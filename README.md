# Godfray — Financial Wallet & Spending Analytics Platform

A robust, production-ready API for managing digital wallets, processing transactions, and enabling users to track and control their spending on data and airtime services.

## 🎯 Overview

Godfray is an **analytics-first** financial platform designed specifically for:

- **Manual wallet top-ups** with spending visibility
- **Transaction tracking** across multiple service categories
- **Budget management** with configurable alerts
- **Spending analytics** to encourage disciplined usage
- **Real-time notifications** for transaction events

The platform prioritizes **user awareness** and **manual control** over automated processes, ensuring transparency in every transaction.

## ✨ Key Features

### Authentication & Security
- JWT-based authentication with access and refresh tokens
- Secure password hashing using bcryptjs
- HTTP-only cookies for refresh token storage
- Role-based access control (USER, ADMIN)
- Rate limiting to prevent abuse
- Comprehensive audit logging

### Wallet Management
- Per-user wallet with balance tracking
- Support for multiple currencies (default: NGN)
- Wallet status management (ACTIVE, FROZEN, SUSPENDED)
- Optimistic locking for concurrent transaction safety
- Balance snapshots for transaction auditing

### Transaction Processing
- **Deposit transactions** for wallet funding
- **Purchase transactions** for data/airtime services
- **Refund and adjustment** transactions
- Support for external provider references
- Flexible metadata storage for provider-specific details
- Transaction status tracking (PENDING, SUCCESS, FAILED, CANCELLED)

### Budget & Analytics
- Per-category monthly budgets
- Configurable alert thresholds (e.g., notify at 80% spent)
- Service categories: DATA, AIRTIME, CABLE_TV, ELECTRICITY, OTHER
- Advanced spending analytics
- Budget exceeded notifications

### Notifications
- Real-time transaction notifications
- Budget warning and exceeded alerts
- System alerts
- Notification read/unread status tracking
- Metadata linking to relevant resources

### System Features
- Health check endpoint with service status
- Request ID tracing for debugging
- Structured logging with Pino
- GZIP compression for responses
- CORS support with configurable origins
- Request body validation with Zod

## 🛠 Tech Stack

### Core
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.9
- **Framework**: Express 5.2
- **ORM**: Prisma 6.19
- **Database**: PostgreSQL 16
- **Cache/Session**: Redis 7

### Authentication & Security
- **JWT**: jsonwebtoken 9.0
- **Password Hashing**: bcryptjs 3.0
- **Security Headers**: helmet 8.1
- **Rate Limiting**: express-rate-limit 8.2

### Utilities
- **Validation**: Zod 4.3
- **Logging**: Pino 10.3
- **Data Compression**: compression 1.8
- **CORS**: cors 2.8

### Development
- **Build Tool**: TypeScript Compiler
- **Linting**: ESLint 10.0
- **Code Formatting**: Prettier 3.8
- **Development Server**: tsx 4.21
- **Testing**: Ready for Jest/Vitest integration
- **Database Management**: Prisma Studio

## 📁 Project Structure

