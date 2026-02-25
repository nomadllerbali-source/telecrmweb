-- Add call_count column to leads table and no_response status
-- Migration: 20260131_add_call_tracking_and_no_response_status

-- Add call_count column to track number of calls made to this lead
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_call_count ON leads(call_count);
CREATE INDEX IF NOT EXISTS idx_leads_no_response ON leads(status) WHERE status = 'no_response';

-- Add comment for documentation
COMMENT ON COLUMN leads.call_count IS 'Number of calls made to this lead, auto-incremented from call_logs';
