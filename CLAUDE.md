# HealthFlow — Claude Code Configuration

> **Last updated:** 13 April 2026 · **Version:** 0.1.0
> **Metrics:** 171 tests | 7 route files | 6 tables | 9 test files

## Project Overview

Health & medical management service for Synclyf. Dual deployment: Free tier (Synclyf-hosted web) and Paid tier (self-hosted Docker Compose). Full data ownership in both tiers.

Service-level telemetry (health checks, metrics, error rates) is required for operational monitoring but MUST NOT include user content, medical data, or personal information.
Multi-user Express.js backend + vanilla JS SPA frontend. SQLite via better-sqlite3.

> **Shared standards** (git workflow, security rules, testing strategy, backend service architecture,
> error handling, anti-patterns, documentation requirements) are in the parent repo's `CLAUDE.md`.
> All standards defined there apply here. This file covers HealthFlow-specific structure and conventions only.

**Status:** v0.1.0 — Full scaffold with CRUD for all resources, auth, security, 171 passing tests.

## Implemented Scope

- Health vitals tracking (blood_pressure, blood_sugar, weight, temperature, spo2, heart_rate)
- Medication management (name, dosage, frequency, schedule, refill tracking)
- Appointment scheduling (doctor, hospital, type, date/time, notes, post-visit notes)
- Emergency health cards (blood type, allergies, medications, emergency contacts, insurance)
- Family member profiles (name, relation, gender, date of birth)
- Session-based auth with bcrypt (cost 12+), CSRF, rate limiting

## Quick Start

```bash
npm install
PORT=3461 DB_DIR=./data SESSION_SECRET=your-secret node src/server.js
npm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3461` | Server port |
| `DB_DIR` | `./data` | Directory for `healthflow.db` |
| `SESSION_SECRET` | required | Session signing secret |
| `NODE_ENV` | `development` | Environment |
| `LOG_LEVEL` | `info` | Pino log level |

## Directory Structure

```
src/
  server.js           — Express 5 app + middleware + graceful shutdown
  db.js               — SQLite connection, WAL mode, pragmas
  migrate.js          — Migration runner (numbered .sql files)
  config.js           — Frozen config from env (Object.freeze)
  validate-env.js     — Zod env validation
  errors.js           — AppError hierarchy
  logger.js           — Pino with redaction
  plugin.js           — Monolith plugin adapter
  middleware/
    auth.js           — Session auth, requireAuth, bcrypt (cost 12+)
    csrf.js           — Double-submit cookie CSRF
    rate-limit.js     — Rate limiting (10 failed/5min)
    error-handler.js  — Global error handler
    validate.js       — Zod validation middleware
  schemas/
    vital.schema.js, medication.schema.js, appointment.schema.js,
    emergency-card.schema.js, family-member.schema.js
  repos/
    vital.repo.js, medication.repo.js, appointment.repo.js,
    emergency-card.repo.js, family-member.repo.js
  services/
    vital.service.js, medication.service.js, appointment.service.js,
    emergency-card.service.js, family-member.service.js
  routes/
    auth.js, vitals.js, medications.js, appointments.js,
    emergency-cards.js, family-members.js, health.js

migrations/001-initial.sql  — 6 tables + auth tables
public/index.html, login.html — SPA frontend

tests/
  helpers.js, auth.test.js (15), vitals.test.js (27),
  medications.test.js (24), appointments.test.js (24),
  emergency-cards.test.js (17), family-members.test.js (18),
  security.test.js (31), validation.test.js (35)
```

## Database — 6 Tables

| Table | Columns | Notes |
|-------|---------|-------|
| `family_members` | id, user_id, name, relation, gender, date_of_birth, notes | UUID v4 PK |
| `vitals` | id, user_id, family_member_id, type, value, unit, notes, measured_at | 6 vital types |
| `medications` | id, user_id, family_member_id, name, dosage, frequency, start_date, end_date, notes, active | Active/inactive |
| `appointments` | id, user_id, family_member_id, title, doctor_name, hospital, type, status, scheduled_at, notes | 5 types |
| `emergency_cards` | id, user_id, family_member_id, blood_type, allergies, medications, conditions, emergency_contacts, insurance_info | JSON fields |
| `users` + `sessions` + `login_attempts` | Auth tables | Standard pattern |

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
