-- Isolated Hive Run Alpha 0.3 scoreboard. Apply to the D1 database HIVE_DB.
CREATE TABLE IF NOT EXISTS hive_sessions (
 token TEXT PRIMARY KEY, seed INTEGER NOT NULL, issued_at INTEGER NOT NULL,
 used_at INTEGER, subject TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hive_sessions_issued ON hive_sessions(issued_at);
CREATE TABLE IF NOT EXISTS hive_scores (
 id TEXT PRIMARY KEY, session_token TEXT NOT NULL UNIQUE,
 alias TEXT NOT NULL, profile_handle TEXT, profile_verified INTEGER NOT NULL DEFAULT 0,
 score INTEGER NOT NULL, kills INTEGER NOT NULL, evolutions INTEGER NOT NULL,
 ticks INTEGER NOT NULL, rules_version TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hive_scores_rank ON hive_scores(score DESC,kills DESC,created_at ASC);
CREATE TABLE IF NOT EXISTS hive_limits (
 subject TEXT NOT NULL,bucket TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(subject,bucket)
);
