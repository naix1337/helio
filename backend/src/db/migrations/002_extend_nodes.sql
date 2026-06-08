-- Migration 002: Extend nodes table
-- Adds labels, maintenance_mode, maintenance_until, created_at columns
-- to support existing deployments that were created before migration 001.
-- Each ALTER TABLE is handled individually; the runner ignores
-- "duplicate column name" errors so this migration is safe to apply
-- on both fresh and pre-existing databases.

ALTER TABLE nodes ADD COLUMN labels TEXT DEFAULT '{}';
ALTER TABLE nodes ADD COLUMN maintenance_mode INTEGER DEFAULT 0;
ALTER TABLE nodes ADD COLUMN maintenance_until INTEGER;
ALTER TABLE nodes ADD COLUMN created_at INTEGER DEFAULT (unixepoch());
