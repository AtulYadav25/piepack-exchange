import dotenv from 'dotenv'

import z from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['PRODUCTION', 'DEVELOPMENT']),
    PORT: z.string().default('3000')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("Invalid Environment Variable Format: ", _env.error.format())
    process.exit(1)
}

export const config = _env.data