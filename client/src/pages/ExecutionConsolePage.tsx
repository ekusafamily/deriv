// DBOT Real-Time Bot Execution Console
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscribeToBot, unsubscribeFromBot } from '../services/socket';
import { formatSymbolName } from '../../../shared/types';
import { useStore } from '../store/useStore';
import {
  Terminal,
  Play,
  Pause,
  Square,
  ShieldAlert,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const ExecutionConsolePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryBotId = searchParams.get('botId');

  const { botSnapshots, activeAccount } = useStore();
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>(queryBotId || '');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'>('ALL');

  // Load available bots
  useEffect(() => {
    fetch('/api/bots')
      .then((r) => r.json())
      .then((data) => {
        setBots(data);
        if (!selectedBotId && data.length > 0) {
          setSelectedBotId(data[0].id);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Subscribe to selected bot Socket.IO stream
  useEffect(() => {
    if (selectedBotId) {
      subscribeToBot(selectedBotId);
      // Fetch initial state
      fetch(`/api/bots/${selectedBotId}/status`)
        .then((r) => r.json())
        .then((snap) => {
          if (snap && snap.botId) {
            useStore.getState().setBotSnapshot(selectedBotId, snap);
          }
        })
        .catch(() => {});
    }

    return () => {
      if (selectedBotId) {
        unsubscribeFromBot(selectedBotId);
      }
    };
  }, [selectedBotId]);

  const snapshot = selectedBotId ? botSnapshots[selectedBotId] : null;
  const isRunning = snapshot && snapshot.status !== 'STOPPED' && snapshot.status !== 'IDLE' && snapshot.status !== 'ERROR';
  const isPaused = snapshot?.status === 'PAUSED';

  // Controls
  const handleStart = async () => {
    if (!selectedBotId) return;
    try {
      const resp = await fetch(`/api/bots/${selectedBotId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runMode: activeAccount?.isVirtual ? 'LIVE_DEMO' : 'LIVE_REAL',
          accountId: activeAccount?.accountId
        })
      });
      const data = await resp.json();
      if (!data.success) alert(data.error);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePause = async () => {
    if (!selectedBotId) return;
    await fetch(`/api/bots/${selectedBotId}/pause`, { method: 'POST' });
  };

  const handleResume = async () => {
    if (!selectedBotId) return;
    await fetch(`/api/bots/${selectedBotId}/resume`, { method: 'POST' });
  };

  const handleStop = async () => {
    if (!selectedBotId) return;
    await fetch(`/api/bots/${selectedBotId}/stop`, { method: 'POST' });
  };

  const handleEmergencyStop = async () => {
    if (!selectedBotId) return;
    if (confirm('🚨 EMERGENCY STOP: Immediately halt this bot?')) {
      await fetch(`/api/bots/${selectedBotId}/emergency-stop`, { method: 'POST' });
    }
  };

  const filteredLogs = snapshot?.logs
    ? snapshot.logs.filter((l) => logFilter === 'ALL' || l.level === logFilter)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Bar: Bot Selector & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm font-bold text-slate-100 rounded-lg px-3 py-1 focus:outline-none focus:border-amber-500"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({formatSymbolName(b.symbol)})
                  </option>
                ))}
              </select>

              {/* Status Badge */}
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                  isRunning
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                    : isPaused
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                ● {snapshot?.status ?? 'IDLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Account: <span className="font-mono text-slate-300">{activeAccount?.accountId}</span> ({activeAccount?.isVirtual ? 'Demo Sandbox' : 'Real Money'})
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Bot
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>

          <button
            onClick={handleEmergencyStop}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-bold text-xs transition-colors"
            title="Emergency Kill Switch"
          >
            <ShieldAlert className="w-4 h-4" />
            Emergency
          </button>
        </div>
      </div>

      {/* Real-Time Telemetry HUD Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Live Profit */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Session Profit</span>
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-xl font-black font-mono ${
                (snapshot?.totalProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(snapshot?.totalProfit ?? 0) >= 0 ? '+' : ''}${snapshot?.totalProfit?.toFixed(2) ?? '0.00'}
            </span>
            {(snapshot?.totalProfit ?? 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            {snapshot?.winningTrades ?? 0} Won / {snapshot?.losingTrades ?? 0} Lost
          </span>
        </div>

        {/* Card 2: Current Stake & Progression */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Next Stake / Step</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xl font-black font-mono text-slate-100">
              ${snapshot?.currentStake?.toFixed(2) ?? '1.00'}
            </span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] text-amber-400 font-mono mt-1 block font-semibold">
            Progression Step #{snapshot?.progressionLevel ?? 1}
          </span>
        </div>

        {/* Card 3: Consecutive Losses */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Consecutive Losses</span>
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-xl font-black font-mono ${
                (snapshot?.consecutiveLosses ?? 0) > 2 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {snapshot?.consecutiveLosses ?? 0}
            </span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            Max limit: 4 steps
          </span>
        </div>

        {/* Card 4: Market Price */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Market Price</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xl font-black font-mono text-amber-400">
              {snapshot?.lastTickPrice ? `$${snapshot.lastTickPrice.toFixed(2)}` : '--'}
            </span>
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            {formatSymbolName(snapshot?.symbol ?? '1HZ100V')} Live Quote
          </span>
        </div>
      </div>

      {/* Active Contract Monitoring Banner */}
      {snapshot?.activeContract ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold font-mono">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-100">
                  OPEN CONTRACT #{snapshot.activeContract.contract_id}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                  {snapshot.activeContract.contract_type}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300 mt-1">
                <span>Entry: {snapshot.activeContract.entry_spot ?? '--'}</span>
                <span>Current: {snapshot.activeContract.current_spot ?? '--'}</span>
                <span>Stake: ${snapshot.activeContract.buy_price.toFixed(2)}</span>
                <span>Payout: ${snapshot.activeContract.payout.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">Unrealized P/L</span>
            <span
              className={`text-lg font-black font-mono ${
                snapshot.activeContract.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {snapshot.activeContract.profit >= 0 ? '+' : ''}${snapshot.activeContract.profit.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>No active contract currently open. Scanning market conditions for entry signals...</span>
        </div>
      )}

      {/* Execution Terminal Console Logs */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200">Execution Logs Stream</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {filteredLogs.length} events
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {(['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  logFilter === lvl
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Log Viewer Window */}
        <div className="h-80 overflow-y-auto bg-[#070b14] p-3 rounded-xl border border-slate-900 font-mono text-xs space-y-1.5 selection:bg-amber-500/20">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-10">No log entries matching filter.</div>
          ) : (
            filteredLogs.map((log, idx) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString();
              let color = 'text-slate-300';
              if (log.level === 'SUCCESS') color = 'text-emerald-400 font-semibold';
              if (log.level === 'WARN') color = 'text-amber-400';
              if (log.level === 'ERROR') color = 'text-rose-400 font-bold';

              return (
                <div key={idx} className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/40 px-1 rounded">
                  <span className="text-slate-500 shrink-0 select-none">[{timeStr}]</span>
                  <span className={`text-[10px] font-bold px-1 rounded select-none shrink-0 ${
                    log.level === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                    log.level === 'WARN' ? 'bg-amber-500/10 text-amber-400' :
                    log.level === 'ERROR' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {log.level}
                  </span>
                  <span className={`flex-1 break-words ${color}`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
