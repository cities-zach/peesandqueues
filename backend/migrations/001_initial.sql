-- Pees & Queues MVP schema
-- Run against Supabase Postgres

CREATE TYPE queue_entry_state AS ENUM ('waiting', 'active', 'done');

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_invite_token ON trips (invite_token);

CREATE TABLE bathrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bathrooms_trip_id ON bathrooms (trip_id);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, phone)
);

CREATE INDEX idx_participants_trip_id ON participants (trip_id);
CREATE INDEX idx_participants_phone ON participants (phone);

CREATE TABLE queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bathroom_id UUID NOT NULL REFERENCES bathrooms(id) ON DELETE CASCADE UNIQUE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_queues_trip_id ON queues (trip_id);

CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  position INT NOT NULL,
  state queue_entry_state NOT NULL DEFAULT 'waiting',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE
);

CREATE UNIQUE INDEX idx_queue_entries_one_active_waiting_per_participant
  ON queue_entries (queue_id, participant_id)
  WHERE state IN ('waiting', 'active');

CREATE INDEX idx_queue_entries_queue_state ON queue_entries (queue_id, state);
CREATE INDEX idx_queue_entries_participant_state ON queue_entries (participant_id, state);
CREATE INDEX idx_queue_entries_activated_at ON queue_entries (activated_at) WHERE state = 'active';

CREATE TABLE sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_sid TEXT NOT NULL UNIQUE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_log_twilio_sid ON sms_log (twilio_sid);

-- Trigger to set updated_at on trips
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
