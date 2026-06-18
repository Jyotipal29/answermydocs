CREATE TABLE IF NOT EXISTS users (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                  TEXT        UNIQUE NOT NULL,
    name                   TEXT        NOT NULL DEFAULT '',
    password_hash          TEXT,                          -- NULL for Google OAuth users
    plan                   TEXT        NOT NULL DEFAULT 'free'
                                       CHECK (plan IN ('free', 'pro', 'enterprise')),
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
