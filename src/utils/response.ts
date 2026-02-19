import { Response } from 'express';

interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: {
        code: string;
        details?: unknown;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export function sendSuccess<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    meta?: ApiResponse['meta'],
): void {
    const response: ApiResponse<T> = {
        success: true,
        message,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    res.status(statusCode).json(response);
}

export function sendError(
    res: Response,
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
): void {
    const response: ApiResponse = {
        success: false,
        message,
        error: {
            code,
            details: process.env.NODE_ENV === 'development' ? details : undefined,
        },
    };

    res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message: string = 'Created'): void {
    sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
    res.status(204).send();
}
