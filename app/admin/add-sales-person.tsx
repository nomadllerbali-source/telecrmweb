import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { createUser } from '@/services/auth';
import { User } from '@/types';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function AddSalesPersonScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  const fetchSalesPersons = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'sales')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSalesPersons(data || []);
    } catch (err: any) {
      console.error('Error fetching sales persons:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.username.trim() || !formData.password) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createUser({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        full_name: formData.fullName,
        role: 'sales',
        phone: formData.phone || undefined,
      });

      Alert.alert('Success', 'Sales person created successfully');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        username: '',
        password: '',
      });
      fetchSalesPersons();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSuspend = async (personId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', personId);

      if (error) throw error;
      fetchSalesPersons();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const viewDetails = (person: User) => {
    router.push({
      pathname: '/admin/sales-person-details',
      params: { id: person.id },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Sales Persons</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Sales Person</Text>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Enter full name"
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            placeholder="Enter username"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              blurOnSubmit={true}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Sales Person</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existing Sales Persons</Text>
          {salesPersons.map((person) => (
            <View key={person.id} style={styles.personCard}>
              <TouchableOpacity
                style={styles.personInfo}
                onPress={() => viewDetails(person)}
              >
                <Text style={styles.personName}>{person.full_name}</Text>
                <Text style={styles.personDetail}>{person.email}</Text>
                {person.phone && (
                  <Text style={styles.personDetail}>{person.phone}</Text>
                )}
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      person.status === 'active' ? styles.statusActive : styles.statusSuspended,
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {person.status === 'active' ? 'Active' : 'Suspended'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.suspendButton,
                  person.status === 'suspended' && styles.activateButton,
                ]}
                onPress={() => toggleSuspend(person.id, person.status)}
              >
                <Text style={styles.suspendButtonText}>
                  {person.status === 'active' ? 'Suspend' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  button: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#86efac',
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
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  personDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusSuspended: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  suspendButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activateButton: {
    backgroundColor: '#10b981',
  },
  suspendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
