/*
  # Fix Destination Delete Permissions

  ## Summary
  Updates the destinations table RLS policies to properly allow authenticated users to delete destinations.
  The SECURITY DEFINER function needs RLS bypass or more permissive policies.

  ## Changes
  1. Update DELETE policy to be more permissive for authenticated users
  2. Keep the pattern consistent across all operations
*/

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Authenticated users can delete destinations" ON destinations;

-- Create a permissive DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete destinations"
  ON destinations FOR DELETE
  TO authenticated
  USING (true);

-- Also ensure other operations work smoothly
DROP POLICY IF EXISTS "Authenticated users can insert destinations" ON destinations;
CREATE POLICY "Authenticated users can insert destinations"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update destinations" ON destinations;
CREATE POLICY "Authenticated users can update destinations"
  ON destinations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
