import { IsUUID, IsISO8601 } from 'class-validator';

export class SchedulePostDto {
  @IsUUID()
  post_id: string;

  @IsISO8601()
  scheduled_at_utc: string;
}
