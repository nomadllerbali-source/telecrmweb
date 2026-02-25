import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase, setUserContext } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { ArrowLeft, TrendingUp, Phone, CheckCircle, BarChart3, Users, DollarSign, Clock, Layout as LayoutIcon, ChevronRight } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface SalesPersonStats {
  id: string;
  name: string;
  totalCalls: number;
  todayCalls: number;
  totalConversions: number;
  todayConversions: number;
  totalLeads: number;
  conversionRate: number;
  totalRevenue: number;
  avgCallDuration: number;
}

export default function AnalysisScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SalesPersonStats[]>([]);
  const [sourceStats, setSourceStats] = useState<{ source: string, count: number, conversions: number }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      if (user) {
        await setUserContext(user.id, user.role);
      }

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

        const { data: confirmations } = await supabase
          .from('confirmations')
          .select('total_amount')
          .eq('confirmed_by', person.id);

        const totalRevenue = (confirmations || []).reduce((sum, conf) => sum + (conf.total_amount || 0), 0);

        const { data: calls } = await supabase
          .from('call_logs')
          .select('call_duration')
          .eq('sales_person_id', person.id);

        const totalDuration = (calls || []).reduce((sum, call) => sum + (call.call_duration || 0), 0);
        const avgDuration = (calls && calls.length) ? totalDuration / calls.length : 0;

        return {
          id: person.id,
          name: person.full_name,
          totalCalls: totalCallsCount || 0,
          todayCalls: todayCallsCount || 0,
          totalConversions: totalConversionsCount || 0,
          todayConversions: todayConversionsCount || 0,
          totalLeads: totalLeadsCount || 0,
          conversionRate: totalLeadsCount ? ((totalConversionsCount || 0) / totalLeadsCount) * 100 : 0,
          totalRevenue: totalRevenue,
          avgCallDuration: avgDuration,
        };
      });

      const resolvedStats = await Promise.all(statsPromises);
      setStats(resolvedStats);

      const leadSources = ['Instagram', 'Facebook', 'Google Ads', 'Website', 'WhatsApp', 'Phone', 'Other'];
      const sourcePromises = leadSources.map(async (source) => {
        const { count: leadCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('lead_source', source || 'Other');

        return {
          source,
          count: leadCount || 0,
          conversions: 0
        };
      });

      const resolvedSourceStats = await Promise.all(sourcePromises);

      const { data: confirmationsWithLeads, error: joinError } = await supabase
        .from('confirmations')
        .select(`
          id,
          leads:lead_id (
            lead_source
          )
        `);

      if (!joinError && confirmationsWithLeads) {
        resolvedSourceStats.forEach(stat => {
          const conversions = (confirmationsWithLeads as any[]).filter(c => c.leads?.lead_source === stat.source).length;
          stat.conversions = conversions;
        });
      }

      setSourceStats(resolvedSourceStats);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Team Analytics</Text>
          <Text style={styles.headerSubtitle}>Real-time performance data</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeaderRow}>
          <Users size={18} color={Colors.text.secondary} />
          <Text style={styles.sectionTitle}>Agent Performance</Text>
        </View>

        {stats.map((person) => (
          <TouchableOpacity
            key={person.id}
            style={styles.personCard}
            onPress={() => router.push({ pathname: '/admin/sales-person-details', params: { id: person.id } })}
          >
            <View style={styles.personHeader}>
              <View style={styles.personAvatar}>
                <Text style={styles.avatarText}>{person.name.charAt(0)}</Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{person.name}</Text>
                <Text style={styles.personStatus}>Active Today</Text>
              </View>
              <ChevronRight size={18} color={Colors.text.tertiary} />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '15' }]}>
                  <LayoutIcon size={16} color={Colors.primary} />
                </View>
                <Text style={styles.statValue}>{person.totalLeads}</Text>
                <Text style={styles.statLabel}>Leads</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.status.warning + '15' }]}>
                  <Phone size={16} color={Colors.status.warning} />
                </View>
                <Text style={styles.statValue}>{person.totalCalls}</Text>
                <Text style={styles.statLabel}>Calls</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.status.success + '15' }]}>
                  <CheckCircle size={16} color={Colors.status.success} />
                </View>
                <Text style={styles.statValue}>{person.totalConversions}</Text>
                <Text style={styles.statLabel}>Wins</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight + '15' }]}>
                  <TrendingUp size={16} color={Colors.primaryLight} />
                </View>
                <Text style={styles.statValue}>{person.conversionRate.toFixed(1)}%</Text>
                <Text style={styles.statLabel}>Conv Rate</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#f9731615' }]}>
                  <DollarSign size={16} color="#f97316" />
                </View>
                <Text style={styles.statValue}>₹{(person.totalRevenue / 1000).toFixed(1)}k</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.text.tertiary + '15' }]}>
                  <Clock size={16} color={Colors.text.tertiary} />
                </View>
                <Text style={styles.statValue}>{Math.floor(person.avgCallDuration / 60)}m</Text>
                <Text style={styles.statLabel}>Avg Call</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.sectionHeaderRow}>
          <BarChart3 size={18} color={Colors.text.secondary} />
          <Text style={styles.sectionTitle}>Conversion Sources</Text>
        </View>

        <View style={styles.sourceCard}>
          {sourceStats.map((item, index) => {
            const maxCount = Math.max(...sourceStats.map(s => s.count)) || 1;
            const percentage = (item.count / maxCount) * 100;
            const convPercentage = item.count > 0 ? (item.conversions / item.count) * 100 : 0;

            return (
              <View key={item.source} style={styles.sourceItem}>
                <View style={styles.sourceInfo}>
                  <View style={styles.sourceNameRow}>
                    <Text style={styles.sourceName}>{item.source}</Text>
                    {convPercentage > 20 && (
                      <View style={styles.hotBadge}>
                        <TrendingUp size={10} color={Colors.status.success} />
                        <Text style={styles.hotBadgeText}>Top Tier</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sourceCount}>{item.count} Lds • {item.conversions} Conf</Text>
                </View>
                <View style={styles.sourceBarWrapper}>
                  <View style={styles.sourceBarContainer}>
                    <View
                      style={[
                        styles.sourceBar,
                        {
                          width: `${Math.min(100, percentage)}%`,
                          backgroundColor: Colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.sourceRateText}>{convPercentage.toFixed(0)}% Conv.</Text>
                </View>
              </View>
            );
          })}
        </View>

        {stats.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Users size={48} color={Colors.surfaceHighlight} />
            <Text style={styles.emptyText}>No performance data found for the current team.</Text>
          </View>
        )}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  personCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 20,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  personStatus: {
    fontSize: 12,
    color: Colors.status.success,
    fontWeight: '600',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '30%',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sourceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  sourceItem: {
    marginBottom: 20,
  },
  sourceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.status.success + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
  },
  hotBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: Colors.status.success,
    textTransform: 'uppercase',
  },
  sourceCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  sourceBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sourceBar: {
    height: '100%',
    borderRadius: 4,
  },
  sourceRateText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    width: 60,
    textAlign: 'right',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center',
    fontWeight: '600',
  },
  spacer: {
    height: 60,
  }
});
