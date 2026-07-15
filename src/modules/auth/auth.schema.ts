import { z } from 'zod';

export const registerSchema = {
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        fullName: z.string().min(2, 'Full name is required'),
        phoneNumber: z.string().optional(),
    }),
};

export const loginSchema = {
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
    }),
};

export const refreshTokenSchema = {
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
};

export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema.body>;
