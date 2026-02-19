# Godfray Backend: Codebase Analysis & API Guide

This document provides a technical overview of the Godfray Wallet & Analytics backend and serves as a detailed integration guide for frontend engineers.

---

## 🏗️ Architectural Overview

The backend is built on a **Modular Clean Architecture** using Node.js (ESM) and TypeScript. 
**Flow:** `Route` → `Validation (Zod)` → `Middleware` → `Controller` → `Service` → `Database (Prisma)`.

### Core Technologies
- **Prisma 7**: Database ORM with Driver Adapters for PostgreSQL.
- **Upstash (Redis)**: Serverless Redis for caching and rate limiting.
- **JWT + Bcrypt**: Secure authentication and password hashing.
- **Pino**: Structured logging.

---

## 🔐 Authentication & Authorization

### 1. Token Management
- **Access Token**: Received upon login/registration. Must be stored by the frontend (e.g., in memory or secure storage) and included in every protected request.
- **Refresh Token**: Automatically handled via **HTTP-only cookies**. You do not need to store this manually.

### 2. Authorization Header
All protected routes require the following header:
```http
Authorization: Bearer <your_access_token>
```

---

## 🚀 API Endpoint Reference

### 1. Authentication (`/auth`)

#### `POST /register`
Creates a new user account and an associated wallet.
- **Payload:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "08012345678" (optional)
}
```

#### `POST /login`
Authenticates user and returns an access token.
- **Payload:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

#### `POST /refresh`
Generates a new access token. Requires the `refreshToken` cookie.

---

### 2. User & Wallet Profile (`/users` & `/wallets`)

#### `GET /users/me`
The primary endpoint for the user dashboard. Returns profile details and the current wallet snapshot.
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "wallet": {
      "balance": 5000.00,
      "currency": "NGN",
      "status": "ACTIVE"
    }
  }
}
```

#### `GET /wallets/me`
Dedicated endpoint for fetching current wallet status only.

---

### 3. Transactions (`/transactions`)

#### `POST /deposit` (Fund Wallet)
- **Payload:**
```json
{
  "amount": 5000,
  "description": "Funding my wallet" (optional)
}
```

#### `POST /purchase` (Data/Airtime)
- **Payload:**
```json
{
  "amount": 1200,
  "category": "DATA", // Enum: DATA, AIRTIME, CABLE_TV, ELECTRICITY, OTHER
  "provider": "MTN",
  "phoneNumber": "08012345678",
  "description": "Monthly data sub" (optional),
  "metadata": { "plan_id": "123" } (optional)
}
```

#### `GET /history`
Returns paginated transaction history.
- **Query Params:** `?page=1&limit=20`

---

### 4. Budgets & Analytics (`/budgets`)

#### `POST /` (Set/Update Budget)
- **Payload:**
```json
{
  "category": "DATA", 
  "amountLimit": 10000,
  "month": 2, // 1-12
  "year": 2026,
  "alertThresholdPercent": 80 (optional, default: 80)
}
```

#### `GET /analytics`
- **Query Params:** `?month=2&year=2026` (defaults to current month if omitted)
- **Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "category": "DATA",
      "amountLimit": 10000,
      "spentAmount": 1200,
      "remainingAmount": 8800,
      "percentUsed": 12,
      "month": 2,
      "year": 2026
    }
  ]
}
```

---

### 5. Notifications (`/notifications`)

#### `GET /`
Fetch latest 50 notifications.

#### `PATCH /:id/read`
Mark a specific notification as read.

---

## 🛡️ Error Protocol

All errors follow this structure:
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "details": [
       { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

#### Important Codes:
- `401 UNAUTHORIZED`: Access token expired or missing. Call `/auth/refresh`.
- `400 BAD_REQUEST`: Validation failed or insufficient balance.
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded.
