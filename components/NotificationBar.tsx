import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { X, AlertCircle, Flame, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  lead_id: string;
  lead_type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationBarProps {
  userId: string;
}

const NOTIFICATION_WIDTH = Dimensions.get('window').width - 16;

export default function NotificationBar({ userId }: NotificationBarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    fetchPreferences();
    setupNotificationListener();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            notifications_enabled: true,
            sound_enabled: true,
            vibration_enabled: true,
          })
          .select()
          .single();
        setPrefs(newPrefs);
      } else {
        setPrefs(data);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  };

  const isInDoNotDisturb = useCallback(() => {
    if (!prefs?.do_not_disturb_enabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = prefs.do_not_disturb_start || '22:00';
    const end = prefs.do_not_disturb_end || '08:00';

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }, [prefs]);

  const shouldShowNotification = useCallback((notification: Notification) => {
    if (!prefs?.notifications_enabled) return false;

    if (isInDoNotDisturb()) return false;

    if (prefs.notification_type_filter === 'hot_only' && notification.lead_type !== 'hot') {
      return false;
    }

    return true;
  }, [prefs, isInDoNotDisturb]);

  const setupNotificationListener = () => {
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newNotification = payload.new as Notification;
          if (shouldShowNotification(newNotification)) {
            setNotifications((prev) => [newNotification, ...prev]);
            setVisibleNotifications((prev) => [newNotification, ...prev.slice(0, 2)]);

            if (Platform.OS !== 'web' && prefs?.vibration_enabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const dismissNotification = (id: string) => {
    setVisibleNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationPress = (notification: Notification) => {
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
      .then(() => {
        dismissNotification(notification.id);
        router.push({
          pathname: '/sales/lead-detail',
          params: { leadId: notification.lead_id },
        });
      });
  };

  const getLeadTypeColor = (leadType: string) => {
    switch (leadType) {
      case 'hot':
        return '#dc2626';
      case 'urgent':
        return '#f97316';
      default:
        return '#3b82f6';
    }
  };

  const getLeadTypeIcon = (leadType: string) => {
    if (leadType === 'hot') return Flame;
    if (leadType === 'urgent') return AlertCircle;
    return Clock;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <View style={styles.container}>
      {visibleNotifications.map((notification) => {
        const IconComponent = getLeadTypeIcon(notification.lead_type);
        const color = getLeadTypeColor(notification.lead_type);

        return (
          <TouchableOpacity
            key={notification.id}
            style={[styles.notificationItem, { borderLeftColor: color }]}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.9}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
              <IconComponent size={20} color={color} />
            </View>

            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                  {notification.title}
                </Text>
                <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
              </View>
              <Text style={styles.message} numberOfLines={2}>
                {notification.message}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => dismissNotification(notification.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="#999" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    maxHeight: 300,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    flexShrink: 0,
  },
  message: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
