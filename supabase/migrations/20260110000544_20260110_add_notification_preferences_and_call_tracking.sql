/*
  # Add notification preferences and enhance call tracking

  1. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `notifications_enabled` (boolean, default: true)
      - `sound_enabled` (boolean, default: true)
      - `vibration_enabled` (boolean, default: true)
      - `do_not_disturb_enabled` (boolean, default: false)
      - `do_not_disturb_start` (time, e.g., "22:00")
      - `do_not_disturb_end` (time, e.g., "08:00")
      - `notification_type_filter` (text: 'all', 'hot_only', 'starred_only')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `notifications`: Add `lead_type` field to track notification type
    - `call_logs`: Add `outcome` field to track call success status

  3. Security
    - Enable RLS on `notification_preferences` table
    - Add policy for users to read/update their own preferences
    - Only admins can view all preferences

  4. Important Notes
    - Each user gets default preferences on first access
    - Do Not Disturb uses 24-hour format (00:00 to 23:59)
    - Filter options: 'all' (all leads), 'hot_only' (hot leads only), 'starred_only' (starred leads only)
*/

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  do_not_disturb_enabled boolean DEFAULT false,
  do_not_disturb_start time DEFAULT '22:00',
  do_not_disturb_end time DEFAULT '08:00',
  notification_type_filter text DEFAULT 'all' CHECK (notification_type_filter IN ('all', 'hot_only', 'starred_only')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id'))::uuid)
  WITH CHECK (user_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Admins can view all notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx ON notification_preferences(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'lead_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN lead_type text DEFAULT 'normal' CHECK (lead_type IN ('normal', 'urgent', 'hot'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'outcome'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN outcome text DEFAULT 'completed' CHECK (outcome IN ('completed', 'missed', 'ended_early', 'pending'));
  END IF;
END $$;
