<p align="center">
  <img src="https://i.ibb.co/fYNLFWy8/image.png" alt="image" width="100%" />
</p>

<h1 align="center">PiePack Exchange</h1>

<p align="center">
  <strong>A full-stack real-time spot trading exchange — limit & market orders matched in-memory, persisted async via Kafka, streamed live to clients over WebSockets.</strong>
</p>

---

## What is PiePack Exchange?

PiePack Exchange is a paper-trading spot exchange built from scratch. Clients connect via WebSocket to receive live **price ticks**, **order book snapshots (depth 7)**, and **recent trades** as they execute. Orders are validated, funds locked, and matched in-memory by a custom price-time-priority order book. 

Every fill, cancellation, and balance change is published to **Kafka** topics and consumed asynchronously by a batch consumer that persists events into **TimescaleDB** hypertables. 

A **Trigger Engine** handles Stop-Loss and Take-Profit orders using OCO (One-Cancels-the-Other) logic, activating conditional orders the moment price crosses their trigger level.

Three markets are supported: **BTC-USDC**, **ETH-USDC**, and **SOL-USDC**. New users are seeded with paper balances (10 BTC, 100 ETH, 1000 SOL, 100,000 USDC) to start trading immediately. A standalone **TradeBot** process simulates realistic market activity — it subscribes to the live WS price feed, flips between randomised bullish/bearish sentiment phases, and fires limit orders every 500–1200 ms to keep order books full and spreads tight.

<p align="center">
  <img src="https://i.ibb.co/kVm1PhVt/Screenshot-873.png" alt="PiePack Exchange" width="100%" />
</p>

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                        Frontend                           │
│  React 19 · Vite · Tailwind CSS · lightweight-charts     │
│  TanStack Query · react-router-dom · shadcn/ui           │
│  WebSocket client (price tick, order book, trades)        │
└──────────────────┬───────────────────────────────────────┘
                   │  REST  +  WebSocket
┌──────────────────▼───────────────────────────────────────┐
│                        Backend                            │
│  Fastify 5 · JWT Auth · Zod Validation · Rate Limiting   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │             In-Memory Exchange Engine             │    │
│  │  ExchangeEngine → MarketEngine (per market)      │    │
│  │    OrderBook  (price-time-priority, FIFO)         │    │
│  │    TriggerEngine  (SL / TP / OCO)                │    │
│  │    BalanceEngine  (lock / release / consume)     │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │ produce events                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │           Kafka (KRaft, no ZooKeeper)             │    │
│  │  Topics: orders · trades · balances               │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │ consume batches                     │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │              TimescaleDB (PostgreSQL)             │    │
│  │  Hypertables: trades · orders · balance_events   │    │
│  │  Candle OHLCV via time_bucket_gapfill()          │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │          WebSocket Gateway (ws lib)              │     │
│  │  Rooms per market — broadcasts on every fill:    │     │
│  │    PRICE_TICK · ORDER_BOOK_SNAPSHOT              │     │
│  │    RECENT_TRADES · NOTIFICATION (per-user)       │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  Databases: PostgreSQL (Prisma — users, balances)         │
│             TimescaleDB (raw pool — time-series events)   │
└──────────────────────────────────────────────────────────┘
                   ▲
                   │  REST + WS
