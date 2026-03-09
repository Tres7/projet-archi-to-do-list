import { useEffect } from 'react';
import { notificationClient } from './notification.client';
import type {
    ClientNotificationEvent,
    ClientNotificationEventName,
} from './notification.types';

export function useNotificationEvent(
    eventName: ClientNotificationEventName,
    handler: (event: ClientNotificationEvent) => void,
) {
    useEffect(() => {
        const unsubscribe = notificationClient.subscribe(eventName, handler);
        return unsubscribe;
    }, [eventName, handler]);
}
