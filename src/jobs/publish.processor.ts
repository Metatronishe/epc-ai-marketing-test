import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from '../entities/post.entity';
import { Stage1Service } from '../stage1/stage1.service';
import { ConfigService } from '@nestjs/config';

import { Job as JobEntity, JobStatus } from '../entities/job.entity';

interface PublishJobData {
  postId: string;
}

@Processor('publication')
export class PublishProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(JobEntity)
    private jobsRepository: Repository<JobEntity>,
    private stage1Service: Stage1Service,
    private configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<PublishJobData, any, string>): Promise<void> {
    const { postId } = job.data;
    const maxAttempts = Number(
      this.configService.get<number>('MAX_PUBLICATION_ATTEMPTS', 5),
    );
    console.log(
      `[Worker] Processing job ${job.id} for post ${postId}. BullMQ attemptsMade: ${job.attemptsMade}. Internal Max: ${maxAttempts}`,
    );

    // 1. Get or create internal job record
    let dbJob = await this.jobsRepository.findOne({ where: { postId } });
    if (!dbJob) {
      dbJob = this.jobsRepository.create({
        postId,
        payload: JSON.stringify(job.data),
        status: JobStatus.PENDING,
        attempts: 0,
      });
    }

    dbJob.status = JobStatus.PROCESSING;
    dbJob.attempts = job.attemptsMade + 1;
    await this.jobsRepository.save(dbJob);

    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) {
      dbJob.status = JobStatus.FAILED;
      dbJob.error_message = `Post ${postId} not found`;
      await this.jobsRepository.save(dbJob);
      throw new Error(`Post with ID ${postId} not found`);
    }

    try {
      await this.stage1Service.publish({
        ref_post_id: post.id,
        channel: 'both',
        payload: {
          title: post.title,
          html: post.html,
        },
      });

      post.status = PostStatus.PUBLISHED;
      post.published_at_utc = new Date();
      await this.postsRepository.save(post);

      dbJob.status = JobStatus.COMPLETED;
      await this.jobsRepository.save(dbJob);

      console.log(`[Worker] Post ${postId} successfully published`);
    } catch (error: unknown) {
      const maxAttempts = Number(
        this.configService.get<number>('MAX_PUBLICATION_ATTEMPTS', 5),
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      dbJob.error_message = errorMessage;

      // BullMQ: job.attemptsMade is incremented AFTER process() fails.
      // But we already incremented dbJob.attempts at the start of process().
      // So if dbJob.attempts reached maxAttempts, this was the last possible try.
      console.error(
        `[Worker] Error publishing post ${postId}: ${errorMessage} (Attempt ${dbJob.attempts}/${maxAttempts})`,
      );

      if (dbJob.attempts >= maxAttempts) {
        console.error(
          `[Worker] Post ${postId} moved to DLQ after ${dbJob.attempts} attempts`,
        );
        dbJob.status = JobStatus.DLQ;
      } else {
        dbJob.status = JobStatus.FAILED;
      }

      await this.jobsRepository.save(dbJob);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.warn(
      `[Worker] Job ${job.id} failed: ${error.message}. Attempt ${job.attemptsMade}`,
    );
  }
}