```
godfray/
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma           # Data models and relationships
│   ├── migrations/             # Database migration history
│   └── generated/              # Prisma client types
│
├── src/
│   ├── app.ts                  # Express app configuration
│   ├── server.ts               # HTTP server setup
│   ├── routes.ts               # Main router and health check
│   │
│   ├── config/                 # Configuration
│   │   ├── env.ts             # Environment validation schema
│   │   └── index.ts           # Validated environment exports
│   │
│   ├── database/               # Database utilities
│   │   ├── index.ts           # Prisma client export
│   │   ├── prisma.ts          # Prisma client instance
│   │   └── transaction.ts      # Transaction helpers
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.ts            # JWT verification & user attachment
│   │   ├── errorHandler.ts    # Global error handling
│   │   ├── rateLimiter.ts     # Rate limiting strategies
│   │   ├── requestLogger.ts   # HTTP request/response logging
│   │   ├── validate.ts        # Request body validation
│   │   └── index.ts           # Middleware exports
│   │
│   ├── modules/                # Feature modules (modular architecture)
│   │   ├── auth/              # Authentication
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── index.ts
│   │   ├── users/             # User management
│   │   ├── wallets/           # Wallet operations
│   │   ├── transactions/      # Transaction processing
│   │   ├── budgets/           # Budget management
│   │   └── notifications/     # Notification system
│   │
│   ├── services/              # Business logic services
│   │   ├── jwt.ts            # JWT operations
│   │   ├── redis.ts          # Redis client
│   │   └── index.ts
│   │
│   ├── utils/                 # Utilities
│   │   ├── errors.ts         # Custom error classes
│   │   ├── logger.ts         # Logger instance
│   │   ├── response.ts       # Response formatting
│   │   └── index.ts
│   │
│   ├── generated/             # Auto-generated Prisma types
│   │   └── prisma/
│   │       ├── client.ts
│   │       ├── models.ts
│   │       └── ...
│   │
│   └── workers/               # Background job workers (if needed)
│
├── docker-compose.yml         # Local development containers
├── Dockerfile                 # Multi-stage production build
├── .dockerignore              # Docker build exclusions
├── tsconfig.json              # TypeScript configuration
├── eslint.config.js           # ESLint configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL 16+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd godfray
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   ```env
   # Server
   NODE_ENV=development
   PORT=3000
   API_PREFIX=/api/v1
   
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/godfray_wallet
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   
   # JWT
   JWT_ACCESS_SECRET=your-secret-key-at-least-16-chars
   JWT_REFRESH_SECRET=your-refresh-secret-at-least-16-chars
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Logging
   LOG_LEVEL=info
   
   # CORS
   CORS_ORIGIN=*
   ```

4. **Setup database**
   ```bash
   npm run prisma:migrate
   ```

5. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

### Building for Production

```bash
npm run build
npm start
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive tokens |
| POST | `/auth/logout` | Logout and clear session |
| POST | `/auth/refresh` | Refresh access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user profile |

### Wallets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallets/me` | Get wallet details |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions/deposit` | Deposit funds to wallet |
| POST | `/transactions/purchase` | Purchase data/airtime |
| GET | `/transactions/history` | Get transaction history |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/budgets` | Set monthly spending budget |
| GET | `/budgets/analytics` | Get spending analytics |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get user notifications |
| PATCH | `/notifications/:id/read` | Mark notification as read |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health status |

## 📊 Database Schema

### Core Models

#### User
- Unique authentication entity
- Role-based access control (USER, ADMIN)
- Email and phone number verification tracking
- Account activity monitoring

#### Wallet
- One-to-one relationship with User
- Tracks balance in specified currency
- Status management for account freezing
- Optimistic locking for concurrent safety

#### Transaction
- Records all wallet movements
- Supports multiple transaction types (DEPOSIT, PURCHASE, REFUND, ADJUSTMENT)
- Stores provider metadata and external references
- Balance snapshots for audit trails

#### Budget
- Monthly spending limits per service category
- Configurable alert thresholds
- Unique constraint: one budget per category per month

#### Notification
- Transaction and budget related alerts
- Read/unread status tracking
- Flexible metadata for linking resources

#### AuditLog
- Comprehensive activity logging
- IP address and user agent tracking
- Supports system-level actions (nullable userId)

## 🔒 Security Features

- **Password Security**: Bcrypt hashing with 10 salt rounds
- **Token Security**: JWT with short-lived access tokens (default 15m)
- **HTTP-only Cookies**: Refresh tokens stored securely
- **Rate Limiting**: Configurable per-endpoint and global limits
- **Request Validation**: Zod schema validation on all inputs
- **Error Handling**: Sanitized error messages without data leakage
- **CORS**: Configurable origin restrictions
- **Security Headers**: Helmet middleware integration
- **Audit Logging**: All sensitive operations tracked

## 🐳 Docker Deployment

### Local Development with Docker

```bash
# Start all services
npm run docker:up

# Rebuild images
npm run docker:build

