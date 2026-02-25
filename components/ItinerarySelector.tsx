import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Send } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { Colors, Layout } from '@/constants/Colors';

interface Itinerary {
  id: string;
  name: string;
  days: number;
  cost_usd: number;
  cost_inr?: number;
  no_of_pax: number;
}

interface ItinerarySelectorProps {
  destination: string;
  selectedItinerary: Itinerary | null;
  onSelect: (itinerary: Itinerary | null) => void;
  contactNumber?: string | null;
  clientName?: string;
  onSendItinerary?: (itinerary: Itinerary) => void;
  showSendButton?: boolean;
}

export default function ItinerarySelector({
  destination,
  selectedItinerary,
  onSelect,
  contactNumber,
  clientName,
  onSendItinerary,
  showSendButton = false
}: ItinerarySelectorProps) {
  const [availableItineraries, setAvailableItineraries] = useState<Itinerary[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExchangeRate();
    fetchItineraries();
  }, [destination]);

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (data.rates && data.rates.INR) {
        setExchangeRate(data.rates.INR);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const fetchItineraries = async () => {
    if (!destination.trim()) {
      setAvailableItineraries([]);
      onSelect(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('id, name, days, cost_usd, cost_inr, no_of_pax')
        .ilike('name', `%${destination}%`);

      if (error) throw error;
      setAvailableItineraries(data || []);

      if (data && data.length === 1) {
        onSelect(data[0]);
      } else if (data && data.length === 0) {
        onSelect(null);
      }
    } catch (err: any) {
      console.error('Error fetching itineraries:', err);
      setAvailableItineraries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendItinerary = async (itinerary: Itinerary) => {
    if (!contactNumber || !clientName) return;

    const costINR = itinerary.cost_inr || Math.round(itinerary.cost_usd * (exchangeRate + 2));

    const message = `Hi ${clientName},

Here's the amazing itinerary for your trip:

*${itinerary.name}*
Duration: ${itinerary.days} Days
Pax: ${itinerary.no_of_pax} persons

Cost:
USD $${itinerary.cost_usd.toFixed(2)}
INR ₹${costINR}

Would love to help you plan this amazing journey!

Best regards,
Nomadller Solutions Team`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodedMessage}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
    }
  };

  if (!destination.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Itinerary</Text>
      {loading ? (
        <View style={[styles.pickerButton, styles.loadingPicker]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.pickerButtonText}>Searching itineraries...</Text>
        </View>
      ) : availableItineraries.length > 0 ? (
        <>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPicker(!showPicker)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pickerButtonText, !selectedItinerary && styles.placeholderText]}>
              {selectedItinerary ? selectedItinerary.name : 'Select an itinerary'}
            </Text>
            <ChevronDown size={20} color={Colors.text.tertiary} />
          </TouchableOpacity>
          {showPicker && (
            <View style={styles.pickerOptions}>
              {availableItineraries.map((itinerary) => (
                <TouchableOpacity
                  key={itinerary.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    onSelect(itinerary);
                    setShowPicker(false);
                  }}
                >
                  <View style={styles.itineraryOptionContent}>
                    <Text style={styles.pickerOptionText}>{itinerary.name}</Text>
                    <Text style={styles.itinerarySubtext}>
                      {itinerary.days} days • USD ${itinerary.cost_usd} • {itinerary.no_of_pax} pax
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {showSendButton && selectedItinerary && contactNumber && (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => onSendItinerary ? onSendItinerary(selectedItinerary) : handleSendItinerary(selectedItinerary)}
              activeOpacity={0.8}
            >
              <Send size={18} color={Colors.background} />
              <Text style={styles.sendButtonText}>Send via WhatsApp</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.noItinerariesBox}>
          <Text style={styles.noItinerariesText}>No itineraries found for this destination</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background,
  },
  pickerButtonText: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  loadingPicker: {
    justifyContent: 'center',
    gap: 10,
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  itineraryOptionContent: {
    flex: 1,
  },
  itinerarySubtext: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },
  noItinerariesBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  noItinerariesText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.xl,
    marginTop: 12,
    gap: 10,
    ...Layout.shadows.md,
  },
  sendButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
