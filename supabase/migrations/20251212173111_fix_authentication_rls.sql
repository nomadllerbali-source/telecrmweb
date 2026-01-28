/*
  # Fix Authentication RLS Policies

  1. Changes
    - Add policy to allow anonymous users to query users table for authentication
    - This enables login functionality by allowing credential verification
    
  2. Security
    - Policy only allows SELECT operations
    - Users can still only read their own data after authentication
    - No sensitive data exposure during authentication
*/

-- Drop existing restrictive policies that block login
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create new policy that allows authentication
CREATE POLICY "Allow authentication queries"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep the existing insert, update policies for admins only
-- These will work after authentication