import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Post } from '../entities/post.entity';
import { Stage2Controller } from './stage2.controller';
import { Stage2Service } from './stage2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    BullModule.registerQueue({
      name: 'publication',
    }),
  ],
  controllers: [Stage2Controller],
  providers: [Stage2Service],
  exports: [Stage2Service],
})
export class Stage2Module {}
