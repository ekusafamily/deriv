import React from 'react';
import { Play, Square, Bot as BotIcon } from 'lucide-react';
import { formatSymbolName } from '@shared/types';

export interface TelemetryMetrics {
  totalStake: number;
  totalPayout: number;
  numberOfRuns: number;
  contractsLost: number;
  contractsWon: number;
  totalProfitLoss: number;
}

export interface JournalLog {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

export interface TradeItem {
  id: string;
  symbol: string;
  contractType: string;
  time: string;
  status: 'WON' | 'LOST' | 'PENDING';
  profit?: number;
}

interface RunPanelProps {
  isRunning: boolean;
  onToggleRun: () => void;
  isSlowMode: boolean;
  onToggleSlowMode: () => void;
  activeTab: 'summary' | 'transactions' | 'journal';
  setActiveTab: (tab: 'summary' | 'transactions' | 'journal') => void;
  metrics: TelemetryMetrics;
  onResetMetrics: () => void;
  trades: TradeItem[];
  journalLogs: JournalLog[];
  isVirtualAccount: boolean;
  onOpenAiModal: () => void;
}

export const RunPanel: React.FC<RunPanelProps> = ({
  isRunning,
  onToggleRun,
  isSlowMode,
  onToggleSlowMode,
  activeTab,
  setActiveTab,
  metrics,
  onResetMetrics,
  trades,
  journalLogs,
  isVirtualAccount,
  onOpenAiModal,
}) => {
  return (
    <aside className="w-[340px] shrink-0 border-l border-slate-800/80 bg-[#0c1222] flex flex-col h-full z-20 select-none">
      {/* Top Control Bar: Red RUN Button + Execution Mode Switch */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0d1426]">
        {/* Run / Stop Button */}
        <button
          onClick={onToggleRun}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 animate-pulse'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>STOP</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run</span>
            </>
          )}
        </button>

        {/* Execution SLOW * Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">
            Execution <span className="text-amber-400 font-bold">{isSlowMode ? 'SLOW *' : 'FAST'}</span>
          </span>
          <button
            onClick={onToggleSlowMode}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              isSlowMode ? 'bg-amber-500/30 border border-amber-500/50' : 'bg-emerald-500/30 border border-emerald-500/50'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                isSlowMode ? 'translate-x-0 bg-amber-400' : 'translate-x-4 bg-emerald-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Summary | Transactions | Journal) */}
      <div className="flex border-b border-slate-800 text-xs font-bold text-slate-400 bg-[#0d1324]">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2.5 text-center transition-colors relative ${
            activeTab === 'summary' ? 'text-slate-100 font-black' : 'hover:text-slate-200'
          }`}
        >
          Summary
          {activeTab === 'summary' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2.5 text-center transition-colors relative ${
            activeTab === 'transactions' ? 'text-slate-100 font-black' : 'hover:text-slate-200'
          }`}
        >
          Transactions
          {activeTab === 'transactions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2.5 text-center transition-colors relative ${
            activeTab === 'journal' ? 'text-slate-100 font-black' : 'hover:text-slate-200'
          }`}
        >
          Journal
          {activeTab === 'journal' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
          )}
        </button>
      </div>

      {/* Tab 1: Summary View */}
      {activeTab === 'summary' && (
        <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto">
          {/* Idle Empty State Prompt */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
            <BotIcon className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
              When you're ready to trade, hit <span className="font-bold text-red-400">Run</span>. You'll be able to track your bot's performance here.
            </p>
            {isVirtualAccount && (
              <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PAPER MODE ($10,000 VIRTUAL)
              </span>
            )}
          </div>

          {/* Telemetry Stats Grid */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex justify-end">
              <button
                onClick={() => alert('Telemetry statistics display real-time contract execution results.')}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                What's this?
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <p className="text-[10px] text-slate-400">Total stake</p>
                <p className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                  {metrics.totalStake.toFixed(2)} USD
                </p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <p className="text-[10px] text-slate-400">Total payout</p>
                <p className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                  {metrics.totalPayout.toFixed(2)} USD
                </p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <p className="text-[10px] text-slate-400">No. of runs</p>
                <p className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                  {metrics.numberOfRuns}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <p className="text-[10px] text-slate-400">Contracts lost</p>
                <p className="text-xs font-bold font-mono text-rose-400 mt-0.5">
                  {metrics.contractsLost}
                </p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <p className="text-[10px] text-slate-400">Contracts won</p>
                <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                  {metrics.contractsWon}
                </p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                <p className="text-[10px] text-slate-400">Total profit/loss</p>
                <p
                  className={`text-xs font-bold font-mono mt-0.5 ${
                    metrics.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {metrics.totalProfitLoss >= 0 ? '+' : ''}
                  {metrics.totalProfitLoss.toFixed(2)} USD
                </p>
              </div>
            </div>

            {/* Reset Telemetry Button */}
            <button
              onClick={onResetMetrics}
              className="w-full py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Floating AI Assistant Bubble */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onOpenAiModal}
              title="Ask AI Assistant"
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-purple-900/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
            >
              <div className="w-full h-full rounded-full bg-[#0d1322] flex items-center justify-center">
                <span className="font-black text-xs bg-gradient-to-r from-purple-300 to-amber-200 bg-clip-text text-transparent">
                  AI
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Transactions View */}
      {activeTab === 'transactions' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
          {trades.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs py-16">
              No contracts executed yet.
            </div>
          ) : (
            trades.map((t) => (
              <div
                key={t.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-200">{formatSymbolName(t.symbol)}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({t.contractType})</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t.time}</p>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-bold font-mono ${
                      t.status === 'WON' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.status === 'WON' ? '+' : ''}
                    {(t.profit || 0).toFixed(2)} USD
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      t.status === 'WON'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Journal Logs View */}
      {activeTab === 'journal' && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1.5">
          {journalLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-slate-300">
              <span className="text-slate-500 shrink-0">{log.timestamp}</span>
              <span
                className={`font-bold shrink-0 ${
                  log.level === 'SUCCESS'
                    ? 'text-emerald-400'
                    : log.level === 'WARN'
                    ? 'text-amber-400'
                    : log.level === 'ERROR'
                    ? 'text-rose-400'
                    : 'text-blue-400'
                }`}
              >
                [{log.level}]
              </span>
              <span className="break-words text-slate-300">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
