import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class PublishPostDto {
  @IsString()
  @IsNotEmpty()
  post_id: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsObject()
  payload: any;
}
