import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { ArrowLeft, Check, Calendar, ChevronDown, Phone, MessageCircle } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { sendLeadAssignmentNotification } from '@/services/notifications';

export default function AssignLeadScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);
  const [showSalesPersonPicker, setShowSalesPersonPicker] = useState(false);

  const [formData, setFormData] = useState({
    leadType: 'normal' as 'normal' | 'urgent' | 'hot',
    clientName: '',
    countryCode: '+91',
    contactNumber: '',
    noOfPax: '',
    place: '',
    travelDate: '',
    travelMonth: '',
    expectedBudget: '',
    remark: '',
    assignedTo: '',
    dateType: 'exact' as 'exact' | 'month',
  });

  const [selectedTravelDate, setSelectedTravelDate] = useState<Date | null>(null);

  const countryCodes = [
    { code: '+91', name: 'India' },
    { code: '+974', name: 'Qatar' },
    { code: '+971', name: 'Dubai (UAE)' },
    { code: '+966', name: 'Saudi Arabia' },
    { code: '+973', name: 'Bahrain' },
    { code: '+61', name: 'Australia' },
    { code: '+977', name: 'Nepal' },
    { code: '+1', name: 'America' },
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const monthYearOptions = years.flatMap(year =>
    months.map(month => `${month} ${year}`)
  );

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  const fetchSalesPersons = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'sales')
        .eq('status', 'active');

      if (error) throw error;
      setSalesPersons(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssign = async () => {
    if (!formData.clientName.trim() || !formData.contactNumber.trim() || !formData.noOfPax ||
        !formData.place.trim() || !formData.expectedBudget || !formData.assignedTo) {
      setError('Please fill all required fields');
      return;
    }

    if (formData.dateType === 'exact' && !formData.travelDate) {
      setError('Please enter travel date');
      return;
    }

    if (formData.dateType === 'month' && !formData.travelMonth) {
      setError('Please select travel month');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: leadData, error: leadError } = await supabase.from('leads').insert([
        {
          lead_type: formData.leadType,
          client_name: formData.clientName,
          country_code: formData.countryCode,
          contact_number: formData.contactNumber,
          no_of_pax: parseInt(formData.noOfPax),
          place: formData.place,
          travel_date: formData.dateType === 'exact' ? formData.travelDate : null,
          travel_month: formData.dateType === 'month' ? formData.travelMonth : null,
          expected_budget: parseFloat(formData.expectedBudget),
          remark: formData.remark || null,
          assigned_to: formData.assignedTo,
          assigned_by: user?.id,
          status: formData.leadType === 'hot' ? 'hot' : 'allocated',
        },
      ]).select();

      if (leadError) throw leadError;

      if (leadData && leadData.length > 0) {
        const leadId = leadData[0].id;
        const assignedSalesPerson = salesPersons.find(sp => sp.id === formData.assignedTo);

        await supabase.from('notifications').insert([
          {
            user_id: formData.assignedTo,
            type: 'lead_assigned',
            title: 'New Lead Assigned',
            message: `${formData.clientName} from ${formData.place} has been assigned to you. ${formData.noOfPax} Pax, Budget: ₹${formData.expectedBudget}`,
            lead_id: leadId,
            lead_type: formData.leadType,
          },
        ]);

        await sendLeadAssignmentNotification(
          formData.assignedTo,
          formData.clientName,
          `${formData.countryCode}${formData.contactNumber}`,
          formData.leadType
        );
      }

      Alert.alert('Success', 'Lead assigned successfully');
      router.back();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (!formData.contactNumber) {
      Alert.alert('Error', 'Please enter a contact number');
      return;
    }
    const phoneNumber = `${formData.countryCode}${formData.contactNumber}`;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    if (!formData.contactNumber) {
      Alert.alert('Error', 'Please enter a contact number');
      return;
    }
    const phoneNumber = `${formData.countryCode}${formData.contactNumber}`.replace(/\+/g, '');
    Linking.openURL(`https://wa.me/${phoneNumber}`);
  };

  const getSelectedCountry = () => {
    const country = countryCodes.find(c => c.code === formData.countryCode);
    return country ? `${country.code} (${country.name})` : formData.countryCode;
  };

  const getSelectedSalesPerson = () => {
    const person = salesPersons.find(p => p.id === formData.assignedTo);
    return person ? person.full_name : 'Select a sales person';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign New Lead</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Lead Type</Text>
        <View style={styles.radioGroup}>
          {(['normal', 'urgent', 'hot'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.radioButton,
                formData.leadType === type && styles.radioButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, leadType: type })}
            >
              <Text
                style={[
                  styles.radioButtonText,
                  formData.leadType === type && styles.radioButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Client Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.clientName}
          onChangeText={(text) => setFormData({ ...formData, clientName: text })}
          placeholder="Enter client name"
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Country Code *</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowCountryCodePicker(true)}
        >
          <Text style={styles.dropdownButtonTextSelected}>
            {getSelectedCountry()}
          </Text>
          <ChevronDown size={20} color="#666" />
        </TouchableOpacity>

        <Text style={styles.label}>Contact Number *</Text>
        <View style={styles.contactNumberRow}>
          <TextInput
            style={styles.contactNumberInput}
            value={formData.contactNumber}
            onChangeText={(text) => setFormData({ ...formData, contactNumber: text })}
            placeholder="Enter contact number"
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCall}
          >
            <Phone size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleWhatsApp}
          >
            <MessageCircle size={20} color="#25D366" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Number of Pax *</Text>
        <TextInput
          style={styles.input}
          value={formData.noOfPax}
          onChangeText={(text) => setFormData({ ...formData, noOfPax: text })}
          placeholder="Enter number of passengers"
          keyboardType="numeric"
          returnKeyType="next"
        />

        <Text style={styles.label}>Place/Destination *</Text>
        <TextInput
          style={styles.input}
          value={formData.place}
          onChangeText={(text) => setFormData({ ...formData, place: text })}
          placeholder="Enter destination"
          returnKeyType="next"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Date Type</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              formData.dateType === 'exact' && styles.radioButtonActive,
            ]}
            onPress={() => setFormData({ ...formData, dateType: 'exact' })}
          >
            <Text
              style={[
                styles.radioButtonText,
                formData.dateType === 'exact' && styles.radioButtonTextActive,
              ]}
            >
              Exact Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.radioButton,
              formData.dateType === 'month' && styles.radioButtonActive,
            ]}
            onPress={() => setFormData({ ...formData, dateType: 'month' })}
          >
            <Text
              style={[
                styles.radioButtonText,
                formData.dateType === 'month' && styles.radioButtonTextActive,
              ]}
            >
              Month Only
            </Text>
          </TouchableOpacity>
        </View>

        {formData.dateType === 'exact' ? (
          <DateTimePickerComponent
            label="Travel Date *"
            value={selectedTravelDate}
            onChange={(date) => {
              setSelectedTravelDate(date);
              setFormData({ ...formData, travelDate: date.toISOString().split('T')[0] });
            }}
            mode="date"
          />
        ) : (
          <>
            <Text style={styles.label}>Travel Month *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={formData.travelMonth ? styles.dropdownButtonTextSelected : styles.dropdownButtonText}>
                {formData.travelMonth || 'Select month and year'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.label}>Expected Budget *</Text>
        <TextInput
          style={styles.input}
          value={formData.expectedBudget}
          onChangeText={(text) => setFormData({ ...formData, expectedBudget: text })}
          placeholder="Enter budget amount"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />

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

        <Text style={styles.label}>Assign to Sales Person *</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowSalesPersonPicker(true)}
        >
          <Text style={formData.assignedTo ? styles.dropdownButtonTextSelected : styles.dropdownButtonText}>
            {getSelectedSalesPerson()}
          </Text>
          <ChevronDown size={20} color="#666" />
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAssign}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Assign Lead</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Travel Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.monthList}>
              {monthYearOptions.map((monthYear) => (
                <TouchableOpacity
                  key={monthYear}
                  style={[
                    styles.monthOption,
                    formData.travelMonth === monthYear && styles.monthOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, travelMonth: monthYear });
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      formData.travelMonth === monthYear && styles.monthOptionTextActive,
                    ]}
                  >
                    {monthYear}
                  </Text>
                  {formData.travelMonth === monthYear && (
                    <Check size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showCountryCodePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryCodePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountryCodePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryCodePicker(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.monthList}>
              {countryCodes.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.monthOption,
                    formData.countryCode === country.code && styles.monthOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, countryCode: country.code });
                    setShowCountryCodePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      formData.countryCode === country.code && styles.monthOptionTextActive,
                    ]}
                  >
                    {country.code} ({country.name})
                  </Text>
                  {formData.countryCode === country.code && (
                    <Check size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showSalesPersonPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSalesPersonPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSalesPersonPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Sales Person</Text>
              <TouchableOpacity onPress={() => setShowSalesPersonPicker(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.monthList}>
              {salesPersons.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={[
                    styles.monthOption,
                    formData.assignedTo === person.id && styles.monthOptionActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, assignedTo: person.id });
                    setShowSalesPersonPicker(false);
                  }}
                >
                  <View style={styles.salesPersonPickerInfo}>
                    <Text
                      style={[
                        styles.monthOptionText,
                        formData.assignedTo === person.id && styles.monthOptionTextActive,
                      ]}
                    >
                      {person.full_name}
                    </Text>
                    <Text style={styles.salesPersonPickerEmail}>{person.email}</Text>
                  </View>
                  {formData.assignedTo === person.id && (
                    <Check size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 8,
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
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
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
  button: {
    backgroundColor: '#3b82f6',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contactNumberInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownButtonTextSelected: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  monthList: {
    maxHeight: 400,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthOptionActive: {
    backgroundColor: '#e0f2fe',
  },
  monthOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  monthOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  salesPersonPickerInfo: {
    flex: 1,
  },
  salesPersonPickerEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
