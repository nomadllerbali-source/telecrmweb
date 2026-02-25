-- Fix RLS for targets table
DROP POLICY IF EXISTS "Admins can manage targets" ON targets;
DROP POLICY IF EXISTS "Sales can view own targets" ON targets;

CREATE POLICY "Admins can manage targets"
  ON targets FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Sales can view own targets"
  ON targets FOR SELECT
  TO authenticated
  USING (user_id = get_current_user_id());

-- Fix RLS for feedback table
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;

CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (get_current_user_role() = 'admin');
