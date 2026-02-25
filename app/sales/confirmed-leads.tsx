import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, Linking, TouchableWithoutFeedback } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead, Reminder } from '@/types';
import { ArrowLeft, MapPin, Users, Calendar, CheckCircle, Bell, X, MessageSquare } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { calendarService } from '@/services/calendar';
import { Colors, Layout } from '@/constants/Colors';

export default function ConfirmedLeadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reminderModal, setReminderModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .eq('status', 'confirmed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching confirmed leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const allocateToOperations = async (leadId: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);

      const { error } = await supabase
        .from('leads')
        .update({ status: 'allocated_to_operations', updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      if (user && lead) {
        const { data: adminData } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminData) {
          await supabase.from('notifications').insert({
            user_id: adminData.id,
            type: 'allocation',
            title: 'Lead Allocated to Operations',
            message: `${lead.client_name} from ${lead.place} has been allocated to operations by ${user.full_name}`,
            lead_id: leadId,
          });
        }
      }

      Alert.alert('Success', 'Lead allocated to operations');
      fetchLeads();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const openReminderModal = (lead: Lead) => {
    setSelectedLead(lead);
    setTravelDate(lead.travel_date ? new Date(lead.travel_date) : null);
    setReminderTime(new Date());
    setReminderTime((prev) => {
      const d = prev || new Date();
      d.setHours(9, 0, 0, 0);
      return d;
    });
    setReminderModal(true);
  };

  const calculateReminderDate = (date: Date): Date => {
    const reminderDate = new Date(date);
    reminderDate.setDate(reminderDate.getDate() - 7);
    return reminderDate;
  };

  const saveReminder = async () => {
    if (!selectedLead || !travelDate || !user) {
      Alert.alert('Error', 'Please select a travel date');
      return;
    }

    setSavingReminder(true);
    try {
      const reminderDate = calculateReminderDate(travelDate);
      const reminderTimeObj = reminderTime || new Date();

      const calendarTitle = `Travel Reminder: ${selectedLead.client_name}`;
      const calendarDescription = `Client: ${selectedLead.client_name}
Location: ${selectedLead.place}
Pax: ${selectedLead.no_of_pax}
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
        selectedLead.id,
        selectedLead.client_name
      );

      const { error } = await supabase.from('reminders').insert({
        lead_id: selectedLead.id,
        sales_person_id: user.id,
        travel_date: travelDate.toISOString().split('T')[0],
        reminder_date: reminderDate.toISOString().split('T')[0],
        reminder_time: reminderTime?.toTimeString().slice(0, 5) || '09:00',
        calendar_event_id: calendarEventId,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('Success', 'Reminder added to calendar');
      setReminderModal(false);
      setSelectedLead(null);
      setTravelDate(null);
      setReminderTime(null);
    } catch (err: any) {
      console.error('Reminder save error:', err);
      Alert.alert('Error', err.message || 'Failed to save reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleRequestFeedback = async (lead: Lead) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ feedback_requested_at: new Date().toISOString() })
        .eq('id', lead.id);

      if (error) throw error;

      const message = `Hi ${lead.client_name}! 👋 Hope you had a wonderful trip to ${lead.place}. %0A%0AWe'd love to hear about your experience! Could you please take a moment to rate us? %0A%0A*Rating scale: 1 (Poor) to 5 (Excellent)*%0A%0AReply with your rating and any comments!`;
      const phoneNumber = (lead.country_code + lead.contact_number).replace(/\+/g, '');
      const url = `https://wa.me/${phoneNumber}?text=${message}`;

      await Linking.openURL(url);
      fetchLeads();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to request feedback');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.status.success} />
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
        <Text style={styles.headerTitle}>Confirmed Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No confirmed leads</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <Text style={styles.leadName}>{lead.client_name}</Text>
                <View style={styles.confirmedBadge}>
                  <View style={styles.badgeContent}>
                    <View style={styles.iconContainer}>
                      <CheckCircle size={16} color={Colors.text.inverse} />
                    </View>
                    <Text style={styles.confirmedBadgeText}>CONFIRMED</Text>
                  </View>
                </View>
              </View>

              <View style={styles.leadDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <MapPin size={16} color={Colors.text.secondary} />
                    </View>
                    <Text style={styles.detailText}>{lead.place}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <Users size={16} color={Colors.text.secondary} />
                    </View>
                    <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailRowContent}>
                    <View style={styles.iconContainer}>
                      <Calendar size={16} color={Colors.text.secondary} />
                    </View>
                    <Text style={styles.detailText}>
                      {lead.travel_date || lead.travel_month || 'Date TBD'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.reminderButton}
                  onPress={() => openReminderModal(lead)}
                >
                  <Bell size={18} color={Colors.text.inverse} />
                  <Text style={styles.reminderButtonText}>Reminder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.feedbackButton, lead.feedback_requested_at && styles.feedbackButtonDisabled]}
                  onPress={() => handleRequestFeedback(lead)}
                >
                  <MessageSquare size={18} color={lead.feedback_requested_at ? '#94a3b8' : Colors.text.inverse} />
                  <Text style={[styles.feedbackButtonText, lead.feedback_requested_at && styles.feedbackButtonDisabledText]}>
                    {lead.feedback_requested_at ? 'Requested' : 'Feedback'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.allocateButton}
                  onPress={() => allocateToOperations(lead.id)}
                >
                  <Text style={styles.allocateButtonText}>Allocate</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={reminderModal} transparent animationType="slide" onRequestClose={() => setReminderModal(false)}>
        <TouchableWithoutFeedback onPress={() => setReminderModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Set Travel Reminder</Text>
                  <TouchableOpacity onPress={() => setReminderModal(false)}>
                    <X size={24} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {selectedLead && (
                  <ScrollView style={styles.modalBody}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{selectedLead.client_name}</Text>
                      <Text style={styles.clientDetail}>{selectedLead.place} • {selectedLead.no_of_pax} Pax</Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Travel Date</Text>
                      <DateTimePickerComponent
                        value={travelDate}
                        onChange={setTravelDate}
                        mode="date"
                        placeholder="Select travel date"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Reminder Time (7 days before)</Text>
                      <DateTimePickerComponent
                        value={reminderTime}
                        onChange={setReminderTime}
                        mode="time"
                        placeholder="Select reminder time"
                      />
                    </View>

                    {travelDate && (
                      <View style={styles.reminderInfo}>
                        <Text style={styles.reminderInfoText}>
                          Reminder will be set for: {calculateReminderDate(travelDate).toISOString().split('T')[0]}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.saveButton, savingReminder && styles.saveButtonDisabled]}
                      onPress={saveReminder}
                      disabled={savingReminder}
                    >
                      <Text style={styles.saveButtonText}>{savingReminder ? 'Saving...' : 'Save Reminder'}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  },
  backButton: {
    padding: 4,
    borderRadius: Layout.radius.full,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  leadCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: 16,
    ...Layout.shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  confirmedBadge: {
    backgroundColor: Colors.status.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Layout.radius.sm,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmedBadgeText: {
    color: Colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  leadDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 4,
  },
  detailRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reminderButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  allocateButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocateButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Layout.spacing.xl,
    ...Layout.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalBody: {
    padding: Layout.spacing.lg,
  },
  clientInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  reminderInfo: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Layout.radius.md,
    marginBottom: 20,
  },
  reminderInfoText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: Colors.status.success,
    paddingVertical: 14,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    marginTop: 8,
    ...Layout.shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButtonDisabled: {
    backgroundColor: Colors.surfaceHighlight,
  },
  feedbackButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackButtonDisabledText: {
    color: '#94a3b8',
  },
});
