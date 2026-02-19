import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError, ZodType, ZodRawShape } from 'zod';
import { ValidationError } from '../utils/errors.js';

interface ValidationSchemas {
    body?: ZodType;
    query?: ZodObject<ZodRawShape>;
    params?: ZodObject<ZodRawShape>;
}

export function validate(schemas: ValidationSchemas) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = (await schemas.query.parseAsync(req.query)) as any;
            }
            if (schemas.params) {
                req.params = (await schemas.params.parseAsync(req.params)) as any;
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.issues.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                    code: e.code,
                }));
                next(new ValidationError('Validation failed', details));
            } else {
                next(error);
            }
        }
    };
}
