import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CandlestickSeries, type IChartApi } from 'lightweight-charts'
import { generateMockCandlesticks, type CandlestickData } from '../../config/tradingMockData'

interface TradingChartProps {
  symbol: string
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D']

export const TradingChart: React.FC<TradingChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [activeTimeframe, setActiveTimeframe] = useState('1h')
  const [chartData, setChartData] = useState<CandlestickData[]>([])

  useEffect(() => {
    const data = generateMockCandlesticks(symbol, activeTimeframe)
    setChartData(data)
  }, [symbol, activeTimeframe])

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return

    // Initialize Lightweight Chart with dark theme options
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

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    // // Add Volume Series
    // const volumeSeries = chart.addSeries(HistogramSeries, {
    //   color: '#3f3f46',
    //   priceFormat: {
    //     type: 'volume',
    //   },
    //   priceScaleId: '',
    // })

    // volumeSeries.priceScale().applyOptions({
    //   scaleMargins: {
    //     top: 0.8,
    //     bottom: 0,
    //   },
    // })

    const formattedCandles = chartData.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candleSeries.setData(formattedCandles)
    // volumeSeries.setData(formattedVolume)

    chart.timeScale().fitContent()

    // Handle container resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [chartData])

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
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          Candlestick Chart
        </div>
      </div>

      {/* Lightweight Chart Container */}
      <div className="flex-1 w-full relative min-h-[380px]" ref={chartContainerRef} />
    </div>
  )
}
