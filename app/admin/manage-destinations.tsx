import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase, setUserContext } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Trash2, MapPin, Globe, Plus, EyeOff, Eye } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface Destination {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function ManageDestinationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (user?.id && user?.role) {
        await setUserContext(user.id, user.role);
      }
      fetchDestinations();
    };
    initialize();
  }, [user?.id]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDestinations(data || []);
    } catch (err: any) {
      console.error('Error fetching destinations:', err);
    }
  };

  const handleAddDestination = async () => {
    if (!destinationName.trim()) {
      setError('Please enter a destination name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (user?.id && user?.role) {
        await setUserContext(user.id, user.role);
      }

      const { data, error: insertError } = await supabase
        .from('destinations')
        .insert({
          name: destinationName.trim(),
          is_active: true,
        })
        .select();

      if (insertError) throw insertError;

      Alert.alert('Success', 'Destination added successfully');
      setDestinationName('');
      fetchDestinations();
    } catch (err: any) {
      if (err.message.includes('unique')) {
        setError('This destination already exists');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDestination = async (id: string, name: string) => {
    Alert.alert(
      'Delete Destination',
      `Are you sure you want to delete "${name}"?`,
      [
        {
          text: 'Cancel',
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            setDeleting(id);
            try {
              if (user?.id && user?.role) {
                await setUserContext(user.id, user.role);
              }

              const { error } = await supabase
                .from('destinations')
                .delete()
                .eq('id', id);

              if (error) throw error;
              Alert.alert('Success', 'Destination deleted successfully');
              fetchDestinations();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setDeleting(null);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      if (user?.id && user?.role) {
        await setUserContext(user.id, user.role);
      }

      const { error } = await supabase
        .from('destinations')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchDestinations();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Tour Destinations</Text>
          <Text style={styles.headerSubtitle}>Manage your catalog</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBg}>
              <Plus size={20} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Add New Destination</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Destination Name</Text>
            <View style={styles.inputContainer}>
              <MapPin size={18} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={destinationName}
                onChangeText={setDestinationName}
                placeholder="e.g. Lakshadweep, Goa"
                placeholderTextColor={Colors.text.tertiary}
                returnKeyType="done"
                autoCapitalize="words"
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!destinationName.trim() || loading) && styles.buttonDisabled]}
            onPress={handleAddDestination}
            disabled={!destinationName.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <View style={styles.buttonContent}>
                <Plus size={18} color={Colors.text.inverse} />
                <Text style={styles.buttonText}>Publish Destination</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>Published Destinations</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{destinations.length}</Text>
            </View>
          </View>

          {destinations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Globe size={48} color={Colors.surfaceHighlight} />
              </View>
              <Text style={styles.emptyText}>No destinations added yet</Text>
              <Text style={styles.emptySubtext}>Add your first tour destination above</Text>
            </View>
          ) : (
            destinations.map((destination) => (
              <View key={destination.id} style={styles.destinationCard}>
                <View style={styles.destinationIcon}>
                  <MapPin size={22} color={Colors.primary} />
                </View>
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationName}>{destination.name}</Text>
                  <View style={styles.statusRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleActive(destination.id, destination.is_active)}
                      style={[
                        styles.statusBadge,
                        { backgroundColor: destination.is_active ? Colors.status.success + '15' : Colors.status.warning + '15' }
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: destination.is_active ? Colors.status.success : Colors.status.warning }
                        ]}
                      />
                      <Text style={[
                        styles.statusText,
                        { color: destination.is_active ? Colors.status.success : Colors.status.warning }
                      ]}>
                        {destination.is_active ? 'Active' : 'Hidden'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.dateText}>Added {new Date(destination.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleToggleActive(destination.id, destination.is_active)}
                    style={styles.actionButton}
                  >
                    {destination.is_active ? (
                      <EyeOff size={18} color={Colors.text.secondary} />
                    ) : (
                      <Eye size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteDestination(destination.id, destination.name)}
                    disabled={deleting === destination.id}
                  >
                    {deleting === destination.id ? (
                      <ActivityIndicator color={Colors.status.error} size="small" />
                    ) : (
                      <Trash2 size={18} color={Colors.status.error} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={styles.spacer} />
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
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
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
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
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: Layout.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Layout.shadows.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.surfaceHighlight,
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  listSection: {
    marginTop: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  destinationIcon: {
    width: 44,
    height: 44,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Layout.radius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButton: {
    padding: 8,
    borderRadius: Layout.radius.md,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: Layout.radius.md,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  spacer: {
    height: 60,
  }
});
