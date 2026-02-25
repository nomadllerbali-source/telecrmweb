import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { supabase, setUserContext } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User, CallLog } from '@/types';
import { ArrowLeft, Phone, Clock, Calendar, Users, Target, TrendingUp, ChevronRight, UserCircle } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

export default function SalesPersonDetailsScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalCalls: 0,
    todayCalls: 0,
    totalConversions: 0,
    todayConversions: 0,
    totalLeads: 0,
    noResponseLeads: 0,
  });
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      if (currentUser) {
        await setUserContext(currentUser.id, currentUser.role);
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) throw userError;
      setPerson(userData);

      const { data: callData } = await supabase
        .from('call_logs')
        .select('*')
        .eq('sales_person_id', id)
        .order('call_start_time', { ascending: false })
        .limit(20);

      setCallLogs(callData || []);

      const { count: totalCallsCount } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('sales_person_id', id);

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCallsCount } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('sales_person_id', id)
        .gte('call_start_time', `${today}T00:00:00`);

      const { count: totalConversionsCount } = await supabase
        .from('confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('confirmed_by', id);

      const { count: todayConversionsCount } = await supabase
        .from('confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('confirmed_by', id)
        .gte('created_at', `${today}T00:00:00`);

      const { count: totalLeadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', id);

      const { count: noResponseCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', id)
        .eq('status', 'no_response');

      setStats({
        totalCalls: totalCallsCount || 0,
        todayCalls: todayCallsCount || 0,
        totalConversions: totalConversionsCount || 0,
        todayConversions: todayConversionsCount || 0,
        totalLeads: totalLeadsCount || 0,
        noResponseLeads: noResponseCount || 0,
      });
    } catch (err: any) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const getTotalCallDuration = () => {
    return callLogs.reduce((sum, log) => sum + (log.call_duration || 0), 0);
  };

  const getAverageCallDuration = () => {
    if (callLogs.length === 0) return 0;
    return Math.floor(getTotalCallDuration() / callLogs.length);
  };

  const getLongestCall = () => {
    if (callLogs.length === 0) return 0;
    return Math.max(...callLogs.map((log) => log.call_duration || 0));
  };

  const getTodayCallDuration = () => {
    const today = new Date().toISOString().split('T')[0];
    return callLogs
      .filter((log) => log.call_start_time.startsWith(today))
      .reduce((sum, log) => sum + (log.call_duration || 0), 0);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Executive Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Card */}
        <View style={styles.personCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{person?.full_name?.charAt(0)}</Text>
          </View>
          <Text style={styles.personName}>{person?.full_name}</Text>
          <Text style={styles.personRole}>Sales Executive</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.personDetail}>{person?.email}</Text>
            {person?.phone && (
              <>
                <View style={styles.dot} />
                <Text style={styles.personDetail}>{person.phone}</Text>
              </>
            )}
          </View>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                person?.status === 'active' ? styles.statusActive : styles.statusSuspended,
              ]}
            />
            <Text style={styles.statusText}>
              {person?.status === 'active' ? 'Active Account' : 'Suspended'}
            </Text>
          </View>

          {person?.last_login && (
            <Text style={styles.lastLogin}>
              Last active: {formatDateTime(person.last_login)}
            </Text>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.viewGuestsButton}
          onPress={() => router.push({ pathname: '/admin/sales-person-leads', params: { id } })}
        >
          <Users size={20} color={Colors.text.inverse} />
          <Text style={styles.viewGuestsButtonText}>View Assigned Guests</Text>
          <ChevronRight size={20} color={Colors.text.inverse} />
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={styles.sectionHeader}>
          <TrendingUp size={18} color={Colors.primary} />
          <Text style={styles.sectionHeaderText}>Performance Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Target size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.totalLeads}</Text>
              <Text style={styles.statLabel}>Total Leads</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.status.info + '15' }]}>
              <Phone size={20} color={Colors.status.info} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.totalCalls}</Text>
              <Text style={styles.statLabel}>Total Calls</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.status.warning + '15' }]}>
              <Clock size={20} color={Colors.status.warning} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.todayCalls}</Text>
              <Text style={styles.statLabel}>Today's Calls</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.status.success + '15' }]}>
              <Users size={20} color={Colors.status.success} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.totalConversions}</Text>
              <Text style={styles.statLabel}>Conversions</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b15' }]}>
              <Phone size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.noResponseLeads}</Text>
              <Text style={styles.statLabel}>No Response</Text>
            </View>
          </View>
        </View>

        {/* Analytics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Duration Metrics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Total Duration</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getTotalCallDuration())}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Today's Action</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getTodayCallDuration())}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Avg. per Call</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getAverageCallDuration())}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Peak Call</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getLongestCall())}</Text>
            </View>
          </View>
        </View>

        {/* Log Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Engagement</Text>
          {callLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Phone size={48} color={Colors.surfaceHighlight} />
              <Text style={styles.emptyText}>No recent call logs found.</Text>
            </View>
          ) : (
            callLogs.map((log) => (
              <View key={log.id} style={styles.callLogCard}>
                <View style={styles.callLogHeader}>
                  <View style={styles.callIcon}>
                    <Phone size={14} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.callLogTime}>
                      {formatDateTime(log.call_start_time)}
                    </Text>
                    <View style={styles.callLogFooter}>
                      <Clock size={12} color={Colors.text.tertiary} />
                      <Text style={styles.callLogDetailText}>
                        Duration: {formatDuration(log.call_duration)}
                      </Text>
                    </View>
                  </View>
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
  personCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.lg,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  personName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  personRole: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.tertiary,
  },
  personDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Layout.radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: Colors.status.success,
  },
  statusSuspended: {
    backgroundColor: Colors.status.error,
  },
  statusText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  lastLogin: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 16,
    fontWeight: '500',
  },
  viewGuestsButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Layout.radius.lg,
    marginBottom: 32,
    gap: 12,
    ...Layout.shadows.md,
  },
  viewGuestsButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginLeft: 4,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analyticsLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginBottom: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  analyticsValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  callLogCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  callLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  callIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callLogTime: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  callLogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callLogDetailText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  spacer: {
    height: 40,
  }
});
