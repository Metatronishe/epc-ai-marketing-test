import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Post } from './entities/post.entity';
import { Stage1Post } from './entities/stage1-post.entity';
import { Job } from './entities/job.entity';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('DB_NAME', 'database.sqlite'),
        entities: [Post, Stage1Post, Job],
        synchronize: true, // For development/test task
      }),
    }),
    TypeOrmModule.forFeature([Post, Stage1Post, Job]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const useMock = configService.get<string>('USE_REDIS_MOCK') === 'true';
        if (useMock) {
          const RedisMock = (await import('ioredis-mock'))
            .default as unknown as new () => any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return {
            connection: new RedisMock() as unknown,
          } as any;
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class DatabaseModule {}
