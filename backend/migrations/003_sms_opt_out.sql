-- SMS opt-out for Twilio/CTIA compliance (STOP handling)
-- Run after 002_payments.sql

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_participants_sms_opt_out ON participants (trip_id, sms_opt_out) WHERE sms_opt_out = true;
