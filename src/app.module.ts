import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { Stage1Module } from './stage1/stage1.module';
import { Stage2Module } from './stage2/stage2.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, Stage1Module, Stage2Module, JobsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
