import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ListTodo, Clock, Flame, CheckCircle, Briefcase, LogOut, MessageCircle, Bell, UserPlus, Plus, BookOpen, Settings, ChevronRight, Users, Phone } from 'lucide-react-native';
import NotificationBar from '@/components/NotificationBar';
import { Colors, Layout } from '@/constants/Colors';
import { syncUpcomingNotifications } from '@/services/notifications';

export default function SalesDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({
    addedLeads: 0,
    allocated: 0,
    followUps: 0,
    almostConfirmed: 0,
    hot: 0,
    confirmed: 0,
    operations: 0,
    noResponse: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchCounts();
      syncUpcomingNotifications(user.id);
    }

    const subscription = supabase
      .channel('sales_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotifications();
      if (user?.id) {
        fetchCounts();
      }
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCounts(), fetchUnreadNotifications()]);
    setRefreshing(false);
  }, []);

  const fetchCounts = async () => {
    try {
      const { count: addedLeadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'added_by_sales');

      const { count: allocatedCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'allocated');

      const { count: followUpsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'follow_up');

      const { count: hotCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'hot');

      const { count: confirmedCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'confirmed');

      const { count: operationsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'allocated_to_operations');

      const { data: followUpData } = await supabase
        .from('follow_ups')
        .select('lead_id', { count: 'exact' })
        .eq('sales_person_id', user?.id)
        .eq('update_type', 'almost_confirmed');

      const almostConfirmedLeadIds = [...new Set((followUpData || []).map((f: any) => f.lead_id))];
      const almostConfirmedCount = almostConfirmedLeadIds.length;

      const { count: noResponseCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .eq('status', 'no_response');

      setCounts({
        addedLeads: addedLeadsCount || 0,
        allocated: allocatedCount || 0,
        followUps: followUpsCount || 0,
        almostConfirmed: almostConfirmedCount || 0,
        hot: hotCount || 0,
        confirmed: confirmedCount || 0,
        operations: operationsCount || 0,
        noResponse: noResponseCount || 0,
      });
    } catch (err: any) {
      console.error('Error fetching counts:', err);
      // Log more details to help debug missing data issues
      if (user?.id) {
        console.warn(`Fetch counts failed for user ${user.id} (${user.role})`);
      }
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      setUnreadNotifications(count || 0);
    } catch (err: any) {
      console.error('Error fetching unread notifications:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const menuItems = [
    {
      title: 'Added Leads',
      count: counts.addedLeads,
      icon: UserPlus,
      route: '/sales/added-leads',
      color: Colors.primary,
    },
    {
      title: 'Allocated Leads',
      count: counts.allocated,
      icon: ListTodo,
      route: '/sales/allocated-leads',
      color: '#6366f1', // Indigo
    },
    {
      title: 'Follow Ups',
      count: counts.followUps,
      icon: Clock,
      route: '/sales/follow-ups',
      color: '#f59e0b', // Amber
    },
    {
      title: 'Almost Confirmed',
      count: counts.almostConfirmed,
      icon: CheckCircle,
      route: '/sales/almost-confirmed-leads',
      color: '#10b981', // Emerald
    },
    {
      title: 'Hot Leads',
      count: counts.hot,
      icon: Flame,
      route: '/sales/hot-leads',
      color: '#ef4444', // Red
    },
    {
      title: 'Confirmed Leads',
      count: counts.confirmed,
      icon: CheckCircle,
      route: '/sales/confirmed-leads',
      color: Colors.status.success,
    },
    {
      title: 'Allocated to Operations',
      count: counts.operations,
      icon: Briefcase,
      route: '/sales/operations',
      color: '#8b5cf6', // Purple
    },
    {
      title: 'No Response Leads',
      count: counts.noResponse,
      icon: Phone,
      route: '/sales/no-response-leads',
      color: '#f59e0b', // Amber/Orange
    },
  ];

  const utilityItems = [
    {
      title: 'Saved Itinerary',
      description: 'View and manage tour packages',
      icon: BookOpen,
      route: '/sales/saved-itinerary',
      color: '#a78bfa', // Light Purple
    },
    {
      title: 'All Guests',
      description: 'Search, edit and manage all guest details',
      icon: Users,
      route: '/sales/all-guests',
      color: '#6366f1', // Indigo
    },
  ];

  return (
    <View style={styles.container}>
      <NotificationBar userId={user?.id || ''} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.full_name?.split(' ')[0]}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/sales/settings')} style={styles.iconButton}>
            <Settings size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/sales/notifications')} style={styles.iconButton}>
            <Bell size={24} color={Colors.text.primary} />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/sales/chat')} style={styles.iconButton}>
            <MessageCircle size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <LogOut size={24} color={Colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuCount}>{item.count}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {utilityItems.map((item, index) => (
            <TouchableOpacity
              key={`util-${index}`}
              style={styles.utilityCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.utilityTitle}>{item.title}</Text>
                <Text style={styles.utilityDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/sales/add-lead')}
        activeOpacity={0.8}
      >
        <Plus size={28} color={Colors.text.inverse} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.status.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  notificationBadgeText: {
    color: Colors.text.inverse,
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
    marginTop: Layout.spacing.xs,
  },
  grid: {
    gap: Layout.spacing.md,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Layout.shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  utilityCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Layout.shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  menuCount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  utilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  utilityDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadows.lg,
  },
  spacer: {
    height: 80,
  }
});

