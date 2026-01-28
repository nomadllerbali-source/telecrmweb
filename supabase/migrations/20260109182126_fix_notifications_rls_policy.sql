/*
  # Fix notifications RLS policy to allow sales persons to create notifications
  
  1. Changes
    - Drop the existing restrictive "Admins can create notifications" policy
    - Create a new policy that allows both admins and sales persons to create notifications
    
  2. Security
    - Authenticated users with role 'admin' or 'sales_person' can create notifications
    - Users can still only view their own notifications
    - Users can only update their own notifications (e.g., mark as read)
*/

DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

CREATE POLICY "Users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'sales_person')
    )
  );
