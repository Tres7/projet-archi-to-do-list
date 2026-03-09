import { useEffect } from 'react';
import { notificationClient } from './notification.client';

type Props = {
    userId: string | null;
};

export function AppNotifications({ userId }: Props) {
    useEffect(() => {
        if (!userId) return;

        notificationClient.connect(userId);

        return () => {
            notificationClient.disconnect();
        };
    }, [userId]);

    return null;
}
