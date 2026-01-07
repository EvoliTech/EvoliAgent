-- Migration: Add calendar_id column to especialistas table
-- This separates the Google Calendar ID from the email field
-- Run this in your Supabase SQL Editor

-- Add calendar_id column to especialistas table
ALTER TABLE especialistas 
ADD COLUMN IF NOT EXISTS calendar_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_especialistas_calendar_id 
ON especialistas(calendar_id);

-- Add comments to explain the columns
COMMENT ON COLUMN especialistas.calendar_id IS 'Google Calendar ID for this specialist (auto-generated, read-only)';
COMMENT ON COLUMN especialistas.email IS 'Email address of the specialist (editable by user)';

-- Optional: Migrate existing data (if email contains Google Calendar IDs)
-- Uncomment the following lines if you want to migrate existing data:
-- UPDATE especialistas 
-- SET calendar_id = email
-- WHERE email LIKE '%@group.calendar.google.com';
