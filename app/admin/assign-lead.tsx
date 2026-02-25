import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { ArrowLeft, Check, Calendar, ChevronDown, Phone, MessageCircle, X, MapPin, Users, Wallet, FileText, Info } from 'lucide-react-native';
import DateTimePickerComponent from '@/components/DateTimePicker';
import { sendLeadAssignmentNotification } from '@/services/notifications';
import { Colors, Layout } from '@/constants/Colors';

export default function AssignLeadScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);
  const [showSalesPersonPicker, setShowSalesPersonPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [isAutoAssign, setIsAutoAssign] = useState(false);

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
    leadSource: 'Other',
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

  const leadSources = [
    'Instagram', 'Facebook', 'Google Ads', 'Website', 'WhatsApp', 'Phone', 'Other'
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
    const isFieldsValid = formData.clientName.trim() && formData.contactNumber.trim() &&
      formData.noOfPax && formData.place.trim() && formData.expectedBudget;

    if (!isFieldsValid || (!formData.assignedTo && !isAutoAssign)) {
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
      let targetSalesPersonId = formData.assignedTo;

      if (isAutoAssign) {
        const { data: salesPersonsOrdered, error: spError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'sales')
          .eq('status', 'active')
          .order('last_assigned_at', { ascending: true, nullsFirst: true })
          .limit(1);

        if (spError || !salesPersonsOrdered || salesPersonsOrdered.length === 0) {
          throw new Error('No active sales persons found for auto-assignment');
        }

        targetSalesPersonId = salesPersonsOrdered[0].id;

        await supabase
          .from('users')
          .update({ last_assigned_at: new Date().toISOString() })
          .eq('id', targetSalesPersonId);
      }

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
          assigned_to: targetSalesPersonId,
          assigned_by: user?.id,
          status: formData.leadType === 'hot' ? 'hot' : 'allocated',
          lead_source: formData.leadSource,
        },
      ]).select();

      if (leadError) throw leadError;

      if (leadData && leadData.length > 0) {
        const leadId = leadData[0].id;

        await supabase.from('notifications').insert([
          {
            user_id: targetSalesPersonId,
            type: 'lead_assigned',
            title: 'New Lead Assigned',
            message: `${formData.clientName} from ${formData.place} has been assigned to you. ${formData.noOfPax} Pax, Budget: ₹${formData.expectedBudget}`,
            lead_id: leadId,
            lead_type: formData.leadType,
          },
        ]);

        await sendLeadAssignmentNotification(
          targetSalesPersonId,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Assign Lead</Text>
          <Text style={styles.headerSubtitle}>Create and route a new inquiry</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Info size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Lead Priority</Text>
          </View>

          <View style={styles.radioGroup}>
            {(['normal', 'urgent', 'hot'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioButton,
                  formData.leadType === type && {
                    backgroundColor: type === 'hot' ? Colors.status.error + '15' :
                      type === 'urgent' ? Colors.status.warning + '15' :
                        Colors.primary + '15',
                    borderColor: type === 'hot' ? Colors.status.error :
                      type === 'urgent' ? Colors.status.warning :
                        Colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, leadType: type })}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    formData.leadType === type && {
                      color: type === 'hot' ? Colors.status.error :
                        type === 'urgent' ? Colors.status.warning :
                          Colors.primary,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Lead Source</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowSourcePicker(true)}
                >
                  <Text style={styles.dropdownButtonTextSelected}>
                    {formData.leadSource}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Client Name *</Text>
            <View style={styles.inputContainer}>
              <Users size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.clientName}
                onChangeText={(text) => setFormData({ ...formData, clientName: text })}
                placeholder="Enter client name"
                placeholderTextColor={Colors.text.tertiary}
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Country</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowCountryCodePicker(true)}
                >
                  <Text style={styles.dropdownButtonTextSelected}>
                    {getSelectedCountry()}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Contact Number *</Text>
            <View style={styles.contactNumberRow}>
              <View style={styles.contactInputWrapper}>
                <Phone size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.contactInput}
                  value={formData.contactNumber}
                  onChangeText={(text) => setFormData({ ...formData, contactNumber: text })}
                  placeholder="Enter number"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <Phone size={20} color={Colors.status.success} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
                <MessageCircle size={20} color="#25D366" />
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 0.4 }}>
                <Text style={styles.label}>Pax *</Text>
                <TextInput
                  style={styles.inputSimple}
                  value={formData.noOfPax}
                  onChangeText={(text) => setFormData({ ...formData, noOfPax: text })}
                  placeholder="2"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 0.6 }}>
                <Text style={styles.label}>Destination *</Text>
                <View style={styles.inputContainer}>
                  <MapPin size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.place}
                    onChangeText={(text) => setFormData({ ...formData, place: text })}
                    placeholder="Where to?"
                    placeholderTextColor={Colors.text.tertiary}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Travel Timing</Text>
            <View style={styles.tabGroup}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  formData.dateType === 'exact' && styles.tabButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, dateType: 'exact' })}
              >
                <Text style={[styles.tabText, formData.dateType === 'exact' && styles.tabTextActive]}>
                  Exact Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  formData.dateType === 'month' && styles.tabButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, dateType: 'month' })}
              >
                <Text style={[styles.tabText, formData.dateType === 'month' && styles.tabTextActive]}>
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
                  <Calendar size={18} color={Colors.text.tertiary} style={{ marginRight: 12 }} />
                  <Text style={formData.travelMonth ? styles.dropdownButtonTextSelected : styles.dropdownButtonTextPlaceholder}>
                    {formData.travelMonth || 'Select month/year'}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.tertiary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Expected Budget *</Text>
            <View style={styles.inputContainer}>
              <Wallet size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.expectedBudget}
                onChangeText={(text) => setFormData({ ...formData, expectedBudget: text })}
                placeholder="₹ 0.00"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.label}>Remark</Text>
            <View style={styles.textAreaContainer}>
              <FileText size={18} color={Colors.text.tertiary} style={[styles.inputIcon, { marginTop: 14 }]} />
              <TextInput
                style={styles.textArea}
                value={formData.remark}
                onChangeText={(text) => setFormData({ ...formData, remark: text })}
                placeholder="Add specific requirements..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={styles.assignmentBox}>
            <View style={styles.assignmentHeader}>
              <View style={styles.assignmentTitleRow}>
                <Users size={18} color={Colors.primary} />
                <Text style={styles.assignmentTitle}>Assignment</Text>
              </View>
              <TouchableOpacity
                style={styles.autoAssignToggle}
                onPress={() => setIsAutoAssign(!isAutoAssign)}
              >
                <Text style={styles.autoAssignText}>Auto</Text>
                <View style={[styles.toggleTrack, isAutoAssign && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, isAutoAssign && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>

            {!isAutoAssign ? (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowSalesPersonPicker(true)}
              >
                <Users size={18} color={Colors.text.tertiary} style={{ marginRight: 12 }} />
                <Text style={formData.assignedTo ? styles.dropdownButtonTextSelected : styles.dropdownButtonTextPlaceholder}>
                  {getSelectedSalesPerson()}
                </Text>
                <ChevronDown size={18} color={Colors.text.tertiary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ) : (
              <View style={styles.autoAssignInfo}>
                <CheckCircleIcon size={16} color={Colors.status.success} />
                <Text style={styles.autoAssignInfoText}>System will intelligently assign this lead.</Text>
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <X size={14} color={Colors.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAssign}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.buttonText}>Confirm Assignment</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.spacer} />
      </ScrollView>

      {/* Modals */}
      {[
        { visible: showMonthPicker, setVisible: setShowMonthPicker, title: 'Travel Month', options: monthYearOptions, current: formData.travelMonth, field: 'travelMonth' },
        { visible: showCountryCodePicker, setVisible: setShowCountryCodePicker, title: 'Country Code', options: countryCodes, current: formData.countryCode, field: 'countryCode' },
        { visible: showSourcePicker, setVisible: setShowSourcePicker, title: 'Lead Source', options: leadSources, current: formData.leadSource, field: 'leadSource' }
      ].map((modal, idx) => (
        <Modal key={idx} visible={modal.visible} transparent animationType="slide" onRequestClose={() => modal.setVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => modal.setVisible(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modal.title}</Text>
                <TouchableOpacity onPress={() => modal.setVisible(false)} style={styles.modalClose}>
                  <X size={20} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {modal.options.map((option: any) => {
                  const val = typeof option === 'string' ? option : option.code;
                  const label = typeof option === 'string' ? option : `${option.code} (${option.name})`;
                  const isActive = modal.current === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.modalOption, isActive && styles.modalOptionActive]}
                      onPress={() => {
                        setFormData({ ...formData, [modal.field as any]: val });
                        modal.setVisible(false);
                      }}
                    >
                      <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>
                        {label}
                      </Text>
                      {isActive && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      ))}

      <Modal
        visible={showSalesPersonPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSalesPersonPicker(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSalesPersonPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Agent</Text>
              <TouchableOpacity onPress={() => setShowSalesPersonPicker(false)} style={styles.modalClose}>
                <X size={20} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {salesPersons.map((person) => {
                const isActive = formData.assignedTo === person.id;
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={[styles.modalOption, isActive && styles.modalOptionActive]}
                    onPress={() => {
                      setFormData({ ...formData, assignedTo: person.id });
                      setShowSalesPersonPicker(false);
                    }}
                  >
                    <View style={styles.salesPersonInfo}>
                      <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>
                        {person.full_name}
                      </Text>
                      <Text style={styles.salesPersonEmail}>{person.email}</Text>
                    </View>
                    {isActive && <Check size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function CheckCircleIcon({ size, color }: { size: number, color: string }) {
  return <CheckCircle size={size} color={color} />;
}

import { CheckCircle } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    fontWeight: '500',
  },
  backButton: {
    marginLeft: -Layout.spacing.sm,
  },
  iconButton: {
    padding: 8,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  section: {
    gap: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  inputSimple: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 14,
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 12,
  },
  textArea: {
    flex: 1,
    height: 100,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Layout.radius.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  radioButtonText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contactNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 12,
  },
  contactInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  actionButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadows.sm,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    padding: 14,
  },
  dropdownButtonTextPlaceholder: {
    fontSize: 16,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  dropdownButtonTextSelected: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  tabGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: 4,
    borderRadius: Layout.radius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Layout.radius.md,
  },
  tabButtonActive: {
    backgroundColor: Colors.surfaceHighlight,
    ...Layout.shadows.sm,
  },
  tabText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '700',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  assignmentBox: {
    marginTop: 8,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  assignmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  autoAssignToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.background,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleTrackActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.text.tertiary,
  },
  toggleThumbActive: {
    transform: [{ translateX: 18 }],
    backgroundColor: Colors.background,
  },
  autoAssignText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text.secondary,
  },
  autoAssignInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  autoAssignInfoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 58,
    borderRadius: Layout.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    ...Layout.shadows.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    maxHeight: '80%',
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalList: {
    padding: Layout.spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: Layout.radius.lg,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  modalOptionActive: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  modalOptionTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  salesPersonInfo: {
    flex: 1,
  },
  salesPersonEmail: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },
  spacer: {
    height: 100,
  }
});
