// DBOT Interactive Financial Chart using Lightweight Charts
import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { useStore } from '../../store/useStore';

interface MarketChartProps {
  symbol?: string;
  height?: number;
  showIndicators?: boolean;
}

export const MarketChart: React.FC<MarketChartProps> = ({
  symbol = 'R_100',
  height = 420,
  showIndicators = true
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const latestTicks = useStore((s) => s.latestTicks);
  const [liveCandles, setLiveCandles] = useState<CandlestickData[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create TradingView Lightweight Chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      crosshair: {
        vertLine: { color: '#f59e0b', width: 1, style: 2 },
        horzLine: { color: '#f59e0b', width: 1, style: 2 }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: true
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });

    const smaSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'SMA (14)'
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    smaSeriesRef.current = smaSeries;

    // Fetch initial historical candles from backend
    fetch(`/api/candles?symbol=${symbol}&count=120&granularity=60`)
      .then((r) => r.json())
      .then((candles) => {
        if (Array.isArray(candles) && candles.length > 0) {
          const formatted: CandlestickData[] = candles.map((c: any) => ({
            time: c.epoch as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }));

          candleSeries.setData(formatted);
          setLiveCandles(formatted);

          // Calculate SMA line data
          if (showIndicators) {
            const smaData: LineData[] = [];
            const period = 14;
            for (let i = period - 1; i < formatted.length; i++) {
              const slice = formatted.slice(i - period + 1, i + 1);
              const sum = slice.reduce((acc, val) => acc + val.close, 0);
              smaData.push({
                time: formatted[i].time,
                value: sum / period
              });
            }
            smaSeries.setData(smaData);
          }

          chart.timeScale().fitContent();
        }
      })
      .catch((err) => console.error('Failed to load chart history:', err));

    // Handle responsive container resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      smaSeriesRef.current = null;
    };
  }, [symbol, height, showIndicators]);

  // Bucket live ticks into 1-minute candles and update chart
  useEffect(() => {
    const tick = latestTicks[symbol];
    if (!tick || !candleSeriesRef.current) return;

    const tickTime = Math.floor(tick.epoch / 60) * 60; // bucket to minute
    const lastCandle = liveCandles[liveCandles.length - 1];

    setLiveCandles((prev) => {
      const newCandles = [...prev];

      if (lastCandle && lastCandle.time === tickTime) {
        // Update existing minute candle
        const updated = { ...lastCandle };
        updated.high = Math.max(updated.high, tick.quote);
        updated.low = Math.min(updated.low, tick.quote);
        updated.close = tick.quote;
        newCandles[newCandles.length - 1] = updated;
      } else {
        // Create new minute candle
        newCandles.push({
          time: tickTime as any,
          open: tick.quote,
          high: tick.quote,
          low: tick.quote,
          close: tick.quote
        });
        // Keep only last 200 candles
        if (newCandles.length > 200) newCandles.shift();
      }

      return newCandles;
    });
  }, [latestTicks, symbol]);

  // Update chart series when live candles change
  useEffect(() => {
    if (candleSeriesRef.current && liveCandles.length > 0) {
      candleSeriesRef.current.setData(liveCandles);
    }
  }, [liveCandles]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden glass-panel p-2">
      <div className="flex items-center justify-between mb-2 px-3 pt-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-100 tracking-wide">{symbol}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">1m</span>
          {latestTicks[symbol] && (
            <span className="text-xs font-mono font-semibold text-amber-400 animate-pulse">
              ${latestTicks[symbol].quote.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Deriv Stream Live</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
};
