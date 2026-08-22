import React, { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  // HistogramSeries, // TODO: re-enable when showing volume bars
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts'
import { useCandleChart, type ChartCandle } from '../../hooks/useCandleChart'

interface TradingChartProps {
  symbol: string
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D']

// Helpers

/** Strip volume — lightweight-charts CandlestickSeries only wants OHLCT */
function toOHLC(c: ChartCandle) {
  return { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }
}

// TODO: re-enable when showing volume bars
// function toVolBar(c: ChartCandle) {
//   return {
//     time: c.time,
//     value: c.volume,
//     color: c.close >= c.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
//   }
// }

// Component

export const TradingChart: React.FC<TradingChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  // const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null) // TODO: re-enable for volume

  const [activeTimeframe, setActiveTimeframe] = useState('1m')

  const { candles, liveCandle, isLoading, error } = useCandleChart(symbol, activeTimeframe)

  // Effect 1: Chart initialisation (runs once on mount)
  // The chart lives for the lifetime of this component — we never destroy
  // and rebuild it just to change data. That's what setData / update are for.

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        vertLine: { color: '#3f3f46', labelBackgroundColor: '#27272a' },
        horzLine: { color: '#3f3f46', labelBackgroundColor: '#27272a' },
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 420,
    })

    chartRef.current = chart

    // Candlestick series
    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    // TODO: re enable volume histogram bars
    // volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
    //   color: '#3f3f46',
    //   priceFormat: { type: 'volume' },
    //   priceScaleId: 'volume',
    // })
    // volumeSeriesRef.current.priceScale().applyOptions({
    //   scaleMargins: { top: 0.82, bottom: 0 },
    // })

    // Responsive resize
    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    })
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      // volumeSeriesRef.current = null
    }
  }, [])

  // Effect 2: Load historical data
  // Runs whenever the REST fetch resolves a new candles array.
  // setData() replaces the entire series in one frame — no flicker.

  useEffect(() => {
    if (!candleSeriesRef.current) return
    if (candles.length === 0) return

    candleSeriesRef.current.setData(candles.map(toOHLC))
    // volumeSeriesRef.current?.setData(candles.map(toVolBar)) // TODO: re-enable volume

    // Scroll to the latest bar
    chartRef.current?.timeScale().scrollToRealTime()
  }, [candles])

  // Effect 3: Update live candle on every RECENT_TRADES tick
  // lightweight-charts update() efficiently patches only the last bar —
  // it does NOT cause a full redraw. This is the correct API for live ticks.
  //
  // Note: if liveCandle.time is newer than all historical candles, the library
  // automatically appends a new bar. If it matches the last bar's time, it
  // updates in place. Both cases are handled transparently.

  useEffect(() => {
    if (!liveCandle || !candleSeriesRef.current) return

    candleSeriesRef.current.update(toOHLC(liveCandle))
    // volumeSeriesRef.current?.update(toVolBar(liveCandle)) // TODO: re-enable volume
  }, [liveCandle])

  // Render
  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl flex flex-col h-full min-h-[440px]">
      {/* Chart toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 font-semibold mr-2">Timeframe:</span>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${activeTimeframe === tf
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          {isLoading ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Loading…
            </>
          ) : error ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400">{error}</span>
            </>
          ) : (
            <>
              <span
                className={`inline-block w-2 h-2 rounded-full ${liveCandle ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'
                  }`}
              />
              {liveCandle ? 'Live' : 'Candlestick Chart'}
            </>
          )}
        </div>
      </div>

      {/* Lightweight Chart Container */}
      <div className="flex-1 w-full relative min-h-[380px]" ref={chartContainerRef} />
    </div>
  )
}
