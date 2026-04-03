# app-tasks-backend

A RESTful API for managing recurring tasks and user streaks, built with **NestJS**, **Prisma ORM**, and **PostgreSQL**.

## Overview

Users can register, authenticate, and manage tasks with configurable recurrence frequencies (daily, weekly, monthly, yearly). Each time a user completes all tasks due in the current period, their streak counter increments automatically. The API exposes a Swagger UI for interactive documentation.

### Data model

| Entity           | Description                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `User`           | Registered account with email, hashed password, avatar, and streak counter                            |
| `Task`           | Recurring task belonging to a user, with a `Frequency` (`DAILY` \| `WEEKLY` \| `MONTHLY` \| `YEARLY`) |
| `TaskCompletion` | Record of a single task completion (unique per task + period)                                         |

---

## Tech stack

- **Node.js 24** / **TypeScript**
- **NestJS 11** — modular framework (controllers → services → Prisma)
- **Prisma 7** — type-safe ORM with PostgreSQL adapter (`@prisma/adapter-pg`)
- **PostgreSQL 16**
- **JWT** — authentication via Bearer tokens
- **Swagger** — auto-generated API docs at `/swagger`
- **bcryptjs** — password hashing
- **Docker / Docker Compose** — fully containerised setup

---

## Requirements

| Tool                    | Minimum version |
| ----------------------- | --------------- |
| Node.js                 | 24              |
| npm                     | 10              |
| PostgreSQL              | 16 (or Docker)  |
| Docker + Docker Compose | v2 (optional)   |

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable             | Description                  | Example                                                     |
| -------------------- | ---------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/tasks?schema=public` |
| `JWT_SECRET`         | Secret key for signing JWTs  | `my_super_secret`                                           |
| `JWT_TOKEN_AUDIENCE` | JWT audience claim           | `app-tasks-api`                                             |
| `JWT_TOKEN_ISSUER`   | JWT issuer claim             | `app-tasks-auth`                                            |
| `JWT_TTL`            | Token expiry                 | `3600s` / `30d`                                             |

---

## Running locally (npm)

### 1. Install dependencies

```bash
npm install
```

### 2. Generate the Prisma client

```bash
npx prisma generate
```

### 3. Run database migrations

Make sure PostgreSQL is running and `DATABASE_URL` is set in `.env`.

```bash
npx prisma migrate deploy
```

### 4. Start the server

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`.  
Swagger UI: `http://localhost:3000/swagger`

---

## Running with Docker Compose

All services (PostgreSQL + the app) are orchestrated in a single command. No local Node.js or PostgreSQL installation required.

### 1. Configure environment variables

The `docker-compose.yml` already ships with sensible defaults. To override them, create a `.env` file at the project root:

```bash
cp .env.example .env
# edit JWT_SECRET, JWT_TOKEN_AUDIENCE, JWT_TOKEN_ISSUER, JWT_TTL
```

### 2. Build and start

```bash
docker compose up --build -d
```

This will:

1. Build the multi-stage Docker image (Node 24 Alpine)
2. Start a PostgreSQL 16 container (`db`)
3. Wait for the database to be healthy
4. Run pending Prisma migrations automatically
5. Start the NestJS application

The API will be available at `http://localhost:3000`.  
Swagger UI: `http://localhost:3000/swagger`

### 3. Stop

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

## Running tests

### Unit tests

Run directly with npm (no database required):

```bash
npm test
```

With coverage report:

```bash
npm run test:cov
```

### Unit tests via Docker

```bash
docker compose -f docker-compose.test.yml run --rm unit
```

### E2E (integration) tests via Docker

A dedicated PostgreSQL container (`db_test`) is spun up automatically, migrations are applied, and the tests run in isolation — no conflict with the production database.

```bash
# First run (builds the image)
docker compose -f docker-compose.test.yml run --rm --build e2e

# Subsequent runs (uses existing image)
docker compose -f docker-compose.test.yml run --rm e2e
```

To clean up test containers after the run:

```bash
docker compose -f docker-compose.test.yml down -v
```

---

## Project structure

```
src/
├── auth/          # JWT authentication (sign-in, guards, hashing)
├── tasks/         # Task CRUD and completion logic
├── users/         # User registration and profile management
├── prisma/        # PrismaService (database client)
└── common/        # Shared DTOs (pagination, etc.)

prisma/
├── schema.prisma  # Data models
└── migrations/    # SQL migration history

test/
├── tasks.e2e-spec.ts
└── users.e2e-spec.ts
```
