/*
  # Fix Destinations RLS Policies

  ## Summary
  Fixes the RLS policies for the destinations table to work with the custom authentication system.
  Removes dependency on non-existent RPC functions and simplifies access control.

  ## Changes
  1. Drop existing RLS policies on destinations
  2. Create new simplified policies that work with custom auth
  3. Allow authenticated access based on user context setting

  ## Security
  - Authenticated users can read active destinations
  - Users with valid user_id context can manage destinations (for admin operations)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read active destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can update destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can delete destinations" ON destinations;

-- Create new simplified policies

-- Allow reading active destinations for anyone (no auth required for reading active ones)
CREATE POLICY "Anyone can read active destinations"
  ON destinations FOR SELECT
  USING (is_active = true);

-- Allow users with valid context to read all destinations
CREATE POLICY "Authenticated users can read all destinations"
  ON destinations FOR SELECT
  USING (
    current_setting('app.current_user_id', true) IS NOT NULL
    AND current_setting('app.current_user_id', true) != ''
  );

-- Allow users with valid context to insert destinations
CREATE POLICY "Authenticated users can insert destinations"
  ON destinations FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NOT NULL
    AND current_setting('app.current_user_id', true) != ''
  );

-- Allow users with valid context to update destinations
CREATE POLICY "Authenticated users can update destinations"
  ON destinations FOR UPDATE
  USING (
    current_setting('app.current_user_id', true) IS NOT NULL
    AND current_setting('app.current_user_id', true) != ''
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NOT NULL
    AND current_setting('app.current_user_id', true) != ''
  );

-- Allow users with valid context to delete destinations
CREATE POLICY "Authenticated users can delete destinations"
  ON destinations FOR DELETE
  USING (
    current_setting('app.current_user_id', true) IS NOT NULL
    AND current_setting('app.current_user_id', true) != ''
  );
