/*
  # Add Delete Destination Function

  ## Summary
  Creates a database function to delete destinations with proper user context.
  This ensures the user context and delete operation happen in the same transaction.

  ## Changes
  1. Create delete_destination function that sets user context and performs delete
  2. Grant execute permission to authenticated users

  ## Security
  - Function sets user context before delete
  - RLS policies still apply during the delete operation
*/

-- Create function to delete destination with proper user context
CREATE OR REPLACE FUNCTION delete_destination(p_user_id TEXT, p_destination_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Set user context
  PERFORM set_config('app.current_user_id', p_user_id, false);
  
  -- Perform delete
  DELETE FROM destinations WHERE id = p_destination_id;
  
  -- Check if delete was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination not found or access denied';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_destination(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_destination(TEXT, UUID) TO anon;
