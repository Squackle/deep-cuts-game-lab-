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

-- Release 1.0: preserve historical alpha data in its existing tables.
CREATE TABLE IF NOT EXISTS hive_sessions_v1 (
 token TEXT PRIMARY KEY, seed INTEGER NOT NULL, issued_at INTEGER NOT NULL,
 used_at INTEGER, subject TEXT NOT NULL, mode TEXT NOT NULL,
 challenge_day TEXT NOT NULL DEFAULT '', rules_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hive_v1_sessions_issued ON hive_sessions_v1(issued_at);
CREATE TABLE IF NOT EXISTS hive_scores_v1 (
 id TEXT PRIMARY KEY, session_token TEXT NOT NULL UNIQUE, alias TEXT NOT NULL,
 profile_id TEXT, profile_handle TEXT, profile_verified INTEGER NOT NULL DEFAULT 0,
 score INTEGER NOT NULL, kills INTEGER NOT NULL, evolutions INTEGER NOT NULL,
 ticks INTEGER NOT NULL, rules_version TEXT NOT NULL, mode TEXT NOT NULL,
 challenge_day TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hive_v1_rank ON hive_scores_v1(rules_version,mode,challenge_day,score DESC,kills DESC,created_at ASC);
