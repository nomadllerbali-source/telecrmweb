import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Itinerary } from '@/types';
import { Send, MessageCircle, ExternalLink, Search } from 'lucide-react-native';

interface ItinerarySenderProps {
  leadId: string;
  guestName: string;
  contactNumber: string | null;
  onSent?: () => void;
}

export default function ItinerarySender({
  leadId,
  guestName,
  contactNumber,
  onSent,
}: ItinerarySenderProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'manual' | null>(null);
  const [manualMessage, setManualMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    fetchItineraries();
  }, []);

  useEffect(() => {
    filterItineraries();
  }, [searchText, itineraries]);

  const fetchItineraries = async () => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItineraries(data || []);
      setFilteredItineraries(data || []);
    } catch (err: any) {
      console.error('Error fetching itineraries:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterItineraries = () => {
    if (!searchText.trim()) {
      setFilteredItineraries(itineraries);
      return;
    }

    const search = searchText.toLowerCase();
    setFilteredItineraries(
      itineraries.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.full_itinerary?.toLowerCase().includes(search)
      )
    );
  };

  const generateWhatsAppMessage = (itinerary: Itinerary) => {
    const exchangeRate = 83;
    const inrAmount = Math.round(itinerary.cost_usd * exchangeRate);

    return `Hi ${guestName},

Here's the amazing itinerary for your trip:

*${itinerary.name}*
Duration: ${itinerary.days} Days

Cost:
USD $${itinerary.cost_usd.toFixed(2)}
INR ₹${inrAmount}

*Itinerary Overview:*
${itinerary.full_itinerary || 'Please contact us for detailed itinerary'}

*What's Included:*
${itinerary.inclusions || 'Customized as per your needs'}

*What's Not Included:*
${itinerary.exclusions || 'Travel insurance, visa, personal expenses'}

Would love to help you plan this amazing journey!

Best regards,
Nomadller Solutions Team`;
  };

  const handleWhatsAppSend = async () => {
    if (!selectedItinerary || !contactNumber) {
      Alert.alert('Error', 'Invalid contact number');
      return;
    }

    setSending(true);
    try {
      const message = generateWhatsAppMessage(selectedItinerary);
      const encodedMessage = encodeURIComponent(message);

      const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodedMessage}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (!canOpen) {
        Alert.alert(
          'WhatsApp Not Available',
          'WhatsApp is not installed on your device. Please install it or use manual sending.'
        );
        setSending(false);
        return;
      }

      await Linking.openURL(whatsappUrl);

      const { data: session } = await supabase.auth.getSession();
      await supabase.from('follow_ups').insert({
        lead_id: leadId,
        sales_person_id: session?.session?.user?.id,
        follow_up_date: new Date().toISOString(),
        status: 'completed',
        update_type: 'itinerary_created',
        remark: `Itinerary "${selectedItinerary.name}" sent via WhatsApp`,
      });

      Alert.alert('Success', 'Itinerary sent successfully!');
      setSelectedItinerary(null);
      setSendMethod(null);
      setShowMessage(false);
      onSent?.();
    } catch (err: any) {
      console.error('Error sending WhatsApp:', err);
      Alert.alert('Error', 'Failed to send itinerary');
    } finally {
      setSending(false);
    }
  };

  const handleManualSend = async () => {
    if (!selectedItinerary || !manualMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      await supabase.from('follow_ups').insert({
        lead_id: leadId,
        sales_person_id: session?.session?.user?.id,
        follow_up_date: new Date().toISOString(),
        status: 'completed',
        update_type: 'itinerary_created',
        remark: `Itinerary "${selectedItinerary.name}" sent manually: ${manualMessage}`,
      });

      Alert.alert('Success', 'Message saved successfully!');
      setSelectedItinerary(null);
      setSendMethod(null);
      setManualMessage('');
      setShowMessage(false);
      onSent?.();
    } catch (err: any) {
      console.error('Error saving message:', err);
      Alert.alert('Error', 'Failed to save message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading itineraries...</Text>
      </View>
    );
  }

  if (selectedItinerary && showMessage) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setShowMessage(false);
            setSendMethod(null);
          }}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Send "{selectedItinerary.name}"</Text>

        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              sendMethod === 'whatsapp' && styles.methodButtonActive,
            ]}
            onPress={() => setSendMethod('whatsapp')}
          >
            <MessageCircle size={24} color={sendMethod === 'whatsapp' ? '#25D366' : '#999'} />
            <Text style={[styles.methodText, sendMethod === 'whatsapp' && styles.methodTextActive]}>
              Send via WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              sendMethod === 'manual' && styles.methodButtonActive,
            ]}
            onPress={() => setSendMethod('manual')}
          >
            <Send size={24} color={sendMethod === 'manual' ? '#3b82f6' : '#999'} />
            <Text style={[styles.methodText, sendMethod === 'manual' && styles.methodTextActive]}>
              Send Manually
            </Text>
          </TouchableOpacity>
        </View>

        {sendMethod === 'whatsapp' && (
          <>
            <Text style={styles.previewLabel}>Message Preview:</Text>
            <ScrollView style={styles.messagePreview}>
              <Text style={styles.previewText}>
                {generateWhatsAppMessage(selectedItinerary)}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleWhatsAppSend}
              disabled={sending || !contactNumber}
            >
              <MessageCircle size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending...' : 'Send on WhatsApp'}
              </Text>
            </TouchableOpacity>

            {!contactNumber && (
              <Text style={styles.errorText}>Contact number not available</Text>
            )}
          </>
        )}

        {sendMethod === 'manual' && (
          <>
            <Text style={styles.label}>Your Message</Text>
            <TextInput
              style={styles.messageInput}
              value={manualMessage}
              onChangeText={setManualMessage}
              placeholder={`Hi ${guestName}, here's your itinerary for ${selectedItinerary.name}...`}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleManualSend}
              disabled={sending || !manualMessage.trim()}
            >
              <Send size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {sending ? 'Saving...' : 'Save Message'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  if (selectedItinerary) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedItinerary(null)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.selectedTitle}>{selectedItinerary.name}</Text>

        <ScrollView style={styles.detailsContainer}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{selectedItinerary.days} Days</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cost (USD)</Text>
              <Text style={styles.detailValue}>${selectedItinerary.cost_usd.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.descriptionLabel}>Itinerary Overview</Text>
          <Text style={styles.descriptionText}>{selectedItinerary.full_itinerary}</Text>

          {selectedItinerary.inclusions && (
            <>
              <Text style={styles.listTitle}>Inclusions</Text>
              <Text style={styles.listItem}>{selectedItinerary.inclusions}</Text>
            </>
          )}

          {selectedItinerary.exclusions && (
            <>
              <Text style={styles.listTitle}>Exclusions</Text>
              <Text style={styles.listItem}>{selectedItinerary.exclusions}</Text>
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowMessage(true)}
        >
          <Send size={20} color="#fff" />
          <Text style={styles.selectButtonText}>Send Itinerary</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Select Itinerary to Send</Text>

      <View style={styles.searchContainer}>
        <Search size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search itineraries..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
      </View>

      {filteredItineraries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No itineraries found</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {filteredItineraries.map((itinerary) => (
            <TouchableOpacity
              key={itinerary.id}
              style={styles.itineraryCard}
              onPress={() => setSelectedItinerary(itinerary)}
            >
              <View style={styles.itineraryHeader}>
                <Text style={styles.itineraryName}>{itinerary.name}</Text>
                <ExternalLink size={16} color="#3b82f6" />
              </View>

              <View style={styles.itineraryDetails}>
                <Text style={styles.itineraryDetail}>
                  {itinerary.days} Days
                </Text>
                <Text style={styles.itineraryPrice}>
                  ${itinerary.cost_usd.toFixed(2)}
                </Text>
              </View>

              {itinerary.full_itinerary && (
                <Text style={styles.itineraryDescription} numberOfLines={2}>
                  {itinerary.full_itinerary}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  listContainer: {
    maxHeight: 300,
  },
  itineraryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itineraryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  itineraryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itineraryDetail: {
    fontSize: 12,
    color: '#666',
  },
  itineraryPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  itineraryDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailsContainer: {
    maxHeight: 400,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  selectButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#f0f7ff',
    borderColor: '#3b82f6',
  },
  methodText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  methodTextActive: {
    color: '#3b82f6',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  messagePreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  previewText: {
    fontSize: 12,
    color: '#1a1a1a',
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#1a1a1a',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 8,
    textAlign: 'center',
  },
});
