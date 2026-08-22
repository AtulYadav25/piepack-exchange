import type { WebSocket } from 'ws';
import {
  WS_SERVER_EVENTS,
  buildMessage,
  type PriceTickPayload,
  type OrderBookSnapshotPayload,
  type OrderBookLevel,
  type RecentTradesPayload,
  type RecentTradePayload,
} from './types.js';
import type { Market } from '../engine/config.js';

const ORDER_BOOK_INTERVAL_MS = 500;

// Callback type that MarketEngine registers so RoomManager can pull live data
export type DepthProvider = () => { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
export type RecentTradesProvider = () => RecentTradePayload[];

interface MarketProviders {
  depth: DepthProvider;
  recentTrades: RecentTradesProvider;
}

/*
Manages market "rooms" — each market symbol has a Set of WebSocket clients.
Also owns the 500ms orderbook broadcast interval per active room.
*/
class RoomManager {
  /** market symbol → Set of active WebSocket clients */
  private rooms = new Map<Market, Set<WebSocket>>();

  // market symbol → live data providers registered by MarketEngine
  private providers = new Map<Market, MarketProviders>();

  // market symbol → interval handle (runs while room has at least 1 subscriber)
  private intervals = new Map<Market, ReturnType<typeof setInterval>>();

  // Provider registration (called by MarketEngine on construction)

  registerProviders(symbol: Market, providers: MarketProviders): void {
    this.providers.set(symbol, providers);
  }

  // Room membership

  join(symbol: Market, socket: WebSocket): void {
    if (!this.rooms.has(symbol)) {
      this.rooms.set(symbol, new Set());
    }
    this.rooms.get(symbol)!.add(socket);
    console.log(`[RoomManager] Socket joined room "${symbol}". Total: ${this.rooms.get(symbol)!.size}`);

    // Start the orderbook interval the first time someone joins
    if (!this.intervals.has(symbol)) {
      this.startOrderBookInterval(symbol);
    }
  }

  leave(symbol: Market, socket: WebSocket): void {
    const room = this.rooms.get(symbol);
    if (!room) return;
    room.delete(socket);
    console.log(`[RoomManager] Socket left room "${symbol}".`);

    if (room.size === 0) {
      this.rooms.delete(symbol);
      this.stopOrderBookInterval(symbol);
    }
  }

  // Remove a socket from every room it joined (called on disconnect)
  leaveAll(socket: WebSocket): void {
    for (const [symbol, room] of this.rooms) {
      if (room.has(socket)) {
        this.leave(symbol, socket);
      }
    }
  }

  // Broadcasting

  //Broadcast a raw JSON string to every OPEN socket in a room.
  broadcast(symbol: Market, message: string): void {
    const room = this.rooms.get(symbol);
    if (!room || room.size === 0) return;

    for (const socket of room) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  //Broadcast a PRICE_TICK event. Called by MarketEngine after every trade
  broadcastPriceTick(symbol: Market, price: number): void {
    const payload: PriceTickPayload = { symbol, price };
    this.broadcast(symbol, buildMessage(WS_SERVER_EVENTS.PRICE_TICK, payload));
  }

  /*
   Broadcast recent trades immediately after they execute.
   Called by MarketEngine with only the newly executed trades.
  */
  broadcastRecentTrades(symbol: Market, trades: RecentTradePayload[]): void {
    if (trades.length === 0) return;
    const payload: RecentTradesPayload = { symbol, trades };
    this.broadcast(symbol, buildMessage(WS_SERVER_EVENTS.RECENT_TRADES, payload));
  }

  // Orderbook interval

  private startOrderBookInterval(symbol: Market): void {
    const handle = setInterval(() => {
      const providers = this.providers.get(symbol);
      if (!providers) return;

      const { bids, asks } = providers.depth();
      const payload: OrderBookSnapshotPayload = { symbol, bids, asks };
      this.broadcast(symbol, buildMessage(WS_SERVER_EVENTS.ORDER_BOOK_SNAPSHOT, payload));
    }, ORDER_BOOK_INTERVAL_MS);

    this.intervals.set(symbol, handle);
    console.log(`[RoomManager] Started orderbook interval for "${symbol}".`);
  }

  private stopOrderBookInterval(symbol: Market): void {
    const handle = this.intervals.get(symbol);
    if (handle) {
      clearInterval(handle);
      this.intervals.delete(symbol);
      console.log(`[RoomManager] Stopped orderbook interval for "${symbol}".`);
    }
  }
}

//shared across the whole process
export const roomManager = new RoomManager();