import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ListTodo, Clock, Flame, CheckCircle, Briefcase, LogOut, MessageCircle, Bell, UserPlus, Plus, BookOpen, Settings } from 'lucide-react-native';
import NotificationBar from '@/components/NotificationBar';

export default function SalesDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState({
    addedLeads: 0,
    allocated: 0,
    followUps: 0,
    almostConfirmed: 0,
    hot: 0,
    confirmed: 0,
    operations: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchCounts();

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
      fetchCounts();
    }, [])
  );

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

      setCounts({
        addedLeads: addedLeadsCount || 0,
        allocated: allocatedCount || 0,
        followUps: followUpsCount || 0,
        almostConfirmed: almostConfirmedCount || 0,
        hot: hotCount || 0,
        confirmed: confirmedCount || 0,
        operations: operationsCount || 0,
      });
    } catch (err: any) {
      console.error('Error fetching counts:', err);
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
      color: '#14b8a6',
    },
    {
      title: 'Allocated Leads',
      count: counts.allocated,
      icon: ListTodo,
      route: '/sales/allocated-leads',
      color: '#3b82f6',
    },
    {
      title: 'Follow Ups',
      count: counts.followUps,
      icon: Clock,
      route: '/sales/follow-ups',
      color: '#f59e0b',
    },
    {
      title: 'Almost Confirmed',
      count: counts.almostConfirmed,
      icon: CheckCircle,
      route: '/sales/almost-confirmed-leads',
      color: '#06b6d4',
    },
    {
      title: 'Hot Leads',
      count: counts.hot,
      icon: Flame,
      route: '/sales/hot-leads',
      color: '#ef4444',
    },
    {
      title: 'Confirmed Leads',
      count: counts.confirmed,
      icon: CheckCircle,
      route: '/sales/confirmed-leads',
      color: '#10b981',
    },
    {
      title: 'Allocated to Operations',
      count: counts.operations,
      icon: Briefcase,
      route: '/sales/operations',
      color: '#8b5cf6',
    },
  ];

  const utilityItems = [
    {
      title: 'Saved Itinerary',
      description: 'View and manage tour packages',
      icon: BookOpen,
      route: '/sales/saved-itinerary',
      color: '#ec4899',
    },
  ];

  return (
    <View style={styles.container}>
      <NotificationBar userId={user?.id || ''} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sales Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.full_name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/sales/settings')} style={styles.settingsButton}>
            <Settings size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/sales/notifications')} style={styles.notificationButton}>
            <Bell size={24} color="#8b5cf6" />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/sales/chat')} style={styles.chatButton}>
            <MessageCircle size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuCard}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <item.icon size={28} color="#fff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuCount}>{item.count} leads</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Tools</Text>
        {utilityItems.map((item, index) => (
          <TouchableOpacity
            key={`util-${index}`}
            style={styles.menuCard}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <item.icon size={28} color="#fff" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/sales/add-lead')}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  menuCount: {
    fontSize: 14,
    color: '#666',
  },
  menuDescription: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
