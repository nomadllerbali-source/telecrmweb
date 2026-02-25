import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { addNotificationResponseListener } from '@/services/notifications';

export function useNotificationHandler() {
    const router = useRouter();

    useEffect(() => {
        const unsub = addNotificationResponseListener((response) => {
            const { type, leadId } = response.notification.request.content.data;

            if (type === 'follow_up') {
                router.push('/sales/follow-ups');
            } else if (type === 'trip_confirmed' && leadId) {
                router.push({
                    pathname: '/sales/lead-detail',
                    params: { leadId: String(leadId) }
                });
            } else if (type === 'lead_assignment') {
                router.push('/sales/allocated-leads');
            }
        });

        return () => unsub();
    }, [router]);
}