┌──────────────────┴───────────────────────────────────────┐
│                      TradeBot                             │
│  Subscribes to WS PRICE_TICK · sentiment phase engine    │
│  Places limit orders every 500–1200 ms across user pool  │
└──────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **In-Memory Order Book** | Price-time-priority matching engine with FIFO fill logic for limit and market orders |
| **Stop-Loss / Take-Profit (OCO)** | TriggerEngine registers conditional orders at specific price levels; when price crosses the threshold, the trigger fires and injects a new order into the book. OCO sibling is cancelled on fill |
| **WebSocket Real-Time Feed** | Clients subscribe to market rooms and receive `PRICE_TICK`, `ORDER_BOOK_SNAPSHOT` (top 7 levels), and `RECENT_TRADES` pushed on every fill |
| **Per-User Notification Channel** | `SUBSCRIBE_NOTIFICATIONS` subscribes a socket to a user-specific channel for server-push notifications (fill confirmations, errors) |
| **Kafka Event Streaming** | Every order lifecycle event (CREATED → PARTIALLY_FILLED → FILLED / CANCELLED) and every TRADE_EXECUTED and BALANCE_CHANGED event is published to dedicated Kafka topics |
| **Batch Consumer → TimescaleDB** | A KafkaJS batch consumer groups messages and bulk-inserts them idempotently into TimescaleDB hypertables using `ON CONFLICT DO NOTHING` |
| **OHLCV Candle API** | Candle data generated on-the-fly using `time_bucket_gapfill()` over the `trades` hypertable — supports 1m, 5m, 15m, 30m, 1h, 4h, 1d intervals |
| **Balance Engine** | Funds are locked before an order enters the book and consumed on fill; unlocked on partial or full cancel. Balances sync to PostgreSQL via Prisma |
| **Order History** | Reads latest event-per-order from TimescaleDB using `DISTINCT ON (order_id) ORDER BY timestamp DESC` |
| **JWT Authentication** | Fastify JWT plugin — tokens validated on every protected route via `preHandler` |
| **Rate Limiting** | 200 requests / minute per IP via `@fastify/rate-limit` |
| **Paper Balances** | New users seeded with demo balances (BTC, ETH, SOL, USDC) to trade immediately |
| **TradeBot Market Maker** | Standalone bot subscribes to WS, anchors price to live ticks, flips bullish/bearish phases every 20–40 s, fires orders at ±0.2% spread from current price |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Fastify 5, TypeScript, `fastify-type-provider-zod` |
| **Auth** | `@fastify/jwt`, bcrypt |
| **Validation** | Zod 4 |
| **In-Memory Engine** | Pure TypeScript — `ExchangeEngine`, `MarketEngine`, `OrderBook`, `TriggerEngine`, `BalanceEngine` |
| **Message Broker** | Apache Kafka (KRaft mode, no ZooKeeper) via KafkaJS |
| **Time-Series DB** | TimescaleDB (PostgreSQL 16) — raw `pg` pool, `time_bucket_gapfill` for candles |
| **Relational DB** | PostgreSQL — Prisma ORM for users and balances |
| **WebSocket** | `ws` library attached to the Fastify HTTP server |
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Charts** | `lightweight-charts` v5 (TradingView) |
| **Data Fetching** | TanStack Query v5 |
| **Routing** | react-router-dom v7 |
| **Icons / Fonts** | Phosphor Icons, IBM Plex Sans, Space Grotesk |
| **DevOps** | Docker Compose (TimescaleDB + Kafka in KRaft mode) |
| **Package Manager** | pnpm (workspace monorepo) |

---

## Project Structure

```
tradeApp/
├── backend/                   # Fastify server — exchange engine, Kafka, WS gateway, REST API
│   ├── src/
│   │   ├── api/               # Fastify app, routes, controllers, validators, plugins, middleware
│   │   ├── engine/            # In-memory ExchangeEngine, OrderBook, TriggerEngine, BalanceEngine
│   │   ├── kafka-infrastructure/  # Kafka client, producer, batch consumer, topic definitions
│   │   ├── ws/                # WebSocket gateway, RoomManager, market & notification handlers
│   │   ├── db/                # Prisma client (users/balances) + TimescaleDB raw pool + init SQL
│   │   └── prisma/            # schema.prisma (User, Balance models)
│   └── docker-compose.yml     # TimescaleDB + Kafka (KRaft) containers
│
├── frontend/                  # React 19 SPA — trading UI
│   └── src/
│       ├── pages/             # Home, Market (market list), TradingPage, Login, Register
│       ├── components/        # Navbar, GuestRoute + trading/ (OrderBook, TradeForm, TradingChart,
│       │                      #   MarketHeader, RecentTrades, UserOrders)
│       ├── api/               # Axios/fetch wrappers for REST endpoints
│       ├── ws/                # WebSocket client — subscribes to market rooms, dispatches events
│       ├── hooks/             # Custom hooks (market data, balances, orders)
│       └── config/            # Market config, environment constants
│
├── tradeBot/                  # Market-maker simulation bot
│   └── src/
│       ├── index.ts           # Phase engine (bullish/bearish), order loop, WS price anchor
│       ├── ws.ts              # WsClient — subscribes PRICE_TICK, exponential-backoff reconnect
│       └── config.ts          # User pool (pre-registered accounts with JWT tokens)
│
└── LEARN_STACK/               # Engineering notes and architecture learning docs
```

