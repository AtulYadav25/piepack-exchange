<p align="center">
  <img src="https://plain-apac-prod-public.komododecks.com/202609/11/AEsh6cG6sRoXLFhLOc98/image.png" alt="PiePack Exchange Demo" width="100%" />
</p>

<h1 align="center">PiePack Exchange</h1>

<p align="center">
  <strong>A full-stack real-time spot trading exchange — limit & market orders matched in-memory, persisted async via Kafka, streamed live to clients over WebSockets.</strong>
</p>

---

## What is PiePack Exchange?

PiePack Exchange is a paper-trading spot exchange built from scratch. Clients connect via WebSocket to receive live **price ticks**, **order book snapshots (depth 7)**, and **recent trades** as they execute. Orders are validated, funds locked, and matched in-memory by a custom price-time-priority order book. 

Every fill, cancellation, and balance change is published to **Kafka** topics and consumed asynchronously by a batch consumer that persists events into **TimescaleDB** (`trades` hypertable, `orders`, and `balance_events` tables). 

A **Trigger Engine** handles Stop-Loss and Take-Profit orders using OCO (One-Cancels-the-Other) logic, activating conditional orders the moment price crosses their trigger level.

Three markets are supported: **BTC-USDC**, **ETH-USDC**, and **SOL-USDC**. New users are seeded with paper balances (10 BTC, 100 ETH, 1000 SOL, 100,000 USDC) to start trading immediately. A standalone **TradeBot** process simulates realistic market activity — it subscribes to the live WS price feed, flips between randomised bullish/bearish sentiment phases, and fires limit orders every 500–1200 ms to keep order books full and spreads tight.


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
│  │  trades (hypertable) · orders · balance_events   │    │
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
| **Batch Consumer → TimescaleDB** | A KafkaJS batch consumer groups messages and bulk-inserts them idempotently into TimescaleDB tables (`trades` hypertable, `orders`, `balance_events`) using `ON CONFLICT DO NOTHING` |
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
| **Validation** | Zod |
| **In-Memory Engine** | Pure TypeScript — `ExchangeEngine`, `MarketEngine`, `OrderBook`, `TriggerEngine`, `BalanceEngine` |
| **Message Broker** | Apache Kafka (KRaft mode, no ZooKeeper) via KafkaJS |
| **Time-Series DB** | TimescaleDB (PostgreSQL 16) — raw `pg` pool, `time_bucket_gapfill` for candles |
| **Relational DB** | PostgreSQL — Prisma ORM for users and balances |
| **WebSocket** | `ws` library attached to the Fastify HTTP server |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Charts** | `lightweight-charts` (TradingView) |
| **Data Fetching** | TanStack Query |
| **Routing** | react-router-dom |
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
│   │   ├── kafka-infrastructure/  # Kafka client, producer, batch consumer, topic definitions, dbSetup
│   │   ├── ws/                # WebSocket gateway, RoomManager, market & notification handlers
│   │   ├── db/                # Prisma client (users/balances) + TimescaleDB raw pool
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

All protected routes require a valid JWT token in the `Authorization: Bearer <token>` header (or cookie).

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register new user, seed default paper balances |
| `POST` | `/login` | Public | Login, receive JWT |
| `POST` | `/logout` | Public | Clear authentication session |

### Orders (`/api/v1/order`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/placeOrder` | Required | Place limit or market order — validates funds, locks balance, sends to engine |
| `GET` | `/openOrders?market=BTC-USDC` | Required | Returns all resting orders from in-memory order book for the user |
| `GET` | `/history?market=BTC-USDC` | Required | Returns latest-status per order from TimescaleDB (last 200) |
| `GET` | `/balances` | Required | Returns live asset balances from in-memory engine (falls back to Prisma) |

### Chart (`/api/v1/chart`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/candles?market=BTC-USDC&interval=1m&limit=100` | Public | OHLCV candle data via `time_bucket_gapfill` from TimescaleDB `trades` hypertable. Intervals: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d` |

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

- **Node.js**: v20+
- **Package Manager**: `pnpm` (`npm install -g pnpm`)
- **Docker & Docker Compose**: For TimescaleDB & Kafka

---

### Step-by-Step Setup

#### 1. Install Dependencies

Install dependencies across the packages:

```bash
# Backend dependencies
cd backend
pnpm install

# Frontend dependencies
cd ../frontend
pnpm install

# TradeBot dependencies (optional)
cd ../tradeBot
pnpm install
```

#### 2. Configure Environment Variables

Create the `.env` files from the provided examples:

**Backend (`backend/.env`):**
```bash
cd backend
cp .env.example .env
```
*(Default settings connect to PostgreSQL/TimescaleDB on port `5433` and Kafka on port `9092`)*

**Frontend (`frontend/.env`):**
```bash
cd frontend
cp .env.example .env
```

---

#### 3. Start Docker Infrastructure

Run Docker Compose from the `backend/` directory to spin up **TimescaleDB** (PostgreSQL 16) and **Apache Kafka** (KRaft mode):

```bash
cd backend
docker compose up -d
```

> **Ports Exposed:**
> - **TimescaleDB / PostgreSQL**: `localhost:5433` (`5432` mapped to host `5433` to avoid conflicts with local Postgres)
> - **Kafka Broker**: `localhost:9092`

---

#### 4. Setup Prisma & Database Tables (Crucial Step)

