# HealthFlow — Claude Code Configuration

> **Last updated:** 12 April 2026 · **Version:** 0.0.0
> **Metrics:** 0 tests | 0 routes | 0 tables | Pending implementation

## Project Overview

Health & medical management service for Synclyf. Dual deployment: Free tier (Synclyf-hosted web) and Paid tier (self-hosted Docker Compose). Full data ownership in both tiers.

Service-level telemetry (health checks, metrics, error rates) is required for operational monitoring but MUST NOT include user content, medical data, or personal information.
Multi-user Express.js backend + vanilla JS SPA frontend. SQLite via better-sqlite3.

> **Shared standards** (git workflow, security rules, testing strategy, backend service architecture,
> error handling, anti-patterns, documentation requirements) are in the parent repo's `CLAUDE.md`.
> All standards defined there apply here. This file covers HealthFlow-specific structure and conventions only.

**Status:** Pending implementation — scaffolding only.

## Planned Scope

- Health vitals tracking (blood pressure, blood sugar, weight, BMI)
- Medication management & reminders
- Doctor appointments & visit history
- Emergency health cards (allergies, blood group, insurance)
- Family member health profiles
- Medical document storage (prescriptions, reports)

## Quick Start

```bash
npm install
node src/server.js          # http://localhost:TBD
npm test                    # via node:test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | TBD | Server port |
| `DB_DIR` | `./data` | Directory for `healthflow.db` |
| `NODE_ENV` | `development` | Environment (development/production/test) |
| `LOG_LEVEL` | `info` | Pino log level |

## Architecture

Follow the standard Synclyf backend service architecture:

```
src/
  server.js           — Express app entry, middleware, graceful shutdown
  config.js           — Centralized config (dotenv, Object.freeze, Zod env validation)
  logger.js           — Pino structured logging
  errors.js           — AppError classes (NotFoundError, ValidationError, etc.)
  db/
    index.js          — SQLite schema, WAL mode, foreign keys, integrity checks
    migrate.js        — SQL migration runner
    migrations/       — Numbered .sql migration files
  routes/             — Express route handlers (one file per resource)
  services/           — Business logic layer (no HTTP concerns)
  repositories/       — Data access layer (prepared statements)
  schemas/            — Zod validation schemas (one file per resource)
  middleware/
    auth.js           — Session-based authentication guard
    csrf.js           — CSRF token middleware
    errors.js         — Global error handler
    validate.js       — Zod validation middleware

public/               — Frontend SPA (vanilla HTML/CSS/JS)
tests/                — Test files (node:test + supertest)
migrations/           — Numbered .sql files
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Backend | Express 5, better-sqlite3 (WAL mode) |
| Frontend | Vanilla JS SPA, no framework, no build step |
| Auth | bcryptjs, session-based |
| Validation | Zod |
| Testing | node:test + supertest + c8 |
| Logging | Pino (structured JSON) |

## Rules

- ALWAYS read a file before editing it
- ALWAYS update documentation after code changes
- Follow the layered architecture: routes → services → repositories
- All write endpoints validate input via Zod schemas
- All API routes require authentication except `/api/auth/*`, `/api/health`
- Use AppError hierarchy for all error handling
- Run `npm test` after every change to ensure no regressions
- Express route order: static routes before parameterized routes
- No build step, no bundler, no framework — edit and reload
