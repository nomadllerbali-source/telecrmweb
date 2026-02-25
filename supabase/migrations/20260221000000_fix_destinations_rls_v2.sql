-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read active destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can read all destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can update destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated users can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can update destinations" ON destinations;
DROP POLICY IF EXISTS "Admins can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Custom auth users can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Custom auth users can update destinations" ON destinations;
DROP POLICY IF EXISTS "Custom auth users can insert destinations" ON destinations;

-- 1. Anyone can read active destinations, while admins can read all
CREATE POLICY "Anyone can read active destinations"
  ON destinations FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR get_current_user_role() = 'admin');

-- 2. Admins can insert destinations
CREATE POLICY "Admins can insert destinations"
  ON destinations FOR INSERT
  TO anon, authenticated
  WITH CHECK (get_current_user_role() = 'admin');

-- 3. Admins can update destinations
CREATE POLICY "Admins can update destinations"
  ON destinations FOR UPDATE
  TO anon, authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 4. Admins can delete destinations
CREATE POLICY "Admins can delete destinations"
  ON destinations FOR DELETE
  TO anon, authenticated
  USING (get_current_user_role() = 'admin');
