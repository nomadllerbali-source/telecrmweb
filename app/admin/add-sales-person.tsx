import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { createUser } from '@/services/auth';
import { User } from '@/types';
import { ArrowLeft, Eye, EyeOff, UserPlus, Trash2, ShieldAlert, Mail, Phone, User as UserIcon, Lock, ChevronRight, UserMinus, ShieldCheck } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

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

  const handleDelete = async (personId: string, personName: string) => {
    Alert.alert(
      'Remove Sales Person',
      `Are you sure you want to remove ${personName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', personId);

              if (error) throw error;
              Alert.alert('Success', 'Sales person removed successfully');
              fetchSalesPersons();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const viewDetails = (person: User) => {
    router.push({
      pathname: '/admin/sales-person-details',
      params: { id: person.id },
    });
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
          <Text style={styles.headerTitle}>Manage Team</Text>
          <Text style={styles.headerSubtitle}>{salesPersons.length} Members active</Text>
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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIcon}>
              <UserPlus size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Add New Member</Text>
              <Text style={styles.sectionSubtitle}>Create credentials for a sales agent</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <UserIcon size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="e.g. John Doe"
                placeholderTextColor={Colors.text.tertiary}
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="john@example.com"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+91 00000 00000"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Auth Username *</Text>
                <View style={styles.inputContainer}>
                  <UserIcon size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.username}
                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                    placeholder="johndoe123"
                    placeholderTextColor={Colors.text.tertiary}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Access Password *</Text>
            <View style={styles.passwordContainer}>
              <Lock size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="••••••••"
                placeholderTextColor={Colors.text.tertiary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.text.tertiary} />
                ) : (
                  <Eye size={20} color={Colors.text.tertiary} />
                )}
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <ShieldAlert size={14} color={Colors.status.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.buttonText}>Register Sales Member</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Existing Team</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{salesPersons.length}</Text>
            </View>
          </View>

          {salesPersons.map((person) => (
            <View key={person.id} style={styles.personCard}>
              <TouchableOpacity
                style={styles.personInfo}
                onPress={() => viewDetails(person)}
                activeOpacity={0.7}
              >
                <View style={styles.personHeader}>
                  <View style={styles.nameRow}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: person.status === 'active' ? Colors.primary + '20' : Colors.text.tertiary + '20' }]}>
                      <Text style={[styles.avatarText, { color: person.status === 'active' ? Colors.primary : Colors.text.secondary }]}>
                        {person.full_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.personName}>{person.full_name}</Text>
                      <Text style={styles.personEmail}>{person.email}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: person.status === 'active' ? Colors.status.success + '15' : Colors.status.error + '15' }
                  ]}>
                    <View style={[styles.statusDot, { backgroundColor: person.status === 'active' ? Colors.status.success : Colors.status.error }]} />
                    <Text style={[
                      styles.statusText,
                      { color: person.status === 'active' ? Colors.status.success : Colors.status.error }
                    ]}>
                      {person.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.personMetrics}>
                  <View style={styles.metricItem}>
                    <Phone size={12} color={Colors.text.tertiary} />
                    <Text style={styles.personDetail}>{person.phone || 'No phone'}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.text.tertiary} />
                </View>
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.miniButton, {
                    backgroundColor: person.status === 'active' ? Colors.status.warning + '10' : Colors.status.success + '10',
                    borderColor: person.status === 'active' ? Colors.status.warning + '30' : Colors.status.success + '30'
                  }]}
                  onPress={() => toggleSuspend(person.id, person.status)}
                >
                  {person.status === 'active' ? (
                    <UserMinus size={14} color={Colors.status.warning} />
                  ) : (
                    <ShieldCheck size={14} color={Colors.status.success} />
                  )}
                  <Text style={[styles.miniButtonText, { color: person.status === 'active' ? Colors.status.warning : Colors.status.success }]}>
                    {person.status === 'active' ? 'Suspend' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniButton, {
                    backgroundColor: Colors.status.error + '10',
                    borderColor: Colors.status.error + '30',
                    paddingHorizontal: 16
                  }]}
                  onPress={() => handleDelete(person.id, person.full_name)}
                >
                  <Trash2 size={14} color={Colors.status.error} />
                  <Text style={[styles.miniButtonText, { color: Colors.status.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {salesPersons.length === 0 && (
            <View style={styles.emptyState}>
              <UserPlus size={48} color={Colors.divider} />
              <Text style={styles.emptyText}>No sales persons registered yet.</Text>
            </View>
          )}
        </View>
        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  backButton: {
    marginLeft: -Layout.spacing.sm,
  },
  iconButton: {
    padding: 8,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  formGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 12,
    marginBottom: 8,
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 8,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: Layout.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...Layout.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.status.error + '10',
    padding: 12,
    borderRadius: Layout.radius.lg,
    marginVertical: 8,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  listSection: {
    marginTop: Layout.spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  countBadge: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Layout.radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  personCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.sm,
  },
  personInfo: {
    flex: 1,
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Layout.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  personName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  personEmail: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  personMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personDetail: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Layout.radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  miniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
  },
  miniButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    padding: Layout.spacing.xl * 2,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 16,
  },
  emptyText: {
    color: Colors.text.tertiary,
    fontSize: 15,
    fontWeight: '600',
  },
  spacer: {
    height: 100,
  }
});
