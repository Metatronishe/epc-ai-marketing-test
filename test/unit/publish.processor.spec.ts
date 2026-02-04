import { Test, TestingModule } from '@nestjs/testing';
import { PublishProcessor } from '../../src/jobs/publish.processor';
import { Job } from 'bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post, PostStatus } from '../../src/entities/post.entity';
import { Stage1Service } from '../../src/stage1/stage1.service';
import { ConfigService } from '@nestjs/config';

import { Job as JobEntity } from '../../src/entities/job.entity';

interface PublishJobData {
  postId: string;
}

interface MockRepo {
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
}

describe('PublishProcessor', () => {
  let processor: PublishProcessor;
  let repository: MockRepo;
  let jobRepository: MockRepo;
  let stage1Service: { publish: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    jobRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d: unknown) => d),
      save: jest.fn(),
    };
    stage1Service = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishProcessor,
        {
          provide: getRepositoryToken(Post),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(JobEntity),
          useValue: jobRepository,
        },
        {
          provide: Stage1Service,
          useValue: stage1Service,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(5) },
        },
      ],
    }).compile();

    processor = module.get<PublishProcessor>(PublishProcessor);
  });

  it('should process job and publish post', async () => {
    const post = {
      id: 'uuid-1',
      status: PostStatus.DRAFT,
      title: 'T',
      html: 'H',
    };
    repository.findOne.mockResolvedValue(post);
    stage1Service.publish.mockResolvedValue({ id: 's1-1' });

    await processor.process({
      data: { postId: 'uuid-1' },
      id: 'job-1',
      attemptsMade: 0,
    } as unknown as Job<PublishJobData, any, string>);

    expect(stage1Service.publish).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PostStatus.PUBLISHED }),
    );
  });

  it('should throw error when Stage1 fails (triggering BullMQ retry)', async () => {
    const post = {
      id: 'uuid-1',
      status: PostStatus.DRAFT,
      title: 'T',
      html: 'H',
    };
    repository.findOne.mockResolvedValue(post);
    stage1Service.publish.mockRejectedValue(new Error('Stage 1 Error'));

    await expect(
      processor.process({
        data: { postId: 'uuid-1' },
        id: 'job-1',
        attemptsMade: 0,
      } as unknown as Job<PublishJobData, any, string>),
    ).rejects.toThrow('Stage 1 Error');
  });
});
