import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Modal, TextInput, AppState, AppStateStatus, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Phone, MessageCircle, MapPin, Users, DollarSign, Calendar, X, ChevronDown } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';

export default function HotLeadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [actionType, setActionType] = useState('');
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [remark, setRemark] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(new Date());
  const [nextFollowUpTime, setNextFollowUpTime] = useState(new Date());
  const [itineraryId, setItineraryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [deadReason, setDeadReason] = useState('');
  const [showDeadReasonPicker, setShowDeadReasonPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const appState = useRef(AppState.currentState);
  const callInitiatedRef = useRef(false);
  const leadForCallRef = useRef<Lead | null>(null);

  const actionTypes = [
    { label: 'Itinerary Sent', value: 'itinerary_sent' },
    { label: 'Itinerary Updated', value: 'itinerary_updated' },
    { label: 'Follow Up', value: 'follow_up' },
    { label: 'Confirm and Advance Paid', value: 'confirmed_advance_paid' },
    { label: 'Dead', value: 'dead' },
  ];

  const deadReasons = [
    'Budget too high',
    'Found another agency',
    'Plans cancelled',
    'Not responding',
    'Changed destination',
    'Timing not suitable',
    'Other',
  ];

  useEffect(() => {
    fetchLeads();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      callInitiatedRef.current &&
      leadForCallRef.current
    ) {
      // App has come to the foreground after a call
      setCurrentLead(leadForCallRef.current);
      setShowFollowUpModal(true);
      callInitiatedRef.current = false;
      leadForCallRef.current = null;
    }
    appState.current = nextAppState;
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .eq('lead_type', 'hot')
        .in('status', ['hot', 'allocated', 'follow_up'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching hot leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber: string, lead: Lead) => {
    callInitiatedRef.current = true;
    leadForCallRef.current = lead;
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening dialer:', err);
      callInitiatedRef.current = false;
      leadForCallRef.current = null;
    });
  };

  const handleWhatsApp = (phoneNumber: string, clientName: string, place: string) => {
    // Remove any spaces, dashes, or special characters from phone number
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const message = `Hello ${clientName}, I'm reaching out regarding your travel inquiry for ${place}.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
    });
  };

  const calculateDueAmount = () => {
    const total = parseFloat(totalAmount) || 0;
    const advance = parseFloat(advanceAmount) || 0;
    return total - advance;
  };

  async function handleSaveFollowUp() {
    if (!currentLead || !actionType || !remark.trim()) return;

    setSaving(true);
    try {
      const followUpData: any = {
        lead_id: currentLead.id,
        sales_person_id: user?.id,
        action_type: actionType,
        follow_up_note: remark.trim(),
        created_at: new Date().toISOString(),
        follow_up_date: new Date().toISOString().split('T')[0],
      };

      // Add conditional fields based on action type
      if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        const dateValue = nextFollowUpDate.toISOString().split('T')[0];
        const timeValue = nextFollowUpTime.toTimeString().split(':').slice(0, 2).join(':');

        followUpData.next_follow_up_date = dateValue;
        followUpData.next_follow_up_time = timeValue + ':00';
      }

      if (actionType === 'confirmed_advance_paid') {
        followUpData.itinerary_id = itineraryId;
        followUpData.total_amount = parseFloat(totalAmount);
        followUpData.advance_amount = parseFloat(advanceAmount);
        followUpData.due_amount = calculateDueAmount();
        followUpData.transaction_id = transactionId;

        // Update lead status to confirmed
        await supabase
          .from('leads')
          .update({ status: 'confirmed' })
          .eq('id', currentLead.id);
      }

      if (actionType === 'dead') {
        followUpData.dead_reason = deadReason;

        // Update lead status to dead
        await supabase
          .from('leads')
          .update({ status: 'dead' })
          .eq('id', currentLead.id);
      }

      const { error } = await supabase
        .from('follow_ups')
        .insert(followUpData);

      if (error) throw error;

      // Update lead status to follow_up for other action types
      if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        await supabase
          .from('leads')
          .update({ status: 'follow_up' })
          .eq('id', currentLead.id);
      }

      handleCloseModal();
      fetchLeads();
    } catch (err: any) {
      console.error('Error saving follow-up:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    setShowFollowUpModal(false);
    setActionType('');
    setRemark('');
    setNextFollowUpDate(new Date());
    setNextFollowUpTime(new Date());
    setItineraryId('');
    setTotalAmount('');
    setAdvanceAmount('');
    setTransactionId('');
    setDeadReason('');
    setCurrentLead(null);
  }


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
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
        <Text style={styles.headerTitle}>Hot Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hot leads</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <Text style={styles.leadName}>{lead.client_name}</Text>
                <View style={styles.hotBadge}>
                  <Text style={styles.hotBadgeText}>HOT</Text>
                </View>
              </View>

              <View style={styles.leadDetails}>
                {lead.contact_number && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailRowContent}>
                      <View style={styles.iconContainer}>
                        <Phone size={16} color="#666" />
                      </View>
                      <Text style={[styles.detailText, styles.detailTextWithIcon]}>{lead.contact_number}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <MapPin size={16} color="#666" />
                    </View>
                    <Text style={[styles.detailText, styles.detailTextWithIcon]}>{lead.place}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <Users size={16} color="#666" />
                    </View>
                    <Text style={[styles.detailText, styles.detailTextWithIcon]}>{lead.no_of_pax} Pax</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <Calendar size={16} color="#666" />
                    </View>
                    <Text style={[styles.detailText, styles.detailTextWithIcon]}>
                      {lead.travel_date || lead.travel_month || 'Date TBD'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <DollarSign size={16} color="#666" />
                    </View>
                    <Text style={[styles.detailText, styles.detailTextWithIcon]}>₹{lead.expected_budget}</Text>
                  </View>
                </View>
              </View>

              {lead.remark && (
                <View style={styles.remarkContainer}>
                  <Text style={styles.remarkLabel}>Remark:</Text>
                  <Text style={styles.remarkText}>{lead.remark}</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton, !lead.contact_number && styles.disabledButton]}
                  onPress={() => lead.contact_number && handleCall(lead.contact_number, lead)}
                  disabled={!lead.contact_number}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <Phone size={20} color="#fff" />
                    </View>
                    <Text style={[styles.actionButtonText, styles.actionButtonTextWithIcon]}>Call</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.whatsappButton, !lead.contact_number && styles.disabledButton]}
                  onPress={() => lead.contact_number && handleWhatsApp(lead.contact_number, lead.client_name, lead.place)}
                  disabled={!lead.contact_number}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <MessageCircle size={20} color="#fff" />
                    </View>
                    <Text style={[styles.actionButtonText, styles.actionButtonTextWithIcon]}>WhatsApp</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showFollowUpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Follow-Up</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <View style={styles.iconContainer}>
                  <X size={24} color="#666" />
                </View>
              </TouchableOpacity>
            </View>

            {currentLead && (
              <View style={styles.leadInfo}>
                <Text style={styles.leadInfoName}>{currentLead.client_name}</Text>
                <Text style={styles.leadInfoDetail}>{currentLead.place} • {currentLead.no_of_pax} Pax</Text>
              </View>
            )}

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Action Type *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowActionPicker(!showActionPicker)}
                >
                  <Text style={[styles.pickerButtonText, !actionType && styles.placeholderText]}>
                    {actionType ? actionTypes.find(a => a.value === actionType)?.label : 'Select action type'}
                  </Text>
                  <View style={styles.iconContainer}>
                    <ChevronDown size={20} color="#666" />
                  </View>
                </TouchableOpacity>

                {showActionPicker && (
                  <View style={styles.pickerOptions}>
                    {actionTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={styles.pickerOption}
                        onPress={() => {
                          setActionType(type.value);
                          setShowActionPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>{type.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType) && (
                <>
                  <DateTimePickerComponent
                    label="Next Follow-Up Date *"
                    value={nextFollowUpDate}
                    onChange={setNextFollowUpDate}
                    mode="date"
                  />

                  <DateTimePickerComponent
                    label="Next Follow-Up Time *"
                    value={nextFollowUpTime}
                    onChange={setNextFollowUpTime}
                    mode="time"
                  />
                </>
              )}

              {actionType === 'confirmed_advance_paid' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Itinerary ID *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter itinerary ID"
                      value={itineraryId}
                      onChangeText={setItineraryId}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Total Amount *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter total amount"
                      value={totalAmount}
                      onChangeText={setTotalAmount}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Advance Amount *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter advance amount"
                      value={advanceAmount}
                      onChangeText={setAdvanceAmount}
                      keyboardType="numeric"
                    />
                  </View>

                  {totalAmount && advanceAmount && (
                    <View style={styles.dueAmountContainer}>
                      <Text style={styles.dueAmountLabel}>Due Amount:</Text>
                      <Text style={styles.dueAmountValue}>₹{calculateDueAmount().toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Transaction ID *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChangeText={setTransactionId}
                    />
                  </View>
                </>
              )}

              {actionType === 'dead' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Reason *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDeadReasonPicker(!showDeadReasonPicker)}
                  >
                    <Text style={[styles.pickerButtonText, !deadReason && styles.placeholderText]}>
                      {deadReason || 'Select reason'}
                    </Text>
                    <View style={styles.iconContainer}>
                      <ChevronDown size={20} color="#666" />
                    </View>
                  </TouchableOpacity>

                  {showDeadReasonPicker && (
                    <View style={styles.pickerOptions}>
                      {deadReasons.map((reason) => (
                        <TouchableOpacity
                          key={reason}
                          style={styles.pickerOption}
                          onPress={() => {
                            setDeadReason(reason);
                            setShowDeadReasonPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{reason}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {actionType && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Remarks *</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Enter remarks..."
                    value={remark}
                    onChangeText={setRemark}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (saving || !actionType || !remark.trim() ||
                    (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType) && (!nextFollowUpDate || !nextFollowUpTime)) ||
                    (actionType === 'confirmed_advance_paid' && (!itineraryId || !totalAmount || !advanceAmount || !transactionId)) ||
                    (actionType === 'dead' && !deadReason)
                  ) && styles.disabledButton
                ]}
                onPress={handleSaveFollowUp}
                disabled={
                  saving || !actionType || !remark.trim() ||
                  (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType) && (!nextFollowUpDate || !nextFollowUpTime)) ||
                  (actionType === 'confirmed_advance_paid' && (!itineraryId || !totalAmount || !advanceAmount || !transactionId)) ||
                  (actionType === 'dead' && !deadReason)
                }
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  hotBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hotBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  leadDetails: {
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  detailTextWithIcon: {
    marginLeft: 8,
  },
  remarkContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  remarkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  remarkText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: '#3b82f6',
  },
  whatsappButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextWithIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalScroll: {
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  leadInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  leadInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  leadInfoDetail: {
    fontSize: 14,
    color: '#666',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  placeholderText: {
    color: '#999',
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dueAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  dueAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dueAmountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
});
