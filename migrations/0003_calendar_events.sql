-- Migration: Create calendar_events table
-- This extends the database schema to support calendar events

-- Create the calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL, -- ISO format
  end_time TEXT NOT NULL,   -- ISO format
  location TEXT,
  host_id TEXT,             -- Optional link to host_submissions table
  status TEXT DEFAULT 'available', -- available, booked, cancelled
  type TEXT DEFAULT 'regular', -- regular, special
  description TEXT,
  custom_props TEXT,        -- JSON string for additional properties
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY(host_id) REFERENCES host_submissions(id)
);

-- Create the calendar_bookings table for booking requests
CREATE TABLE IF NOT EXISTS calendar_bookings (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY(event_id) REFERENCES calendar_events(id)
);
