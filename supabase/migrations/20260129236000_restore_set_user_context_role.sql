-- Restore set_user_context to include user_role
CREATE OR REPLACE FUNCTION set_user_context(user_id text, user_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
  PERFORM set_config('app.current_user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_context(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_context(TEXT, TEXT) TO anon;
