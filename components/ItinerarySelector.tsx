import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Send } from 'lucide-react-native';
import * as Linking from 'expo-linking';

interface Itinerary {
  id: string;
  name: string;
  days: number;
  cost_usd: number;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItineraries();
  }, [destination]);

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
        .select('id, name, days, cost_usd, no_of_pax')
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

    const exchangeRate = 83;
    const inrAmount = Math.round(itinerary.cost_usd * exchangeRate);

    const message = `Hi ${clientName},

Here's the amazing itinerary for your trip:

*${itinerary.name}*
Duration: ${itinerary.days} Days
Pax: ${itinerary.no_of_pax} persons

Cost:
USD $${itinerary.cost_usd.toFixed(2)}
INR ₹${inrAmount}

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
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.pickerButtonText}>Loading itineraries...</Text>
        </View>
      ) : availableItineraries.length > 0 ? (
        <>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPicker(!showPicker)}
          >
            <Text style={[styles.pickerButtonText, !selectedItinerary && styles.placeholderText]}>
              {selectedItinerary ? selectedItinerary.name : 'Select an itinerary'}
            </Text>
            <ChevronDown size={20} color="#666" />
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
            >
              <Send size={18} color="#fff" />
              <Text style={styles.sendButtonText}>Send Itinerary via WhatsApp</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <Text style={styles.noItinerariesText}>No itineraries found for this destination</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  loadingPicker: {
    justifyContent: 'center',
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  itineraryOptionContent: {
    flex: 1,
  },
  itinerarySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  noItinerariesText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
