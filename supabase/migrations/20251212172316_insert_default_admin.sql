/*
  # Insert Default Admin User

  1. Data Insertion
    - Creates a default admin user for initial system access
    - Username: admin
    - Password: admin123
    - Email: admin@telecrm.com
    - Full Name: System Administrator

  2. Security Notes
    - Password is hashed using SHA-256
    - User should change credentials after first login
    - This is a one-time setup for initial access
*/

-- Insert default admin user
-- Password hash for 'admin123'
INSERT INTO users (email, username, password_hash, full_name, role, status)
VALUES (
  'admin@telecrm.com',
  'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'System Administrator',
  'admin',
  'active'
)
ON CONFLICT (username) DO NOTHING;