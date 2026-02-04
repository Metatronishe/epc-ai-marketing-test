import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from '../entities/post.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Stage2Service {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectQueue('publication')
    private publicationQueue: Queue,
    private configService: ConfigService,
  ) {}

  async createDraft(data: { title: string; html: string; tags: string[] }) {
    const slug = data.title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
    const post = this.postsRepository.create({
      ...data,
      slug,
      status: PostStatus.DRAFT,
    });
    return this.postsRepository.save(post);
  }

  async schedulePublication(id: string, scheduledAt: Date) {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const idempotencyKey = `${post.title}-${scheduledAt.toISOString()}`;
    const existingPostWithKey = await this.postsRepository.findOne({
      where: { idempotency_key: idempotencyKey },
    });
    if (existingPostWithKey) {
      console.log(`[Stage 2] Idempotency triggered for key: ${idempotencyKey}`);
      return existingPostWithKey;
    }

    post.scheduled_at_utc = scheduledAt;
    post.status = PostStatus.SCHEDULED;
    post.idempotency_key = idempotencyKey;

    await this.postsRepository.save(post);

    const delay = scheduledAt.getTime() - Date.now();
    const maxAttempts = Number(
      this.configService.get<number>('MAX_PUBLICATION_ATTEMPTS', 5),
    );
    const backoffDelay =
      Number(this.configService.get<number>('BACKOFF_DELAY_SECONDS', 5)) * 1000;

    await this.publicationQueue.add(
      'publish',
      { postId: post.id },
      {
        delay: delay > 0 ? delay : 0,
        jobId: post.id,
        attempts: maxAttempts,
        backoff: {
          type: 'exponential',
          delay: backoffDelay,
        },
        removeOnComplete: true,
      },
    );

    return post;
  }

  async getPostBySlug(slug: string) {
    return this.postsRepository.findOne({ where: { slug } });
  }
}