---

## Supported Markets

| Market | Base | Quote | Default Seed Balance |
|---|---|---|---|
| BTC-USDC | BTC | USDC | 10 BTC / 100,000 USDC |
| ETH-USDC | ETH | USDC | 100 ETH / 100,000 USDC |
| SOL-USDC | SOL | USDC | 1,000 SOL / 100,000 USDC |

---

## API Routes

All protected routes require a valid JWT token in the `Authorization: Bearer <token>` header.

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register new user, seed default paper balances |
| `POST` | `/login` | Public | Login, receive JWT |

### Orders (`/api/v1/order`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/placeOrder` | Required | Place limit or market order — validates funds, locks balance, sends to engine |
| `GET` | `/openOrders?market=BTC-USDC` | Required | Returns all resting orders from in-memory order book for the user |
| `GET` | `/orderHistory?market=BTC-USDC` | Required | Returns latest-status per order from TimescaleDB (last 200) |
| `GET` | `/balances` | Required | Returns live asset balances from in-memory engine (falls back to Prisma) |
| `DELETE` | `/:orderId` | Required | Cancel a resting order and release locked funds |

### Chart (`/api/v1/chart`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/candles?market=BTC-USDC&interval=1m&limit=100` | Public | OHLCV candle data via `time_bucket_gapfill` from TimescaleDB. Intervals: `1m` `5m` `15m` `30m` `1h` `4h` `1d` |

---

## WebSocket Protocol

Connect to `ws://localhost:3000`. All messages follow the envelope `{ type, payload, ts }`.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `SUBSCRIBE_MARKET` | `{ symbol: "BTC-USDC" }` | Join a market room to receive real-time ticks, depth, and trades |
| `UNSUBSCRIBE_MARKET` | `{ symbol: "BTC-USDC" }` | Leave the market room |
| `SUBSCRIBE_NOTIFICATIONS` | `{ userId: "<uuid>" }` | Register for server-push notifications on this socket |
| `UNSUBSCRIBE_NOTIFICATIONS` | `{ userId: "<uuid>" }` | Deregister notification channel |
| `PING` | `{}` | Application-level keepalive (server replies `PONG`) |

### Server → Client

| Event | Payload | Trigger |
|---|---|---|
| `PRICE_TICK` | `{ symbol, price }` | Every time a trade executes — last fill price |
| `ORDER_BOOK_SNAPSHOT` | `{ symbol, bids: [price, qty][], asks: [price, qty][] }` | Pushed on every order book change (top 7 levels) |
| `RECENT_TRADES` | `{ symbol, trades: [{ id, price, quantity, side, executedAt }] }` | Pushed immediately after each batch of fills (last 20) |
| `NOTIFICATION` | `{ id, title, message, level }` | Pushed to per-user channel for order fills and errors |

---

## TradeBot

The `tradeBot` package is a standalone Node.js process that acts as a market maker to keep the exchange active.

