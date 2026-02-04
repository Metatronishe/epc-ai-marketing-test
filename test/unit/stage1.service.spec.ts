import { Test, TestingModule } from '@nestjs/testing';
import { Stage1Service } from '../../src/stage1/stage1.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Stage1Post,
  Stage1Status,
} from '../../src/entities/stage1-post.entity';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';

import { Job as JobEntity } from '../../src/entities/job.entity';

interface MockRepo {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
}

describe('Stage1Service', () => {
  let service: Stage1Service;
  let repository: MockRepo;
  let jobRepository: { find: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockImplementation((dto: unknown) => dto),
      save: jest
        .fn()
        .mockImplementation((post: unknown) =>
          Promise.resolve({ ...(post as object), id: 's1-uuid' }),
        ),
      find: jest.fn(),
    };
    jobRepository = {
      find: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Stage1Service,
        {
          provide: getRepositoryToken(Stage1Post),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(JobEntity),
          useValue: jobRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<Stage1Service>(Stage1Service);
  });

  it('should publish naturally when simulation is off', async () => {
    configService.get.mockReturnValue('false');
    const data = { ref_post_id: 'p-1', channel: 'web', payload: {} };
    const result = await service.publish(data);

    expect(result.status).toBe(Stage1Status.PUBLISHED);
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw HttpException when simulation is on', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'SIMULATE_FAILURE') return 'true';
      if (key === 'SIMULATE_HTTP_ERROR_CODE') return 429;
      return null;
    });

    const data = { ref_post_id: 'p-1', channel: 'web', payload: {} };
    await expect(service.publish(data)).rejects.toThrow(HttpException);
  });
});
