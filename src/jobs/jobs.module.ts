import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../entities/post.entity';
import { Job } from '../entities/job.entity';
import { Stage1Post } from '../entities/stage1-post.entity';
import { PublishProcessor } from './publish.processor';
import { Stage1Module } from '../stage1/stage1.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Job, Stage1Post]),
    BullModule.registerQueueAsync({
      name: 'publication',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        defaultJobOptions: {
          attempts: Number(
            configService.get<number>('MAX_PUBLICATION_ATTEMPTS', 5),
          ),
          backoff: {
            type: 'exponential',
            delay: configService.get<number>('BACKOFF_DELAY_SECONDS', 5) * 1000,
          },
        },
      }),
    }),
    Stage1Module,
  ],
  providers: [PublishProcessor],
})
export class JobsModule {}
