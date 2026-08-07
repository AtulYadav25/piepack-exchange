src/
  engine/
    types.ts             # Order, Trade, Side, OrderType, OrderStatus
    orderBook.ts          # OrderBook class
    matchingEngine.ts      # MatchingEngine class (extends EventEmitter)
    __tests__/
      orderBook.test.ts   # the unit tests we discussed earlier — write these first
  db/
    prisma/
      schema.prisma
    repositories/
      orderRepo.ts
      tradeRepo.ts
      balanceRepo.ts
  services/
    orderService.ts        # orchestrates: validate -> lock balance -> engine.placeOrder -> persist -> broadcast
    marketDataService.ts   # candle query logic
  ws/
    gateway.ts             # WsGateway class
  api/
    routes/
      orders.ts             # POST /orders, DELETE /orders/:id
      orderbook.ts          # GET /orderbook/:market
      candles.ts            # GET /candles/:market
    plugins/
      prisma.ts             # Fastify plugin registering prisma client
      websocket.ts           # registers @fastify/websocket, wires gateway
  app.ts                    # builds the Fastify instance, registers plugins/routes
  server.ts                  # instantiates MatchingEngine, WsGateway, wires event listeners, calls app.listen()