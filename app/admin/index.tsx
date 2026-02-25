import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, ListPlus, BarChart3, Download, LogOut, MessageCircle, Bell, BookOpen, Map, Trophy, Target, MessageSquare, ChevronRight, Settings } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';
import NotificationBar from '@/components/NotificationBar';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchUnreadNotifications();

    const subscription = supabase
      .channel('admin_notifications')
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
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUnreadNotifications();
    setRefreshing(false);
  }, []);

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

  const sections = [
    {
      title: 'Lead Management',
      items: [
        {
          title: 'Assign New Lead',
          description: 'Assign tasks to sales persons',
          icon: ListPlus,
          route: '/admin/assign-lead',
          color: Colors.primary,
        },
      ],
    },
    {
      title: 'Team Management',
      items: [
        {
          title: 'Add New Sales Person',
          description: 'Create and manage sales team',
          icon: UserPlus,
          route: '/admin/add-sales-person',
          color: '#10b981', // Emerald
        },
        {
          title: 'Performance Leaderboard',
          description: 'Monthly sales rankings & goals',
          icon: Trophy,
          route: '/admin/leaderboard',
          color: '#f59e0b', // Amber
        },
        {
          title: 'Manage Targets',
          description: 'Set monthly salesperson goals',
          icon: Target,
          route: '/admin/manage-targets',
          color: '#6366f1', // Indigo
        },
      ],
    },
    {
      title: 'Operations & Content',
      items: [
        {
          title: 'Manage Destinations',
          description: 'Add and manage tour destinations',
          icon: Map,
          route: '/admin/manage-destinations',
          color: '#8b5cf6', // Violet
        },
        {
          title: 'Saved Itinerary',
          description: 'Create and manage tour packages',
          icon: BookOpen,
          route: '/admin/saved-itinerary',
          color: '#a78bfa', // Light Purple
        },
      ],
    },
    {
      title: 'Analytics & Feedback',
      items: [
        {
          title: 'Analysis',
          description: 'View team performance metrics',
          icon: BarChart3,
          route: '/admin/analysis',
          color: '#ec4899', // Pink
        },
        {
          title: 'Customer Feedback',
          description: 'View guest reviews and ratings',
          icon: MessageSquare,
          route: '/admin/feedback',
          color: '#f43f5e', // Rose
        },
        {
          title: 'Export Data',
          description: 'Download reports and sheets',
          icon: Download,
          route: '/admin/export',
          color: '#64748b', // Slate
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <NotificationBar userId={user?.id || ''} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.full_name?.split(' ')[0]}</Text>
        </View>
        <View style={styles.headerActions}>
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
          <TouchableOpacity onPress={() => router.push('/admin/chat')} style={styles.iconButton}>
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
        {sections.map((section, sIndex) => (
          <View key={sIndex} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map((item, iIndex) => (
                <TouchableOpacity
                  key={iIndex}
                  style={styles.menuCard}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                    <item.icon size={24} color={item.color} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.spacer} />
      </ScrollView>
    </View >
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
  sectionContainer: {
    marginBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Layout.spacing.md,
    marginLeft: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  spacer: {
    height: 40,
  }
});
