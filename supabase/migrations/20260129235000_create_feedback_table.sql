-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  confirmation_id uuid REFERENCES confirmations(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(confirmation_id)
);

-- Add feedback_requested_at to confirmations
ALTER TABLE confirmations ADD COLUMN IF NOT EXISTS feedback_requested_at timestamptz;

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Anyone can insert feedback" -- Simulated public access
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);
