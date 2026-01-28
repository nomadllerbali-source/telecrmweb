import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { requestNotificationPermissions, addNotificationResponseListener, addNotificationReceivedListener } from '@/services/notifications';
import { useRouter } from 'expo-router';

export default function SalesLayout() {
  const router = useRouter();

  useEffect(() => {
    requestNotificationPermissions();

    const responseListener = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data.type === 'lead_assignment') {
        router.push('/sales/allocated-leads');
      } else if (data.type === 'follow_up') {
        router.push('/sales/follow-ups');
      }
    });

    const receivedListener = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    return () => {
      responseListener();
      receivedListener();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="allocated-leads" />
      <Stack.Screen name="follow-ups" />
      <Stack.Screen name="hot-leads" />
      <Stack.Screen name="confirmed-leads" />
      <Stack.Screen name="operations" />
      <Stack.Screen name="lead-action" />
      <Stack.Screen name="confirm-lead" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="lead-detail" />
    </Stack>
  );
}
