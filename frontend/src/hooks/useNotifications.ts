import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { on, send, initWsClient } from '../ws/wsClient';

// WS event constants (mirror backend types)

const SUBSCRIBE_NOTIFICATIONS = 'SUBSCRIBE_NOTIFICATIONS';
const UNSUBSCRIBE_NOTIFICATIONS = 'UNSUBSCRIBE_NOTIFICATIONS';
const NOTIFICATION = 'NOTIFICATION';

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

// Hook

/*
 Subscribes to server-push notifications for the authenticated user
 and surfaces them as react-hot-toast toasts.

 Mount this once high in the component tree (e.g. inside a layout that
 only renders for authenticated users).

 Usage:
   useNotifications(user.id);
 */
export function useNotifications(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return;

    initWsClient();
    send(SUBSCRIBE_NOTIFICATIONS, { userId });

    const unsub = on<NotificationPayload>(NOTIFICATION, (payload) => {
      const opts = { id: payload.id };

      switch (payload.level) {
        case 'success':
          toast.success(`${payload.title}: ${payload.message}`, opts);
          break;
        case 'error':
          toast.error(`${payload.title}: ${payload.message}`, opts);
          break;
        case 'warning':
          toast(`⚠️ ${payload.title}: ${payload.message}`, { ...opts, icon: '⚠️' });
          break;
        default:
          toast(`${payload.title}: ${payload.message}`, opts);
      }
    });

    return () => {
      send(UNSUBSCRIBE_NOTIFICATIONS, { userId });
      unsub();
    };
  }, [userId]);
}
