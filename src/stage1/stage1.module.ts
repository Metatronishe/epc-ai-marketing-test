import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stage1Post } from '../entities/stage1-post.entity';
import { Job } from '../entities/job.entity';
import { Stage1Controller } from './stage1.controller';
import { Stage1Service } from './stage1.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stage1Post, Job])],
  controllers: [Stage1Controller],
  providers: [Stage1Service],
  exports: [Stage1Service],
})
export class Stage1Module {}
