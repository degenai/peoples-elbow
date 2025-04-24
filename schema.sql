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

-- Example query: Select recent host submissions
-- SELECT * FROM host_submissions ORDER BY created_at DESC LIMIT 10;

-- Example query: Count submissions by venue type
-- SELECT venue_type, COUNT(*) as count FROM host_submissions GROUP BY venue_type;
