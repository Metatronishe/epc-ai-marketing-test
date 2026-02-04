import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class CreateDraftDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  html: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
