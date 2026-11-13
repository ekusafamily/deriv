// DBOT Historical Backtesting Simulation Interface
import React, { useState } from 'react';
import { STRATEGY_TEMPLATES } from '../../../shared/strategy-templates';
import { BacktestReport } from '../../../server/src/engine/backtester';
import {
  FlaskConical,
  Play,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Percent,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

export const BacktestingPage: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [selectedTemplateId, setSelectedTemplateId] = useState(STRATEGY_TEMPLATES[0].id);
  const [candleCount, setCandleCount] = useState(500);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [granularity, setGranularity] = useState(60);

  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const template = STRATEGY_TEMPLATES.find((t) => t.id === selectedTemplateId) || STRATEGY_TEMPLATES[0];

      const resp = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: template.ast,
          symbol: selectedSymbol,
          count: candleCount,
          granularity,
          initialBalance
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Backtest failed');
      }

      setReport(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during backtesting.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-blue-950/20">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-blue-400" />
          Historical Strategy Backtester
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Simulate algorithmic strategies chronologically against official Deriv historical market candles without lookahead bias.
        </p>
      </div>

      {/* Backtest Parameters Configuration Form */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Symbol */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Market Asset
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="1HZ100V">Volatility 100 (1s) Index</option>
              <option value="1HZ75V">Volatility 75 (1s) Index</option>
              <option value="1HZ50V">Volatility 50 (1s) Index</option>
              <option value="1HZ25V">Volatility 25 (1s) Index</option>
              <option value="1HZ10V">Volatility 10 (1s) Index</option>
              <option value="R_100">Volatility 100 Index</option>
              <option value="R_75">Volatility 75 Index</option>
              <option value="R_50">Volatility 50 Index</option>
              <option value="R_25">Volatility 25 Index</option>
              <option value="R_10">Volatility 10 Index</option>
              <option value="BOOM300">Boom 300 Index</option>
              <option value="CRASH300">Crash 300 Index</option>
              <option value="STEP_INDEX">Step Index</option>
              <option value="frxEURUSD">EUR/USD Forex</option>
              <option value="cryBTCUSD">BTC/USD Crypto</option>
            </select>
          </div>

          {/* Strategy Template */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Strategy Logic
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {STRATEGY_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Granularity */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Candle Period
            </label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value={60}>1 Minute (60s)</option>
              <option value={120}>2 Minutes (120s)</option>
              <option value={300}>5 Minutes (300s)</option>
              <option value={900}>15 Minutes (900s)</option>
            </select>
          </div>

          {/* Sample Size (Candles) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              History Depth
            </label>
            <select
              value={candleCount}
              onChange={(e) => setCandleCount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value={200}>200 Candles</option>
              <option value={500}>500 Candles</option>
              <option value={1000}>1000 Candles</option>
            </select>
          </div>

          {/* Execute Button */}
          <div>
            <button
              onClick={handleRunBacktest}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Backtest
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Overview */}
      {report && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Simulated Net Profit</span>
              <div className="mt-2 text-xl font-black font-mono">
                <span className={report.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {report.netProfit >= 0 ? '+' : ''}${report.netProfit.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Final: ${report.finalBalance.toFixed(2)}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Win Rate %</span>
              <div className="mt-2 text-xl font-black font-mono text-slate-100">
                {report.winRate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                {report.winningTrades}W / {report.losingTrades}L ({report.totalTrades} total)
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Max Drawdown</span>
              <div className="mt-2 text-xl font-black font-mono text-rose-400">
                -${report.maxDrawdown.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                {report.maxDrawdownPercent.toFixed(1)}% Peak to Trough
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Profit Factor</span>
              <div className="mt-2 text-xl font-black font-mono text-amber-400">
                {report.profitFactor.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                Gross Win / Gross Loss
              </span>
            </div>
          </div>

          {/* Chronological Trade Replay Log Table */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-100">
              Chronological Trade Replay ({report.trades.length} Trades)
            </h2>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Entry Time</th>
                    <th className="py-2.5 px-3">Entry Price</th>
                    <th className="py-2.5 px-3">Exit Price</th>
                    <th className="py-2.5 px-3">Stake</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">Profit / Loss</th>
                    <th className="py-2.5 px-3">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.trades.map((t) => {
                    const isWin = t.outcome === 'WON';
                    return (
                      <tr key={t.tradeIndex} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-400">{t.tradeIndex}</td>
                        <td className="py-2 px-3 text-slate-400">
                          {new Date(t.entryTime * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3 text-slate-200">{t.entryPrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-200">{t.exitPrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-300">${t.stake.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isWin
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {t.outcome}
                          </span>
                        </td>
                        <td className={`py-2 px-3 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${t.profit.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-bold">${t.balanceAfter.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
