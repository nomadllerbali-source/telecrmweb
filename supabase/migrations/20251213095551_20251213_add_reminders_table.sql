/*
  # Create reminders table for travel date notifications

  1. New Tables
    - `reminders`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `sales_person_id` (uuid, foreign key to users)
      - `travel_date` (date, actual travel date)
      - `reminder_date` (date, calculated as 7 days before travel)
      - `reminder_time` (time, time to send reminder)
      - `calendar_event_id` (text, device calendar event ID)
      - `status` (pending, triggered, cancelled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `reminders` table
    - Add policy for users to view their own reminders
    - Add policy for users to create reminders for their assigned leads
    - Add policy for users to update their own reminders

  3. Indexes
    - Index on sales_person_id for efficient querying
    - Index on reminder_date for scheduled reminders
*/

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sales_person_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  reminder_date date NOT NULL,
  reminder_time time NOT NULL DEFAULT '09:00:00',
  calendar_event_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales persons can view their own reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sales_person_id);

CREATE POLICY "Sales persons can create reminders for their leads"
  ON reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sales_person_id);

CREATE POLICY "Sales persons can update their own reminders"
  ON reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sales_person_id)
  WITH CHECK (auth.uid() = sales_person_id);

CREATE POLICY "Sales persons can delete their own reminders"
  ON reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sales_person_id);

CREATE INDEX IF NOT EXISTS reminders_sales_person_id_idx ON reminders(sales_person_id);
CREATE INDEX IF NOT EXISTS reminders_reminder_date_idx ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS reminders_status_idx ON reminders(status);
