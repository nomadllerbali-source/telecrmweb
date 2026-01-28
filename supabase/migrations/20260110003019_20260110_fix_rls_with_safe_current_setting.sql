/*
  # Fix RLS policies to safely handle missing current_setting

  1. Security Changes
    - Create get_current_user_id() function that safely reads settings
    - Create get_current_user_role() function that safely reads role settings
    - Update all RLS policies to use these safe functions
    - Use true parameter in current_setting to return NULL instead of error

  2. Important Notes
    - Uses current_setting(..., true) to prevent errors if setting doesn't exist
    - Safe functions return NULL if setting isn't set (no error)
    - Policies fall back to denying access if user context not set
*/

DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;

CREATE FUNCTION get_current_user_id() RETURNS uuid AS $$
  SELECT 
    CASE 
      WHEN current_setting('app.current_user_id', true) IS NULL THEN NULL::uuid
      ELSE (current_setting('app.current_user_id', true))::uuid
    END;
$$ LANGUAGE SQL STABLE;

CREATE FUNCTION get_current_user_role() RETURNS text AS $$
  SELECT current_setting('app.current_user_role', true);
$$ LANGUAGE SQL STABLE;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (
    user_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

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
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (
    user_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (
    user_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

CREATE POLICY "Users can view own reminders"
  ON reminders
  FOR SELECT
  USING (
    sales_person_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can insert own reminders"
  ON reminders
  FOR INSERT
  WITH CHECK (
    sales_person_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can update own reminders"
  ON reminders
  FOR UPDATE
  USING (
    sales_person_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  )
  WITH CHECK (
    sales_person_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  USING (
    sales_person_id = get_current_user_id() 
    OR get_current_user_role() = 'admin'
  );
