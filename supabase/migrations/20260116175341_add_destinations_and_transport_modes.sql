/*
  # Add Destinations Management and Transport Modes

  ## Summary
  This migration adds comprehensive destination management and transport mode support
  for itineraries, enabling better organization and multi-mode trip planning.

  ## New Tables
  1. `destinations`
    - `id` (uuid, primary key) - Unique identifier
    - `name` (text, unique) - Destination name
    - `is_active` (boolean) - Whether destination is currently available
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## Modified Tables
  1. `itineraries`
    - Add `destination_id` (uuid) - Reference to destinations table
    - Add `mode_of_transport` (text) - Transport mode: driver_with_cab, self_drive_cab, self_drive_scooter
    - Add `important_notes` (text) - Important notes and information
    - Add `disclaimers` (text) - Legal disclaimers and terms
    - Add `cost_inr` (numeric) - Cost in INR for convenience

  2. `leads`
    - Add `destination_id` (uuid, nullable) - Reference to destinations table
    - Keep `place` field for backward compatibility

  ## Security
  - Enable RLS on destinations table
  - Add policies for authenticated users to read destinations
  - Add policies for admin users to manage destinations

  ## Important Notes
  - Existing itineraries will have NULL destination_id and default mode_of_transport
  - Migration preserves all existing data
  - Admins can populate destinations from existing places data
*/

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to itineraries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'destination_id'
  ) THEN
    ALTER TABLE itineraries ADD COLUMN destination_id uuid REFERENCES destinations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'mode_of_transport'
  ) THEN
    ALTER TABLE itineraries ADD COLUMN mode_of_transport text DEFAULT 'driver_with_cab'
      CHECK (mode_of_transport IN ('driver_with_cab', 'self_drive_cab', 'self_drive_scooter'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'important_notes'
  ) THEN
    ALTER TABLE itineraries ADD COLUMN important_notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'disclaimers'
  ) THEN
    ALTER TABLE itineraries ADD COLUMN disclaimers text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itineraries' AND column_name = 'cost_inr'
  ) THEN
    ALTER TABLE itineraries ADD COLUMN cost_inr numeric DEFAULT 0;
  END IF;
END $$;

-- Add destination_id to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'destination_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN destination_id uuid REFERENCES destinations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_itineraries_destination_id ON itineraries(destination_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_mode_of_transport ON itineraries(mode_of_transport);
CREATE INDEX IF NOT EXISTS idx_leads_destination_id ON leads(destination_id);
CREATE INDEX IF NOT EXISTS idx_destinations_is_active ON destinations(is_active);

-- Enable RLS on destinations
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for destinations
CREATE POLICY "Authenticated users can read active destinations"
  ON destinations FOR SELECT
  TO authenticated
  USING (is_active = true OR current_setting('app.current_user_id', true)::uuid IN (
    SELECT id FROM users WHERE role = 'admin'
  ));

CREATE POLICY "Admins can insert destinations"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (
    current_setting('app.current_user_id', true)::uuid IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can update destinations"
  ON destinations FOR UPDATE
  TO authenticated
  USING (
    current_setting('app.current_user_id', true)::uuid IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  )
  WITH CHECK (
    current_setting('app.current_user_id', true)::uuid IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can delete destinations"
  ON destinations FOR DELETE
  TO authenticated
  USING (
    current_setting('app.current_user_id', true)::uuid IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Insert some common destinations
INSERT INTO destinations (name, is_active) VALUES
  ('Leh Ladakh', true),
  ('Kashmir', true),
  ('Himachal Pradesh', true),
  ('Goa', true),
  ('Kerala', true),
  ('Rajasthan', true),
  ('Uttarakhand', true),
  ('Andaman', true)
ON CONFLICT (name) DO NOTHING;
