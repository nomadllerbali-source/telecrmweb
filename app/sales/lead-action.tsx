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
import { Colors, Layout } from '@/constants/Colors';

export default function LeadActionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { leadId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callCount, setCallCount] = useState(0);

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
  const [lastItineraryId, setLastItineraryId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(83);

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchFollowUpHistory();
      fetchLatestItineraryForLead();
    }
    fetchItineraries();
    fetchDestinations();
    fetchExchangeRate();
  }, [leadId]);

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
      setCallCount(data?.call_count || 0);
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      Alert.alert('Error', 'Failed to load lead details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestItineraryForLead = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('itinerary_id')
        .eq('lead_id', leadId)
        .not('itinerary_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setLastItineraryId(data[0].itinerary_id);
      }
    } catch (err) {
      console.error('Error fetching latest itinerary:', err);
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

      // Increment call count in leads table
      const newCallCount = callCount + 1;
      await supabase
        .from('leads')
        .update({ call_count: newCallCount })
        .eq('id', leadId);

      setCallCount(newCallCount);
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
      const costINR = selectedItinerary.cost_inr || Math.round(selectedItinerary.cost_usd * (exchangeRate + 2));

      const message = `Hi ${lead.client_name},

Here's the amazing itinerary for your trip:

*${selectedItinerary.name}*
Duration: ${selectedItinerary.days} Days

Cost:
USD $${selectedItinerary.cost_usd.toFixed(2)}
INR ₹${costINR}

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
          itinerary_id: selectedItinerary.id,
        });

        setLastItineraryId(selectedItinerary.id);
        Alert.alert('Success', 'Itinerary sent via WhatsApp!');
      } catch (err: any) {
        console.error('Error sending via WhatsApp:', err);
        Alert.alert('Error', 'Failed to send itinerary');
      }
    } else if (method === 'manual') {
      try {
        await supabase.from('follow_ups').insert({
          lead_id: leadId,
          sales_person_id: user?.id,
          follow_up_date: new Date().toISOString(),
          status: 'completed',
          update_type: 'itinerary_created',
          remark: `Itinerary "${selectedItinerary.name}" recorded as sent (Manual)`,
          itinerary_id: selectedItinerary.id,
        });
        setLastItineraryId(selectedItinerary.id);
        Alert.alert('Success', 'Itinerary recorded successfully');
      } catch (err: any) {
        console.error('Error recording itinerary:', err);
        Alert.alert('Error', 'Failed to record itinerary');
      }
    }

    setShowSendItineraryModal(false);
    setSelectedItinerary(null);
    setSendManually(false);
    setItinerarySearchText('');
    fetchFollowUpHistory();
  };

  const handleMarkNoResponse = async () => {
    try {
      if (!lead || !user?.id) return;

      Alert.alert(
        'Mark as No Response',
        `This lead has ${callCount} call attempts. Mark as no response?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: async () => {
              try {
                setSubmitting(true);

                // Update lead status to no_response
                await supabase
                  .from('leads')
                  .update({ status: 'no_response', updated_at: new Date().toISOString() })
                  .eq('id', leadId);

                // Add follow-up record
                await supabase.from('follow_ups').insert([
                  {
                    lead_id: leadId,
                    sales_person_id: user.id,
                    follow_up_date: new Date().toISOString(),
                    status: 'completed',
                    update_type: 'no_response',
                    remark: `Marked as no response after ${callCount} call attempts`,
                  },
                ]);

                Alert.alert('Success', 'Lead marked as no response');
                router.back();
              } catch (err: any) {
                Alert.alert('Error', err.message);
              } finally {
                setSubmitting(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error marking no response:', err);
    }
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
            itinerary_id: lastItineraryId,
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
            itinerary_id: lastItineraryId,
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconContainer}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Up Update</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
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
              <Phone size={24} color={Colors.text.inverse} />
            </View>
            <Text style={styles.callButtonText}>
              {callInProgress ? 'End Call' : `Start Call (${callCount})`}
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
          placeholderTextColor={Colors.text.tertiary}
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
          style={[styles.noResponseButton, submitting && styles.submitButtonDisabled]}
          onPress={handleMarkNoResponse}
          disabled={submitting}
        >
          <Text style={styles.noResponseButtonText}>
            Mark as No Response ({callCount} calls)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.text.inverse} />
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
              {sendManually && <Check size={16} color={Colors.text.inverse} />}
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
                        placeholderTextColor={Colors.text.tertiary}
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
                        placeholderTextColor={Colors.text.tertiary}
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
                    onPress={() => setShowItineraryDropdown(true)}
                  >
                    <Text style={[styles.dropdownText, !selectedItinerary && styles.dropdownPlaceholder]}>
                      {selectedItinerary ? selectedItinerary.name : 'Choose an itinerary...'}
                    </Text>
                    <ChevronDown size={20} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </>
              )}

              {selectedItinerary && (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => setShowSendItineraryModal(true)}
                >
                  <Package size={18} color={Colors.text.inverse} />
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
              <Package size={18} color={Colors.text.inverse} />
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
                    placeholderTextColor={Colors.text.tertiary}
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
          <Package size={20} color={Colors.primary} />
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

      {/* Itinerary Selection Modal */}
      <Modal
        visible={showItineraryDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItineraryDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setShowItineraryDropdown(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Itinerary</Text>

            <View style={[styles.searchContainer, { paddingHorizontal: 16, paddingVertical: 12 }]}>
              <Search size={16} color={Colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search itineraries..."
                value={itinerarySearchText}
                onChangeText={setItinerarySearchText}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredItineraries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyDropdownText}>No itineraries found</Text>
                </View>
              ) : (
                filteredItineraries.map((itinerary) => (
                  <TouchableOpacity
                    key={itinerary.id}
                    style={[
                      styles.modalItem,
                      selectedItinerary?.id === itinerary.id && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      handleSelectItinerary(itinerary);
                      setShowItineraryDropdown(false);
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemName}>{itinerary.name}</Text>
                      <Text style={styles.modalItemDetails}>
                        {itinerary.days} Days • ${itinerary.cost_usd.toFixed(2)}
                      </Text>
                    </View>
                    {selectedItinerary?.id === itinerary.id && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: 60,
    paddingBottom: Layout.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Layout.shadows.sm,
  },
  backButton: {
    padding: 8,
    borderRadius: Layout.radius.full,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  leadInfo: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    ...Layout.shadows.sm,
  },
  leadName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  leadDetail: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  callButton: {
    backgroundColor: Colors.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.lg,
    marginBottom: Layout.spacing.xl,
    ...Layout.shadows.md,
  },
  callButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  callButtonActive: {
    backgroundColor: Colors.status.error,
  },
  callButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
    opacity: 0.8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: Colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
    marginTop: Layout.spacing.xs,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    marginTop: 8,
  },
  radioGroup: {
    gap: 10,
    marginBottom: Layout.spacing.lg,
  },
  radioButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.surface,
  },
  radioButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioButtonText: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  radioButtonTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 14,
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.status.success,
    height: 52,
    borderRadius: Layout.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Layout.spacing.lg,
    marginBottom: 40,
    ...Layout.shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
  },
  noResponseButton: {
    backgroundColor: Colors.status.warning,
    height: 52,
    borderRadius: Layout.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Layout.spacing.md,
    ...Layout.shadows.md,
  },
  noResponseButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
  },
  dateTimeInputContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Layout.spacing.md,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    padding: 0,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Layout.shadows.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.status.success,
    textTransform: 'capitalize',
  },
  historyRemark: {
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  historyBy: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  itineraryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Layout.radius.lg,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  itineraryToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  itinerarySection: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    ...Layout.shadows.sm,
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
    borderColor: Colors.border,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.text.tertiary,
  },
  dropdownContent: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
    ...Layout.shadows.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: Colors.text.primary,
  },
  dropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.surfaceHighlight,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  dropdownItemDetails: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  emptyDropdownText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Layout.radius.lg,
    gap: 8,
    marginTop: Layout.spacing.sm,
    ...Layout.shadows.sm,
  },
  sendButtonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: Layout.spacing.xl,
    paddingBottom: 40,
    ...Layout.shadows.lg,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },
  itineraryDetails: {
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.lg,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    marginTop: 12,
    ...Layout.shadows.md,
  },
  confirmButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  manualInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: 20,
    minHeight: 80,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: Colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  destinationTagActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  destinationTagText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  destinationTagTextActive: {
    color: Colors.text.inverse,
  },
  filtersContainer: {
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  filterItem: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  filterInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
  },
  transportDropdown: {
    gap: 8,
  },
  transportOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.md,
  },
  transportOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  transportOptionText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  transportOptionTextActive: {
    color: Colors.text.inverse,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemSelected: {
    backgroundColor: Colors.surfaceHighlight,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  modalItemDetails: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  modalScrollView: {
    flex: 1,
  },
});
