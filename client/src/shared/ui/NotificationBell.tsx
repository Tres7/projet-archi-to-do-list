import { useState } from 'react';
import { Dropdown, Badge, Button } from 'react-bootstrap';
import { useNotificationEvent } from '../notifications/useNotificationEvent';
import {
    CLIENT_NOTIFICATION_EVENT_NAMES,
} from '../notifications/notification.types';
import { useNotifications } from '../notifications/useNotifications';


export function NotificationBell() {
    const { notifications, unread, push, clearAll, clearUnread } = useNotifications();
    const [open, setOpen] = useState(false);

    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CREATED, push);
    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_CLOSED, push);
    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.PROJECT_DELETED, push);
    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.TASK_CREATED, push);
    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.TASK_UPDATED, push);
    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.TASK_DELETED, push);
    useNotificationEvent(CLIENT_NOTIFICATION_EVENT_NAMES.OPERATION_REJECTED, push);

    function handleToggle(isOpen: boolean) {
        setOpen(isOpen);
        if (isOpen) clearUnread();
    }

    return (
        <Dropdown onToggle={handleToggle} show={open}>
            <Dropdown.Toggle
                as="button"
                className="btn btn-link text-white p-0 position-relative border-0"
                style={{ background: 'none' }}
            >
                <i className="fa-solid fa-bell fa-lg" />
                {unread > 0 && (
                    <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                        {unread > 99 ? '99+' : unread}
                    </Badge>
                )}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" style={{ minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length > 0 && (
                    <>
                        <div className="d-flex justify-content-end px-2">
                            <Button variant="link" size="sm" className="text-muted p-0" onClick={clearAll}>
                                Delete all
                            </Button>
                        </div>
                        <Dropdown.Divider />
                    </>
                )}
                {notifications.length === 0 ? (
                    <Dropdown.Item disabled>Aucune notification</Dropdown.Item>
                ) : (
                    notifications.map((n, i) => (
                        <Dropdown.Item key={i} className="d-flex flex-column" style={{ whiteSpace: 'normal' }}>
                            <span>{n.message}</span>
                            <small className="text-muted">
                                {new Date(n.receivedAt).toLocaleTimeString()}
                            </small>
                        </Dropdown.Item>
                    ))
                )}
            </Dropdown.Menu>
        </Dropdown>
    );
}
