/*
  # Add number of passengers to itineraries
  
  1. Changes
    - Add `no_of_pax` column to itineraries table
    - Set default value to 2
    
  2. Notes
    - This allows filtering itineraries by number of passengers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'no_of_pax'
  ) THEN
    ALTER TABLE itineraries ADD COLUMN no_of_pax integer NOT NULL DEFAULT 2;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS itineraries_no_of_pax_idx ON itineraries(no_of_pax);
CREATE INDEX IF NOT EXISTS itineraries_days_idx ON itineraries(days);
