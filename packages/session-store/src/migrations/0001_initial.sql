PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  platform TEXT,
  chat_id TEXT,
  thread_id TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_source ON sessions (source);
CREATE INDEX IF NOT EXISTS idx_sessions_platform_chat ON sessions (platform, chat_id);

CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  message_type TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcripts_session_created_at
  ON transcripts (session_id, created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
  transcript_id UNINDEXED,
  session_id UNINDEXED,
  text
);

CREATE TRIGGER IF NOT EXISTS transcripts_ai
AFTER INSERT ON transcripts
BEGIN
  INSERT INTO transcripts_fts (transcript_id, session_id, text)
  VALUES (new.id, new.session_id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS transcripts_ad
AFTER DELETE ON transcripts
BEGIN
  DELETE FROM transcripts_fts WHERE transcript_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS transcripts_au
AFTER UPDATE ON transcripts
BEGIN
  DELETE FROM transcripts_fts WHERE transcript_id = old.id;
  INSERT INTO transcripts_fts (transcript_id, session_id, text)
  VALUES (new.id, new.session_id, new.text);
END;

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule TEXT NOT NULL,
  timezone TEXT,
  delivery_target TEXT NOT NULL,
  origin_session_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  skills_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_run_at TEXT,
  next_run_at TEXT,
  FOREIGN KEY (origin_session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_enabled_next_run_at
  ON jobs (enabled, next_run_at);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  session_id TEXT,
  output_text TEXT,
  error_text TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_started_at
  ON job_runs (job_id, started_at);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  approval_type TEXT NOT NULL,
  request_text TEXT NOT NULL,
  request_payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  requested_by TEXT,
  resolved_by TEXT,
  requested_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_status_requested_at
  ON approvals (status, requested_at);

CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  session_id TEXT,
  confidence REAL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_store_updated_at
  ON memory_entries (store, updated_at);
