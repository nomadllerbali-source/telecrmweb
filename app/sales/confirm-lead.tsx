import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead, Itinerary } from '@/types';
import { ArrowLeft, Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { Colors, Layout } from '@/constants/Colors';
import { scheduleTripConfirmedNotification } from '@/services/notifications';
import { syncAdvancePaymentToFinance } from '@/services/financeSync';

export default function ConfirmLeadScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { leadId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [showPaymentMode, setShowPaymentMode] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showItineraryDropdown, setShowItineraryDropdown] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);

  const [formData, setFormData] = useState({
    totalAmount: '',
    advanceAmount: '',
    transactionId: '',
    itineraryId: '',
    travelDate: '',
    paymentMode: '',
    remark: '',
  });

  const [selectedTravelDate, setSelectedTravelDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchLead();
    fetchItineraries();
  }, [leadId]);

  const fetchItineraries = async () => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItineraries(data || []);
    } catch (err: any) {
      console.error('Error fetching itineraries:', err);
    }
  };

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

  const handleSubmit = async () => {
    if (!formData.totalAmount || !formData.advanceAmount || !selectedItinerary || !formData.paymentMode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (formData.paymentMode === 'upi' && !formData.transactionId) {
      Alert.alert('Error', 'Please enter UPI transaction number');
      return;
    }

    if (formData.paymentMode === 'cash' && !formData.transactionId) {
      Alert.alert('Error', 'Please enter transaction ID after transferring money');
      return;
    }

    setSubmitting(true);

    try {
      await supabase.from('confirmations').insert([
        {
          lead_id: leadId,
          total_amount: parseFloat(formData.totalAmount),
          advance_amount: parseFloat(formData.advanceAmount),
          transaction_id: formData.transactionId,
          itinerary_id: selectedItinerary.id,
          travel_date: formData.travelDate,
          remark: formData.remark || null,
          confirmed_by: user?.id,
        },
      ]);

      // Update lead status
      await supabase
        .from('leads')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', leadId);

      // Schedule trip reminder notification (3 days before)
      if (user && formData.travelDate && lead?.client_name) {
        try {
          await scheduleTripConfirmedNotification(
            user.id,
            leadId as string,
            lead.client_name,
            new Date(formData.travelDate)
          );
        } catch (notifErr) {
          console.error('Notification scheduling failed:', notifErr);
        }
      }

      Alert.alert('Success', 'Lead confirmed successfully');
      router.push('/sales');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle}>Confirm Lead</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{lead?.client_name}</Text>
          <Text style={styles.leadDetail}>{lead?.place} - {lead?.no_of_pax} Pax</Text>
        </View>

        <DateTimePickerComponent
          label="Travel Date *"
          value={selectedTravelDate}
          onChange={(date) => {
            setSelectedTravelDate(date);
            setFormData({ ...formData, travelDate: date.toISOString().split('T')[0] });
          }}
          mode="date"
        />

        <Text style={styles.label}>Total Amount *</Text>
        <TextInput
          style={styles.input}
          value={formData.totalAmount}
          onChangeText={(text) => setFormData({ ...formData, totalAmount: text })}
          placeholder="Enter total booking amount"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />

        <Text style={styles.label}>Advance Amount *</Text>
        <TextInput
          style={styles.input}
          value={formData.advanceAmount}
          onChangeText={(text) => setFormData({ ...formData, advanceAmount: text })}
          placeholder="Enter advance payment received"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />

        <Text style={styles.label}>Payment Mode *</Text>
        <View>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPaymentMode(!showPaymentMode)}
          >
            <Text style={formData.paymentMode ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.paymentMode ? formData.paymentMode.toUpperCase() : 'Select payment mode'}
            </Text>
            <ChevronDown size={20} color={Colors.text.secondary} />
          </TouchableOpacity>

          {showPaymentMode && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setFormData({ ...formData, paymentMode: 'cash' });
                  setShowPaymentMode(false);
                }}
              >
                <Text style={styles.dropdownItemText}>CASH</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setFormData({ ...formData, paymentMode: 'upi' });
                  setShowPaymentMode(false);
                }}
              >
                <Text style={styles.dropdownItemText}>UPI</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {formData.paymentMode === 'cash' && (
          <View style={styles.accountDetails}>
            <Text style={styles.accountTitle}>Transfer Money to This Account:</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Account No:</Text>
              <Text style={styles.accountValue}>12345678</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>IFSC Code:</Text>
              <Text style={styles.accountValue}>fdg1234</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>GPay:</Text>
              <Text style={styles.accountValue}>737273823239</Text>
            </View>
            <Text style={styles.accountNote}>
              After transferring, please enter the transaction ID below
            </Text>
          </View>
        )}

        {formData.paymentMode === 'upi' && (
          <>
            <Text style={styles.label}>UPI Transaction Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.transactionId}
              onChangeText={(text) => setFormData({ ...formData, transactionId: text })}
              placeholder="Enter UPI transaction number"
              returnKeyType="next"
              keyboardType="number-pad"
            />
          </>
        )}

        {formData.paymentMode === 'cash' && (
          <>
            <Text style={styles.label}>Transaction ID *</Text>
            <TextInput
              style={styles.input}
              value={formData.transactionId}
              onChangeText={(text) => setFormData({ ...formData, transactionId: text })}
              placeholder="Enter transaction ID"
              returnKeyType="next"
              keyboardType="number-pad"
            />
          </>
        )}

        <Text style={styles.label}>Select Itinerary *</Text>
        <View>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowItineraryDropdown(!showItineraryDropdown)}
          >
            <Text style={selectedItinerary ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedItinerary ? selectedItinerary.name : 'Select an itinerary'}
            </Text>
            <ChevronDown size={20} color={Colors.text.secondary} />
          </TouchableOpacity>

          {showItineraryDropdown && (
            <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
              {itineraries.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>No itineraries available</Text>
                </View>
              ) : (
                itineraries.map((itinerary) => (
                  <TouchableOpacity
                    key={itinerary.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedItinerary(itinerary);
                      setShowItineraryDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemTitle}>{itinerary.name}</Text>
                    <Text style={styles.dropdownItemSubtitle}>
                      {itinerary.days} Days • ${itinerary.cost_usd.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        <Text style={styles.label}>Remark</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.remark}
          onChangeText={(text) => setFormData({ ...formData, remark: text })}
          placeholder="Enter any additional remarks"
          multiline
          numberOfLines={4}
          returnKeyType="done"
          blurOnSubmit={true}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <Text style={styles.submitButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    padding: 4,
    borderRadius: Layout.radius.full,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  leadInfo: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: 16,
    ...Layout.shadows.sm,
  },
  leadName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  leadDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: Colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeInputContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    padding: 0,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: Colors.text.tertiary,
  },
  dropdownList: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    marginTop: -12,
    marginBottom: 12,
    maxHeight: 250,
    overflow: 'hidden',
    ...Layout.shadows.sm,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  dropdownItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  dropdownItemSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  accountDetails: {
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Layout.radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  accountNote: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: Colors.status.success,
    height: 48,
    borderRadius: Layout.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
    ...Layout.shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
