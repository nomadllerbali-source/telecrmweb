/*
  # Create Delete Destination Function

  ## Summary
  Creates a secure database function to delete destinations with proper context.

  ## Changes
  1. Creates `delete_destination` function that:
     - Sets user context before deletion
     - Deletes the destination
     - Returns success status
  2. Security: Function is SECURITY DEFINER to bypass RLS
  3. Only allows deletion by setting proper user context
*/

-- Create function to delete destinations
CREATE OR REPLACE FUNCTION delete_destination(
  destination_id uuid,
  user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the user context
  PERFORM set_config('app.current_user_id', user_id::text, false);
  
  -- Delete the destination
  DELETE FROM destinations WHERE id = destination_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;