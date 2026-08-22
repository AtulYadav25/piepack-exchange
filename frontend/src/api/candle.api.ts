import { apiClient } from './client'

// Response shapes (mirrors backend candleController output)

export interface CandleData {
  /** Unix milliseconds — from `new Date(row.bucket).getTime()` in the controller */
  timestamp: number
  bucket: string
  market: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CandleApiResponse {
  success: boolean
  data: {
    market: string
    interval: string
    candles: CandleData[]
  }
}

// Request params (mirrors backend CandleQuerySchema)

export interface FetchCandlesParams {
  market: string
  /** e.g. '1m', '5m', '15m', '1h', '4h', '1d' — backend maps to pg INTERVAL */
  interval: string
  startTime?: string
  endTime?: string
  /** 1–2000, default 200 */
  limit?: number
}

// API object

export const candleApi = {
  /**
   * Fetch OHLCV candle history from TimescaleDB.
   * Route: GET /api/v1/chart/candles
   */
  getCandles: (params: FetchCandlesParams): Promise<CandleApiResponse> => {
    const queryParams: Record<string, string> = {
      market: params.market.toUpperCase(),
      interval: params.interval,
    }
    if (params.startTime) queryParams.startTime = params.startTime
    if (params.endTime) queryParams.endTime = params.endTime
    if (params.limit !== undefined) queryParams.limit = String(params.limit)

    return apiClient.get<CandleApiResponse>('/api/v1/chart/candles', {
      params: queryParams,
    })
  },
}
