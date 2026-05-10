PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent_endpoints (
  agent_id TEXT PRIMARY KEY,
  session_id TEXT,
  runtime_type TEXT NOT NULL,
  status TEXT NOT NULL,
  process_id INTEGER,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_endpoints_status
  ON agent_endpoints (status);

CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  correlation_id TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  acknowledged_at TEXT,
  error_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_target_status_created_at
  ON agent_messages (to_agent_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_messages_correlation_id
  ON agent_messages (correlation_id);

