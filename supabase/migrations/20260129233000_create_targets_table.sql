-- Create targets table
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

-- Enable RLS
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage targets"
  ON targets FOR ALL
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin')
  WITH CHECK ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Sales can view own targets"
  ON targets FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id'))::uuid);
