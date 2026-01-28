import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking, Platform, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, setUserContext } from '@/lib/supabase';
import { Lead, Itinerary } from '@/types';
import { ArrowLeft, Phone, Calendar, Clock, Package, ChevronDown, Search, Check } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import ItinerarySender from '@/components/ItinerarySender';
import { scheduleFollowUpNotification } from '@/services/notifications';

export default function LeadActionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { leadId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);

  const [updateType, setUpdateType] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date>(new Date());
  const [followUpTime, setFollowUpTime] = useState<Date>(new Date());
  const [followUpHistory, setFollowUpHistory] = useState<any[]>([]);
  const [showItinerarySection, setShowItinerarySection] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [itinerarySearchText, setItinerarySearchText] = useState('');
  const [showItineraryDropdown, setShowItineraryDropdown] = useState(false);
  const [sendManually, setSendManually] = useState(false);
  const [showSendItineraryModal, setShowSendItineraryModal] = useState(false);
  const [destinations, setDestinations] = useState<{ id: string; name: string }[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [filterPax, setFilterPax] = useState<string>('');
  const [filterDays, setFilterDays] = useState<string>('');
  const [filterTransport, setFilterTransport] = useState<string>('');

  useEffect(() => {
    fetchLead();
    fetchFollowUpHistory();
    fetchItineraries();
    fetchDestinations();
  }, [leadId]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDestinations(data || []);
    } catch (err: any) {
      console.error('Error fetching destinations:', err);
    }
  };

  useEffect(() => {
    filterItineraries();
  }, [itinerarySearchText, itineraries, selectedDestination, filterPax, filterDays, filterTransport, destinations]);

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      Alert.alert('Error', 'Failed to load lead details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUpHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, sales_person:sales_person_id(full_name)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowUpHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching follow-up history:', err);
    }
  };

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
    }
  };

  const filterItineraries = () => {
    const normalizedSearchText = itinerarySearchText.trim().toLowerCase();

    const filtered = itineraries.filter((item) => {
      // Filter by Destination
      if (selectedDestination) {
        const selectedDestObj = destinations.find(d => d.name === selectedDestination);
        if (selectedDestObj && item.destination_id) {
          if (item.destination_id !== selectedDestObj.id) return false;
        } else {
          // Fallback to name matching if IDs are missing (backward compatibility)
          if (!item.name.includes(selectedDestination)) return false;
        }
      }

      // Filter by Pax
      if (filterPax) {
        if (item.no_of_pax !== parseInt(filterPax)) return false;
      }

      // Filter by Days
      if (filterDays) {
        if (item.days !== parseInt(filterDays)) return false;
      }

      // Filter by Transport
      if (filterTransport) {
        if (!item.name.includes(filterTransport)) return false;
      }

      // Filter by Search Text
      if (normalizedSearchText) {
        const matchesName = item.name.toLowerCase().includes(normalizedSearchText);
        const matchesItinerary = item.full_itinerary?.toLowerCase().includes(normalizedSearchText);
        if (!matchesName && !matchesItinerary) return false;
      }

      return true;
    });

    setFilteredItineraries(filtered);
  };

  const startCall = () => {
    if (lead?.contact_number) {
      setCallStartTime(new Date());
      setCallInProgress(true);
      Linking.openURL(`tel:${lead.contact_number}`);
    }
  };

  const endCall = async () => {
    if (!callStartTime) return;

    const callEndTime = new Date();
    const duration = Math.floor((callEndTime.getTime() - callStartTime.getTime()) / 1000);

    try {
      if (user?.id && user?.role) {
        await setUserContext(user.id, user.role);
      }

      await supabase.from('call_logs').insert([
        {
          lead_id: leadId,
          sales_person_id: user?.id,
          call_start_time: callStartTime.toISOString(),
          call_end_time: callEndTime.toISOString(),
          call_duration: duration,
        },
      ]);
    } catch (err: any) {
      console.error('Error logging call:', err);
    }

    setCallInProgress(false);
    setCallStartTime(null);
  };

  const handleSelectItinerary = (itinerary: Itinerary) => {
    setSelectedItinerary(itinerary);
    setShowItineraryDropdown(false);
    setShowSendItineraryModal(true);
  };

  const handleSendItinerary = async (method: 'whatsapp' | 'manual') => {
    if (!selectedItinerary || !lead?.contact_number) {
      Alert.alert('Error', 'Contact number not available');
      return;
    }

    if (method === 'whatsapp') {
      const exchangeRate = 83;
      const inrAmount = Math.round(selectedItinerary.cost_usd * exchangeRate);

      const message = `Hi ${lead.client_name},

Here's the amazing itinerary for your trip:

*${selectedItinerary.name}*
Duration: ${selectedItinerary.days} Days

Cost:
USD $${selectedItinerary.cost_usd.toFixed(2)}
INR ₹${inrAmount}

*Itinerary Overview:*
${selectedItinerary.full_itinerary || 'Please contact us for detailed itinerary'}

*What's Included:*
${selectedItinerary.inclusions || 'Customized as per your needs'}

*What's Not Included:*
${selectedItinerary.exclusions || 'Travel insurance, visa, personal expenses'}

Would love to help you plan this amazing journey!

Best regards,
TeleCRM Team`;

      try {
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${lead.contact_number}?text=${encodedMessage}`;

        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (!canOpen) {
          Alert.alert('Error', 'WhatsApp is not installed');
          return;
        }

        await Linking.openURL(whatsappUrl);

        await supabase.from('follow_ups').insert({
          lead_id: leadId,
          sales_person_id: user?.id,
          follow_up_date: new Date().toISOString(),
          status: 'completed',
          update_type: 'itinerary_created',
          remark: `Itinerary "${selectedItinerary.name}" sent via WhatsApp`,
        });

        Alert.alert('Success', 'Itinerary sent via WhatsApp!');
      } catch (err: any) {
        console.error('Error sending via WhatsApp:', err);
        Alert.alert('Error', 'Failed to send itinerary');
      }
    }

    setShowSendItineraryModal(false);
    setSelectedItinerary(null);
    setSendManually(false);
    setItinerarySearchText('');
    fetchFollowUpHistory();
  };

  const handleSubmit = async () => {
    if (!updateType) {
      Alert.alert('Error', 'Please select an update type');
      return;
    }

    if (!remark.trim()) {
      Alert.alert('Error', 'Please enter a remark');
      return;
    }

    if (updateType === 'follow_up' && (!followUpDate || !followUpTime)) {
      Alert.alert('Error', 'Please select follow-up date and time');
      return;
    }

    if (updateType === 'advance_paid_confirmed') {
      router.push({
        pathname: '/sales/confirm-lead',
        params: { leadId },
      });
      return;
    }

    setSubmitting(true);

    try {
      if (updateType === 'dead') {
        await supabase
          .from('leads')
          .update({ status: 'dead', updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } else if (updateType === 'follow_up') {
        const dateString = followUpDate.toISOString().split('T')[0];
        const timeString = followUpTime.toTimeString().slice(0, 5);
        const followUpDateTime = `${dateString}T${timeString}:00`;

        await supabase.from('follow_ups').insert([
          {
            lead_id: leadId,
            sales_person_id: user?.id,
            follow_up_date: followUpDateTime,
            status: 'pending',
            update_type: updateType,
            remark: remark,
          },
        ]);

        const followUpFullDateTime = new Date(followUpDateTime);
        if (user?.id && lead?.client_name) {
          await scheduleFollowUpNotification(user.id, lead.client_name, followUpFullDateTime, remark);
        }

        await supabase
          .from('leads')
          .update({ status: 'follow_up', updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } else {
        await supabase.from('follow_ups').insert([
          {
            lead_id: leadId,
            sales_person_id: user?.id,
            follow_up_date: new Date().toISOString(),
            status: 'completed',
            update_type: updateType,
            remark: remark,
          },
        ]);
      }

      Alert.alert('Success', 'Lead updated successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconContainer}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Up Update</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{lead?.client_name}</Text>
          <Text style={styles.leadDetail}>{lead?.place} - {lead?.no_of_pax} Pax</Text>
        </View>

        <TouchableOpacity
          style={[styles.callButton, callInProgress && styles.callButtonActive, !lead?.contact_number && styles.callButtonDisabled]}
          onPress={callInProgress ? endCall : startCall}
          disabled={!lead?.contact_number && !callInProgress}
        >
          <View style={styles.callButtonContent}>
            <View style={styles.iconContainer}>
              <Phone size={24} color="#fff" />
            </View>
            <Text style={styles.callButtonText}>
              {callInProgress ? 'End Call' : 'Start Call'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Update Follow-Up</Text>

        <Text style={styles.label}>Update Type *</Text>
        <View style={styles.radioGroup}>
          {[
            { value: 'itinerary_created', label: 'Itinerary Created' },
            { value: 'itinerary_updated', label: 'Itinerary Updated' },
            { value: 'follow_up', label: 'Follow Up' },
            { value: 'almost_confirmed', label: 'Almost Confirm' },
            { value: 'advance_paid_confirmed', label: 'Advance Paid & Confirmed' },
            { value: 'dead', label: 'Dead' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioButton,
                updateType === option.value && styles.radioButtonActive,
              ]}
              onPress={() => setUpdateType(option.value)}
            >
              <Text
                style={[
                  styles.radioButtonText,
                  updateType === option.value && styles.radioButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Remark *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={remark}
          onChangeText={setRemark}
          placeholder="Enter remarks"
          multiline
          numberOfLines={4}
        />

        {updateType === 'follow_up' && (
          <>
            <DateTimePickerComponent
              label="Next Follow-Up Date *"
              value={followUpDate}
              onChange={setFollowUpDate}
              mode="date"
            />

            <DateTimePickerComponent
              label="Next Follow-Up Time *"
              value={followUpTime}
              onChange={setFollowUpTime}
              mode="time"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Update</Text>
          )}
        </TouchableOpacity>

        <View style={styles.itinerarySection}>
          <Text style={styles.sectionTitle}>Send Itinerary to Guest</Text>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, sendManually && styles.checkboxChecked]}
              onPress={() => setSendManually(!sendManually)}
            >
              {sendManually && <Check size={16} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Send Manually (skip selection)</Text>
          </View>

          {!sendManually && (
            <>
              <Text style={styles.label}>Destination *</Text>
              <View style={styles.dropdownContainer}>
                <View style={styles.customDropdown}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.destinationScroll}
                  >
                    {destinations.map((dest) => (
                      <TouchableOpacity
                        key={dest.id}
                        style={[
                          styles.destinationTag,
                          selectedDestination === dest.name && styles.destinationTagActive,
                        ]}
                        onPress={() => setSelectedDestination(dest.name)}
                      >
                        <Text
                          style={[
                            styles.destinationTagText,
                            selectedDestination === dest.name && styles.destinationTagTextActive,
                          ]}
                        >
                          {dest.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {selectedDestination && (
                <>
                  <Text style={styles.label}>Filter Itineraries</Text>

                  <View style={styles.filtersContainer}>
                    <View style={styles.filterItem}>
                      <Text style={styles.filterLabel}>Passengers</Text>
                      <TextInput
                        style={styles.filterInput}
                        placeholder="e.g., 2"
                        value={filterPax}
                        onChangeText={setFilterPax}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.filterItem}>
                      <Text style={styles.filterLabel}>Days</Text>
                      <TextInput
                        style={styles.filterInput}
                        placeholder="e.g., 7"
                        value={filterDays}
                        onChangeText={setFilterDays}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.filterItem}>
                      <Text style={styles.filterLabel}>Transport Mode</Text>
                      <View style={styles.transportDropdown}>
                        {['Driver with cab', 'Self drive cab', 'Self drive scooter'].map((mode) => (
                          <TouchableOpacity
                            key={mode}
                            style={[
                              styles.transportOption,
                              filterTransport === mode && styles.transportOptionActive,
                            ]}
                            onPress={() => setFilterTransport(filterTransport === mode ? '' : mode)}
                          >
                            <Text
                              style={[
                                styles.transportOptionText,
                                filterTransport === mode && styles.transportOptionTextActive,
                              ]}
                            >
                              {mode}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.label}>Select Itinerary</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowItineraryDropdown(!showItineraryDropdown)}
                  >
                    <Text style={[styles.dropdownText, !selectedItinerary && styles.dropdownPlaceholder]}>
                      {selectedItinerary ? selectedItinerary.name : 'Choose an itinerary...'}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </TouchableOpacity>

                  {showItineraryDropdown && (
                    <View style={styles.dropdownContent}>
                      <View style={styles.searchContainer}>
                        <Search size={16} color="#999" />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search itineraries..."
                          value={itinerarySearchText}
                          onChangeText={setItinerarySearchText}
                          placeholderTextColor="#999"
                        />
                      </View>

                      <ScrollView style={styles.dropdownList}>
                        {filteredItineraries.length === 0 ? (
                          <Text style={styles.emptyDropdownText}>No itineraries found</Text>
                        ) : (
                          filteredItineraries.map((itinerary) => (
                            <TouchableOpacity
                              key={itinerary.id}
                              style={[
                                styles.dropdownItem,
                                selectedItinerary?.id === itinerary.id && styles.dropdownItemSelected,
                              ]}
                              onPress={() => handleSelectItinerary(itinerary)}
                            >
                              <View style={styles.dropdownItemContent}>
                                <Text style={styles.dropdownItemName}>{itinerary.name}</Text>
                                <Text style={styles.dropdownItemDetails}>
                                  {itinerary.days} Days • ${itinerary.cost_usd.toFixed(2)}
                                </Text>
                              </View>
                              {selectedItinerary?.id === itinerary.id && (
                                <Check size={20} color="#3b82f6" />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}

              {selectedItinerary && (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => setShowSendItineraryModal(true)}
                >
                  <Package size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Itinerary</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {sendManually && (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => setShowSendItineraryModal(true)}
            >
              <Package size={18} color="#fff" />
              <Text style={styles.sendButtonText}>Record Manual Send</Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={showSendItineraryModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowSendItineraryModal(false);
            setSelectedItinerary(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowSendItineraryModal(false);
                  setSelectedItinerary(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {sendManually ? (
                <>
                  <Text style={styles.modalTitle}>Record Manual Send</Text>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="Enter how you sent the itinerary (email, SMS, etc.)"
                    onChangeText={(text) => {
                      if (!selectedItinerary) {
                        setSelectedItinerary({ id: 'manual', name: 'Manual Send' } as any);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => handleSendItinerary('manual')}
                  >
                    <Text style={styles.confirmButtonText}>Record Send</Text>
                  </TouchableOpacity>
                </>
              ) : selectedItinerary ? (
                <>
                  <Text style={styles.modalTitle}>{selectedItinerary.name}</Text>
                  <View style={styles.itineraryDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{selectedItinerary.days} Days</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cost:</Text>
                      <Text style={styles.detailValue}>${selectedItinerary.cost_usd.toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => handleSendItinerary('whatsapp')}
                  >
                    <Text style={styles.confirmButtonText}>Send via WhatsApp</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        <TouchableOpacity
          style={styles.itineraryToggle}
          onPress={() => setShowItinerarySection(!showItinerarySection)}
        >
          <Package size={20} color="#3b82f6" />
          <Text style={styles.itineraryToggleText}>
            {showItinerarySection ? 'Hide Itinerary Sender' : 'Send Itinerary to Guest'}
          </Text>
        </TouchableOpacity>

        {showItinerarySection && lead && (
          <ItinerarySender
            leadId={lead.id}
            guestName={lead.client_name}
            contactNumber={lead.contact_number}
            onSent={() => {
              setShowItinerarySection(false);
              fetchFollowUpHistory();
            }}
          />
        )}

        {followUpHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Follow-Up History</Text>
            {followUpHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyType}>
                    {item.update_type ? item.update_type.replace(/_/g, ' ').toUpperCase() : 'FOLLOW UP'}
                  </Text>
                  <Text style={styles.historyStatus}>{item.status}</Text>
                </View>
                <Text style={styles.historyRemark}>{item.remark}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.follow_up_date).toLocaleString()}
                </Text>
                <Text style={styles.historyBy}>
                  By: {item.sales_person?.full_name || 'Unknown'}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  leadInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  leadName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  leadDetail: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  callButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonActive: {
    backgroundColor: '#ef4444',
  },
  callButtonDisabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.6,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 8,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 16,
  },
  radioButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  radioButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  radioButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#86efac',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeInputContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'capitalize',
  },
  historyRemark: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyBy: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  itineraryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  itineraryToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  itinerarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  dropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dropdownItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  emptyDropdownText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#999',
    fontWeight: '300',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  itineraryDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  manualInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  customDropdown: {
    marginBottom: 12,
  },
  destinationScroll: {
    paddingVertical: 4,
  },
  destinationTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  destinationTagActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  destinationTagText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  destinationTagTextActive: {
    color: '#fff',
  },
  filtersContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  filterItem: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  filterInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  transportDropdown: {
    gap: 8,
  },
  transportOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  transportOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  transportOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  transportOptionTextActive: {
    color: '#fff',
  },
});
