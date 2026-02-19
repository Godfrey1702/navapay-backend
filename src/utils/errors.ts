export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: string;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        details?: unknown,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.details = details;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request', details?: unknown) {
        super(message, 400, 'BAD_REQUEST', true, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED', true);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN', true);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND', true);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT', true);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed', details?: unknown) {
        super(message, 422, 'VALIDATION_ERROR', true, details);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'TOO_MANY_REQUESTS', true);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, 500, 'INTERNAL_SERVER_ERROR', false);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE', true);
    }
}
