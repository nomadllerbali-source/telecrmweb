/*
  # Fix notification preferences RLS policies

  1. Security
    - Replace app.current_user_id with auth.uid() for proper authentication
    - Users can read their own preferences
    - Users can insert their own preferences
    - Users can update their own preferences
    - Admins can read all preferences

  2. Important Notes
    - Uses auth.uid() instead of app.current_user_id() for consistency
    - Proper authentication context awareness
*/

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Admins can view all notification preferences" ON notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
