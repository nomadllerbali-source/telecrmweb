import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Dimensions, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, ListPlus, BarChart3, Download, LogOut, MessageCircle, Bell, BookOpen, Map, Trophy, Target, MessageSquare, ChevronRight, Settings } from 'lucide-react-native';
import NotificationBar from '@/components/NotificationBar';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Futuristic Theme
const Theme = {
  bg: '#050511',           // Deep dark blue/black
  surface: 'rgba(255, 255, 255, 0.03)', // Very transparent glass surface
  surfaceGlow: 'rgba(0, 240, 255, 0.05)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8', // Slate 400
  border: 'rgba(255, 255, 255, 0.1)',
  neon: {
    cyan: '#00f0ff',
    purple: '#8b5cf6',
    emerald: '#10b981',
    amber: '#f59e0b',
    indigo: '#6366f1',
    pink: '#ec4899',
    rose: '#f43f5e',
    slate: '#94a3b8',
    red: '#ff2a2a'
  }
};

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
          title: 'Assign Leads',
          description: 'Distribute tasks',
          icon: ListPlus,
          route: '/admin/assign-lead',
          color: Theme.neon.cyan,
        },
      ],
    },
    {
      title: 'Team Management',
      items: [
        {
          title: 'Add Personnel',
          description: 'Manage sales team',
          icon: UserPlus,
          route: '/admin/add-sales-person',
          color: Theme.neon.emerald,
        },
        {
          title: 'Leaderboard',
          description: 'Monthly rankings',
          icon: Trophy,
          route: '/admin/leaderboard',
          color: Theme.neon.amber,
        },
        {
          title: 'Set Targets',
          description: 'Monthly goals',
          icon: Target,
          route: '/admin/manage-targets',
          color: Theme.neon.indigo,
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          title: 'Destinations',
          description: 'Manage locations',
          icon: Map,
          route: '/admin/manage-destinations',
          color: Theme.neon.purple,
        },
        {
          title: 'Itineraries',
          description: 'Tour packages',
          icon: BookOpen,
          route: '/admin/saved-itinerary',
          color: '#a78bfa',
        },
      ],
    },
    {
      title: 'Analytics & Data',
      items: [
        {
          title: 'Analytics',
          description: 'Performance metrics',
          icon: BarChart3,
          route: '/admin/analysis',
          color: Theme.neon.pink,
        },
        {
          title: 'Feedback',
          description: 'Guest ratings',
          icon: MessageSquare,
          route: '/admin/feedback',
          color: Theme.neon.rose,
        },
        {
          title: 'Exports',
          description: 'Download sheets',
          icon: Download,
          route: '/admin/export',
          color: Theme.neon.slate,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <NotificationBar userId={user?.id || ''} />

      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(0, 240, 255, 0.1)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
      />

      {/* Header HUD */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
          style={styles.headerGlass}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerSubtitle}>SYSTEM SECURE</Text>
              <Text style={styles.headerTitle}>Welcome, {user?.full_name?.split(' ')[0]}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => router.push('/sales/notifications')} style={styles.iconButton}>
                <Bell size={22} color={Theme.neon.cyan} />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/admin/chat')} style={styles.iconButton}>
                <MessageCircle size={22} color={Theme.neon.purple} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
                <LogOut size={22} color={Theme.neon.red} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.neon.cyan}
            colors={[Theme.neon.cyan]}
            progressBackgroundColor={Theme.surface}
          />
        }
      >
        {sections.map((section, sIndex) => (
          <View key={sIndex} style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.grid}>
              {section.items.map((item, iIndex) => (
                <TouchableOpacity
                  key={iIndex}
                  style={styles.cardWrapper}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                    style={[styles.menuCard, { borderColor: `${item.color}30` }]}
                  >
                    <View style={[styles.iconContainer, {
                      backgroundColor: `${item.color}15`,
                      shadowColor: item.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                      elevation: 5
                    }]}>
                      <item.icon size={26} color={item.color} />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuDescription} numberOfLines={1}>{item.description}</Text>
                    </View>
                    {/* Glowing Accent Line at the bottom of card */}
                    <View style={[styles.cardAccentLine, { backgroundColor: item.color }]} />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.bg,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerGlass: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 16,
    overflow: 'hidden',
    shadowColor: Theme.neon.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    color: Theme.neon.cyan,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.textPrimary,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Theme.neon.red,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: Theme.neon.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLine: {
    width: 24,
    height: 2,
    backgroundColor: Theme.neon.cyan,
    marginRight: 10,
    shadowColor: Theme.neon.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  cardWrapper: {
    width: (width - 40 - 16) / 2, // 2 columns, 40 total padding, 16 gap
  },
  menuCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 140, // Fixed height for consistent grid
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuTextContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.textPrimary,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  cardAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.8,
  },
  spacer: {
    height: 80,
  }
});
