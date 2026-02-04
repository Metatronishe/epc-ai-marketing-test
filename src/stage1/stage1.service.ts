import { Injectable, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage1Post, Stage1Status } from '../entities/stage1-post.entity';
import { Job } from '../entities/job.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Stage1Service {
  constructor(
    @InjectRepository(Stage1Post)
    private stage1Repository: Repository<Stage1Post>,
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    private configService: ConfigService,
  ) { }

  async publish(data: { ref_post_id: string; channel: string; payload: any }) {
    // Failure simulation
    const simulateFailure =
      this.configService.get<string>('SIMULATE_FAILURE') === 'true';
    if (simulateFailure) {
      const errorCode = this.configService.get<number>(
        'SIMULATE_HTTP_ERROR_CODE',
        429,
      );
      console.warn(`[Stage 1] Simulating failure with code ${errorCode}`);
      throw new HttpException('Simulated Stage 1 failure', errorCode);
    }

    const post = this.stage1Repository.create({
      ...data,
      status: Stage1Status.PUBLISHED,
    });

    const saved = await this.stage1Repository.save(post);
    console.log(
      `[Stage 1] Published post ${data.ref_post_id} to channel ${data.channel}`,
    );
    return saved;
  }

  async getPost(id: string) {
    return this.stage1Repository.findOne({ where: { id } });
  }

  async getPostsByRefId(refPostId: string) {
    return this.stage1Repository.find({ where: { ref_post_id: refPostId } });
  }

  async getAllJobs() {
    return this.jobsRepository.find({ order: { created_at: 'DESC' } });
  }
}
