import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Modal, TextInput, AppState, AppStateStatus, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Calendar, Clock, Phone, MessageCircle, X, ChevronDown, Plus, History } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { calendarService } from '@/services/calendar';
import { scheduleFollowUpNotification } from '@/services/notifications';

interface FollowUpWithLead {
  id: string;
  follow_up_date: string;
  status: string;
  remark: string;
  lead: {
    id: string;
    client_name: string;
    place: string;
    no_of_pax: number;
    contact_number: string | null;
  };
}

interface FollowUpHistory {
  id: string;
  action_type: string;
  follow_up_note: string;
  created_at: string;
  next_follow_up_date: string | null;
  next_follow_up_time: string | null;
  itinerary_id: string | null;
  total_amount: number | null;
  advance_amount: number | null;
  due_amount: number | null;
  transaction_id: string | null;
  dead_reason: string | null;
}

export default function FollowUpsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUpWithLead[]>([]);
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [currentLead, setCurrentLead] = useState<any | null>(null);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const appState = useRef(AppState.currentState);
  const callInitiatedRef = useRef(false);
  const leadForCallRef = useRef<any | null>(null);

  const actionTypes = [
    { label: 'Itinerary Sent', value: 'itinerary_sent' },
    { label: 'Itinerary Updated', value: 'itinerary_updated' },
    { label: 'Follow Up', value: 'follow_up' },
    { label: 'Almost Confirmed', value: 'almost_confirmed' },
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
    fetchFollowUps();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [showTodayOnly]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      callInitiatedRef.current &&
      leadForCallRef.current
    ) {
      setCurrentLead(leadForCallRef.current);
      setShowFollowUpModal(true);
      callInitiatedRef.current = false;
      leadForCallRef.current = null;
    }
    appState.current = nextAppState;
  };

  const fetchFollowUps = async () => {
    try {
      let query = supabase
        .from('follow_ups')
        .select(`
          *,
          lead:leads(id, client_name, place, no_of_pax, contact_number)
        `)
        .eq('sales_person_id', user?.id)
        .eq('status', 'pending')
        .order('follow_up_date', { ascending: true });

      if (showTodayOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('follow_up_date', `${today}T00:00:00`).lt('follow_up_date', `${today}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFollowUps(data || []);
    } catch (err: any) {
      console.error('Error fetching follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const handleFollowUp = async (followUp: FollowUpWithLead) => {
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', followUp.lead.id)
      .single();

    if (leadData) {
      setCurrentLead(leadData);
      await fetchFollowUpHistory(followUp.lead.id);
      setShowHistoryModal(true);
    }
  };

  const fetchFollowUpHistory = async (leadId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowUpHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching follow-up history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddNewFollowUp = () => {
    setShowHistoryModal(false);
    setShowFollowUpModal(true);
  };

  const handleCall = (phoneNumber: string, lead: any) => {
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

    if (actionType === 'confirmed_advance_paid' && !travelDate) {
      Alert.alert('Error', 'Please select a travel date');
      return;
    }

    setSaving(true);
    try {
      const followUpData: any = {
        lead_id: currentLead.id,
        sales_person_id: user?.id,
        action_type: actionType,
        follow_up_note: remark.trim(),
        follow_up_date: new Date().toISOString(),
        status: 'completed',
      };

      if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        const dateValue = nextFollowUpDate.toISOString().split('T')[0];
        const timeValue = nextFollowUpTime.toTimeString().split(':').slice(0, 2).join(':');

        followUpData.next_follow_up_date = dateValue;
        followUpData.next_follow_up_time = timeValue + ':00';
      }

      if (actionType === 'confirmed_advance_paid' && travelDate) {
        followUpData.itinerary_id = itineraryId;
        followUpData.total_amount = parseFloat(totalAmount);
        followUpData.advance_amount = parseFloat(advanceAmount);
        followUpData.due_amount = calculateDueAmount();
        followUpData.transaction_id = transactionId;

        await supabase
          .from('leads')
          .update({ status: 'confirmed', travel_date: travelDate.toISOString().split('T')[0] })
          .eq('id', currentLead.id);
      }

      if (actionType === 'dead') {
        followUpData.dead_reason = deadReason;

        await supabase
          .from('leads')
          .update({ status: 'dead' })
          .eq('id', currentLead.id);
      }

      const { error } = await supabase
        .from('follow_ups')
        .insert(followUpData);

      if (error) throw error;

      if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        await supabase
          .from('leads')
          .update({ status: 'follow_up' })
          .eq('id', currentLead.id);

        const followUpDateTime = new Date(nextFollowUpDate);
        const timeComponents = nextFollowUpTime.toTimeString().split(':');
        followUpDateTime.setHours(parseInt(timeComponents[0]));
        followUpDateTime.setMinutes(parseInt(timeComponents[1]));

        await scheduleFollowUpNotification(
          user?.id || '',
          currentLead.client_name,
          followUpDateTime,
          remark
        );
      }

      const actionTypeLabel = getActionTypeLabel(actionType);
      await supabase.from('notifications').insert({
        user_id: currentLead.assigned_by || user?.id,
        type: 'follow_up',
        title: 'Follow-up Updated',
        message: `Follow-up added for ${currentLead.client_name} - ${actionTypeLabel}`,
        lead_id: currentLead.id,
      });

      // Create reminder if confirmed with advance paid
      if (actionType === 'confirmed_advance_paid' && travelDate && user) {
        const reminderDate = new Date(travelDate);
        reminderDate.setDate(reminderDate.getDate() - 7);

        const reminderTimeObj = reminderTime || new Date();

        try {
          const calendarTitle = `Travel Reminder: ${currentLead.client_name}`;
          const calendarDescription = `Client: ${currentLead.client_name}
Location: ${currentLead.place}
Pax: ${currentLead.no_of_pax}
Travel Date: ${travelDate.toISOString().split('T')[0]}

This is a 7-day advance reminder for the travel date.`;

          const calendarEventDate = new Date(reminderDate);
          calendarEventDate.setHours(reminderTimeObj.getHours());
          calendarEventDate.setMinutes(reminderTimeObj.getMinutes());

          const calendarEventId = await calendarService.createReminder(
            {
              title: calendarTitle,
              description: calendarDescription,
              startDate: calendarEventDate,
            },
            currentLead.id,
            currentLead.client_name
          );

          await supabase.from('reminders').insert({
            lead_id: currentLead.id,
            sales_person_id: user.id,
            travel_date: travelDate.toISOString().split('T')[0],
            reminder_date: reminderDate.toISOString().split('T')[0],
            reminder_time: reminderTime?.toTimeString().slice(0, 5) || '09:00',
            calendar_event_id: calendarEventId,
            status: 'pending',
          });
        } catch (reminderError) {
          console.error('Error creating reminder:', reminderError);
          // Don't fail the entire operation if reminder fails
        }
      }

      handleCloseModal();
      fetchFollowUps();
    } catch (err: any) {
      console.error('Error saving follow-up:', err);
      Alert.alert('Error', err.message || 'Failed to save follow-up');
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
    setTravelDate(null);
    setReminderTime(null);
    setCurrentLead(null);
  }

  function handleCloseHistoryModal() {
    setShowHistoryModal(false);
    setCurrentLead(null);
    setFollowUpHistory([]);
  }

  const getActionTypeLabel = (actionType: string) => {
    const type = actionTypes.find(t => t.value === actionType);
    return type?.label || actionType;
  };

  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
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
        <Text style={styles.headerTitle}>Follow Ups</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !showTodayOnly && styles.filterButtonActive]}
          onPress={() => setShowTodayOnly(false)}
        >
          <Text style={[styles.filterButtonText, !showTodayOnly && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showTodayOnly && styles.filterButtonActive]}
          onPress={() => setShowTodayOnly(true)}
        >
          <Text style={[styles.filterButtonText, showTodayOnly && styles.filterButtonTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {followUps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No follow-ups scheduled</Text>
          </View>
        ) : (
          followUps.map((followUp) => {
            const { date, time } = formatDateTime(followUp.follow_up_date);
            return (
              <View
                key={followUp.id}
                style={styles.followUpCard}
              >
                <View style={styles.followUpHeader}>
                  <Text style={styles.leadName}>{followUp.lead.client_name}</Text>
                </View>

                <View style={styles.followUpDetails}>
                  <Text style={styles.leadDetail}>
                    {followUp.lead.place} - {followUp.lead.no_of_pax} Pax
                  </Text>

                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeItem}>
                      <View style={styles.dateTimeContent}>
                        <View style={styles.iconContainer}>
                          <Calendar size={14} color="#666" />
                        </View>
                        <Text style={styles.dateTimeText}>{date}</Text>
                      </View>
                    </View>
                    <View style={styles.dateTimeItem}>
                      <View style={styles.dateTimeContent}>
                        <View style={styles.iconContainer}>
                          <Clock size={14} color="#666" />
                        </View>
                        <Text style={styles.dateTimeText}>{time}</Text>
                      </View>
                    </View>
                  </View>

                  {followUp.remark && (
                    <View style={styles.remarkContainer}>
                      <Text style={styles.remarkText}>{followUp.remark}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardActionButtons}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleFollowUp(followUp)}
                  >
                    <View style={styles.buttonIconContainer}>
                      <History size={16} color="#3b82f6" />
                    </View>
                    <Text style={styles.cardActionButtonText}>History</Text>
                  </TouchableOpacity>
                  {followUp.lead.contact_number && (
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => handleWhatsApp(followUp.lead.contact_number!, followUp.lead.client_name, followUp.lead.place)}
                    >
                      <View style={styles.buttonIconContainer}>
                        <MessageCircle size={16} color="#25D366" />
                      </View>
                      <Text style={styles.cardActionButtonText}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => {
                      setCurrentLead(followUp.lead);
                      setShowFollowUpModal(true);
                    }}
                  >
                    <View style={styles.buttonIconContainer}>
                      <Plus size={16} color="#10b981" />
                    </View>
                    <Text style={styles.cardActionButtonText}>New Follow-Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseHistoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Follow-Up History</Text>
              <TouchableOpacity onPress={handleCloseHistoryModal}>
                <View style={styles.iconContainer}>
                  <X size={24} color="#666" />
                </View>
              </TouchableOpacity>
            </View>

            {currentLead && (
              <View style={styles.leadInfo}>
                <View style={styles.leadInfoHeader}>
                  <View style={styles.leadInfoText}>
                    <Text style={styles.leadInfoName}>{currentLead.client_name}</Text>
                    <Text style={styles.leadInfoDetail}>{currentLead.place} • {currentLead.no_of_pax} Pax</Text>
                    {currentLead.contact_number && (
                      <Text style={styles.leadInfoContact}>{currentLead.contact_number}</Text>
                    )}
                  </View>
                  {currentLead.contact_number && (
                    <View style={styles.leadInfoActions}>
                      <TouchableOpacity
                        style={styles.leadInfoActionButton}
                        onPress={() => handleCall(currentLead.contact_number, currentLead)}
                      >
                        <Phone size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.leadInfoActionButton, styles.whatsappButton]}
                        onPress={() => handleWhatsApp(currentLead.contact_number, currentLead.client_name, currentLead.place)}
                      >
                        <MessageCircle size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.addFollowUpButton}
              onPress={handleAddNewFollowUp}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Plus size={20} color="#fff" />
                </View>
                <Text style={styles.addFollowUpButtonText}>Add New Follow-Up</Text>
              </View>
            </TouchableOpacity>

            <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyScrollContent} keyboardShouldPersistTaps="handled">
              {historyLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : followUpHistory.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <View style={styles.iconContainer}>
                    <History size={48} color="#ccc" />
                  </View>
                  <Text style={styles.emptyHistoryText}>No follow-up history</Text>
                </View>
              ) : (
                followUpHistory.map((history) => (
                  <View key={history.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyActionType}>{getActionTypeLabel(history.action_type)}</Text>
                      <Text style={styles.historyDate}>{formatHistoryDate(history.created_at)}</Text>
                    </View>

                    {history.follow_up_note && (
                      <View style={styles.historyNote}>
                        <Text style={styles.historyNoteLabel}>Note:</Text>
                        <Text style={styles.historyNoteText}>{history.follow_up_note}</Text>
                      </View>
                    )}

                    {history.next_follow_up_date && (
                      <View style={styles.historyDetail}>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.iconContainer}>
                            <Calendar size={14} color="#666" />
                          </View>
                          <Text style={styles.historyDetailText}>
                            {`Next Follow-Up: ${new Date(history.next_follow_up_date).toLocaleDateString()}${history.next_follow_up_time ? ` at ${history.next_follow_up_time.slice(0, 5)}` : ''}`}
                          </Text>
                        </View>
                      </View>
                    )}

                    {history.itinerary_id && (
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyDetailLabel}>Itinerary ID:</Text>
                        <Text style={styles.historyDetailValue}>{history.itinerary_id}</Text>
                      </View>
                    )}

                    {history.total_amount && (
                      <View style={styles.historyAmounts}>
                        <View style={styles.historyAmountRow}>
                          <Text style={styles.historyAmountLabel}>Total:</Text>
                          <Text style={styles.historyAmountValue}>₹{history.total_amount}</Text>
                        </View>
                        <View style={styles.historyAmountRow}>
                          <Text style={styles.historyAmountLabel}>Advance:</Text>
                          <Text style={styles.historyAmountValue}>₹{history.advance_amount}</Text>
                        </View>
                        <View style={styles.historyAmountRow}>
                          <Text style={styles.historyAmountLabel}>Due:</Text>
                          <Text style={[styles.historyAmountValue, styles.dueAmountText]}>₹{history.due_amount}</Text>
                        </View>
                      </View>
                    )}

                    {history.transaction_id && (
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyDetailLabel}>Transaction ID:</Text>
                        <Text style={styles.historyDetailValue}>{history.transaction_id}</Text>
                      </View>
                    )}

                    {history.dead_reason && (
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyDetailLabel}>Reason:</Text>
                        <Text style={styles.historyDetailValue}>{history.dead_reason}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

            {currentLead && currentLead.contact_number && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={() => handleCall(currentLead.contact_number, currentLead)}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <Phone size={20} color="#fff" />
                    </View>
                    <Text style={[styles.actionButtonText, styles.actionButtonTextWithIcon]}>Call</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp(currentLead.contact_number, currentLead.client_name, currentLead.place)}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.iconContainer}>
                      <MessageCircle size={20} color="#fff" />
                    </View>
                    <Text style={[styles.actionButtonText, styles.actionButtonTextWithIcon]}>WhatsApp</Text>
                  </View>
                </TouchableOpacity>
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
                    <Text style={styles.label}>Travel Date *</Text>
                    <DateTimePickerComponent
                      value={travelDate}
                      onChange={setTravelDate}
                      mode="date"
                      placeholder="Select travel date"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Reminder Time (7 days before)</Text>
                    <DateTimePickerComponent
                      value={reminderTime}
                      onChange={setReminderTime}
                      mode="time"
                      placeholder="Select reminder time"
                    />
                  </View>

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
                    (actionType === 'confirmed_advance_paid' && (!travelDate || !itineraryId || !totalAmount || !advanceAmount || !transactionId)) ||
                    (actionType === 'dead' && !deadReason)
                  ) && styles.disabledButton
                ]}
                onPress={handleSaveFollowUp}
                disabled={
                  saving || !actionType || !remark.trim() ||
                  (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType) && (!nextFollowUpDate || !nextFollowUpTime)) ||
                  (actionType === 'confirmed_advance_paid' && (!travelDate || !itineraryId || !totalAmount || !advanceAmount || !transactionId)) ||
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
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
  followUpCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  followUpHeader: {
    marginBottom: 8,
  },
  leadName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  followUpDetails: {
    gap: 8,
  },
  leadDetail: {
    fontSize: 14,
    color: '#666',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  remarkContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  remarkText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  cardActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  buttonIconContainer: {
    marginRight: 4,
  },
  cardActionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16,
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
    backgroundColor: '#25D366',
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
  leadInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadInfoText: {
    flex: 1,
    marginRight: 12,
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
    marginBottom: 4,
  },
  leadInfoContact: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  leadInfoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  leadInfoActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  addFollowUpButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFollowUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyScroll: {
    flex: 1,
  },
  historyScrollContent: {
    paddingBottom: 20,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  historyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyActionType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  historyNote: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  historyNoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  historyNoteText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  historyDetail: {
    marginBottom: 8,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDetailText: {
    fontSize: 14,
    color: '#666',
  },
  historyDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  historyDetailValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  historyAmounts: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  historyAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dueAmountText: {
    color: '#3b82f6',
  },
});
