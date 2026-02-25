import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trash2, Bell } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface NotificationPreferences {
  id: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  do_not_disturb_enabled: boolean;
  do_not_disturb_start: string;
  do_not_disturb_end: string;
  notification_type_filter: 'all' | 'hot_only' | 'starred_only';
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id]);

  const fetchPreferences = async () => {
    try {
      let { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user?.id,
            notifications_enabled: true,
            sound_enabled: true,
            vibration_enabled: true,
            do_not_disturb_enabled: false,
            notification_type_filter: 'all',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPrefs(newPrefs);
      } else {
        setPrefs(data);
      }
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (field: keyof NotificationPreferences, value: any) => {
    if (!prefs) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('id', prefs.id);

      if (error) throw error;

      setPrefs({
        ...prefs,
        [field]: value,
      });
    } catch (err: any) {
      console.error('Error updating preference:', err);
    } finally {
      setSaving(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
      alert('All notifications cleared');
    } catch (err: any) {
      console.error('Error clearing notifications:', err);
      alert('Failed to clear notifications');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!prefs) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load preferences</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Bell size={20} color={Colors.primary} />
              <View style={styles.labelText}>
                <Text style={styles.labelTitle}>Enable Notifications</Text>
                <Text style={styles.labelDescription}>Receive lead assignment alerts</Text>
              </View>
            </View>
            <Switch
              value={prefs.notifications_enabled}
              onValueChange={(value) => updatePreference('notifications_enabled', value)}
              disabled={saving}
              trackColor={{ false: Colors.text.tertiary, true: Colors.primary + '80' }}
              thumbColor={prefs.notifications_enabled ? Colors.primary : '#f3f4f6'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Bell size={20} color={Colors.primary} />
              <View style={styles.labelText}>
                <Text style={styles.labelTitle}>Sound Alerts</Text>
                <Text style={styles.labelDescription}>Play sound for incoming notifications</Text>
              </View>
            </View>
            <Switch
              value={prefs.sound_enabled}
              onValueChange={(value) => updatePreference('sound_enabled', value)}
              disabled={saving || !prefs.notifications_enabled}
              trackColor={{ false: Colors.text.tertiary, true: Colors.primary + '80' }}
              thumbColor={prefs.sound_enabled ? Colors.primary : '#f3f4f6'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Bell size={20} color={Colors.primary} />
              <View style={styles.labelText}>
                <Text style={styles.labelTitle}>Vibration Alerts</Text>
                <Text style={styles.labelDescription}>Haptic feedback on notifications</Text>
              </View>
            </View>
            <Switch
              value={prefs.vibration_enabled}
              onValueChange={(value) => updatePreference('vibration_enabled', value)}
              disabled={saving || !prefs.notifications_enabled}
              trackColor={{ false: Colors.text.tertiary, true: Colors.primary + '80' }}
              thumbColor={prefs.vibration_enabled ? Colors.primary : '#f3f4f6'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Do Not Disturb</Text>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Bell size={20} color={Colors.primary} />
              <View style={styles.labelText}>
                <Text style={styles.labelTitle}>Enable Do Not Disturb</Text>
                <Text style={styles.labelDescription}>Silence notifications during set hours</Text>
              </View>
            </View>
            <Switch
              value={prefs.do_not_disturb_enabled}
              onValueChange={(value) => updatePreference('do_not_disturb_enabled', value)}
              disabled={saving}
              trackColor={{ false: Colors.text.tertiary, true: Colors.primary + '80' }}
              thumbColor={prefs.do_not_disturb_enabled ? Colors.primary : '#f3f4f6'}
            />
          </View>

          {prefs.do_not_disturb_enabled && (
            <>
              <View style={styles.timeInputContainer}>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeInputLabel}>Start Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={prefs.do_not_disturb_start}
                    onChangeText={(value) => updatePreference('do_not_disturb_start', value)}
                    placeholder="22:00"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeInputLabel}>End Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={prefs.do_not_disturb_end}
                    onChangeText={(value) => updatePreference('do_not_disturb_end', value)}
                    placeholder="08:00"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
              </View>
              <Text style={styles.timeHelperText}>Use 24-hour format (HH:MM)</Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Type Filter</Text>

          <Text style={styles.filterDescription}>
            Choose which notifications you want to receive based on lead type.
          </Text>

          <View style={styles.filterOptions}>
            {(['all', 'hot_only', 'starred_only'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterButton,
                  prefs.notification_type_filter === option && styles.filterButtonActive,
                ]}
                onPress={() => updatePreference('notification_type_filter', option)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    prefs.notification_type_filter === option && styles.filterButtonTextActive,
                  ]}
                >
                  {option === 'all' && 'All Leads'}
                  {option === 'hot_only' && 'Hot Leads Only'}
                  {option === 'starred_only' && 'Starred Only'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={clearAllNotifications}
            disabled={saving}
          >
            <Trash2 size={20} color={Colors.status.error} />
            <Text style={styles.dangerButtonText}>Clear All Notifications</Text>
          </TouchableOpacity>
          <Text style={styles.dangerDescription}>This action cannot be undone.</Text>
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.status.error,
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
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: 16,
    ...Layout.shadows.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  preferenceLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelText: {
    flex: 1,
  },
  labelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  labelDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  timeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text.primary,
    fontFamily: 'monospace',
    backgroundColor: Colors.background,
  },
  timeHelperText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
  filterDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  filterOptions: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceHighlight,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.status.error + '40', // 25% opacity
    backgroundColor: Colors.status.error + '10', // 10% opacity
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.status.error,
  },
  dangerDescription: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 8,
    textAlign: 'center',
  },
});
