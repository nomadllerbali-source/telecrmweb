/*
  # Add Admin Role Check for Destinations Delete

  ## Summary
  Updates the destinations RLS policies to explicitly check for admin role.
  This ensures only admins can add, update, and delete destinations.
  
  ## Changes
  - Create function to check if user is admin
  - Update INSERT, UPDATE, and DELETE policies to verify admin role
  - Maintain READ policies for all authenticated users
*/

-- Drop existing write policies
DROP POLICY IF EXISTS "Custom auth users can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Custom auth users can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Custom auth users can update destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can delete destinations" ON destinations;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = (current_setting('app.current_user_id', true)::uuid)
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can insert destinations
CREATE POLICY "Admins can insert destinations"
  ON destinations FOR INSERT
  TO public
  WITH CHECK (is_current_user_admin());

-- Admin can update destinations
CREATE POLICY "Admins can update destinations"
  ON destinations FOR UPDATE
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Admin can delete destinations
CREATE POLICY "Admins can delete destinations"
  ON destinations FOR DELETE
  TO public
  USING (is_current_user_admin());
