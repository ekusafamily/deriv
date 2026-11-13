import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { MarketChart } from '../components/charts/MarketChart';
import { formatSymbolName } from '../../../shared/types';
import {
  TrendingUp,
  TrendingDown,
  Cpu,
  History,
  ShieldCheck,
  PlusCircle,
  Play,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeAccount, selectedSymbol, setSelectedSymbol } = useStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch((e) => console.error(e));

    fetch('/api/trades?limit=8')
      .then((r) => r.json())
      .then((data) => setRecentTrades(data.slice(0, 6)))
      .catch((e) => console.error(e));

    fetch('/api/bots')
      .then((r) => r.json())
      .then((data) => setBots(data))
      .catch((e) => console.error(e));
  }, []);

  const totalProfit = analytics?.totalProfit ?? 0;
  const isProfitPositive = totalProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-amber-950/20 border border-slate-800 p-6 rounded-2xl glass-panel">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Quantitative Trading Hub
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Deriv API v3
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Build visual algorithmic bots, backtest against official historical data, and execute trades safely with strict automated risk guards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/builder')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Build New Bot
          </button>
          <button
            onClick={() => navigate('/library')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors"
          >
            Template Library
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Account Balance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-slate-100">
              ${activeAccount ? (activeAccount.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1.5">{activeAccount?.currency ?? 'USD'}</span>
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5">
            <span className={`font-semibold ${activeAccount?.isVirtual ? 'text-emerald-400' : 'text-amber-400'}`}>
              {activeAccount?.isVirtual ? '● Demo Sandbox' : '● Live Real Money'}
            </span>
          </div>
        </div>

        {/* Metric 2: Net Profit / Loss */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Profit</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isProfitPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isProfitPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black font-mono ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitPositive ? '+' : ''}${totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Win Rate: <span className="font-bold text-slate-200">{analytics?.winRate?.toFixed(1) ?? '0.0'}%</span> ({analytics?.wins ?? 0}W / {analytics?.losses ?? 0}L)
          </div>
        </div>

        {/* Metric 3: Active Bots */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Trading Bots</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-slate-100">
              {analytics?.activeBotsCount ?? 0}
            </span>
            <span className="text-xs text-slate-400 ml-2">running</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Total Bots Saved: <span className="font-bold text-slate-200">{bots.length}</span>
          </div>
        </div>

        {/* Metric 4: Risk Protection */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk Safeguards</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-emerald-400 uppercase tracking-wide">FAIL-CLOSED</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Auto stop loss & max consecutive loss active
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Quick Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Candlestick Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Live Market Stream
            </h2>
            <div className="flex items-center gap-2">
              {['1HZ100V', '1HZ50V', '1HZ10V', 'R_100', 'R_50'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSelectedSymbol(sym)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedSymbol === sym
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {formatSymbolName(sym)}
                </button>
              ))}
            </div>
          </div>

          <MarketChart symbol={selectedSymbol} height={380} />
        </div>

        {/* Right 1 Col: Quick Launch & Active Bots */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              Saved Strategies
            </h2>
            <button
              onClick={() => navigate('/builder')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              View all
            </button>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 space-y-3">
            {bots.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Cpu className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">No bots saved yet.</p>
                <button
                  onClick={() => navigate('/library')}
                  className="text-xs text-amber-400 font-bold underline"
                >
                  Load a pre-built template
                </button>
              </div>
            ) : (
              bots.slice(0, 4).map((bot) => (
                <div
                  key={bot.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{bot.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                      <span>{bot.symbol}</span>
                      <span>•</span>
                      <span>{bot.contractType}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/console?botId=${bot.id}`)}
                    className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                    title="Open Console"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => navigate('/builder')}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Create Custom Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Recent Trades Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Recent Executions & Outcomes
          </h2>
          <button
            onClick={() => navigate('/history')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            Trade History <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No trades recorded yet. Start a bot or run a paper trading session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Contract ID</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Stake</th>
                  <th className="py-2.5 px-3">Profit / Loss</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTrades.map((t) => {
                  const won = t.status === 'WON';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        #{t.contractId ?? t.id.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-400">{formatSymbolName(t.symbol)}</td>
                      <td className="py-2.5 px-3">{t.contractType}</td>
                      <td className="py-2.5 px-3 text-slate-300">${t.stake.toFixed(2)}</td>
                      <td className={`py-2.5 px-3 font-bold ${won ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {won ? '+' : ''}${t.profit.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            won
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {t.isPaperTrade ? 'Paper' : 'Live'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
