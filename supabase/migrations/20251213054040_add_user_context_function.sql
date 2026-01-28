/*
  # Add User Context Function

  1. New Functions
    - `set_user_context` - Sets the current user ID and role for RLS policies
  
  2. Purpose
    - Allows the application to set user context before making queries
    - Required for RLS policies to work with custom authentication
*/

CREATE OR REPLACE FUNCTION set_user_context(user_id text, user_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
  PERFORM set_config('app.current_user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;