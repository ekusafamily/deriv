// DBOT Quantitative Analytics & Performance Dashboard
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Percent,
  Layers,
  Award,
  Zap
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { activeAccount } = useStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [riskSettings, setRiskSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch((e) => console.error(e));

    fetch('/api/risk/settings')
      .then((r) => r.json())
      .then((data) => setRiskSettings(data))
      .catch((e) => console.error(e));
  }, []);

  const totalProfit = analytics?.totalProfit ?? 0;
  const isProfitPositive = totalProfit >= 0;

  // Calculate risk utilization percentage
  const maxDailyLoss = riskSettings?.maxDailyLoss ?? 100;
  const lossUtilized = totalProfit < 0 ? Math.min((Math.abs(totalProfit) / maxDailyLoss) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-purple-950/20">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <PieChart className="w-6 h-6 text-purple-400" />
          Quantitative Performance Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Deep telemetry across all executed bot strategies, win-loss distribution, cumulative equity progression, and risk limit utilization.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Capital Staked</span>
          <div className="mt-3 text-2xl font-black font-mono text-slate-100">
            ${analytics?.totalStake?.toFixed(2) ?? '0.00'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Across {analytics?.totalTrades ?? 0} contracts
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Realized Profit / Loss</span>
          <div className="mt-3 text-2xl font-black font-mono">
            <span className={isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {isProfitPositive ? '+' : ''}${totalProfit.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            Net return on staked capital
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Win / Loss Ratio</span>
          <div className="mt-3 text-2xl font-black font-mono text-slate-100">
            {analytics?.winRate?.toFixed(1) ?? '0.0'}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            {analytics?.wins ?? 0} Won / {analytics?.losses ?? 0} Lost
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Active Execution Pool</span>
          <div className="mt-3 text-2xl font-black font-mono text-amber-400">
            {analytics?.activeBotsCount ?? 0} Bots
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            Running concurrently
          </span>
        </div>
      </div>

      {/* Equity Progression Curve & Risk Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cumulative Equity Curve Visualizer */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Cumulative Equity Progression Curve
            </h2>
            <span className="text-xs font-mono text-slate-400">Time Normalized</span>
          </div>

          <div className="h-64 bg-[#070b14] rounded-xl border border-slate-900 p-4 flex items-end justify-between gap-1 overflow-x-auto">
            {analytics?.equityCurve?.length > 0 ? (
              analytics.equityCurve.map((point: any, idx: number) => {
                const profit = point.profit;
                const minH = 10;
                const heightPercent = Math.min(Math.max(Math.abs(profit) * 3, minH), 95);
                const isPos = profit >= 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[14px] rounded-t transition-all ${
                        isPos
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-125'
                          : 'bg-gradient-to-t from-rose-600 to-rose-400 group-hover:brightness-125'
                      }`}
                    />
                    <span className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      ${profit.toFixed(0)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-xs text-slate-600 py-20">
                Execute bot trades to build the live equity curve progression.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Risk Limit Utilization */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Risk Guard Utilization
          </h2>

          <div className="space-y-4 text-xs font-mono">
            {/* Daily Loss Gauge */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Daily Loss Allowance</span>
                <span>{lossUtilized.toFixed(0)}% Used</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${lossUtilized}%` }}
                  className={`h-full transition-all ${
                    lossUtilized > 75 ? 'bg-rose-500' : lossUtilized > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Max Daily Limit: ${maxDailyLoss.toFixed(2)}
              </span>
            </div>

            {/* Take Profit Target */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Take Profit Target</span>
              <div className="text-sm font-bold text-emerald-400">
                ${riskSettings?.takeProfitTarget?.toFixed(2) ?? '100.00'}
              </div>
              <p className="text-[10px] text-slate-500">
                Trading halts automatically once this target profit is secured.
              </p>
            </div>

            {/* Max Stake */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Maximum Single Stake</span>
              <div className="text-sm font-bold text-amber-400">
                ${riskSettings?.maxStake?.toFixed(2) ?? '50.00'}
              </div>
              <p className="text-[10px] text-slate-500">
                Hard ceiling preventing progression systems from exceeding limit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
