-- Prisma-compatible users table
-- Mirrors the schema defined in src/prisma/schema.prisma
CREATE TABLE IF NOT EXISTS users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        UNIQUE NOT NULL,
    password    TEXT        NOT NULL,
    name        TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookup
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
