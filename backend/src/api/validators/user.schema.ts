import { z } from 'zod';

// ─── Register ─────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
    email: z.email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ─── Login ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export type LoginInput = z.infer<typeof LoginSchema>;