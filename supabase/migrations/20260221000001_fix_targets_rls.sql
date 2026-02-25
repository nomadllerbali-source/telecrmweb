-- Create targets table if it doesn't exist and setup RLS

-- 1. Create table if missing
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  month text NOT NULL, -- e.g., 'January'
  year integer NOT NULL, -- e.g., 2026
  target_leads integer DEFAULT 0,
  target_conversions integer DEFAULT 0,
  target_revenue decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- 2. Enable RLS
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies
DROP POLICY IF EXISTS "Admins can manage targets" ON targets;
DROP POLICY IF EXISTS "Sales can view own targets" ON targets;

-- 4. Create new policies using get_current_user_role() and get_current_user_id()
-- Include 'anon' role as it's used by the custom auth flow

-- Admins can do everything
CREATE POLICY "Admins can manage targets"
  ON targets FOR ALL
  TO anon, authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Sales persons can view their own targets
CREATE POLICY "Sales can view own targets"
  ON targets FOR SELECT
  TO anon, authenticated
  USING (
    user_id = get_current_user_id()
    OR get_current_user_role() = 'admin'
  );
