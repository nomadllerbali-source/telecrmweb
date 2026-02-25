-- Add last_assigned_at to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz;

-- Add index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_users_last_assigned_at ON users(last_assigned_at);
