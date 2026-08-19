import type { WebSocket } from 'ws';
import { WS_SERVER_EVENTS, buildMessage, type PriceTickPayload } from './types.js';
import type { Market } from '../engine/config.js';

/*
Manages market "rooms" — each market symbol has a Set of WebSocket clients.
*/
class RoomManager {
  /** market symbol → Set of active WebSocket clients */
  private rooms = new Map<Market, Set<WebSocket>>();

  // Room membership
  join(symbol: Market, socket: WebSocket): void {
    if (!this.rooms.has(symbol)) {
      this.rooms.set(symbol, new Set());
    }
    this.rooms.get(symbol)!.add(socket);
    console.log(`[RoomManager] Socket joined room "${symbol}". Total: ${this.rooms.get(symbol)!.size}`);
  }

  leave(symbol: Market, socket: WebSocket): void {
    const room = this.rooms.get(symbol);
    if (!room) return;
    room.delete(socket);
    if (room.size === 0) this.rooms.delete(symbol);
    console.log(`[RoomManager] Socket left room "${symbol}".`);
  }

  /** Remove a socket from every room it joined (called on disconnect). */
  leaveAll(socket: WebSocket): void {
    for (const [symbol, room] of this.rooms) {
      if (room.has(socket)) {
        this.leave(symbol, socket);
      }
    }
  }

  // Broadcasting

  /** Broadcast a raw JSON string to every OPEN socket in a room. */
  broadcast(symbol: Market, message: string): void {
    const room = this.rooms.get(symbol);
    if (!room || room.size === 0) return;

    for (const socket of room) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  /** Convenience: broadcast a PRICE_TICK event to all watchers of a market. */
  broadcastPriceTick(symbol: Market, price: number): void {
    const payload: PriceTickPayload = { symbol, price };
    const message = buildMessage(WS_SERVER_EVENTS.PRICE_TICK, payload);
    this.broadcast(symbol, message);
  }
}

//shared across the whole process
export const roomManager = new RoomManager();
