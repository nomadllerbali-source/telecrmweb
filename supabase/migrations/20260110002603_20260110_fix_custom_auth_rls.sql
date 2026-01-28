/*
  # Fix RLS policies to work with custom authentication

  1. Security Changes
    - Create get_current_user_id() function to retrieve user context
    - Update notification_preferences RLS to use the context function
    - Update notifications RLS to use the context function
    - Update reminders RLS to use the context function
    - Ensure all queries respect user isolation

  2. Important Notes
    - Uses current_setting('app.current_user_id') to get user context
    - Policies now properly check user ownership for all operations
    - Admin access still available through app role checking
*/

CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS uuid AS $$
  SELECT (current_setting('app.current_user_id'))::uuid;
$$ LANGUAGE SQL STABLE;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (user_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (user_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

CREATE POLICY "Users can view own reminders"
  ON reminders
  FOR SELECT
  USING (sales_person_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Users can insert own reminders"
  ON reminders
  FOR INSERT
  WITH CHECK (sales_person_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Users can update own reminders"
  ON reminders
  FOR UPDATE
  USING (sales_person_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin')
  WITH CHECK (sales_person_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  USING (sales_person_id = get_current_user_id() OR (current_setting('app.current_user_role')) = 'admin');
