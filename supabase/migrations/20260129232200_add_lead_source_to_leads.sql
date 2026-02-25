-- Add lead_source column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source text;

-- Add index for lead_source
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source);