# Stop services
npm run docker:down
```

### Production Build

The multi-stage Dockerfile optimizes:
- Minimal final image size
- Separation of build and runtime dependencies
- Security through non-root user execution

## 📝 Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | enum | development | execution environment |
| `PORT` | number | 3000 | server port |
| `API_PREFIX` | string | /api/v1 | API base path |
| `DATABASE_URL` | string | - | PostgreSQL connection string |
| `REDIS_HOST` | string | localhost | Redis server hostname |
| `REDIS_PORT` | number | 6379 | Redis server port |
| `REDIS_PASSWORD` | string | - | Redis authentication password |
| `REDIS_DB` | number | 0 | Redis database number |
| `JWT_ACCESS_SECRET` | string | - | Access token signing key |
| `JWT_REFRESH_SECRET` | string | - | Refresh token signing key |
| `JWT_ACCESS_EXPIRY` | string | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRY` | string | 7d | Refresh token TTL |
| `RATE_LIMIT_WINDOW_MS` | number | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | number | 100 | Max requests per window |
| `LOG_LEVEL` | enum | info | Pino log level |
| `CORS_ORIGIN` | string | * | CORS allowed origins |

## 🔄 Authentication Flow

### Registration & Login
1. User provides email/password
2. Password hashed with bcrypt (10 rounds)
3. JWT access token generated (15m expiry)
4. JWT refresh token stored in HTTP-only cookie (7d expiry)
5. Subsequent requests require Bearer token in Authorization header

### Token Refresh
1. Client sends refresh token from cookie or request body
2. Server validates token signature and expiry
3. New access token issued
4. Refresh token may be rotated

### Authentication Check
- All protected endpoints verify Bearer token
- User context attached to request object
- Role-based authorization available

## 🛠 Development Workflow

### Making Database Changes

1. **Update schema** in [prisma/schema.prisma](prisma/schema.prisma)
2. **Create migration** (auto-generated):
   ```bash
   npm run prisma:migrate
   ```
3. **Generate types**:
   ```bash
   npm run prisma:generate
   ```
4. **Commit** migration file to version control

### Adding New Endpoints

1. Create module directory: `src/modules/feature-name/`
2. Implement files:
   - `feature.controller.ts` - Request handlers
   - `feature.service.ts` - Business logic
   - `feature.schema.ts` - Zod validation schemas
   - `feature.routes.ts` - Route definitions
   - `index.ts` - Module exports
3. Register in [src/routes.ts](src/routes.ts)
4. Add tests and documentation

### Code Standards

- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Error Handling**: Use custom error classes from [src/utils/errors.ts](src/utils/errors.ts)
- **Logging**: Use logger from [src/utils/logger.ts](src/utils/logger.ts)
- **Validation**: Zod schemas in `.schema.ts` files

## 📦 Dependencies Overview

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `@prisma/client` | ORM and database client |
| `postgresql` | Database driver via @prisma/adapter-pg |
| `jsonwebtoken` | JWT generation and verification |
| `bcryptjs` | Password hashing |
| `ioredis` | Redis client |
| `zod` | Runtime schema validation |
| `pino` | High-performance structured logging |
| `helmet` | Security headers middleware |
| `cors` | Cross-origin resource sharing |
| `express-rate-limit` | Rate limiting middleware |

## 🚨 Error Handling

The API uses custom error classes for consistent error responses:

```typescript
// Examples
throw new ValidationError('Invalid input');
throw new UnauthorizedError('Not authorized');
throw new ForbiddenError('Access denied');
throw new NotFoundError('Resource not found');
throw new ConflictError('Resource already exists');
throw new InternalServerError('Unexpected error');
```

All errors return standardized JSON response with:
- HTTP status code
- Error message
- Timestamp
- Request ID (for debugging)

## 📊 Monitoring & Logging

- **Request Logging**: All HTTP requests logged with response time
- **Error Logging**: Full stack traces in development, sanitized in production
- **Request Tracing**: Unique request ID attached to each request
- **Structured Logging**: JSON format for log aggregation tools

Configure log level via `LOG_LEVEL` environment variable:
- `fatal` - Critical errors
- `error` - Error conditions
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug information
- `trace` - Detailed trace information

## 🔐 Session Policy

**Important Design Decision**: Users must authenticate every time they re-enter the app.

- **No silent session persistence**: Access tokens are short-lived (15m)
- **Refresh token invalidation**: Tokens cleared on logout
- **Safety first**: Suitable for shared device environments
- **Financial safety**: Prevents unauthorized purchases

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes following code standards
3. Run tests and linting:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
4. Commit with clear messages
5. Push and create a Pull Request

## 📄 License

ISC

## 📞 Support

For issues, questions, or contributions, please reach out to the development team.

---

**Last Updated**: February 2026  
**Version**: 1.0.0  
**Status**: Production Ready
