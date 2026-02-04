import { Test, TestingModule } from '@nestjs/testing';
import { Stage2Service } from '../../src/stage2/stage2.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post, PostStatus } from '../../src/entities/post.entity';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface MockRepo {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
}

describe('Stage2Service', () => {
  let service: Stage2Service;
  let repository: MockRepo;
  let queue: { add: jest.Mock };

  const mockPost = {
    id: 'uuid-1',
    title: 'Test Post',
    html: '<p>Content</p>',
    status: PostStatus.DRAFT,
    slug: 'test-post',
    save: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockImplementation((dto: unknown) => ({
        ...(dto as object),
        slug: 'test-post',
      })),
      save: jest
        .fn()
        .mockImplementation((post: unknown) => Promise.resolve(post)),
      findOne: jest.fn(),
    };
    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Stage2Service,
        {
          provide: getRepositoryToken(Post),
          useValue: repository,
        },
        {
          provide: getQueueToken('publication'),
          useValue: queue,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(5) },
        },
      ],
    }).compile();

    service = module.get<Stage2Service>(Stage2Service);
  });

  it('should create a draft with a slug', async () => {
    const dto = { title: 'Test Post', html: '<p>Content</p>', tags: ['test'] };
    const result = (await service.createDraft(dto)) as { slug: string };
    expect(result.slug).toBe('test-post');
    expect(repository.create).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should schedule a publication and generate idempotency key', async () => {
    const post = { ...mockPost };
    repository.findOne.mockImplementation(
      ({ where }: { where: { id?: string; idempotency_key?: string } }) => {
        if (where.id === 'uuid-1') return Promise.resolve(post);
        return Promise.resolve(null); // No idempotency trigger
      },
    );
    const scheduledAt = new Date();
    const result = (await service.schedulePublication(
      'uuid-1',
      scheduledAt,
    )) as { status: PostStatus; idempotency_key: string };

    expect(result.status).toBe(PostStatus.SCHEDULED);
    expect(result.idempotency_key).toBe(
      `Test Post-${scheduledAt.toISOString()}`,
    );
    expect(queue.add).toHaveBeenCalledWith(
      'publish',
      { postId: 'uuid-1' },
      expect.any(Object),
    );
  });

  it('should return existing post if idempotency key matches', async () => {
    const scheduledAt = new Date();
    const idempotencyKey = `Test Post-${scheduledAt.toISOString()}`;
    repository.findOne.mockImplementation(
      ({ where }: { where: { id?: string; idempotency_key?: string } }) => {
        if (where.id === 'uuid-1') return Promise.resolve({ ...mockPost });
        if (where.idempotency_key === idempotencyKey)
          return Promise.resolve({
            ...mockPost,
            idempotency_key: idempotencyKey,
          });
        return Promise.resolve(null);
      },
    );

    const result = (await service.schedulePublication(
      'uuid-1',
      scheduledAt,
    )) as { idempotency_key: string };
    expect(repository.save).not.toHaveBeenCalled();
    expect(result.idempotency_key).toBe(idempotencyKey);
  });

  it('should throw NotFoundException if post does not exist', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.schedulePublication('invalid', new Date()),
    ).rejects.toThrow(NotFoundException);
  });
});
