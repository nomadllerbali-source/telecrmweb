import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Modal, TextInput, AppState, AppStateStatus, Alert } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead, Itinerary } from '@/types';
import { ArrowLeft, Calendar, Clock, Phone, MessageCircle, X, ChevronDown, Plus, History, Package, Edit } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { calendarService } from '@/services/calendar';
import { scheduleFollowUpNotification } from '../../services/notifications';
import { syncAdvancePaymentToFinance } from '@/services/financeSync';
import { Colors, Layout } from '@/constants/Colors';

interface FollowUpWithLead {
  id: string;
  follow_up_date: string;
  status: string;
  remark: string;
  itinerary_id: string | null;
  lead: {
    id: string;
    client_name: string;
    place: string;
    no_of_pax: number;
    contact_number: string | null;
    assigned_by: string | null;
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
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [deadReason, setDeadReason] = useState('');
  const [showDeadReasonPicker, setShowDeadReasonPicker] = useState(false);
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [availableItineraries, setAvailableItineraries] = useState<Itinerary[]>([]);
  const [showItineraryPicker, setShowItineraryPicker] = useState(false);
  const [itinerarySearchQuery, setItinerarySearchQuery] = useState('');
  const [filterDays, setFilterDays] = useState('');
  const [filterPax, setFilterPax] = useState('');
  const [filterTransport, setFilterTransport] = useState('');
  const [fetchingItinerary, setFetchingItinerary] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      fetchFollowUps();

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        subscription.remove();
      };
    }, [showTodayOnly, user])
  );

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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching follow-ups for user:', user.id);
      let query = supabase
        .from('follow_ups')
        .select(`
          *,
          lead:leads(id, client_name, place, no_of_pax, contact_number, assigned_by)
        `)
        .eq('sales_person_id', user.id)
        .eq('status', 'pending')
        .order('follow_up_date', { ascending: true });

      if (showTodayOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('follow_up_date', `${today}T00:00:00`).lt('follow_up_date', `${today}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;

      let enrichedData = data || [];
      console.log('Raw follow-ups count:', enrichedData.length);

      if (enrichedData.length > 0) {
        const leadIds = enrichedData.map(f => f.lead.id);
        // Get the latest itinerary_id for each lead in the list
        const { data: latestItineraries } = await supabase
          .from('follow_ups')
          .select('lead_id, itinerary_id, created_at')
          .in('lead_id', leadIds)
          .not('itinerary_id', 'is', null)
          .order('created_at', { ascending: false });

        console.log('Latest itineraries found:', latestItineraries?.length);

        if (latestItineraries && latestItineraries.length > 0) {
          enrichedData = enrichedData.map(followUp => {
            // Find the most recent itinerary_id for this lead
            const leadId = followUp.lead?.id || (followUp as any).lead_id;
            const latest = latestItineraries.find(li => String(li.lead_id) === String(leadId));

            if (latest && latest.itinerary_id && !followUp.itinerary_id) {
              console.log(`Enriching lead ${leadId} with itinerary ${latest.itinerary_id}`);
              return { ...followUp, itinerary_id: latest.itinerary_id };
            }
            return followUp;
          });
        }
      }

      setFollowUps(enrichedData);
    } catch (err: any) {
      console.error('Error fetching follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = async (followUp: FollowUpWithLead) => {
    console.log('Card pressed:', followUp.id);
    console.log('Linked Itinerary ID:', followUp.itinerary_id);
    setCurrentLead(followUp.lead);

    if (followUp.itinerary_id) {
      setFetchingItinerary(true);
      setShowItineraryModal(true);
      try {
        console.log('Fetching itinerary details for:', followUp.itinerary_id);
        const { data, error } = await supabase
          .from('itineraries')
          .select('*')
          .eq('id', followUp.itinerary_id)
          .single();

        if (error) {
          console.error('Supabase error fetching itinerary:', error);
          throw error;
        }
        console.log('Itinerary data fetched:', data ? 'Found' : 'Null');
        setSelectedItinerary(data);
      } catch (err: any) {
        console.error('Error fetching itinerary:', err);
        // Don't show error alert, just log. We can still show lead details.
        setSelectedItinerary(null);
      } finally {
        setFetchingItinerary(false);
      }
    } else {
      console.log('No itinerary_id on this follow-up');
      setSelectedItinerary(null);
      setShowItineraryModal(true);
    }
  };

  const handleEditItinerary = (itineraryId: string) => {
    setShowItineraryModal(false);
    router.push({
      pathname: '/sales/saved-itinerary',
      params: { editId: itineraryId }
    });
  };

  const handleViewItinerary = async (itineraryId: string) => {
    setFetchingItinerary(true);
    setShowItineraryModal(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', itineraryId)
        .single();

      if (error) throw error;
      setSelectedItinerary(data);
    } catch (err) {
      console.error('Error fetching itinerary:', err);
      setSelectedItinerary(null);
    } finally {
      setFetchingItinerary(false);
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

  const handleAddNewFollowUp = async (lead?: Lead) => {
    // If a lead is passed, use it; otherwise fallback to currentLead
    const targetLead = lead || currentLead;
    if (lead) {
      setCurrentLead(lead);
    }

    setNextFollowUpDate(new Date());
    setNextFollowUpTime(new Date());
    setRemark('');
    setActionType('follow_up');

    // Fetch available itineraries for selection
    try {
      const { data: itinerariesData, error: itinerariesError } = await supabase
        .from('itineraries')
        .select('id, name, days, no_of_pax, mode_of_transport')
        .order('created_at', { ascending: false });

      if (!itinerariesError && itinerariesData) {
        // @ts-ignore
        setAvailableItineraries(itinerariesData);
      }
    } catch (err) {
      console.log('Error fetching itineraries list:', err);
    }

    // Fetch latest itinerary for the target lead to pre-fill context
    if (targetLead?.id) {
      try {
        console.log('Fetching latest itinerary for lead:', targetLead.id);
        const { data, error } = await supabase
          .from('follow_ups')
          .select('itinerary_id')
          .eq('lead_id', targetLead.id)
          .not('itinerary_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && data.itinerary_id) {
          console.log('Found previous itinerary ID:', data.itinerary_id);
          setItineraryId(data.itinerary_id);
        } else {
          console.log('No previous itinerary ID found');
          // Reset to null if none found, to avoid carrying over from previous state
          setItineraryId(null);
        }
      } catch (err) {
        console.log('Error fetching previous itinerary:', err);
        setItineraryId(null);
      }
    }

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
        itinerary_id: itineraryId || null,
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

        // Reminder creation continues...
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
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.iconContainer}>
              <ArrowLeft size={24} color={Colors.text.inverse} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Follow Ups</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, !showTodayOnly && styles.activeTab]}
          onPress={() => setShowTodayOnly(false)}
        >
          <Text style={[styles.tabText, !showTodayOnly && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showTodayOnly && styles.activeTab]}
          onPress={() => setShowTodayOnly(true)}
        >
          <Text style={[styles.tabText, showTodayOnly && styles.activeTabText]}>
            Today
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContent} contentContainerStyle={styles.contentContainer}>
        {followUps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No follow-ups scheduled</Text>
          </View>
        ) : (
          followUps.map((followUp) => {
            const { date, time } = formatDateTime(followUp.follow_up_date);
            return (
              <TouchableOpacity
                key={followUp.id}
                style={styles.card}
                onPress={() => handleCardPress(followUp)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.clientName}>{followUp.lead.client_name}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.leadDetail}>
                    {followUp.lead.place} - {followUp.lead.no_of_pax} Pax
                  </Text>

                  <View style={styles.infoRow}>
                    <Calendar size={14} color={Colors.text.secondary} />
                    <Text style={styles.infoText}>{date}</Text>
                    <Clock size={14} color={Colors.text.secondary} style={{ marginLeft: 8 }} />
                    <Text style={styles.infoText}>{time}</Text>
                  </View>

                  {followUp.remark && (
                    <View style={styles.remarkContainer}>
                      <Text style={styles.remarkText}>{followUp.remark}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border }]}
                    onPress={() => handleFollowUp(followUp)}
                  >
                    <History size={16} color={Colors.primary} />
                    <Text style={[styles.actionButtonText, { color: Colors.primary }]}>History</Text>
                  </TouchableOpacity>

                  {followUp.lead.contact_number && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.whatsAppButton]}
                      onPress={() => handleWhatsApp(followUp.lead.contact_number!, followUp.lead.client_name, followUp.lead.place)}
                    >
                      <MessageCircle size={16} color={Colors.text.inverse} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.followUpButton]}
                    onPress={() => handleAddNewFollowUp(followUp.lead as any)}
                  >
                    <Plus size={16} color={Colors.text.inverse} />
                    <Text style={styles.actionButtonText}>Follow-Up</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Follow-Up History</Text>
              <TouchableOpacity onPress={handleCloseHistoryModal}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {currentLead && (
              <View style={[styles.leadInfoContainer, { marginBottom: 16 }]}>
                <Text style={styles.clientName}>{currentLead.client_name}</Text>
                <Text style={styles.leadDetail}>{currentLead.place} • {currentLead.no_of_pax} Pax</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { marginBottom: 16, marginTop: 0 }]}
              onPress={() => handleAddNewFollowUp()}
            >
              <Plus size={20} color={Colors.text.inverse} style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Add New Follow-Up</Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {historyLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : followUpHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <History size={48} color={Colors.text.tertiary} />
                  <Text style={styles.emptyText}>No follow-up history</Text>
                </View>
              ) : (
                followUpHistory.map((history) => (
                  <View key={history.id} style={[styles.card, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.clientName, { fontSize: 16 }]}>{getActionTypeLabel(history.action_type)}</Text>
                      {history.itinerary_id && (
                        <TouchableOpacity
                          onPress={() => handleViewItinerary(history.itinerary_id!)}
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                          <Package size={14} color={Colors.accent} />
                          <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>View Itinerary</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.infoText, { fontSize: 12, marginBottom: 8 }]}>{formatHistoryDate(history.created_at)}</Text>

                    {history.follow_up_note && (
                      <View style={styles.remarkContainer}>
                        <Text style={styles.remarkText}>{history.follow_up_note}</Text>
                      </View>
                    )}

                    {history.next_follow_up_date && (
                      <View style={[styles.infoRow, { marginTop: 8 }]}>
                        <Calendar size={14} color={Colors.text.secondary} />
                        <Text style={styles.infoText}>
                          Next: {new Date(history.next_follow_up_date).toLocaleDateString()}
                        </Text>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Follow-Up</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: '80%' }} keyboardShouldPersistTaps="handled">
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
                    <ChevronDown size={20} color={Colors.text.secondary} />
                  </View>
                </TouchableOpacity>

                {showActionPicker && (
                  <View style={styles.pickerOptions}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
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
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Link Itinerary (Optional)</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    setShowItineraryPicker(!showItineraryPicker);
                    setItinerarySearchQuery('');
                  }}
                >
                  <Text style={[styles.pickerButtonText, !itineraryId && styles.placeholderText]}>
                    {itineraryId
                      ? availableItineraries.find(i => i.id === itineraryId)?.name || 'Itinerary Linked'
                      : 'Select Itinerary'}
                  </Text>
                  <ChevronDown size={20} color={Colors.text.secondary} />
                </TouchableOpacity>

                {showItineraryPicker && (
                  <View style={styles.pickerOptions}>
                    <View style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, margin: 0, height: 40 }]}
                        placeholder="Name..."
                        placeholderTextColor={Colors.text.tertiary}
                        value={itinerarySearchQuery}
                        onChangeText={setItinerarySearchQuery}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={[styles.input, { width: 60, margin: 0, height: 40 }]}
                        placeholder="Day"
                        placeholderTextColor={Colors.text.tertiary}
                        value={filterDays}
                        onChangeText={setFilterDays}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, { width: 60, margin: 0, height: 40 }]}
                        placeholder="Pax"
                        placeholderTextColor={Colors.text.tertiary}
                        value={filterPax}
                        onChangeText={setFilterPax}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['All', 'driver_with_cab', 'self_drive_cab', 'self_drive_scooter'].map((mode) => (
                          <TouchableOpacity
                            key={mode}
                            onPress={() => setFilterTransport(mode === 'All' ? '' : mode)}
                            style={{
                              backgroundColor: filterTransport === (mode === 'All' ? '' : mode) ? Colors.primary : Colors.background,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 16,
                              marginRight: 8,
                              borderWidth: 1,
                              borderColor: Colors.border
                            }}
                          >
                            <Text style={{
                              color: filterTransport === (mode === 'All' ? '' : mode) ? '#fff' : Colors.text.primary,
                              fontSize: 12,
                              fontWeight: '600'
                            }}>
                              {mode === 'All' ? 'All Transport' : mode.replace(/_/g, ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                      <TouchableOpacity
                        style={styles.pickerOption}
                        onPress={() => {
                          setItineraryId(null);
                          setShowItineraryPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerOptionText, { color: Colors.text.tertiary }]}>None</Text>
                      </TouchableOpacity>
                      {availableItineraries
                        .filter(itinerary => {
                          const matchesName = itinerary.name.toLowerCase().includes(itinerarySearchQuery.toLowerCase());
                          const matchesDays = !filterDays || (itinerary.days && itinerary.days.toString() === filterDays);
                          const matchesPax = !filterPax || (itinerary.no_of_pax && itinerary.no_of_pax.toString() === filterPax);
                          const matchesTransport = !filterTransport || (itinerary.mode_of_transport === filterTransport);

                          return matchesName && matchesDays && matchesPax && matchesTransport;
                        })
                        .map((itinerary) => (
                          <TouchableOpacity
                            key={itinerary.id}
                            style={styles.pickerOption}
                            onPress={() => {
                              setItineraryId(itinerary.id);
                              setShowItineraryPicker(false);
                            }}
                          >
                            <Text style={styles.pickerOptionText}>
                              {itinerary.name} ({itinerary.days || '?'}D, {itinerary.no_of_pax || '?'}Pax)
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                      value={itineraryId || ''}
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
                    <View style={{ padding: 12, backgroundColor: Colors.surfaceHighlight, borderRadius: 8, marginBottom: 16 }}>
                      <Text style={{ fontWeight: '600', color: Colors.text.primary }}>Due Amount:</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.primary }}>₹{calculateDueAmount().toFixed(2)}</Text>
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
                    <ChevronDown size={20} color={Colors.text.secondary} />
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
                    placeholderTextColor={Colors.text.tertiary}
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
                style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton, { flex: 2, marginTop: 12, opacity: saving ? 0.7 : 1 }
                ]}
                onPress={handleSaveFollowUp}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showItineraryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowItineraryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lead & Itinerary Details</Text>
              <TouchableOpacity onPress={() => setShowItineraryModal(false)}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {fetchingItinerary ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ marginTop: 12, color: Colors.text.secondary }}>Loading details...</Text>
              </View>
            ) : (
              <ScrollView style={{ padding: 0 }}>
                {/* Lead Details Section */}
                {currentLead && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.label}>Guest Details</Text>
                    <View style={styles.leadInfoContainer}>
                      <Text style={styles.clientName}>{currentLead.client_name}</Text>
                      <Text style={styles.leadDetail}>{currentLead.place} • {currentLead.no_of_pax} Pax</Text>
                      {currentLead.contact_number && (
                        <TouchableOpacity
                          style={styles.leadContactRow}
                          onPress={() => Linking.openURL(`tel:${currentLead.contact_number}`)}
                        >
                          <Phone size={14} color={Colors.primary} />
                          <Text style={styles.leadContactText}>{currentLead.contact_number}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Itinerary Details Section */}
                {selectedItinerary ? (
                  <>
                    <View style={styles.divider} />
                    <View style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 16 }}>
                      <Text style={styles.label}>Itinerary: {selectedItinerary.name}</Text>
                      <Text style={{ fontSize: 14, color: Colors.text.secondary }}>{selectedItinerary.days} Days</Text>
                    </View>

                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.label, { color: Colors.text.primary }]}>Overview</Text>
                      <Text style={{ fontSize: 14, color: Colors.text.secondary, lineHeight: 20 }}>
                        {selectedItinerary.full_itinerary || 'No overview available'}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.label, { color: Colors.text.primary }]}>Inclusions</Text>
                      <Text style={{ fontSize: 14, color: Colors.text.secondary, lineHeight: 20 }}>
                        {selectedItinerary.inclusions || 'N/A'}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: Colors.surfaceHighlight, padding: 16, borderRadius: 12, marginBottom: 24 }}>
                      <Text style={{ fontSize: 13, color: Colors.text.secondary, marginBottom: 4 }}>Lead Cost (USD)</Text>
                      <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.text.primary }}>${selectedItinerary.cost_usd}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No itinerary linked to this follow-up.</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={[styles.modalActions, { marginTop: 0, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1, marginTop: 0 }]}
                onPress={() => setShowItineraryModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              {selectedItinerary && (
                <TouchableOpacity
                  style={[styles.saveButton, { flex: 1, marginTop: 0, marginLeft: 12, backgroundColor: Colors.accent }]}
                  onPress={() => handleEditItinerary(selectedItinerary.id)}
                >
                  <Edit size={18} color={Colors.text.inverse} style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: Layout.spacing.lg,
    borderBottomLeftRadius: Layout.radius.xl,
    borderBottomRightRadius: Layout.radius.xl,
    ...Layout.shadows.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Layout.radius.full,
    paddingHorizontal: Layout.spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.md,
    marginTop: -Layout.spacing.lg, // Overlap for modern look
    marginBottom: Layout.spacing.md,
  },
  tab: {
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.full,
    marginRight: Layout.spacing.sm,
    backgroundColor: Colors.surface,
    ...Layout.shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  listContent: {
    padding: Layout.spacing.md,
    paddingTop: Layout.spacing.xl, // Space for overlapping tabs
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    ...Layout.shadows.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.sm,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  leadTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
    marginLeft: 8,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  remarkContainer: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: Layout.radius.md,
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.text.tertiary,
  },
  remarkText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.full,
    gap: 6,
    ...Layout.shadows.sm,
  },
  whatsAppButton: {
    backgroundColor: '#25D366', // Keep brand color
  },
  contentContainer: {
    paddingBottom: Layout.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  callButton: {
    backgroundColor: Colors.status.info,
  },
  followUpButton: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    maxHeight: '85%',
    ...Layout.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary, // Darker label
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerButtonText: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  iconContainer: {
    marginLeft: 8,
  },
  pickerOptions: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.sm,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.md,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: Layout.radius.full,
    alignItems: 'center',
    marginTop: 10,
    ...Layout.shadows.md,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: Layout.radius.full,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  leadInfoContainer: {
    backgroundColor: Colors.surfaceHighlight, // Subtle highlight
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '30', // Semi-transparent brand color
  },
  leadContactRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 16,
  },
  leadContactText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Layout.spacing.md,
  },
  backButton: {
    padding: 4,
  },
  leadDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
