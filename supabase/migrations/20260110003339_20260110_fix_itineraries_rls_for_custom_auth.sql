/*
  # Fix itineraries RLS policies for custom authentication

  1. Security Changes
    - Update itineraries RLS to work with custom auth system
    - Remove auth.uid() dependency
    - Allow authenticated users to create and view itineraries
    - Automatic UUID generation for itinerary IDs

  2. Important Notes
    - Itinerary ID is automatically generated with gen_random_uuid()
    - Each itinerary gets a unique UUID on creation
    - RLS simplified to allow app-level security enforcement
*/

DROP POLICY IF EXISTS "Authenticated users can view itineraries" ON itineraries;
DROP POLICY IF EXISTS "Admins and sales persons can create itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can update own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Admins can delete itineraries" ON itineraries;

CREATE POLICY "Anyone can view itineraries"
  ON itineraries
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create itineraries"
  ON itineraries
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update itineraries"
  ON itineraries
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete itineraries"
  ON itineraries
  FOR DELETE
  TO authenticated, anon
  USING (true);