**How it works:**
1. Connects to the backend WS and subscribes `PRICE_TICK` for the configured market — price is anchored to real executed trade prices, not drifted artificially
2. A **Phase Engine** runs concurrently, flipping between **bullish** (`buy_probability = 58–72%`) and **bearish** (`buy_probability = 25–42%`) phases every 20–40 seconds
3. An **Order Loop** picks a random user from the configured pool, calculates a price at ±0.2% from current, picks a random quantity, and fires a limit order via REST every 500–1200 ms
4. The bot waits for the first real `PRICE_TICK` before firing any orders to ensure it's anchored to actual exchange prices
5. Graceful shutdown on `SIGINT` — disconnects WS and exits cleanly

Configure `ACTIVE_MARKET` in `src/index.ts` to switch between `BTC-USDC`, `ETH-USDC`, or `SOL-USDC`.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
cd backend
docker-compose up -d
```

This starts **TimescaleDB** on port `5433` and **Kafka** (KRaft) on port `9092`.

### 2. Apply Database Migrations

After the TimescaleDB container is healthy, initialise the hypertables:

```bash
docker exec -i tradeapp_db psql -U postgres -d tradeapp < backend/src/db/timescale/init.sql
```

Then generate the Prisma client and apply migrations for users and balances:

```bash
cd backend
pnpm db:generate
```

### 3. Start Backend

```bash
cd backend
pnpm dev
```

Server starts on `http://localhost:3000`. Kafka consumer connects automatically and begins processing events.

### 4. Start Frontend

```bash
cd frontend
pnpm dev
```

Frontend starts on `http://localhost:5173`.

### 5. Start TradeBot (Optional)

```bash
cd tradeBot
pnpm dev
```

The bot connects to the backend WS, waits for the first price tick, then begins placing orders. Markets stay liquid even with no real users trading.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Fastify server port (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string for Prisma (users, balances) |
| `TIMESCALE_URL` | PostgreSQL connection string for the raw TimescaleDB pool (trades, orders, balance events) |
| `KAFKA_BROKER` | Kafka broker address (default: `localhost:9092`) |
| `JWT_SECRET` | Secret for signing / verifying JWT tokens |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend REST base URL (default: `http://localhost:3000`) |
| `VITE_WS_URL` | Backend WebSocket URL (default: `ws://localhost:3000`) |

---

## Kafka Topics & Event Types

| Topic | Event Types | Written By | Consumed By |
|---|---|---|---|
| `orders` | `ORDER_CREATED`, `ORDER_FILLED`, `ORDER_PARTIALLY_FILLED`, `ORDER_CANCELLED` | ExchangeEngine / MarketEngine | Batch consumer → `orders` hypertable |
| `trades` | `TRADE_EXECUTED` | MarketEngine (on every fill) | Batch consumer → `trades` hypertable |
| `balances` | `BALANCE_RESERVED`, `BALANCE_RELEASED`, `BALANCE_CHANGED` | BalanceEngine | Batch consumer → `balance_events` hypertable |

The batch consumer uses `groupId: tradeapp-db-batch-consumer` and processes all three topics in a single consumer group with `eachBatch` for bulk idempotent inserts.

---

## Database Schema

### PostgreSQL / Prisma (Operational)

| Table | Purpose |
|---|---|
| `users` | User accounts — UUID primary key, email, bcrypt password, name |
| `balances` | Per-user per-asset balance rows — `available` and `locked` float columns, unique on `(userId, asset)` |

### TimescaleDB (Time-Series, Raw SQL)

| Hypertable | Partition By | Purpose |
|---|---|---|
| `trades` | `timestamp` | Every executed fill — price, quantity, maker/taker order and user IDs |
| `orders` | `timestamp` | Full order event log — one row per lifecycle event per order |
| `balance_events` | `timestamp` | Audit trail of every balance mutation |

Candle queries use `time_bucket_gapfill($interval, timestamp, $start, $end)` with `first()`, `last()`, `max()`, `min()`, and `sum()` aggregates from the TimescaleDB toolkit.

---

## License

This project is for educational and personal portfolio use. Not licensed for commercial deployment.
