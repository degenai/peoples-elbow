-- The only D1 use is the public changelog. Forms are email-only and never
-- stored (see privacy.html and workers/host-form-worker.js).

-- Changelog Entries Table
-- This table stores commit information for the development timeline
CREATE TABLE IF NOT EXISTS changelog_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique, auto-incrementing ID
    commit_hash TEXT NOT NULL UNIQUE,     -- Git commit hash, must be unique
    commit_message TEXT NOT NULL,         -- The full commit message
    commit_date TEXT NOT NULL,            -- Commit date in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
    author_name TEXT,                     -- Name of the commit author
    author_email TEXT                     -- Email of the commit author
);

-- Create an index on commit_date for efficient sorting and querying by date
CREATE INDEX IF NOT EXISTS idx_changelog_commit_date ON changelog_entries (commit_date);
