import type { WebSocket } from 'ws';
import { roomManager } from '../RoomManager.js';
import {
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
  buildMessage,
  type WsMessage,
  type SubscribeMarketPayload,
} from '../types.js';

/**
Handles all market-channel messages for a single WebSocket connection.
Call once per connected socket.
*/
export function registerMarketHandler(socket: WebSocket, msg: WsMessage): void {
  switch (msg.type) {
    case WS_CLIENT_EVENTS.SUBSCRIBE_MARKET: {
      const { symbol } = msg.payload as SubscribeMarketPayload;
      if (!symbol) {
        socket.send(buildMessage(WS_SERVER_EVENTS.ERROR, { message: 'SUBSCRIBE_MARKET requires a symbol' }));
        return;
      }

      roomManager.join(symbol, socket);

      socket.send(
        buildMessage(WS_SERVER_EVENTS.SUBSCRIBED, { channel: 'market', symbol }),
      );
      break;
    }

    case WS_CLIENT_EVENTS.UNSUBSCRIBE_MARKET: {
      const { symbol } = msg.payload as SubscribeMarketPayload;
      if (symbol) {
        roomManager.leave(symbol, socket);
      }
      break;
    }

    default:
      break;
  }
}
