import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  triggerSeconds: number = 0
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    const trigger = triggerSeconds === 0 ? null : { seconds: triggerSeconds };
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: trigger as any,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

export async function sendLeadAssignmentNotification(
  salesPersonId: string,
  leadName: string,
  leadContact: string,
  leadType: string = 'normal'
) {
  await scheduleLocalNotification(
    'New Lead Assigned',
    `You have been assigned a new lead: ${leadName} (${leadContact})`,
    {
      type: 'lead_assignment',
      salesPersonId,
      leadName,
      leadContact,
    }
  );

  await supabase.from('notifications').insert({
    user_id: salesPersonId,
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    message: `You have been assigned a new lead: ${leadName} (${leadContact})`,
    data: { leadName, leadContact },
    lead_type: leadType,
  });
}

export async function scheduleFollowUpNotification(
  salesPersonId: string,
  leadName: string,
  followUpTime: Date,
  notes?: string,
  leadType: string = 'normal'
) {
  const now = new Date();
  const triggerSeconds = Math.max(0, Math.floor((followUpTime.getTime() - now.getTime()) / 1000));

  if (triggerSeconds > 0) {
    await scheduleLocalNotification(
      'Follow-up Reminder',
      `Follow-up with ${leadName}${notes ? `: ${notes}` : ''}`,
      {
        type: 'follow_up',
        salesPersonId,
        leadName,
        followUpTime: followUpTime.toISOString(),
      },
      triggerSeconds
    );
  }

  await supabase.from('notifications').insert({
    user_id: salesPersonId,
    type: 'follow_up',
    title: 'Follow-up Reminder',
    message: `Follow-up with ${leadName}${notes ? `: ${notes}` : ''}`,
    data: { leadName, followUpTime: followUpTime.toISOString(), notes },
    lead_type: leadType,
  });
}

export async function cancelNotification(notificationId: string) {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}
