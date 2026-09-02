import { apiClient } from './client'

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface OpenOrder {
    id: string
    market: string
    side: 'buy' | 'sell'
    type: 'limit' | 'market'
    price: number | null
    quantity: number
    remainingQuantity: number | null
    status: 'open' | 'partially_filled' | 'filled' | 'cancelled'
    createdAt?: number
}

export interface HistoryOrder {
    id: string
    market: string
    side: 'buy' | 'sell'
    type: 'limit' | 'market'
    price: number | null
    quantity: number
    remainingQuantity: number | null
    status: 'open' | 'partially_filled' | 'filled' | 'cancelled'
    timestamp: string
}

export interface AssetBalance {
    available: number
    locked: number
}

export interface OpenOrdersResponse {
    market: string
    userId: string
    openOrders: OpenOrder[]
    count: number
}

export interface HistoryOrdersResponse {
    market: string
    userId: string
    orders: HistoryOrder[]
    count: number
}

export interface BalancesResponse {
    userId: string
    balances: Record<string, AssetBalance>
}

export interface PlaceOrderPayload {
    userId: string
    market: string
    order: {
        userId: string
        market: string
        side: 'buy' | 'sell'
        type: 'limit' | 'market'
        price?: number | null
        quantity: number
    }
}

// API

export const orderApi = {
    /**
     * GET /api/v1/order/openOrders?market=BTC-USDC
     * Returns live resting orders from the in-memory trade engine.
     */
    getOpenOrders: (market: string): Promise<OpenOrdersResponse> =>
        apiClient.get<OpenOrdersResponse>('/api/v1/order/openOrders', {
            params: { market: market.toUpperCase() },
        }),

    /**
     * GET /api/v1/order/history?market=BTC-USDC
     * Returns historical orders (latest status per order) from TimescaleDB.
     */
    getOrderHistory: (market: string): Promise<HistoryOrdersResponse> =>
        apiClient.get<HistoryOrdersResponse>('/api/v1/order/history', {
            params: { market: market.toUpperCase() },
        }),

    /**
     * GET /api/v1/order/balances
     * Returns live asset balances from the in-memory balance engine.
     */
    getBalances: (): Promise<BalancesResponse> =>
        apiClient.get<BalancesResponse>('/api/v1/order/balances'),

    /**
     * POST /api/v1/order/placeOrder
     * Places a limit or market order in the trade engine.
     */
    placeOrder: (payload: PlaceOrderPayload): Promise<unknown> =>
        apiClient.post<unknown>('/api/v1/order/placeOrder', payload),
}

