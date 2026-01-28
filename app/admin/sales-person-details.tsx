import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { User, CallLog } from '@/types';
import { ArrowLeft, Phone, Clock, Calendar } from 'lucide-react-native';

export default function SalesPersonDetailsScreen() {
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
  });
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
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

      setStats({
        totalCalls: totalCallsCount || 0,
        todayCalls: todayCallsCount || 0,
        totalConversions: totalConversionsCount || 0,
        todayConversions: todayConversionsCount || 0,
        totalLeads: totalLeadsCount || 0,
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
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales Person Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.personCard}>
          <Text style={styles.personName}>{person?.full_name}</Text>
          <Text style={styles.personDetail}>{person?.email}</Text>
          {person?.phone && <Text style={styles.personDetail}>{person.phone}</Text>}
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                person?.status === 'active' ? styles.statusActive : styles.statusSuspended,
              ]}
            />
            <Text style={styles.statusText}>
              {person?.status === 'active' ? 'Active' : 'Suspended'}
            </Text>
          </View>
          {person?.last_login && (
            <Text style={styles.lastLogin}>
              Last Login: {formatDateTime(person.last_login)}
            </Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalLeads}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalCalls}</Text>
            <Text style={styles.statLabel}>Total Calls</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.todayCalls}</Text>
            <Text style={styles.statLabel}>Today's Calls</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalConversions}</Text>
            <Text style={styles.statLabel}>Total Conversions</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Duration Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Total Duration</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getTotalCallDuration())}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Today's Duration</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getTodayCallDuration())}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Average Duration</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getAverageCallDuration())}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>Longest Call</Text>
              <Text style={styles.analyticsValue}>{formatDuration(getLongestCall())}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Call Logs</Text>
          {callLogs.length === 0 ? (
            <Text style={styles.emptyText}>No call logs yet</Text>
          ) : (
            callLogs.map((log) => (
              <View key={log.id} style={styles.callLogCard}>
                <View style={styles.callLogHeader}>
                  <Phone size={16} color="#3b82f6" />
                  <Text style={styles.callLogTime}>
                    {formatDateTime(log.call_start_time)}
                  </Text>
                </View>
                <View style={styles.callLogDetails}>
                  <View style={styles.callLogDetail}>
                    <Clock size={14} color="#666" />
                    <Text style={styles.callLogDetailText}>
                      Duration: {formatDuration(log.call_duration)}
                    </Text>
                  </View>
                </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  personCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  personDetail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusSuspended: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  lastLogin: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  callLogCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  callLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  callLogTime: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    marginLeft: 8,
  },
  callLogDetails: {
    marginLeft: 24,
  },
  callLogDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  callLogDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
