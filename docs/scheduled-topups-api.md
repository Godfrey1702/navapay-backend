# Scheduled Top-ups API

This document defines the API contract for Scheduled Top-ups (schedules and runs), including request/response schemas, events, idempotency, and sample payloads.

Base path: `/api/v1/schedules`

## Resources

- `Schedule` — user-defined recurring/top-up schedule
- `ScheduleRun` — execution attempt of a schedule (history)

---

## Endpoints

### Create Schedule
POST /api/v1/schedules

Request (201 Created)
{
  "amount": 500.0,
  "category": "AIRTIME",        // ServiceCategory enum
  "provider": "MTN",
  "phoneNumber": "+2348012345678",
  "frequency": "MONTHLY",      // DAILY | WEEKLY | MONTHLY
  "startDate": "2026-04-05T08:00:00Z",
  "endDate": null,
  "retryPolicy": { "maxAttempts": 5, "backoff": "exponential" },
  "pauseOnInsufficientFunds": true
}

Response (201)
{
  "id": "sched_01F...",
  "userId": "user_abc",
  "amount": 500.0,
  "category": "AIRTIME",
  "provider": "MTN",
  "phoneNumber": "+2348012345678",
  "frequency": "MONTHLY",
  "startDate": "2026-04-05T08:00:00Z",
  "nextRunAt": "2026-04-05T08:00:00Z",
  "active": true,
  "paused": false,
  "retryPolicy": { "maxAttempts": 5 },
  "createdAt": "...",
  "updatedAt": "..."
}

Errors
- 400: validation errors
- 401: unauthorized
- 429: rate limit

---

### List Schedules
GET /api/v1/schedules

Query: `page`, `limit`, `status` (optional)

Response (200)
{
  "data": [ /* schedule objects */ ],
  "pagination": { "page":1, "limit":20, "total":5 }
}

---

### Get Schedule
GET /api/v1/schedules/:id

Response (200)
{
  /* schedule object with recent runs */
}

---

### Update Schedule
PATCH /api/v1/schedules/:id

Body: any updatable fields (amount, frequency, phoneNumber, paused, active)

Response (200)
{
  /* updated schedule */
}

---

### Pause / Resume
PATCH /api/v1/schedules/:id/pause
PATCH /api/v1/schedules/:id/resume

Response (200) { "status":"paused" }

---

### Cancel Schedule
DELETE /api/v1/schedules/:id

Response (204) No Content

---

### Manual Run (trigger now)
POST /api/v1/schedules/:id/run
Request headers: `Idempotency-Key` (recommended)

Response (202)
{
  "runId": "run_01F...",
  "status": "queued",
  "scheduledAt": "...",
}

Errors
- 409: schedule already running

---

### Schedule Run History
GET /api/v1/schedules/:id/runs

Response (200)
{
  "data": [
    {
      "id": "run_01F...",
      "scheduleId": "sched_01F...",
      "runAt": "2026-04-05T08:00:00Z",
      "status": "FAILED", // PENDING, PROCESSING, SUCCESS, FAILED
      "attempts": 3,
      "error": "INSUFFICIENT_FUNDS",
      "transactionId": null
    }
  ]
}

---

## Events / Webhooks

Use these to inform clients / 3rd parties. Webhooks and internal message bus events should include minimal sensitive data and a link to the resource.

Event names (pub/sub & webhook):
- `schedule.created` (payload: scheduleId, userId, nextRunAt)
- `schedule.updated`
- `schedule.paused`
- `schedule.resumed`
- `schedule.cancelled`
- `schedule.run.queued` (runId, scheduleId, runAt)
- `schedule.run.started` (runId)
- `schedule.run.succeeded` (runId, scheduleId, transactionId, amount)
- `schedule.run.failed` (runId, scheduleId, errorCode, attempts)

Sample webhook payload (schedule.run.failed):
{
  "event":"schedule.run.failed",
  "data":{
    "runId":"run_01F...",
    "scheduleId":"sched_01F...",
    "userId":"user_abc",
    "runAt":"2026-04-05T08:00:00Z",
    "errorCode":"INSUFFICIENT_FUNDS",
    "message":"User wallet balance 0.00 < 500.00",
    "attempts":3
  },
  "meta": { "sentAt":"..." }
}

Security: sign webhooks with HMAC using shared secret; include `X-Signature` header.

---

## Idempotency & Concurrency
- Clients should include `Idempotency-Key` header for manual run and create schedule actions to avoid duplicates.
- Workers should use `scheduleId:runAt` as server-side idempotency key for scheduled runs.
- Use DB unique constraint on `(scheduleId, runAt)` and optimistic locking for schedule updates.

---

## Error Codes (examples)
- `INSUFFICIENT_FUNDS` (pauseable)
- `PROVIDER_UNAVAILABLE` (retryable)
- `INVALID_PROVIDER` (client error)
- `RATE_LIMITED` (retry after)
- `MAX_RETRIES_EXCEEDED`

---

## Notes & Recommendations
- Keep schedule creation lightweight; heavy validation against provider should happen at run-time.
- Provide `nextRunAt` in user's timezone; store times in UTC in DB.
- Support `overrideOnRun` flags: e.g., allow run even if budget exceeded if user explicitly opted in.
- For auditability, keep `ScheduledJobRun` rows with full attempt history.

---

## Example: Full Lifecycle
1. Client `POST /schedules` -> 201 with schedule and `nextRunAt`.
2. Scheduler enqueues job when `nextRunAt` <= now.
3. Worker sets `run` PROCESSING, does pre-checks, creates transaction, updates wallet.
4. Worker emits `schedule.run.succeeded` and updates `schedule.nextRunAt`.
5. Client receives webhook/event; UI shows run in history.



