# TECHNICAL & PRODUCT DOCUMENTATION

**Project:** Data & Airtime Wallet + Spending Analytics Platform
**Current Phase:** MVP
**Core Feature:** Manual Top-Up + Spending Tracking (NO Auto-Top-Up)

---

## 1. Project Overview

This platform is a wallet-based data and airtime purchase system that enables users to:

- Manually purchase data and airtime
- Track spending behavior over time
- Set monthly spending budgets
- Receive alerts when approaching or exceeding budget limits
- View spending analytics on a dashboard

This product is **analytics-first**, not automation-first.

- Auto-top-up is intentionally excluded
- Manual control + visibility is the priority

---

## 2. Business Objective

The system is designed to:

- Increase user awareness of data/airtime spending
- Encourage disciplined usage through budgeting
- Generate revenue through transaction volume, not hidden automation
- Scale with user growth and high transaction concurrency

This is a numbers business:

> Users × Transactions × Retention = Sustainability

---

## 3. High-Level Architecture

### System Components

#### Frontend

- Web / Mobile Client (React-based)
- User Dashboard
- Budget & Settings Interface

#### Backend

- Authentication Service
- Wallet Service
- Transaction Service
- Budget & Analytics Service
- Notification Service

#### External Services

- Third-party telecom API (data/airtime provider)
- Payment gateway (wallet funding)

#### Database

- Relational DB (PostgreSQL recommended)
- Redis (caching, rate limiting, sessions)

---

## 4. Authentication & Session Policy

### Login Behavior (Intentional Design)

- User must authenticate every time they re-enter the app
- No silent session persistence
- Access tokens are short-lived
- Refresh tokens are invalidated on app exit

### Reasoning

- Financial safety
- Shared device environments
- Reduced risk of unauthorized purchases

---

## 5. Core Workflow: Manual Top-Up

### Step-by-Step Flow

1. **User Initiates Purchase**
   - Selects data/airtime plan
   - Confirms purchase amount

2. **Authentication Check**
   - Validate access token
   - Reject request if unauthenticated

3. **Wallet Balance Validation**
   - Ensure sufficient balance
   - Lock wallet row (DB transaction)

4. **Third-Party API Call**
   - Send purchase request
   - Await response (success / pending / failed)

5. **Transaction Resolution**
   - On success:
     - Deduct wallet balance
     - Create transaction record
   - On failure:
     - Rollback wallet lock
     - Log error

6. **Frontend Update**
   - Display transaction status
   - Update wallet balance
   - Trigger analytics recalculation

---

## 6. Spending Analytics Workflow (Critical Feature)

### Data Capture

Every successful transaction writes:

- `user_id`
- `amount`
- `category` (data / airtime)
- `timestamp`
- `network_provider`
- `transaction_status`

This data is **immutable**.

### Monthly Budget Logic

#### Budget Setting (Settings Page)

User defines:

- Monthly spending limit (e.g. ₦10,000)
- Budget reset cycle (calendar month)

Stored as:

```
monthly_budget {
  user_id
  amount
  month
  year
}
```

#### Real-Time Tracking (Dashboard)

On every transaction:

- Aggregate monthly spending:
  ```sql
  SUM(transactions.amount)
  WHERE user_id = X
  AND month = current_month
  ```
- Compare against budget
- Calculate percentage used

### Notification Triggers

| Condition      | Action              |
| -------------- | ------------------- |
| 70% used       | Soft warning        |
| 90% used       | Strong warning      |
| 100% exceeded  | Limit breach alert  |

Notifications can be:

- In-app alerts
- Push notifications
- Email (future)

---

## 7. Data Flow Synchronization

### Frontend ↔ Backend Consistency

- Backend is source of truth
- Frontend never computes balances
- All analytics come from API responses

Pattern used:

- Event-driven recalculation
- Optimistic UI only after backend confirmation

---

## 8. Scalability Strategy

### Backend Design Principles

- Stateless APIs
- Horizontal scaling
- Idempotent transaction endpoints
- Queue-based third-party calls

### High Traffic Handling

- Rate limiting per user
- Redis locks on wallet writes
- Async workers for provider APIs

### Transactions Per Second (TPS)

- MVP target: 100–300 TPS
- Scalable to 1k+ TPS with:
  - Read replicas
  - Queue separation
  - Provider load balancing

---

## 9. Database Structure (Simplified)

### Core Tables

- `users`
- `wallets`
- `transactions`
- `budgets`
- `notifications`
- `audit_logs`

All financial operations are:

- ACID-compliant
- Fully auditable
- Non-destructive

---

## 10. Error Handling & Observability

- Centralized logging
- Transaction trace IDs
- Provider failure retries
- Alerting on anomaly patterns

---

## 11. Security Considerations

- No client-side balance logic
- Encrypted tokens
- Signed provider requests
- Request validation at every layer

---

## 12. What This Project Is NOT

- ❌ Not an auto-top-up system
- ❌ Not a wallet lender
- ❌ Not a prediction engine (yet)

> This discipline is important. Scope creep kills products.

---

## 13. Roadmap (Post-MVP)

- Spending insights (behavior patterns)
- Provider optimization
- Smart recommendations
