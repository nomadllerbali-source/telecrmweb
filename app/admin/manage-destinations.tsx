import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase, setUserContext } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Trash2 } from 'lucide-react-native';

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
          onPress: () => {},
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
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Destinations</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Destination</Text>

          <Text style={styles.label}>Destination Name *</Text>
          <TextInput
            style={styles.input}
            value={destinationName}
            onChangeText={setDestinationName}
            placeholder="Enter destination name (e.g., Paris, Tokyo)"
            returnKeyType="done"
            autoCapitalize="words"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAddDestination}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Destination</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Existing Destinations ({destinations.length})
          </Text>
          {destinations.length === 0 ? (
            <Text style={styles.emptyText}>No destinations added yet</Text>
          ) : (
            destinations.map((destination) => (
              <View key={destination.id} style={styles.destinationCard}>
                <TouchableOpacity
                  style={styles.destinationInfo}
                  onPress={() => handleToggleActive(destination.id, destination.is_active)}
                >
                  <View style={styles.destinationContent}>
                    <Text style={styles.destinationName}>{destination.name}</Text>
                    <View style={styles.statusBadge}>
                      <View
                        style={[
                          styles.statusDot,
                          destination.is_active ? styles.statusActive : styles.statusInactive,
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {destination.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDestination(destination.id, destination.name)}
                  disabled={deleting === destination.id}
                >
                  {deleting === destination.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Trash2 size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
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
  button: {
    backgroundColor: '#3b82f6',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationContent: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
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
  statusInactive: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
