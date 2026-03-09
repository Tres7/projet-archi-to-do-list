import { useState, useCallback, useEffect } from 'react';
import { getUserId } from '../utils/tokenStorage';
import type { ClientNotificationEvent } from './notification.types';

export type StoredNotification = ClientNotificationEvent & { receivedAt: string };

const STORAGE_KEY = () => `notifications_${getUserId() ?? 'guest'}`;
const UNREAD_KEY = () => `notifications_unread_${getUserId() ?? 'guest'}`;


const loadFromStorage = (): StoredNotification[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY()) ?? '[]');
    } catch {
        return [];
    }
};

export function useNotifications() {
    const [notifications, setNotifications] = useState<StoredNotification[]>(loadFromStorage);
    
    const [unread, setUnread] = useState(() => {
        return Number(localStorage.getItem(UNREAD_KEY()) ?? '0');
    });


    useEffect(() => {
        localStorage.setItem(STORAGE_KEY(), JSON.stringify(notifications));
        localStorage.setItem(UNREAD_KEY(), String(unread));
    }, [notifications, unread]);

    const push = useCallback((event: ClientNotificationEvent) => {
        setNotifications((prev) =>
            [{ ...event, receivedAt: new Date().toISOString() }, ...prev].slice(0, 20),
        );
        setUnread((prev) => prev + 1);
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnread(0);
    }, []);

    const clearUnread = useCallback(() => setUnread(0), []);

    return { notifications, unread, push, clearAll, clearUnread };
}
