import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ChevronDown, Check, Phone } from 'lucide-react-native';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

export default function AddLeadScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [contactNumber, setContactNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>({
    code: '+91',
    name: 'India',
    flag: '🇮🇳',
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const countries: CountryCode[] = [
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+974', name: 'Qatar', flag: '🇶🇦' },
    { code: '+971', name: 'UAE', flag: '🇦🇪' },
    { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+977', name: 'Nepal', flag: '🇳🇵' },
    { code: '+1', name: 'USA', flag: '🇺🇸' },
  ];

  const validateContactNumber = (number: string): boolean => {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  const checkDuplicateNumber = async (fullNumber: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id')
        .eq('contact_number', fullNumber)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('Error checking duplicate:', err);
      return false;
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!contactNumber.trim()) {
      setError('Please enter a contact number');
      return;
    }

    if (!validateContactNumber(contactNumber)) {
      setError('Contact number must be between 7 and 15 digits');
      return;
    }

    const fullNumber = `${selectedCountry.code}${contactNumber}`;

    setLoading(true);
    try {
      const isDuplicate = await checkDuplicateNumber(fullNumber);
      if (isDuplicate) {
        setError('This contact number already exists in the system');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          contact_number: fullNumber,
          country_code: selectedCountry.code,
          client_name: 'To be updated',
          place: 'TBD',
          no_of_pax: 0,
          expected_budget: 0,
          lead_type: 'normal',
          status: 'added_by_sales',
          assigned_to: user?.id,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      router.replace('/sales/added-leads');
    } catch (err: any) {
      console.error('Error adding lead:', err);
      setError(err.message || 'Failed to add lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Lead</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Phone size={48} color="#14b8a6" style={styles.icon} />
          <Text style={styles.title}>Start with Contact Details</Text>
          <Text style={styles.subtitle}>Enter the phone number to create a new lead</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Country Code</Text>
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryText}>
                {selectedCountry.name} ({selectedCountry.code})
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="Enter contact number"
              keyboardType="phone-pad"
              maxLength={15}
            />
            <Text style={styles.hint}>7-15 digits without country code</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Lead</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.countryOption}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryOptionText}>
                    {country.name} ({country.code})
                  </Text>
                  {selectedCountry.code === country.code && (
                    <Check size={20} color="#14b8a6" />
                  )}
                </TouchableOpacity>
              ))}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  formGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#14b8a6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 16,
    color: '#14b8a6',
    fontWeight: '600',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  countryOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});
