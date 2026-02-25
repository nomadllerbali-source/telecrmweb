import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { requestNotificationPermissions } from '@/services/notifications';
import { Colors } from '@/constants/Colors';

export default function AdminLayout() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: Colors.background }
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="assign-lead" />
      <Stack.Screen name="add-sales-person" />
      <Stack.Screen name="manage-destinations" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="export" />
      <Stack.Screen name="sales-person-details" />
      <Stack.Screen name="sales-person-leads" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
