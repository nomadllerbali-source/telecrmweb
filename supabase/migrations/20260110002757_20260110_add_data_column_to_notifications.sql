/*
  # Add data and scheduled_for columns to notifications table

  1. Modified Tables
    - `notifications`: Add `data` and `scheduled_for` columns for rich notification data

  2. Important Notes
    - data column stores JSON with additional context like lead name, contact, notes
    - scheduled_for tracks when a notification should be triggered
    - Both columns are nullable for backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE notifications ADD COLUMN scheduled_for timestamptz;
  END IF;
END $$;
