import type { WebSocket } from 'ws';
import {
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
  buildMessage,
  type WsMessage,
  type SubscribeNotificationsPayload,
  type NotificationPayload,
} from '../types.js';

/**
Maps userId → active WebSocket so notifications can be pushed
to specific users from anywhere in the server (e.g. on order fill).

One user can only have one active socket here (latest wins).
Extend to a Set<WebSocket> per userId for multi-tab support later.
*/
const userSocketMap = new Map<string, WebSocket>();

// Lifecycle helpers

export function registerNotifyHandler(socket: WebSocket, msg: WsMessage): void {
  switch (msg.type) {
    case WS_CLIENT_EVENTS.SUBSCRIBE_NOTIFICATIONS: {
      const { userId } = msg.payload as SubscribeNotificationsPayload;
      if (!userId) {
        socket.send(buildMessage(WS_SERVER_EVENTS.ERROR, { message: 'SUBSCRIBE_NOTIFICATIONS requires a userId' }));
        return;
      }

      userSocketMap.set(userId, socket);
      socket.send(buildMessage(WS_SERVER_EVENTS.SUBSCRIBED, { channel: 'notifications', userId }));
      console.log(`[NotifyHandler] User "${userId}" subscribed to notifications.`);
      break;
    }

    case WS_CLIENT_EVENTS.UNSUBSCRIBE_NOTIFICATIONS: {
      const { userId } = msg.payload as SubscribeNotificationsPayload;
      if (userId) {
        userSocketMap.delete(userId);
      }
      break;
    }

    default:
      break;
  }
}

/** Remove a socket from the notify map when its connection closes. */
export function cleanupNotifySocket(socket: WebSocket): void {
  for (const [userId, ws] of userSocketMap) {
    if (ws === socket) {
      userSocketMap.delete(userId);
      console.log(`[NotifyHandler] Cleaned up notifications socket for user "${userId}".`);
      break;
    }
  }
}

// Public API — call from anywhere in the server

/*
Push a notification to a specific user.
Safe to call even if the user has no active WS connection (silently no-ops).
*/
export function sendNotification(userId: string, payload: NotificationPayload): void {
  const socket = userSocketMap.get(userId);
  if (!socket || socket.readyState !== socket.OPEN) return;
  socket.send(buildMessage(WS_SERVER_EVENTS.NOTIFICATION, payload));
}
