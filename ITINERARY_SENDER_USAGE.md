# Itinerary Selector with WhatsApp Send - Usage Guide

## Overview
The updated ItinerarySelector component now includes automatic WhatsApp sending functionality, making it easy to send itinerary details directly to clients.

## Features
1. **Smart Itinerary Selection** - Automatically fetches itineraries matching the destination
2. **Send via WhatsApp** - One-click sending to client's WhatsApp
3. **Professional Message Template** - Automatically formatted with pricing in USD and INR
4. **Branded Messages** - All messages are branded as "Nomadller Solutions"

## How to Use

### Basic Usage (Selection Only)
```tsx
import ItinerarySelector from '@/components/ItinerarySelector';

<ItinerarySelector
  destination={lead.place}
  selectedItinerary={selectedItinerary}
  onSelect={setSelectedItinerary}
/>
```

### With WhatsApp Send Button
```tsx
<ItinerarySelector
  destination={lead.place}
  selectedItinerary={selectedItinerary}
  onSelect={setSelectedItinerary}
  contactNumber={lead.contact_number}
  clientName={lead.client_name}
  showSendButton={true}
/>
```

### With Custom Send Handler
```tsx
<ItinerarySelector
  destination={lead.place}
  selectedItinerary={selectedItinerary}
  onSelect={setSelectedItinerary}
  contactNumber={lead.contact_number}
  clientName={lead.client_name}
  showSendButton={true}
  onSendItinerary={(itinerary) => {
    // Custom handling logic
    console.log('Sending itinerary:', itinerary.name);
  }}
/>
```

## Message Template
When a client receives the itinerary, they will see:

```
Hi [Client Name],

Here's the amazing itinerary for your trip:

*[Itinerary Name]*
Duration: [X] Days
Pax: [X] persons

Cost:
USD $[XXX.XX]
INR ₹[XXXXX]

Would love to help you plan this amazing journey!

Best regards,
Nomadller Solutions Team
```

## Integration Points

### In Lead Update Forms
Add the selector in your lead update modal:
```tsx
{['itinerary_sent', 'itinerary_updated'].includes(actionType) && (
  <ItinerarySelector
    destination={currentLead.place}
    selectedItinerary={selectedItinerary}
    onSelect={setSelectedItinerary}
    contactNumber={currentLead.contact_number}
    clientName={currentLead.client_name}
    showSendButton={true}
  />
)}
```

### Manual Send Toggle
You can also add a manual send option after updating the lead profile by using a toggle state:
```tsx
const [manualSendEnabled, setManualSendEnabled] = useState(false);

// In your form
<TouchableOpacity
  onPress={() => setManualSendEnabled(!manualSendEnabled)}
  style={styles.toggleButton}
>
  <Text>Send Itinerary Manually</Text>
</TouchableOpacity>

{manualSendEnabled && (
  <ItinerarySelector
    destination={lead.place}
    selectedItinerary={selectedItinerary}
    onSelect={setSelectedItinerary}
    contactNumber={lead.contact_number}
    clientName={lead.client_name}
    showSendButton={true}
  />
)}
```

## Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `destination` | string | Yes | Lead's destination (used to filter itineraries) |
| `selectedItinerary` | Itinerary \| null | Yes | Currently selected itinerary |
| `onSelect` | (itinerary: Itinerary \| null) => void | Yes | Callback when itinerary is selected |
| `contactNumber` | string \| null | No | Client's WhatsApp number |
| `clientName` | string | No | Client's name for personalization |
| `showSendButton` | boolean | No | Show the WhatsApp send button (default: false) |
| `onSendItinerary` | (itinerary: Itinerary) => void | No | Custom send handler |

## Notes
- The component automatically converts USD to INR using an 83x exchange rate
- WhatsApp messages are URL-encoded to handle special characters
- If WhatsApp is not installed, the send will fail gracefully
- The send button only appears when an itinerary is selected AND a contact number is provided
