# AI Usage Report - AI-Marketing Internal Platform

This document describes the collaboration with **Antigravity (Google DeepMind)** during the development of this project.

## 1. Where and How AI Was Used

AI was used throughout the entire development lifecycle:
- **Project Setup**: Initializing NestJS structure, configuring TypeORM for SQLite, and setting up BullMQ with Redis.
- **Implementation**: 
    - Designing the **Idempotency** mechanism based on dynamic metadata.
    - Implementing the **Jobs & DLQ** logic for persistent audit trails.
    - Creating **DTOs and Validation** pipes using `class-validator`.
- **Infrastructure**: Automating Redis startup via `docker-compose` and Shell scripts within `package.json`.
- **Testing**: 
    - generating multi-scenario unit tests for services and processors.
    - Developing a comprehensive **Unified E2E Testing Suite** covering both successful publication and DLQ failure paths.

## 2. Key Prompts (Examples)

- *"Implement a scheduling system using BullMQ with exponential backoff and jitter."*
- *"Refactor Stage 2 to handle idempotency by generating a unique key from post title and scheduled date."*
- *"Create an E2E test that waits for Redis connection, creates a draft, schedules it, and verifies publication in Stage 1."*
- *"Add a jobs table to track every distribution attempt and move to DLQ status after failure exhaustion."*

## 3. Accepted vs. Rejected Suggestions

- **Accepted**:
    - Use of **UUIDs** for all entities for better distributed system reliability.
    - **Separate Entities** for Stage 2 (Drafts) and Stage 1 (Processed) to mirror real-world microservices logic.
    - **Jobs tracking entity** to provide visibility into the async queue state.
- **Rejected**:
    - **ioredis-mock for E2E**: Initially attempted using mocks to save time, but rejected because BullMQ relies on complex Lua cycles not supported by the mock. Switched to mandatory real Redis for verification.
    - **Simple setTimeout in Tests**: Initially used fixed delays, but rejected in favor of robust **Redis connection retry loops** to prevent race conditions during Docker startup.

## 4. Verification Methodology

The correctness of the AI-generated code was verified through:
1. **Automated Unit Tests**: Verified logic in isolation (Service/Processor).
2. **Unified E2E Suite**: Verified the integration between Stage 2, BullMQ, and Stage 1 using real infrastructure.
3. **Manual Audit**: Periodic inspection of the generated `.sqlite` database and JSON payloads.
4. **Log Analysis**: Monitoring `[Worker]` and `[Stage 1]` log prefixes to verify retry timing and backoff.

## 5. Efficiency Evaluation

- **Time Saved**: Estimated **80%**. 
    - Scaffolding and boilerplate were handled in seconds. 
    - Debugging environment-specific issues (Docker/Redis) was significantly accelerated by AI analysis of logs.
    - Documentation (README, Walkthrough) was generated based on the actual codebase state.
- **Quality**: AI ensured high coverage for edge cases (e.g. Stage 1 downtime, unique constraint violations).
