/*
  # Add Support for Sales-Created Leads

  1. Changes
    - Add 'added_by_sales' to lead status enum
    - Add 'created_by' column to leads table to track who created the lead
    - Update RLS policies to allow sales persons to insert their own leads
    
  2. Security
    - Sales persons can only insert leads where they are both creator and assignee
    - Maintain existing policies for viewing and updating
*/

-- Add created_by column to track who created the lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

-- Drop existing check constraint on status
DO $$ 
BEGIN
  ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new check constraint with added_by_sales status
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('allocated', 'follow_up', 'hot', 'confirmed', 'allocated_to_operations', 'dead', 'added_by_sales'));

-- Add RLS policy for sales persons to insert their own leads
CREATE POLICY "Sales persons can insert own leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (current_setting('app.current_user_id'))::uuid 
    AND assigned_to = (current_setting('app.current_user_id'))::uuid
    AND (current_setting('app.current_user_role')) = 'sales'
  );

-- Create index for better performance on created_by queries
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);