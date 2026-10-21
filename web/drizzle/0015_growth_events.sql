-- Anonymous first-party funnel, no names, IPs, cookies, or cross-day identity.
CREATE TABLE IF NOT EXISTS growth_events (
  id TEXT PRIMARY KEY NOT NULL,
  day TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  event TEXT NOT NULL,
  year INTEGER NOT NULL,
  league TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS growth_events_day_event_idx ON growth_events(day, event);
