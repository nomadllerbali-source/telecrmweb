/*
  # Add Contact Information to Leads

  1. Changes
    - Add country_code column to leads table
    - Add contact_number column to leads table
    
  2. Notes
    - Country codes for India, Qatar, Dubai (UAE), Saudi Arabia, Bahrain, Australia, Nepal, America
*/

-- Add contact fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_number text;