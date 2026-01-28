import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead, Destination, Itinerary } from '@/types';
import { ArrowLeft, Phone, MessageCircle, X, Calendar, Users, MapPin, DollarSign, ChevronDown, Filter, Search } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { calendarService } from '@/services/calendar';

export default function AddedLeadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState('');
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [travelMonth, setTravelMonth] = useState('');
  const [noOfPax, setNoOfPax] = useState('');
  const [place, setPlace] = useState('');
  const [budget, setBudget] = useState('');
  const [remarks, setRemarks] = useState('');

  const [actionType, setActionType] = useState('');
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(new Date());
  const [nextFollowUpTime, setNextFollowUpTime] = useState(new Date());
  const [itineraryId, setItineraryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [deadReason, setDeadReason] = useState('');
  const [showDeadReasonPicker, setShowDeadReasonPicker] = useState(false);
  const [confirmTravelDate, setConfirmTravelDate] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);

  const [availableItineraries, setAvailableItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [showItineraryPicker, setShowItineraryPicker] = useState(false);
  const [loadingItineraries, setLoadingItineraries] = useState(false);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);

  const [filterPax, setFilterPax] = useState('');
  const [filterDays, setFilterDays] = useState('');
  const [filterTransportMode, setFilterTransportMode] = useState('');
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [itinerarySearchText, setItinerarySearchText] = useState('');
  const [showItinerarySection, setShowItinerarySection] = useState(false);

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

  const transportModes = [
    { label: 'Driver with Cab', value: 'driver_with_cab' },
    { label: 'Self Drive Cab', value: 'self_drive_cab' },
    { label: 'Self Drive Scooter', value: 'self_drive_scooter' },
  ];

  useEffect(() => {
    fetchLeads();
    fetchDestinations();

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
      setCurrentLead(leadForCallRef.current);
      resetForm();
      setShowUpdateModal(true);
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
        .eq('status', 'added_by_sales')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinations = async () => {
    setLoadingDestinations(true);
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setDestinations(data || []);
    } catch (err: any) {
      console.error('Error fetching destinations:', err);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setTravelDate(null);
    setTravelMonth('');
    setNoOfPax('');
    setPlace('');
    setBudget('');
    setRemarks('');
    setSelectedItinerary(null);
    setAvailableItineraries([]);
    setFilteredItineraries([]);
    setSelectedDestination(null);
    setFilterPax('');
    setFilterDays('');
    setFilterTransportMode('');
    setItinerarySearchText('');
    setShowItinerarySection(false);
  };

  const fetchItinerariesByDestination = async (destinationId: string) => {
    if (!destinationId) {
      setAvailableItineraries([]);
      setFilteredItineraries([]);
      setSelectedItinerary(null);
      return;
    }

    setLoadingItineraries(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('destination_id', destinationId);

      if (error) throw error;
      setAvailableItineraries(data || []);
      setFilteredItineraries(data || []);
    } catch (err: any) {
      console.error('Error fetching itineraries:', err);
      setAvailableItineraries([]);
      setFilteredItineraries([]);
    } finally {
      setLoadingItineraries(false);
    }
  };

  useEffect(() => {
    applyItineraryFilters();
  }, [filterPax, filterDays, filterTransportMode, itinerarySearchText, availableItineraries]);

  const applyItineraryFilters = () => {
    let filtered = [...availableItineraries];

    if (filterPax) {
      const paxNum = parseInt(filterPax);
      filtered = filtered.filter((it) => it.no_of_pax >= paxNum);
    }

    if (filterDays) {
      const daysNum = parseInt(filterDays);
      filtered = filtered.filter((it) => it.days === daysNum);
    }

    if (filterTransportMode) {
      filtered = filtered.filter((it) => it.mode_of_transport === filterTransportMode);
    }

    if (itinerarySearchText.trim()) {
      const searchLower = itinerarySearchText.toLowerCase();
      filtered = filtered.filter((it) =>
        it.name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredItineraries(filtered);
  };

  const handleDestinationChange = (destination: Destination) => {
    setSelectedDestination(destination);
    setPlace(destination.name);
    setShowDestinationPicker(false);
    setShowItinerarySection(true);
    setSelectedItinerary(null);
    setFilterPax('');
    setFilterDays('');
    setFilterTransportMode('');
    setItinerarySearchText('');
    fetchItinerariesByDestination(destination.id);
  };

  const getTransportModeLabel = (value: string) => {
    return transportModes.find((mode) => mode.value === value)?.label || value;
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

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const message = `Hello! I'm reaching out regarding your travel inquiry.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
    });
  };

  const handleWhatsAppWithItinerary = () => {
    if (!currentLead?.contact_number || !selectedItinerary) {
      Alert.alert('Error', 'Please select an itinerary and ensure contact number exists');
      return;
    }

    const cleanNumber = currentLead.contact_number.replace(/[^\d+]/g, '');
    const usdRate = 84;
    const costINR = selectedItinerary.cost_inr || selectedItinerary.cost_usd * usdRate;

    const message = `Hi ${clientName || 'there'}! 👋

Here's your customized ${selectedDestination?.name || place} itinerary:

*${selectedItinerary.name}*
📅 Duration: ${selectedItinerary.days} days
👥 Suitable for: ${selectedItinerary.no_of_pax} pax
🚗 Transport: ${getTransportModeLabel(selectedItinerary.mode_of_transport)}
💰 Cost: $${selectedItinerary.cost_usd} USD (₹${costINR.toFixed(0)} INR)

*Overview:*
${selectedItinerary.full_itinerary}

*What's Included:*
${selectedItinerary.inclusions}

*What's Not Included:*
${selectedItinerary.exclusions}

${selectedItinerary.important_notes ? `*Important Notes:*\n${selectedItinerary.important_notes}\n\n` : ''}${selectedItinerary.disclaimers ? `*Disclaimers:*\n${selectedItinerary.disclaimers}\n\n` : ''}Let me know if you'd like any modifications or have questions! 😊`;

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
      Alert.alert('Error', 'Could not open WhatsApp. Please try again.');
    });
  };

  const validateProfile = (): string | null => {
    if (!clientName.trim()) return 'Client name is required';
    if (!selectedDestination) return 'Please select a destination';
    if (!noOfPax || parseInt(noOfPax) < 1) return 'Number of persons must be at least 1';
    if (!budget || parseFloat(budget) <= 0) return 'Budget must be greater than 0';
    if (!travelDate && !travelMonth.trim()) return 'Please provide either travel date or month';
    return null;
  };

  const calculateDueAmount = () => {
    const total = parseFloat(totalAmount) || 0;
    const advance = parseFloat(advanceAmount) || 0;
    return total - advance;
  };

  const getActionTypeLabel = (value: string) => {
    return actionTypes.find((type) => type.value === value)?.label || value;
  };

  const handleAddFollowUp = async () => {
    if (!currentLead) return;

    const validationError = validateProfile();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    if (!actionType) {
      Alert.alert('Error', 'Please select an action type');
      return;
    }

    if (!followUpRemark.trim()) {
      Alert.alert('Error', 'Please add a remark');
      return;
    }

    if (actionType === 'confirmed_advance_paid' && !confirmTravelDate) {
      Alert.alert('Error', 'Please select a travel date');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        client_name: clientName.trim(),
        place: place.trim(),
        destination_id: selectedDestination?.id || null,
        no_of_pax: parseInt(noOfPax),
        expected_budget: parseFloat(budget),
        remark: remarks.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (travelDate) {
        updateData.travel_date = travelDate.toISOString().split('T')[0];
        updateData.travel_month = null;
      } else if (travelMonth.trim()) {
        updateData.travel_month = travelMonth.trim();
        updateData.travel_date = null;
      }

      if (actionType === 'confirmed_advance_paid') {
        updateData.status = 'confirmed';
        if (confirmTravelDate) {
          updateData.travel_date = confirmTravelDate.toISOString().split('T')[0];
          updateData.travel_month = null;
        }
      } else if (actionType === 'dead') {
        updateData.status = 'dead';
      } else if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        updateData.status = 'follow_up';
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', currentLead.id);

      if (updateError) throw updateError;

      const followUpData: any = {
        lead_id: currentLead.id,
        sales_person_id: user?.id,
        action_type: actionType,
        follow_up_note: followUpRemark.trim(),
        follow_up_date: new Date().toISOString(),
        status: 'completed',
      };

      if (actionType === 'confirmed_advance_paid' && confirmTravelDate) {
        followUpData.itinerary_id = itineraryId;
        followUpData.total_amount = parseFloat(totalAmount);
        followUpData.advance_amount = parseFloat(advanceAmount);
        followUpData.due_amount = calculateDueAmount();
        followUpData.transaction_id = transactionId;
      }

      if (actionType === 'dead') {
        followUpData.dead_reason = deadReason;
      }

      const { error: followUpError } = await supabase
        .from('follow_ups')
        .insert(followUpData);

      if (followUpError) throw followUpError;

      if (['itinerary_sent', 'itinerary_updated', 'follow_up'].includes(actionType)) {
        const dateValue = nextFollowUpDate.toISOString().split('T')[0];
        const timeValue = nextFollowUpTime.toTimeString().split(':').slice(0, 2).join(':');
        const nextFollowUpDateTime = `${dateValue}T${timeValue}:00`;

        const { error: nextFollowUpError } = await supabase
          .from('follow_ups')
          .insert({
            lead_id: currentLead.id,
            sales_person_id: user?.id,
            follow_up_date: nextFollowUpDateTime,
            status: 'pending',
            remark: `Scheduled follow-up after ${getActionTypeLabel(actionType)}`,
          });

        if (nextFollowUpError) throw nextFollowUpError;
      }

      const { error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          lead_id: currentLead.id,
          sales_person_id: user?.id,
          call_start_time: new Date().toISOString(),
          call_duration: 0,
        });

      if (callLogError) throw callLogError;

      const actionTypeLabel = getActionTypeLabel(actionType);
      await supabase.from('notifications').insert({
        user_id: currentLead.assigned_by || user?.id,
        type: 'follow_up',
        title: 'Follow-up Updated',
        message: `Follow-up added for ${clientName} - ${actionTypeLabel}`,
        lead_id: currentLead.id,
      });

      if (actionType === 'confirmed_advance_paid' && confirmTravelDate && user) {
        const reminderDate = new Date(confirmTravelDate);
        reminderDate.setDate(reminderDate.getDate() - 7);

        const reminderTimeObj = reminderTime || new Date();

        try {
          const calendarTitle = `Travel Reminder: ${clientName}`;
          const calendarDescription = `Client: ${clientName}
Location: ${place}
Pax: ${noOfPax}
Travel Date: ${confirmTravelDate.toISOString().split('T')[0]}

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
            clientName
          );

          await supabase.from('reminders').insert({
            lead_id: currentLead.id,
            sales_person_id: user.id,
            travel_date: confirmTravelDate.toISOString().split('T')[0],
            reminder_date: reminderDate.toISOString().split('T')[0],
            reminder_time: reminderTime?.toTimeString().slice(0, 5) || '09:00',
            calendar_event_id: calendarEventId,
            status: 'pending',
          });
        } catch (reminderError) {
          console.error('Error creating reminder:', reminderError);
        }
      }

      handleCloseModal();
      fetchLeads();
    } catch (err: any) {
      console.error('Error adding follow-up:', err);
      Alert.alert('Error', err.message || 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowUpdateModal(false);
    resetForm();
    setActionType('');
    setFollowUpRemark('');
    setNextFollowUpDate(new Date());
    setNextFollowUpTime(new Date());
    setItineraryId('');
    setTotalAmount('');
    setAdvanceAmount('');
    setTransactionId('');
    setDeadReason('');
    setConfirmTravelDate(null);
    setReminderTime(null);
    setCurrentLead(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Added Leads</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyState}>
            <Phone size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Added Leads Yet</Text>
            <Text style={styles.emptyText}>
              Start adding leads with their contact numbers to begin your outreach
            </Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <View style={styles.phoneContainer}>
                  <Phone size={20} color="#14b8a6" />
                  <Text style={styles.phoneNumber}>{lead.contact_number}</Text>
                </View>
                <Text style={styles.timestamp}>{formatDate(lead.created_at)}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={() => handleCall(lead.contact_number!, lead)}
                >
                  <Phone size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp(lead.contact_number!)}
                >
                  <MessageCircle size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showUpdateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Lead Profile</Text>
            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <TextInput
                style={styles.input}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Enter client name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Travel Date</Text>
              <DateTimePickerComponent
                value={travelDate}
                onChange={setTravelDate}
                placeholder="Select travel date"
                mode="date"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Or Travel Month</Text>
              <TextInput
                style={styles.input}
                value={travelMonth}
                onChangeText={setTravelMonth}
                placeholder="e.g., June 2026"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Number of Persons *</Text>
              <TextInput
                style={styles.input}
                value={noOfPax}
                onChangeText={setNoOfPax}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination Place *</Text>
              {loadingDestinations ? (
                <View style={[styles.pickerButton, styles.loadingPicker]}>
                  <ActivityIndicator size="small" color="#14b8a6" />
                  <Text style={styles.pickerButtonText}>Loading destinations...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDestinationPicker(!showDestinationPicker)}
                  >
                    <Text style={[styles.pickerButtonText, !selectedDestination && styles.placeholderText]}>
                      {selectedDestination ? selectedDestination.name : 'Select a destination'}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </TouchableOpacity>
                  {showDestinationPicker && (
                    <View style={styles.pickerOptions}>
                      {destinations.map((destination) => (
                        <TouchableOpacity
                          key={destination.id}
                          style={styles.pickerOption}
                          onPress={() => handleDestinationChange(destination)}
                        >
                          <Text style={styles.pickerOptionText}>{destination.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {showItinerarySection && (
              <View style={styles.itinerarySectionContainer}>
                <View style={styles.itinerarySectionHeader}>
                  <MapPin size={20} color="#14b8a6" />
                  <Text style={styles.itinerarySectionTitle}>Select Itinerary (Optional)</Text>
                </View>
                <Text style={styles.itinerarySectionSubtitle}>
                  Choose an itinerary to send via WhatsApp, or skip this step
                </Text>

                <View style={styles.filtersContainer}>
                  <Text style={styles.filtersLabel}>Filter Itineraries:</Text>

                  <View style={styles.filterRow}>
                    <View style={[styles.filterItem, styles.filterItemHalf]}>
                      <Text style={styles.filterItemLabel}>Passengers</Text>
                      <TextInput
                        style={styles.filterInput}
                        value={filterPax}
                        onChangeText={setFilterPax}
                        placeholder="Min pax"
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.filterItem, styles.filterItemHalf]}>
                      <Text style={styles.filterItemLabel}>Days</Text>
                      <TextInput
                        style={styles.filterInput}
                        value={filterDays}
                        onChangeText={setFilterDays}
                        placeholder="No. of days"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.filterItem}>
                    <Text style={styles.filterItemLabel}>Transport Mode</Text>
                    <TouchableOpacity
                      style={styles.filterInput}
                      onPress={() => setShowTransportPicker(!showTransportPicker)}
                    >
                      <Text style={[styles.pickerButtonText, !filterTransportMode && styles.placeholderText]}>
                        {filterTransportMode ? getTransportModeLabel(filterTransportMode) : 'All transport modes'}
                      </Text>
                      <ChevronDown size={16} color="#666" />
                    </TouchableOpacity>
                    {showTransportPicker && (
                      <View style={styles.pickerOptions}>
                        <TouchableOpacity
                          style={styles.pickerOption}
                          onPress={() => {
                            setFilterTransportMode('');
                            setShowTransportPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>All transport modes</Text>
                        </TouchableOpacity>
                        {transportModes.map((mode) => (
                          <TouchableOpacity
                            key={mode.value}
                            style={styles.pickerOption}
                            onPress={() => {
                              setFilterTransportMode(mode.value);
                              setShowTransportPicker(false);
                            }}
                          >
                            <Text style={styles.pickerOptionText}>{mode.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.filterItem}>
                    <Text style={styles.filterItemLabel}>Search by Name</Text>
                    <View style={styles.searchInputContainer}>
                      <Search size={18} color="#999" />
                      <TextInput
                        style={styles.searchInput}
                        value={itinerarySearchText}
                        onChangeText={setItinerarySearchText}
                        placeholder="Search itineraries..."
                      />
                    </View>
                  </View>
                </View>

                {loadingItineraries ? (
                  <View style={styles.loadingItinerariesContainer}>
                    <ActivityIndicator size="small" color="#14b8a6" />
                    <Text style={styles.loadingItinerariesText}>Loading itineraries...</Text>
                  </View>
                ) : filteredItineraries.length > 0 ? (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Choose Itinerary</Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowItineraryPicker(!showItineraryPicker)}
                      >
                        <Text style={[styles.pickerButtonText, !selectedItinerary && styles.placeholderText]}>
                          {selectedItinerary ? selectedItinerary.name : `Select from ${filteredItineraries.length} itineraries`}
                        </Text>
                        <ChevronDown size={20} color="#666" />
                      </TouchableOpacity>
                      {showItineraryPicker && (
                        <ScrollView style={styles.pickerOptionsScrollable}>
                          <View style={styles.pickerOptions}>
                            {filteredItineraries.map((itinerary) => (
                              <TouchableOpacity
                                key={itinerary.id}
                                style={styles.pickerOption}
                                onPress={() => {
                                  setSelectedItinerary(itinerary);
                                  setShowItineraryPicker(false);
                                }}
                              >
                                <View style={styles.itineraryOptionContent}>
                                  <Text style={styles.pickerOptionText}>{itinerary.name}</Text>
                                  <Text style={styles.itinerarySubtext}>
                                    {itinerary.days} days • {itinerary.no_of_pax} pax • {getTransportModeLabel(itinerary.mode_of_transport)}
                                  </Text>
                                  <Text style={styles.itineraryCost}>
                                    ${itinerary.cost_usd} USD • ₹{itinerary.cost_inr || itinerary.cost_usd * 84} INR
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      )}
                    </View>

                    {selectedItinerary && (
                      <TouchableOpacity
                        style={styles.whatsappItineraryButton}
                        onPress={handleWhatsAppWithItinerary}
                      >
                        <MessageCircle size={20} color="#fff" />
                        <Text style={styles.whatsappItineraryButtonText}>Send Itinerary via WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <Text style={styles.noItinerariesText}>
                    No itineraries match your filters. Try adjusting your search.
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.skipItineraryButton}
                  onPress={() => setShowItinerarySection(false)}
                >
                  <Text style={styles.skipItineraryButtonText}>Skip Itinerary Selection</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expected Budget *</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="Enter budget"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Add any additional notes"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Follow-Up Action</Text>
              <Text style={styles.sectionSubtitle}>Required to save the lead details</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Action Type *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowActionPicker(!showActionPicker)}
              >
                <Text style={[styles.pickerButtonText, !actionType && styles.placeholderText]}>
                  {actionType ? getActionTypeLabel(actionType) : 'Select action type'}
                </Text>
                <ChevronDown size={20} color="#666" />
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
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Next Follow-Up Date *</Text>
                  <DateTimePickerComponent
                    value={nextFollowUpDate}
                    onChange={setNextFollowUpDate}
                    mode="date"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Next Follow-Up Time *</Text>
                  <DateTimePickerComponent
                    value={nextFollowUpTime}
                    onChange={setNextFollowUpTime}
                    mode="time"
                  />
                </View>
              </>
            )}

            {actionType === 'confirmed_advance_paid' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Travel Date *</Text>
                  <DateTimePickerComponent
                    value={confirmTravelDate}
                    onChange={setConfirmTravelDate}
                    placeholder="Select travel date"
                    mode="date"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Reminder Time</Text>
                  <DateTimePickerComponent
                    value={reminderTime}
                    onChange={setReminderTime}
                    placeholder="Select reminder time"
                    mode="time"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Itinerary ID</Text>
                  <TextInput
                    style={styles.input}
                    value={itineraryId}
                    onChangeText={setItineraryId}
                    placeholder="Enter itinerary ID"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Total Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={totalAmount}
                      onChangeText={setTotalAmount}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Advance Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={advanceAmount}
                      onChangeText={setAdvanceAmount}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {totalAmount && advanceAmount && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Due Amount</Text>
                    <Text style={styles.dueAmountText}>₹ {calculateDueAmount().toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Transaction ID</Text>
                  <TextInput
                    style={styles.input}
                    value={transactionId}
                    onChangeText={setTransactionId}
                    placeholder="Enter transaction ID"
                  />
                </View>
              </>
            )}

            {actionType === 'dead' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Dead Reason *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowDeadReasonPicker(!showDeadReasonPicker)}
                >
                  <Text style={[styles.pickerButtonText, !deadReason && styles.placeholderText]}>
                    {deadReason || 'Select reason'}
                  </Text>
                  <ChevronDown size={20} color="#666" />
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Remarks *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={followUpRemark}
                onChangeText={setFollowUpRemark}
                placeholder="Add follow-up notes (required)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddFollowUp}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save & Add Follow-Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadHeader: {
    marginBottom: 16,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  callButton: {
    backgroundColor: '#10b981',
  },
  whatsappButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#14b8a6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 20,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
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
  dueAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14b8a6',
    paddingVertical: 12,
  },
  loadingPicker: {
    justifyContent: 'center',
  },
  noItinerariesText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  itineraryOptionContent: {
    flex: 1,
  },
  itinerarySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  itineraryCost: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '600',
    marginTop: 4,
  },
  itinerarySectionContainer: {
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  itinerarySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itinerarySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f766e',
  },
  itinerarySectionSubtitle: {
    fontSize: 13,
    color: '#5eead4',
    marginBottom: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  filtersLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterItemHalf: {
    flex: 1,
  },
  filterItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  filterInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  loadingItinerariesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingItinerariesText: {
    fontSize: 14,
    color: '#666',
  },
  pickerOptionsScrollable: {
    maxHeight: 200,
  },
  whatsappItineraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  whatsappItineraryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  skipItineraryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  skipItineraryButtonText: {
    fontSize: 14,
    color: '#14b8a6',
    fontWeight: '600',
  },
});
