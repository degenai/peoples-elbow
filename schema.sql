-- Host Form Submissions Table
CREATE TABLE IF NOT EXISTS host_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  venue_type TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact Form Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Example query: Select recent host submissions
-- SELECT * FROM host_submissions ORDER BY created_at DESC LIMIT 10;

-- Example query: Count submissions by venue type
-- SELECT venue_type, COUNT(*) as count FROM host_submissions GROUP BY venue_type;
