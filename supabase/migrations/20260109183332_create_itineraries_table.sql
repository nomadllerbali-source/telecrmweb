/*
  # Create itineraries table for saved tour packages
  
  1. New Tables
    - `itineraries`
      - `id` (uuid, primary key)
      - `name` (text, itinerary name)
      - `days` (integer, number of days)
      - `full_itinerary` (text, detailed day-by-day itinerary)
      - `inclusions` (text, what's included)
      - `exclusions` (text, what's excluded)
      - `cost_usd` (numeric, cost in USD)
      - `created_by` (uuid, user who created it)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. Security
    - Enable RLS on `itineraries` table
    - Admins and sales persons can create itineraries
    - All authenticated users can view itineraries
    - Users can update their own created itineraries
    - Only admins can delete itineraries
*/

CREATE TABLE IF NOT EXISTS itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days integer NOT NULL DEFAULT 1,
  full_itinerary text NOT NULL,
  inclusions text NOT NULL DEFAULT '',
  exclusions text NOT NULL DEFAULT '',
  cost_usd numeric(10, 2) NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view itineraries"
  ON itineraries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'sales_person')
    )
  );

CREATE POLICY "Admins and sales persons can create itineraries"
  ON itineraries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'sales_person')
    )
  );

CREATE POLICY "Users can update own itineraries"
  ON itineraries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can delete itineraries"
  ON itineraries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS itineraries_created_by_idx ON itineraries(created_by);
CREATE INDEX IF NOT EXISTS itineraries_created_at_idx ON itineraries(created_at DESC);
