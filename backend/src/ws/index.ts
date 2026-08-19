import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { roomManager } from './RoomManager.js';
import { registerMarketHandler } from './handlers/marketHandler.js';
import { registerNotifyHandler, cleanupNotifySocket } from './handlers/notifyHandler.js';
import {
    WS_CLIENT_EVENTS,
    WS_SERVER_EVENTS,
    buildMessage,
    type WsMessage,
} from './types.js';

let wss: WebSocketServer | null = null;

//Init Socket

export function initWebSocketServer(httpServer: any): void {
    if (wss) return; // already initialised

    wss = new WebSocketServer({ server: httpServer });
    console.log('[WS] WebSocket server attached to HTTP server.');

    wss.on('connection', (socket: WebSocket, _req: IncomingMessage) => {
        console.log('[WS] New client connected.');

        // Heartbeat (keep-alive)
        let isAlive = true;
        socket.on('pong', () => { isAlive = true; });

        const pingInterval = setInterval(() => {
            if (!isAlive) {
                socket.terminate();
                return;
            }
            isAlive = false;
            socket.ping();
        }, 30_000);

        //Incoming messages
        socket.on('message', (raw: Buffer) => {
            let msg: WsMessage;

            try {
                msg = JSON.parse(raw.toString());
            } catch {
                socket.send(buildMessage(WS_SERVER_EVENTS.ERROR, { message: 'Invalid JSON' }));
                return;
            }

            if (!msg.type) {
                socket.send(buildMessage(WS_SERVER_EVENTS.ERROR, { message: 'Missing message type' }));
                return;
            }

            // PING ↔ PONG (application-level)
            if (msg.type === WS_CLIENT_EVENTS.PING) {
                socket.send(buildMessage(WS_SERVER_EVENTS.PONG, {}));
                return;
            }

            // Route to the correct channel handler
            if (
                msg.type === WS_CLIENT_EVENTS.SUBSCRIBE_MARKET ||
                msg.type === WS_CLIENT_EVENTS.UNSUBSCRIBE_MARKET
            ) {
                registerMarketHandler(socket, msg);
                return;
            }

            if (
                msg.type === WS_CLIENT_EVENTS.SUBSCRIBE_NOTIFICATIONS ||
                msg.type === WS_CLIENT_EVENTS.UNSUBSCRIBE_NOTIFICATIONS
            ) {
                registerNotifyHandler(socket, msg);
                return;
            }

            socket.send(buildMessage(WS_SERVER_EVENTS.ERROR, { message: `Unknown event type: ${msg.type}` }));
        });

        // Cleanup on close
        socket.on('close', () => {
            clearInterval(pingInterval);
            roomManager.leaveAll(socket);
            cleanupNotifySocket(socket);
            console.log('[WS] Client disconnected.');
        });

        socket.on('error', (err: Error) => {
            console.error('[WS] Socket error:', err.message);
        });
    });
}

// Re-exports for use by the engine & other modules

export { roomManager } from './RoomManager.js';
export { sendNotification } from './handlers/notifyHandler.js';