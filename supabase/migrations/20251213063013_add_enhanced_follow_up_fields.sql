/*
  # Enhanced Follow-Up Tracking

  1. New Columns in follow_ups table
    - `action_type` (text) - Type of follow-up action: 'itinerary_sent', 'itinerary_updated', 'follow_up', 'confirmed_advance_paid', 'dead'
    - `next_follow_up_date` (date) - Date for next follow-up
    - `next_follow_up_time` (time) - Time for next follow-up
    - `itinerary_id` (text) - For confirmed bookings
    - `total_amount` (numeric) - Total booking amount
    - `advance_amount` (numeric) - Advance paid amount
    - `due_amount` (numeric) - Due amount (calculated)
    - `transaction_id` (text) - Transaction/payment ID
    - `dead_reason` (text) - Reason if lead is marked dead
    - `follow_up_note` (text) - General notes/remarks

  2. Changes
    - Add all new fields to support comprehensive follow-up tracking
*/

DO $$
BEGIN
  -- Add action_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN action_type text;
  END IF;

  -- Add next_follow_up_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'next_follow_up_date'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN next_follow_up_date date;
  END IF;

  -- Add next_follow_up_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'next_follow_up_time'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN next_follow_up_time time;
  END IF;

  -- Add itinerary_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'itinerary_id'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN itinerary_id text;
  END IF;

  -- Add total_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN total_amount numeric;
  END IF;

  -- Add advance_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'advance_amount'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN advance_amount numeric;
  END IF;

  -- Add due_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'due_amount'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN due_amount numeric;
  END IF;

  -- Add transaction_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN transaction_id text;
  END IF;

  -- Add dead_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'dead_reason'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN dead_reason text;
  END IF;

  -- Add follow_up_note column (keeping remark for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_ups' AND column_name = 'follow_up_note'
  ) THEN
    ALTER TABLE follow_ups ADD COLUMN follow_up_note text;
  END IF;
END $$;
