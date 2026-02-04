import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { Stage1Service } from './stage1.service';
import { PublishPostDto } from './dto/publish-post.dto';

@Controller('stage1')
export class Stage1Controller {
  constructor(private readonly stage1Service: Stage1Service) {}

  @Post('posts')
  async publish(@Body() publishPostDto: PublishPostDto) {
    return this.stage1Service.publish({
      ref_post_id: publishPostDto.post_id,
      channel: publishPostDto.channel,
      payload: publishPostDto.payload as unknown,
    });
  }

  @Get('posts/ref/:refId')
  async getPostsByRefId(@Param('refId') refId: string) {
    return this.stage1Service.getPostsByRefId(refId);
  }

  @Get('jobs')
  async getAllJobs() {
    return this.stage1Service.getAllJobs();
  }
}
