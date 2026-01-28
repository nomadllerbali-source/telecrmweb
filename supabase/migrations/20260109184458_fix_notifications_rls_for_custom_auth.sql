/*
  # Fix Notifications RLS for Custom Authentication
  
  1. Changes
    - Drop existing restrictive RLS policies on notifications table
    - Create permissive policies that work with custom authentication
    - This matches the pattern used by other tables in the system
    
  2. Security Notes
    - This app uses custom authentication, not Supabase Auth
    - auth.uid() doesn't work with custom auth
    - Application logic controls access, not database RLS
    - This is consistent with other tables (leads, follow_ups, etc.)
*/

-- Drop all existing policies on notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Create permissive policies that work with custom auth
CREATE POLICY "Allow all access to notifications"
  ON notifications FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
