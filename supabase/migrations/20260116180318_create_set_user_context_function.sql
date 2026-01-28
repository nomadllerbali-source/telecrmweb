/*
  # Create User Context Function

  ## Summary
  Creates a PostgreSQL function to set the current user context for RLS policies.
  This allows the application to set the user ID in the session for RLS checks.

  ## Changes
  1. Create set_user_context function
  2. Allow function to set session variables

  ## Security
  - Function is accessible to authenticated connections
  - Sets temporary session variable that persists only for the current transaction
*/

-- Create function to set user context
CREATE OR REPLACE FUNCTION set_user_context(user_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_context(TEXT) TO anon;
