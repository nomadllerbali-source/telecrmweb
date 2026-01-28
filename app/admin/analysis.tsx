import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { ArrowLeft, TrendingUp, Phone, CheckCircle } from 'lucide-react-native';

interface SalesPersonStats {
  id: string;
  name: string;
  totalCalls: number;
  todayCalls: number;
  totalConversions: number;
  todayConversions: number;
  totalLeads: number;
}

export default function AnalysisScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SalesPersonStats[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: salesPersons, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'sales')
        .eq('status', 'active');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const statsPromises = (salesPersons || []).map(async (person: User) => {
        const { count: totalCallsCount } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('sales_person_id', person.id);

        const { count: todayCallsCount } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('sales_person_id', person.id)
          .gte('call_start_time', `${today}T00:00:00`);

        const { count: totalConversionsCount } = await supabase
          .from('confirmations')
          .select('*', { count: 'exact', head: true })
          .eq('confirmed_by', person.id);

        const { count: todayConversionsCount } = await supabase
          .from('confirmations')
          .select('*', { count: 'exact', head: true })
          .eq('confirmed_by', person.id)
          .gte('created_at', `${today}T00:00:00`);

        const { count: totalLeadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', person.id);

        return {
          id: person.id,
          name: person.full_name,
          totalCalls: totalCallsCount || 0,
          todayCalls: todayCallsCount || 0,
          totalConversions: totalConversionsCount || 0,
          todayConversions: todayConversionsCount || 0,
          totalLeads: totalLeadsCount || 0,
        };
      });

      const resolvedStats = await Promise.all(statsPromises);
      setStats(resolvedStats);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Analysis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {stats.map((person) => (
          <View key={person.id} style={styles.personCard}>
            <Text style={styles.personName}>{person.name}</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
                  <TrendingUp size={20} color="#3b82f6" />
                </View>
                <Text style={styles.statValue}>{person.totalLeads}</Text>
                <Text style={styles.statLabel}>Total Leads</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                  <Phone size={20} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>{person.totalCalls}</Text>
                <Text style={styles.statLabel}>Total Calls</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#ddd6fe' }]}>
                  <Phone size={20} color="#8b5cf6" />
                </View>
                <Text style={styles.statValue}>{person.todayCalls}</Text>
                <Text style={styles.statLabel}>Today's Calls</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                  <CheckCircle size={20} color="#10b981" />
                </View>
                <Text style={styles.statValue}>{person.totalConversions}</Text>
                <Text style={styles.statLabel}>Total Conversions</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                  <CheckCircle size={20} color="#10b981" />
                </View>
                <Text style={styles.statValue}>{person.todayConversions}</Text>
                <Text style={styles.statLabel}>Today's Conversions</Text>
              </View>
            </View>
          </View>
        ))}

        {stats.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sales persons found</Text>
          </View>
        )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
