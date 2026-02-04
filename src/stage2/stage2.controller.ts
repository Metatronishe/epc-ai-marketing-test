import { Controller, Post, Body } from '@nestjs/common';
import { Stage2Service } from './stage2.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';

@Controller('stage2')
export class Stage2Controller {
  constructor(private readonly stage2Service: Stage2Service) {}

  @Post('drafts')
  async createDraft(@Body() createDraftDto: CreateDraftDto) {
    return this.stage2Service.createDraft(createDraftDto);
  }

  @Post('schedule')
  async schedule(@Body() schedulePostDto: SchedulePostDto) {
    return this.stage2Service.schedulePublication(
      schedulePostDto.post_id,
      new Date(schedulePostDto.scheduled_at_utc),
    );
  }
}
