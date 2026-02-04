import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JobStatus } from './../src/entities/job.entity';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as fs from 'fs';

interface ApiResponse {
  id: string;
  status: string;
}

interface JobRecord {
  postId: string;
  status: string;
  attempts: number;
}

describe('Unified Publication Flow (e2e)', () => {
  let app: INestApplication;
  let configOverrides: Record<string, string | number> = {};

  beforeAll(async () => {
    process.env.DB_NAME = 'database.test.sqlite';
    process.env.USE_REDIS_MOCK = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string, defaultValue?: string | number) => {
          if (key in configOverrides) return configOverrides[key];
          const val = process.env[key] || defaultValue;
          if (
            key === 'MAX_PUBLICATION_ATTEMPTS' ||
            key === 'BACKOFF_DELAY_SECONDS'
          )
            return Number(val);
          return val;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api');

    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const redis = new Redis({ host, port, retryStrategy: () => 1000 });
    let connected = false;
    for (let i = 0; i < 5; i++) {
      try {
        await redis.ping();
        connected = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    await redis.quit();
    if (!connected) console.warn('[E2E] Redis connection failed');

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    // Cleanup SQLite file
    const dbPath = 'database.test.sqlite';
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log(`[E2E] Cleaned up ${dbPath}`);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(`[E2E] Could not delete ${dbPath}: ${errorMessage}`);
      }
    }
  });

  it('SUCCESS PATH: should complete the full publication flow', async () => {
    configOverrides = { SIMULATE_FAILURE: 'false' };
    const uniqueTitle = `Success Post ${Date.now()}`;
    const createRes = await request(app.getHttpServer() as string)
      .post('/api/stage2/drafts')
      .send({ title: uniqueTitle, html: 'Content', tags: ['test'] })
      .expect(201);

    const postId = (createRes.body as ApiResponse).id;
    await request(app.getHttpServer() as string)
      .post('/api/stage2/schedule')
      .send({
        post_id: postId,
        scheduled_at_utc: new Date(Date.now() + 1000).toISOString(),
      })
      .expect(201);

    console.log('[E2E] Waiting for success processing (10s)...');
    await new Promise((r) => setTimeout(r, 10000));

    const stage1Res = await request(app.getHttpServer() as string)
      .get(`/api/stage1/posts/ref/${postId}`)
      .expect(200);

    const body = stage1Res.body as ApiResponse[];
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].status).toBe('published');
  }, 30000);

  it('FAILURE PATH: should move job to DLQ after exhaustion (3 attempts)', async () => {
    // Demonstrate real retries: 3 attempts with 1s backoff
    configOverrides = {
      SIMULATE_FAILURE: 'true',
      MAX_PUBLICATION_ATTEMPTS: 3,
      BACKOFF_DELAY_SECONDS: 1, // Fast backoff for test
    };

    const uniqueTitle = `DLQ Multi Post ${Date.now()}`;
    const createRes = await request(app.getHttpServer() as string)
      .post('/api/stage2/drafts')
      .send({ title: uniqueTitle, html: 'Failure Content', tags: ['dlq'] })
      .expect(201);

    const postId = (createRes.body as ApiResponse).id;
    await request(app.getHttpServer() as string)
      .post('/api/stage2/schedule')
      .send({
        post_id: postId,
        scheduled_at_utc: new Date(Date.now() + 1000).toISOString(),
      })
      .expect(201);

    console.log('[E2E] Waiting for 3 attempts and DLQ transition (20s)...');
    await new Promise((r) => setTimeout(r, 20000));

    const jobsRes = await request(app.getHttpServer() as string)
      .get('/api/stage1/jobs')
      .expect(200);

    const postJob = (jobsRes.body as JobRecord[]).find(
      (j) => j.postId === postId,
    );
    if (postJob?.status !== JobStatus.DLQ || postJob?.attempts !== 3) {
      console.log('[E2E] DLQ check failed. Job state:', postJob);
    }
    expect(postJob).toBeDefined();
    expect(postJob?.status).toBe(JobStatus.DLQ);
    expect(postJob?.attempts).toBe(3);
  }, 60000);
});
