# AI-Marketing Internal Platform

Backend service for automating content publication.

## Tech Stack
- NestJS
- SQLite (TypeORM)
- Redis (BullMQ)
- Docker Compose

## Start
1. Ensure Redis is running:
   ```bash
   docker-compose up -d redis
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env`:
   ```bash
   cp .env.example .env
   ```
4. Run app:
   ```bash
   npm run start:dev
   ```

## Testing
- **Unit Tests**: `npm run test`
- **E2E Tests**: `npm run test:e2e` (requires Docker)
- **Coverage**: `npm run test:cov`

## Examples

### 1. Create Draft
```bash
curl -X POST http://localhost:3000/api/stage2/drafts \
  -H "Content-Type: application/json" \
  -d '{"title": "My Post", "html": "<p>Content</p>", "tags": ["news"]}'
```

### 2. Schedule Publication
```bash
curl -X POST http://localhost:3000/api/stage2/schedule \
  -H "Content-Type: application/json" \
  -d '{"post_id": "POST_ID_HERE", "scheduled_at_utc": "2026-02-04T15:00:00Z"}'
```

### 3. Check Status
```bash
curl http://localhost:3000/api/stage1/posts/POST_ID_HERE
```
