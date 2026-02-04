import { Test, TestingModule } from '@nestjs/testing';
import { PublishProcessor } from '../../src/jobs/publish.processor';
import { Job } from 'bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post, PostStatus } from '../../src/entities/post.entity';
import { Job as JobEntity, JobStatus } from '../../src/entities/job.entity';
import { Stage1Service } from '../../src/stage1/stage1.service';
import { ConfigService } from '@nestjs/config';

interface PublishJobData {
  postId: string;
}

interface MockRepo {
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
}

describe('PublishProcessor (DLQ)', () => {
  let processor: PublishProcessor;
  let postRepo: MockRepo;
  let jobRepo: MockRepo;
  let stage1Service: { publish: jest.Mock };

  beforeEach(async () => {
    postRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
    jobRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d: unknown) => d),
      save: jest.fn().mockImplementation((j: unknown) => Promise.resolve(j)),
    };
    stage1Service = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishProcessor,
        { provide: getRepositoryToken(Post), useValue: postRepo },
        { provide: getRepositoryToken(JobEntity), useValue: jobRepo },
        { provide: Stage1Service, useValue: stage1Service },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(3) },
        },
      ],
    }).compile();

    processor = module.get<PublishProcessor>(PublishProcessor);
  });

  it('should move job to DLQ after reaching max attempts', async () => {
    const post = { id: 'p-1', title: 'T', html: 'H', status: PostStatus.DRAFT };
    const jobRecord = { postId: 'p-1', attempts: 2, status: JobStatus.FAILED };

    postRepo.findOne.mockResolvedValue(post);
    jobRepo.findOne.mockResolvedValue(jobRecord);
    stage1Service.publish.mockRejectedValue(new Error('Persistent Error'));

    // Mock BullMQ job state: attemptsMade = 2 (so this is the 3rd attempt)
    await expect(
      processor.process({
        data: { postId: 'p-1' },
        attemptsMade: 2,
        id: 'bull-1',
      } as unknown as Job<PublishJobData, any, string>),
    ).rejects.toThrow('Persistent Error');

    expect(jobRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: JobStatus.DLQ,
        attempts: 3,
      }),
    );
  });
});
