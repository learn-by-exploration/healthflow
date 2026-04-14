# HealthFlow — Claude Code Configuration

> **Last updated:** 13 April 2026 · **Version:** 0.3.0
> **Metrics:** 350 tests | 12 route files | 11 tables | 14 test files | 11 SPA tabs

## LLM Behavior Guidelines

> Based on [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls. These principles complement the rules above.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Project Overview

Health & medical management service for Synclyf. Dual deployment: Free tier (Synclyf-hosted web) and Paid tier (self-hosted Docker Compose). Full data ownership in both tiers.

Service-level telemetry (health checks, metrics, error rates) is required for operational monitoring but MUST NOT include user content, medical data, or personal information.
Multi-user Express.js backend + vanilla JS SPA frontend. SQLite via better-sqlite3.

> **Shared standards** (git workflow, security rules, testing strategy, backend service architecture,
> error handling, anti-patterns, documentation requirements) are in the parent repo's `CLAUDE.md`.
> All standards defined there apply here. This file covers HealthFlow-specific structure and conventions only.

**Status:** v0.2.0 — MVP backend with 11 tables, 12 route files, 343 passing tests.

## Implemented Scope

### v0.1.0 (Foundation)
- Health vitals tracking (blood_pressure, blood_sugar, weight, temperature, spo2, heart_rate)
- Medication management (name, dosage, frequency, schedule, refill tracking)
- Appointment scheduling (doctor, hospital, type, date/time, notes, post-visit notes)
- Emergency health cards (blood type, allergies, medications, emergency contacts, insurance)
- Family member profiles (name, relation, gender, date of birth)
- Session-based auth with bcrypt (cost 12+), CSRF, rate limiting

### v0.2.0 (MVP Expansion)
- Structured health conditions tracking (severity, status, diagnosing doctor)
- Structured allergy records (drug, food, environmental categories with severity/reaction)
- Medical document metadata storage (prescriptions, lab reports, insurance cards, vaccination records)
- Medical expense tracking with category aggregation and summary endpoint
- First aid kit checklist with expiry tracking and expiring-items endpoint
- Family member profile enrichment (height, weight)
- Appointment recurrence and reminder support

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
    emergency-card.schema.js, family-member.schema.js,
    condition.schema.js, allergy.schema.js, document.schema.js,
    medical-expense.schema.js, first-aid.schema.js
  repos/
    vital.repo.js, medication.repo.js, appointment.repo.js,
    emergency-card.repo.js, family-member.repo.js,
    condition.repo.js, allergy.repo.js, document.repo.js,
    medical-expense.repo.js, first-aid.repo.js
  services/
    vital.service.js, medication.service.js, appointment.service.js,
    emergency-card.service.js, family-member.service.js,
    condition.service.js, allergy.service.js, document.service.js,
    medical-expense.service.js, first-aid.service.js
  routes/
    auth.js, vitals.js, medications.js, appointments.js,
    emergency-cards.js, family-members.js, health.js,
    conditions.js, allergies.js, documents.js,
    medical-expenses.js, first-aid.js

migrations/001-initial.sql  — 6 tables + auth tables
migrations/002-mvp-tables.sql — 5 new tables + column additions
public/index.html, login.html — SPA frontend

tests/
  helpers.js, auth.test.js (15), vitals.test.js (27),
  medications.test.js (24), appointments.test.js (24),
  emergency-cards.test.js (17), family-members.test.js (18),
  security.test.js (31), validation.test.js (35),
  conditions.test.js, allergies.test.js, documents.test.js,
  medical-expenses.test.js, first-aid.test.js
```

## Database — 11 Tables

| Table | Columns | Notes |
|-------|---------|-------|
| `family_members` | id, user_id, name, relation, gender, date_of_birth, height_cm, weight_kg, notes | UUID v4 PK |
| `vitals` | id, user_id, family_member_id, type, value, unit, notes, measured_at | 7 vital types |
| `medications` | id, user_id, family_member_id, name, dosage, frequency, start_date, end_date, notes, active | Active/inactive |
| `appointments` | id, user_id, family_member_id, doctor_name, hospital, type, status, scheduled_at, reminder_minutes, recurrence, notes | 9 types |
| `emergency_cards` | id, user_id, family_member_id, blood_type, allergies, medications, conditions, emergency_contacts, insurance_info | JSON fields |
| `health_conditions` | id, user_id, family_member_id, name, severity, diagnosed_date, diagnosing_doctor, status, notes | 4 severity levels, 4 statuses |
| `allergies` | id, user_id, family_member_id, allergen, category, severity, reaction, diagnosed_date, notes | 6 categories, 4 severity levels |
| `medical_documents` | id, user_id, family_member_id, appointment_id, type, title, file_name, file_path, file_size, mime_type, document_date, doctor_name, hospital, notes | 8 document types |
| `medical_expenses` | id, user_id, family_member_id, appointment_id, category, description, amount, currency, expense_date, payment_method, insurance_claimed, receipt_document_id, notes | 10 categories, amount in cents |
| `first_aid_items` | id, user_id, name, category, quantity, expiry_date, is_available, notes | 6 categories, expiry tracking |
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
