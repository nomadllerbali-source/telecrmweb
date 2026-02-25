-- Add feedback_requested_at to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_requested_at timestamptz;