The database stores two categories of data:
1. **Relational Models (`users`, `balances`)**: Managed by Prisma ORM.
2. **Time-Series Event Tables (`trades` hypertable, `orders`, `balance_events`)**: Managed by the backend TimescaleDB raw pool (`setupKafkaTables()`).

> [!IMPORTANT]
> **Why `pnpm db:generate` alone is not enough:**
> `pnpm db:generate` only compiles TypeScript types and client artifacts in `src/generated/prisma`. It **does NOT** create tables in the database.
> If you start with a fresh database or after deleting Docker volumes (`docker compose down -v`), you **MUST run `pnpm db:push`** to initialize the `users` and `balances` tables in PostgreSQL.

Run the following inside `backend/`:

```bash
cd backend

# 1. Generate the Prisma Client types
pnpm db:generate

# 2. Push schema to create 'users' and 'balances' tables in the database
pnpm db:push
```

##### All Available Prisma Commands

| Command | Script | Description |
|---|---|---|
| `pnpm db:generate` | `prisma generate --config src/prisma.config.ts` | Generates TypeScript Prisma Client code in `src/generated/prisma` |
| `pnpm db:push` | `prisma db push --config src/prisma.config.ts` | **Initializes / syncs database tables** directly from `schema.prisma` without migration files (ideal for local development & fresh DBs) |
| `pnpm db:migrate` | `prisma migrate deploy --config src/prisma.config.ts` | Applies existing migration files to the database |
| `pnpm db:studio` | `prisma studio --config src/prisma.config.ts` | Opens a web-based GUI at `http://localhost:5555` to browse and edit database rows |

---

#### 5. Start Backend Server

```bash
cd backend
pnpm dev
```

- Server starts on `http://localhost:3000` (WebSocket at `ws://localhost:3000`).
- On startup, the backend automatically calls `setupKafkaTables()`, ensuring TimescaleDB extensions and `trades`, `orders`, and `balance_events` hypertables/indexes are active.

---

#### 6. Start Frontend

In a separate terminal:

```bash
cd frontend
pnpm dev
```

- Web UI is accessible at `http://localhost:5173`.
- Register a new account to receive instant default paper balances (10 BTC, 100 ETH, 1000 SOL, 100,000 USDC) and start trading!

---

#### 7. Start TradeBot (Optional Market Maker)

In a separate terminal:

```bash
cd tradeBot
pnpm dev
```

- The bot connects to the backend WebSocket, listens for live price ticks, and automatically submits limit orders to maintain market liquidity and realistic spread.

---

## Docker Lifecycle & Database Reset

If you ever need to stop or completely reset the database state:

```bash
# Stop containers
cd backend
docker compose down

# Wipe all database data & volumes (Fresh start)
docker compose down -v

# Re-launch containers
docker compose up -d

# Re-create tables (REQUIRED after wiping volumes)
pnpm db:push
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `DEVELOPMENT` | Environment mode (`DEVELOPMENT` \| `PRODUCTION`) |
| `PORT` | `3000` | Fastify server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/tradeapp` | PostgreSQL connection string (used by Prisma and TimescaleDB raw pool) |
| `POSTGRES_USER` | `postgres` | Docker PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | Docker PostgreSQL password |
| `POSTGRES_DB` | `tradeapp` | Docker PostgreSQL database name |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker connection address |
| `JWT_SECRET` | `supersecret_change_me_in_production_please` | Secret key for signing / verifying JWT tokens |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Backend REST API base URL |
| `VITE_WS_URL` | `ws://localhost:3000` | Backend WebSocket Gateway URL |

---

## Kafka Topics & Event Types

| Topic | Event Types | Written By | Consumed By |
|---|---|---|---|
| `orders` | `ORDER_CREATED`, `ORDER_FILLED`, `ORDER_PARTIALLY_FILLED`, `ORDER_CANCELLED` | ExchangeEngine / MarketEngine | Batch consumer → `orders` table |
| `trades` | `TRADE_EXECUTED` | MarketEngine (on every fill) | Batch consumer → `trades` hypertable |
| `balances` | `BALANCE_RESERVED`, `BALANCE_RELEASED`, `BALANCE_CHANGED` | BalanceEngine | Batch consumer → `balance_events` table |

The batch consumer uses `groupId: tradeapp-db-batch-consumer` and processes all three topics in a single consumer group with `eachBatch` for bulk idempotent inserts.

---

## Database Schema

### PostgreSQL / Prisma (Operational)

| Table | Purpose |
|---|---|
| `users` | User accounts — UUID primary key, email, bcrypt password, name |
| `balances` | Per-user per-asset balance rows — `available` and `locked` float columns, unique on `(userId, asset)` |

### TimescaleDB (Time-Series & Event Log Tables)

| Table | Type | Primary / Unique Key | Purpose |
|---|---|---|---|
| `trades` | **Hypertable** (partitioned on `timestamp`) | `(trade_id, timestamp)` | Every executed fill — price, quantity, maker/taker order and user IDs |
| `orders` | **Standard Table** | `event_id` | Full order event log — one row per lifecycle event per order |
| `balance_events` | **Standard Table** | `event_id` | Audit trail of every balance mutation |

Candle queries use `time_bucket_gapfill($interval, timestamp, $start, $end)` with `first()`, `last()`, `max()`, `min()`, and `sum()` aggregates from the TimescaleDB toolkit over the `trades` hypertable.

---

## License

This project is for educational and personal portfolio use. Not licensed for commercial deployment.
