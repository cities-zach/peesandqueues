-- Payments: trip status, expiry, Stripe, discount codes
-- Run after 001_initial.sql

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_trips_stripe_session ON trips (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_trips_status_expires ON trips (status, expires_at);

-- Backfill existing trips: 7-day expiry from creation
UPDATE trips SET expires_at = created_at + INTERVAL '7 days' WHERE expires_at IS NULL;

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percent',
  percent_off INT NOT NULL DEFAULT 0 CHECK (percent_off >= 0 AND percent_off <= 100),
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes (code);
