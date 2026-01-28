/*
  # Fix Destinations Delete RLS for Custom Auth

  ## Summary
  Updates the destinations table RLS policies to work with custom authentication
  using current_setting instead of Supabase's built-in authenticated role.

  ## Changes
  1. Drop the authenticated role policies
  2. Create new policies that check for current_setting('app.current_user_id')
  3. Ensure all CRUD operations work with custom auth
*/

-- Drop existing authenticated role policies
DROP POLICY IF EXISTS "Authenticated users can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can update destinations" ON destinations;

-- Create custom auth policies that check current_setting
CREATE POLICY "Custom auth users can delete destinations"
  ON destinations FOR DELETE
  TO public
  USING (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) <> ''
  );

CREATE POLICY "Custom auth users can insert destinations"
  ON destinations FOR INSERT
  TO public
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) <> ''
  );

CREATE POLICY "Custom auth users can update destinations"
  ON destinations FOR UPDATE
  TO public
  USING (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) <> ''
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) <> ''
  );
