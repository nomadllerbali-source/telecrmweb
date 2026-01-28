# Nomadller Solutions - Travel Management System

A comprehensive mobile CRM application built with React Native and Expo for managing travel company leads, sales teams, and customer interactions.

## Features

### Admin Panel
- **Login** - Secure authentication for administrators
- **Assign New Lead** - Assign leads to sales persons with lead type (normal/urgent/hot), client details, destination, travel dates, and budget
- **Add Sales Person** - Create and manage sales team members, suspend/activate accounts, view performance metrics
- **Saved Itinerary** - Create and manage tour packages with detailed itineraries, inclusions, exclusions, and pricing
- **Analysis Dashboard** - View team performance with metrics like total calls, conversions, and lead statistics
- **Export Data** - Download lead sheets and confirmation sheets as CSV files

### Sales Panel
- **Login** - Secure authentication for sales persons
- **Allocated Leads** - View assigned leads with call and WhatsApp buttons
- **Smart Itinerary Selector** - Select and send itineraries directly via WhatsApp with professional message templates
- **Follow-ups** - Manage scheduled follow-ups with date/time reminders and filter by today's tasks
- **Hot Leads** - Quick access to high-priority leads
- **Confirmed Leads** - View confirmed bookings with option to allocate to operations
- **Allocated to Operations** - Track leads handed over to operations team
- **Lead Actions** - Make calls, update lead status, schedule follow-ups, and confirm bookings
- **Lead Detail View** - Complete client information including all follow-up history and financial details
- **Chat** - Real-time messaging with admin and other team members

## Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL database, real-time subscriptions)
- **Authentication**: Custom authentication with role-based access control
- **Navigation**: Expo Router (file-based routing)
- **Icons**: Lucide React Native

## Database Schema

The app uses the following main tables:
- `users` - Admin and sales person accounts
- `leads` - Customer leads with status tracking
- `follow_ups` - Scheduled follow-up tasks with reminders
- `confirmations` - Confirmed bookings with payment details
- `itineraries` - Tour packages with detailed information, pricing, and inclusions
- `call_logs` - Call history and duration tracking
- `chat_messages` - Real-time messaging between users
- `notifications` - Real-time notification system with customizable preferences
- `reminders` - Travel date reminders with calendar integration

## Default Login Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

⚠️ Please change the default password after first login for security.

## Getting Started

1. The app is already configured with Supabase database
2. Run the development server (automatically started)
3. Login with the admin credentials above
4. Create sales persons from the admin panel
5. Start assigning leads and managing your travel business

## Key Workflows

### Admin Workflow
1. Login to admin panel
2. Create sales team members
3. Assign leads to sales persons with priority levels
4. Monitor team performance through analytics
5. Export data for reporting

### Sales Workflow
1. Login to sales panel
2. View allocated leads in dashboard
3. Call or WhatsApp clients directly from the app
4. Update lead status after each interaction
5. Schedule follow-ups with reminders
6. Confirm bookings with payment details
7. Allocate confirmed leads to operations
8. Chat with admin for support

## Features in Detail

### Lead Management
- Three priority levels: Normal, Urgent, Hot
- Track client details, destination, passenger count, budget
- Flexible date entry (exact date or month)
- Custom remarks for each lead
- Status tracking through entire sales pipeline

### Call Tracking
- Automatic call logging with duration
- View call history for each sales person
- Track last call and current call details

### Itinerary Management
- Create and save detailed tour packages
- Automatic destination-based filtering
- One-click WhatsApp sending with professional templates
- Pricing in both USD and INR
- Include full itinerary details, inclusions, and exclusions
- Track itinerary sends in follow-up history

### Follow-up System
- Schedule follow-ups with date and time
- App notifications for upcoming follow-ups
- Today's follow-ups quick filter
- Multiple follow-up types: itinerary created/updated, follow-up, advance paid

### Confirmation Process
- Record total amount and advance payment
- Track transaction ID and itinerary ID
- Confirm travel date
- Add booking remarks

### Real-time Chat
- Direct messaging between admin and sales team
- Message read status
- Real-time updates using Supabase subscriptions

### Export & Reporting
- Export all leads as CSV
- Export confirmations as CSV
- Share files directly from the app

## App Structure

```
app/
├── admin/              # Admin panel screens
│   ├── index.tsx       # Dashboard
│   ├── assign-lead.tsx
│   ├── add-sales-person.tsx
│   ├── analysis.tsx
│   ├── export.tsx
│   └── sales-person-details.tsx
├── sales/              # Sales panel screens
│   ├── index.tsx       # Dashboard
│   ├── allocated-leads.tsx
│   ├── follow-ups.tsx
│   ├── hot-leads.tsx
│   ├── confirmed-leads.tsx
│   ├── operations.tsx
│   ├── lead-action.tsx
│   ├── confirm-lead.tsx
│   └── chat.tsx
└── index.tsx           # Login screen
```

## Security Features

- Password hashing with SHA-256
- Role-based access control (Admin/Sales)
- Row Level Security (RLS) policies in database
- Session management with AsyncStorage
- Account suspension capability

## Support

For any issues or feature requests, please contact the administrator or check the application logs.
