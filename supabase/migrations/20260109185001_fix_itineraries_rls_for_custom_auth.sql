/*
  # Fix Itineraries RLS for Custom Authentication
  
  1. Changes
    - Drop existing restrictive RLS policies on itineraries table
    - Create permissive policies that work with custom authentication
    - This matches the pattern used by other tables in the system
    
  2. Security Notes
    - This app uses custom authentication, not Supabase Auth
    - auth.uid() doesn't work with custom auth
    - Application logic controls access, not database RLS
    - This is consistent with other tables (leads, follow_ups, notifications, etc.)
*/

-- Drop all existing policies on itineraries
DROP POLICY IF EXISTS "Authenticated users can view itineraries" ON itineraries;
DROP POLICY IF EXISTS "Admins and sales persons can create itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can update own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Admins can delete itineraries" ON itineraries;

-- Create permissive policies that work with custom auth
CREATE POLICY "Allow all access to itineraries"
  ON itineraries FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
