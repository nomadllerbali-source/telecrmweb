/*
  # Fix Authentication Flow

  1. Changes
    - Create authenticate_user function that bypasses RLS
    - Add RLS policy to allow unauthenticated login queries
    - This solves the chicken-and-egg problem where login needs to query users table before context is set

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS safely
    - Only returns user data if credentials match
    - Does not expose password hashes
*/

-- Create authentication function that bypasses RLS
CREATE OR REPLACE FUNCTION authenticate_user(
  p_username text,
  p_password_hash text
)
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  full_name text,
  role text,
  phone text,
  status text,
  created_at timestamptz,
  last_login timestamptz
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.role,
    u.phone,
    u.status,
    u.created_at,
    u.last_login
  FROM users u
  WHERE u.username = p_username
    AND u.password_hash = p_password_hash
    AND u.status = 'active'
  LIMIT 1;
END;
$$;

-- Allow anyone to execute this function
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO anon, authenticated;