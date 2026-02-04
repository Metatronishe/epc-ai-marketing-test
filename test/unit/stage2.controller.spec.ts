import { Test, TestingModule } from '@nestjs/testing';
import { Stage2Controller } from '../../src/stage2/stage2.controller';
import { Stage2Service } from '../../src/stage2/stage2.service';

describe('Stage2Controller', () => {
  let controller: Stage2Controller;
  let service: Stage2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Stage2Controller],
      providers: [
        {
          provide: Stage2Service,
          useValue: {
            createDraft: jest
              .fn()
              .mockResolvedValue({ id: '1', title: 'Test' }),
            schedulePublication: jest
              .fn()
              .mockResolvedValue({ id: '1', status: 'scheduled' }),
          },
        },
      ],
    }).compile();

    controller = module.get<Stage2Controller>(Stage2Controller);
    service = module.get<Stage2Service>(
      Stage2Service,
    ) as jest.Mocked<Stage2Service>;
  });

  it('should call createDraft service', async () => {
    const dto = { title: 'Test', html: 'html', tags: [] };
    await controller.createDraft(dto);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.createDraft).toHaveBeenCalledWith(dto);
  });

  it('should call schedulePublication service', async () => {
    const dto = { post_id: 'uuid', scheduled_at_utc: new Date().toISOString() };
    await controller.schedule(dto);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.schedulePublication).toHaveBeenCalled();
  });
});
