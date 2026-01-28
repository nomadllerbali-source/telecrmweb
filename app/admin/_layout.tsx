import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { requestNotificationPermissions } from '@/services/notifications';

export default function AdminLayout() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="assign-lead" />
      <Stack.Screen name="add-sales-person" />
      <Stack.Screen name="manage-destinations" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="export" />
      <Stack.Screen name="sales-person-details" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
