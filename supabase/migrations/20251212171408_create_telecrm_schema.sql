/*
  # TeleCRM Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique user identifier
      - `email` (text, unique) - User email for login
      - `username` (text, unique) - Username for login
      - `password_hash` (text) - Hashed password
      - `full_name` (text) - Full name of user
      - `role` (text) - User role (admin or sales)
      - `phone` (text) - Phone number
      - `status` (text) - active or suspended
      - `created_at` (timestamptz) - Account creation timestamp
      - `last_login` (timestamptz) - Last login time
      
    - `leads`
      - `id` (uuid, primary key) - Unique lead identifier
      - `lead_type` (text) - normal, urgent, or hot
      - `client_name` (text) - Name of the client
      - `no_of_pax` (integer) - Number of passengers
      - `place` (text) - Destination
      - `travel_date` (date, nullable) - Exact travel date
      - `travel_month` (text, nullable) - Travel month if exact date unknown
      - `expected_budget` (decimal) - Expected budget
      - `remark` (text) - Additional remarks
      - `assigned_to` (uuid, foreign key) - Sales person assigned
      - `assigned_by` (uuid, foreign key) - Admin who assigned
      - `status` (text) - allocated, follow_up, hot, confirmed, allocated_to_operations, dead
      - `created_at` (timestamptz) - Lead creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
    - `follow_ups`
      - `id` (uuid, primary key) - Unique follow-up identifier
      - `lead_id` (uuid, foreign key) - Associated lead
      - `sales_person_id` (uuid, foreign key) - Sales person handling
      - `follow_up_date` (timestamptz) - Scheduled follow-up date and time
      - `status` (text) - pending, completed, cancelled
      - `update_type` (text) - itinerary_created, itinerary_updated, follow_up, advance_paid_confirmed, dead
      - `remark` (text) - Follow-up remarks
      - `created_at` (timestamptz) - Follow-up creation timestamp
      
    - `confirmations`
      - `id` (uuid, primary key) - Unique confirmation identifier
      - `lead_id` (uuid, foreign key) - Associated lead
      - `total_amount` (decimal) - Total booking amount
      - `advance_amount` (decimal) - Advance payment received
      - `transaction_id` (text) - Payment transaction ID
      - `itinerary_id` (text) - Itinerary reference ID
      - `travel_date` (date) - Confirmed travel date
      - `remark` (text) - Confirmation remarks
      - `confirmed_by` (uuid, foreign key) - Sales person who confirmed
      - `created_at` (timestamptz) - Confirmation timestamp
      
    - `call_logs`
      - `id` (uuid, primary key) - Unique call log identifier
      - `lead_id` (uuid, foreign key) - Associated lead
      - `sales_person_id` (uuid, foreign key) - Sales person who called
      - `call_start_time` (timestamptz) - Call start timestamp
      - `call_end_time` (timestamptz, nullable) - Call end timestamp
      - `call_duration` (integer) - Duration in seconds
      - `created_at` (timestamptz) - Log creation timestamp
      
    - `chat_messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `sender_id` (uuid, foreign key) - User who sent message
      - `receiver_id` (uuid, foreign key) - User who receives message
      - `message` (text) - Message content
      - `is_read` (boolean) - Read status
      - `created_at` (timestamptz) - Message timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Admins can access all data
    - Sales persons can only access their assigned data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'sales')),
  phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type text NOT NULL CHECK (lead_type IN ('normal', 'urgent', 'hot')),
  client_name text NOT NULL,
  no_of_pax integer NOT NULL,
  place text NOT NULL,
  travel_date date,
  travel_month text,
  expected_budget decimal(10,2) NOT NULL,
  remark text,
  assigned_to uuid REFERENCES users(id),
  assigned_by uuid REFERENCES users(id),
  status text DEFAULT 'allocated' CHECK (status IN ('allocated', 'follow_up', 'hot', 'confirmed', 'allocated_to_operations', 'dead')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  sales_person_id uuid REFERENCES users(id),
  follow_up_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  update_type text CHECK (update_type IN ('itinerary_created', 'itinerary_updated', 'follow_up', 'advance_paid_confirmed', 'dead')),
  remark text,
  created_at timestamptz DEFAULT now()
);

-- Create confirmations table
CREATE TABLE IF NOT EXISTS confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  total_amount decimal(10,2) NOT NULL,
  advance_amount decimal(10,2) NOT NULL,
  transaction_id text NOT NULL,
  itinerary_id text NOT NULL,
  travel_date date NOT NULL,
  remark text,
  confirmed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  sales_person_id uuid REFERENCES users(id),
  call_start_time timestamptz NOT NULL,
  call_end_time timestamptz,
  call_duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id),
  receiver_id uuid REFERENCES users(id),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin')
  WITH CHECK ((current_setting('app.current_user_role')) = 'admin');

-- RLS Policies for leads table
CREATE POLICY "Admins can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Sales persons can view assigned leads"
  ON leads FOR SELECT
  TO authenticated
  USING (assigned_to = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Admins can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin')
  WITH CHECK ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Sales persons can update assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (assigned_to = (current_setting('app.current_user_id'))::uuid)
  WITH CHECK (assigned_to = (current_setting('app.current_user_id'))::uuid);

-- RLS Policies for follow_ups table
CREATE POLICY "Admins can view all follow-ups"
  ON follow_ups FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Sales persons can view own follow-ups"
  ON follow_ups FOR SELECT
  TO authenticated
  USING (sales_person_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Sales persons can insert own follow-ups"
  ON follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (sales_person_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Sales persons can update own follow-ups"
  ON follow_ups FOR UPDATE
  TO authenticated
  USING (sales_person_id = (current_setting('app.current_user_id'))::uuid)
  WITH CHECK (sales_person_id = (current_setting('app.current_user_id'))::uuid);

-- RLS Policies for confirmations table
CREATE POLICY "Admins can view all confirmations"
  ON confirmations FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Sales persons can view own confirmations"
  ON confirmations FOR SELECT
  TO authenticated
  USING (confirmed_by = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Sales persons can insert confirmations"
  ON confirmations FOR INSERT
  TO authenticated
  WITH CHECK (confirmed_by = (current_setting('app.current_user_id'))::uuid);

-- RLS Policies for call_logs table
CREATE POLICY "Admins can view all call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING ((current_setting('app.current_user_role')) = 'admin');

CREATE POLICY "Sales persons can view own call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (sales_person_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Sales persons can insert call logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (sales_person_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Sales persons can update own call logs"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (sales_person_id = (current_setting('app.current_user_id'))::uuid)
  WITH CHECK (sales_person_id = (current_setting('app.current_user_id'))::uuid);

-- RLS Policies for chat_messages table
CREATE POLICY "Users can view messages they sent"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (sender_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Users can view messages they received"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (receiver_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (current_setting('app.current_user_id'))::uuid);

CREATE POLICY "Users can update messages they received"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (receiver_id = (current_setting('app.current_user_id'))::uuid)
  WITH CHECK (receiver_id = (current_setting('app.current_user_id'))::uuid);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_sales_person ON follow_ups(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_call_logs_sales_person ON call_logs(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);