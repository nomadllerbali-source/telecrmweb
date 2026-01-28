export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'admin' | 'sales';
  phone: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  last_login: string | null;
}

export interface Lead {
  id: string;
  lead_type: 'normal' | 'urgent' | 'hot';
  client_name: string;
  contact_number: string | null;
  no_of_pax: number;
  place: string;
  destination_id: string | null;
  travel_date: string | null;
  travel_month: string | null;
  expected_budget: number;
  remark: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  status: 'allocated' | 'follow_up' | 'hot' | 'confirmed' | 'allocated_to_operations' | 'dead';
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  sales_person_id: string;
  follow_up_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  update_type: 'itinerary_created' | 'itinerary_updated' | 'follow_up' | 'advance_paid_confirmed' | 'almost_confirmed' | 'dead' | null;
  remark: string | null;
  created_at: string;
}

export interface Confirmation {
  id: string;
  lead_id: string;
  total_amount: number;
  advance_amount: number;
  transaction_id: string;
  itinerary_id: string;
  travel_date: string;
  remark: string | null;
  confirmed_by: string;
  created_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  sales_person_id: string;
  call_start_time: string;
  call_end_time: string | null;
  call_duration: number;
  outcome?: 'completed' | 'missed' | 'ended_early' | 'pending';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  lead_id: string;
  sales_person_id: string;
  travel_date: string;
  reminder_date: string;
  reminder_time: string;
  calendar_event_id: string | null;
  status: 'pending' | 'triggered' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  lead_id: string | null;
  lead_type?: 'normal' | 'urgent' | 'hot';
  is_read: boolean;
  created_at: string;
}

export interface Itinerary {
  id: string;
  name: string;
  days: number;
  no_of_pax: number;
  full_itinerary: string;
  inclusions: string;
  exclusions: string;
  cost_usd: number;
  cost_inr: number;
  destination_id: string | null;
  mode_of_transport: 'driver_with_cab' | 'self_drive_cab' | 'self_drive_scooter';
  important_notes: string;
  disclaimers: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Destination {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  do_not_disturb_enabled: boolean;
  do_not_disturb_start: string;
  do_not_disturb_end: string;
  notification_type_filter: 'all' | 'hot_only' | 'starred_only';
  created_at: string;
  updated_at: string;
}

export interface LeadWithSalesPerson extends Lead {
  sales_person?: User;
}
