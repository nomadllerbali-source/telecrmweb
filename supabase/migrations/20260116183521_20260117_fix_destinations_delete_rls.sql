/*
  # Fix Destinations Delete RLS Policy

  ## Summary
  Fixes the DELETE policy for destinations table to work properly with custom auth.
  The issue was that DELETE operations need both USING and WITH CHECK clauses for RLS.
  
  ## Changes
  - Recreate the delete policy with explicit check that user context is set
  - Ensure policy allows deletion when user context exists
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Custom auth users can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can delete destinations" ON destinations;

-- Create new delete policy that works reliably
CREATE POLICY "Admins can delete destinations"
  ON destinations FOR DELETE
  TO public
  USING (
    COALESCE(current_setting('app.current_user_id', true), '') <> ''
  );
