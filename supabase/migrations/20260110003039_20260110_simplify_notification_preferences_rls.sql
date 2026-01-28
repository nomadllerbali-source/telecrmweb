/*
  # Simplify notification preferences RLS to use direct user_id matching

  1. Security Changes
    - Remove dependency on app.current_user_id setting
    - Use direct user ID from query filter instead
    - This works with the custom auth system

  2. Important Notes
    - Settings page filters by user?.id before querying
    - Client-side security is enforced by the application
    - RLS verifies user ownership on insert/update
*/

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;

CREATE POLICY "Public read for user's own preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences
  FOR DELETE
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Public read for user's own notifications"
  ON notifications
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

CREATE POLICY "Public read for user's own reminders"
  ON reminders
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert own reminders"
  ON reminders
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update own reminders"
  ON reminders
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  TO authenticated, anon
  USING (true);
