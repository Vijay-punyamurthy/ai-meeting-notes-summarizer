-- PostgreSQL schema for structured meeting + action item data.
-- Raw transcript text and raw agent output are kept in MongoDB instead
-- (see backend/src/db/mongo.ts) since that content is unstructured/variable-shape.

CREATE TABLE IF NOT EXISTS meetings (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  summary         TEXT,
  transcript_ref  TEXT,              -- Mongo _id of the raw transcript document
  agent_run_ref   TEXT,              -- Mongo _id of the raw agent output document
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | summarized | failed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_items (
  id          SERIAL PRIMARY KEY,
  meeting_id  INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  owner       TEXT,
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'open', -- open | done
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON action_items(meeting_id);
