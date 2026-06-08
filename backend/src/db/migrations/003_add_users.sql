-- Migration 003: Add users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer',
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login    INTEGER
);
