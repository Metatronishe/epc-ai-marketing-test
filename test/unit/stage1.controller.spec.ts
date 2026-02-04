import { Test, TestingModule } from '@nestjs/testing';
import { Stage1Controller } from '../../src/stage1/stage1.controller';
import { Stage1Service } from '../../src/stage1/stage1.service';

describe('Stage1Controller', () => {
  let controller: Stage1Controller;
  let service: Stage1Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Stage1Controller],
      providers: [
        {
          provide: Stage1Service,
          useValue: {
            publish: jest
              .fn()
              .mockResolvedValue({ id: 's1-uuid', status: 'published' }),
            getPostsByRefId: jest
              .fn()
              .mockResolvedValue([{ id: 's1-uuid', ref_post_id: 'p-1' }]),
          },
        },
      ],
    }).compile();

    controller = module.get<Stage1Controller>(Stage1Controller);
    service = module.get<Stage1Service>(
      Stage1Service,
    ) as jest.Mocked<Stage1Service>;
  });

  it('should call publish service', async () => {
    const dto = { post_id: 'p-1', channel: 'web', payload: {} };
    await controller.publish(dto);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.publish).toHaveBeenCalledWith({
      ref_post_id: 'p-1',
      channel: 'web',
      payload: {},
    });
  });

  it('should call getPostsByRefId service', async () => {
    const id = 's1-uuid';
    await controller.getPostsByRefId(id);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getPostsByRefId).toHaveBeenCalledWith(id);
  });
});
