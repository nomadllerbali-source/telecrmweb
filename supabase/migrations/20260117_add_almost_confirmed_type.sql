/*
  # Add Almost Confirmed follow-up type

  1. Modified Tables
    - `follow_ups`: Add 'almost_confirmed' to update_type CHECK constraint
  
  2. Important Notes
    - Allows tracking leads that are nearly ready for confirmation
    - Helps admins and sales managers identify high-priority conversion opportunities
*/

DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_update_type_check;
  
  -- Add the updated constraint with almost_confirmed
  ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_update_type_check 
    CHECK (update_type IN ('itinerary_created', 'itinerary_updated', 'follow_up', 'advance_paid_confirmed', 'almost_confirmed', 'dead'));
EXCEPTION WHEN duplicate_object THEN
  -- If constraint already exists, do nothing
  NULL;
END $$;
