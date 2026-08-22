/**
Singleton WebSocket client with:
- Auto-reconnect with exponential back-off
- Typed message routing via on(type, handler)
- onConnected() hook for re-subscription after reconnects
- One shared connection for the entire app
 */

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000';

// Types

export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  ts: number;
}

type MessageHandler<T = unknown> = (payload: T) => void;

// Singleton state

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let manualClose = false;
const MAX_RECONNECT_DELAY_MS = 30_000;

// Map of eventType → Set of handlers
const listeners = new Map<string, Set<MessageHandler<any>>>();

// Callbacks fired on every successful (re)connection — used for re-subscription
type ConnectHandler = () => void;
const connectHandlers = new Set<ConnectHandler>();

// Queue messages that arrive before the socket is open
const sendQueue: string[] = [];

// Core connection

function connect(): void {
  manualClose = false;
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WsClient] Connected.');
    reconnectAttempts = 0;

    // Flush any queued messages
    while (sendQueue.length > 0) {
      socket!.send(sendQueue.shift()!);
    }

    // Notify all registered connect handlers so hooks can re-subscribe.
    for (const h of connectHandlers) {
      h();
    }
  };

  socket.onmessage = (event: MessageEvent<string>) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      console.warn('[WsClient] Received non-JSON message:', event.data);
      return;
    }

    const handlers = listeners.get(msg.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(msg.payload);
      }
    }
  };

  socket.onclose = () => {
    socket = null;
    if (manualClose) return;

    const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS);
    reconnectAttempts++;
    console.log(`[WsClient] Disconnected. Reconnecting in ${delay}ms…`);
    setTimeout(connect, delay);
  };

  socket.onerror = (err) => {
    console.error('[WsClient] Error:', err);
  };
}

// Public API

// Register a handler for a specific message type. Returns an unsubscribe fn.
export function on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(handler as MessageHandler);

  return () => {
    listeners.get(type)?.delete(handler as MessageHandler);
  };
}

/**
 * Register a callback that fires on every successful WS connection (including
 * reconnections). If the socket is already open when this is called, the
 * callback fires immediately so the caller doesn't miss the current session.
 * Returns an unregister function — call it in your useEffect cleanup.
 */
export function onConnected(handler: ConnectHandler): () => void {
  connectHandlers.add(handler);
  // Fire immediately if socket is already open (avoids a missed-connection window)
  if (socket?.readyState === WebSocket.OPEN) {
    handler();
  }
  return () => {
    connectHandlers.delete(handler);
  };
}

// Send a typed message. Queues it if the socket is not yet open. 
export function send<T = unknown>(type: string, payload: T): void {
  const msg: WsMessage<T> = { type, payload, ts: Date.now() };
  const raw = JSON.stringify(msg);

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(raw);
  } else {
    sendQueue.push(raw);
    // Ensure we're trying to connect
    if (!socket) connect();
  }
}

/** Call once at app startup (e.g. in main.tsx or a provider). */
export function initWsClient(): void {
  if (!socket) connect();
}

/** Gracefully close the connection (e.g. on logout). */
export function closeWsClient(): void {
  manualClose = true;
  socket?.close();
  socket = null;
}

export function isConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN;
}
