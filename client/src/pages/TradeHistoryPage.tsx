// DBOT Complete Trade History & Portfolio Log
import React, { useEffect, useState } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatSymbolName } from '../../../shared/types';

export const TradeHistoryPage: React.FC = () => {
  const [trades, setTrades] = useState<any[]>([]);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = () => {
    setIsLoading(true);
    let url = '/api/trades?limit=100';
    if (filterSymbol) url += `&symbol=${filterSymbol}`;
    if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;
    if (filterMode === 'PAPER') url += '&paper=true';
    if (filterMode === 'LIVE') url += '&paper=false';

    fetch(url)
      .then((r) => r.json())
      .then((data) => setTrades(data))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTrades();
  }, [filterSymbol, filterStatus, filterMode]);

  const handleExportCsv = () => {
    window.open('/api/trades/export', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-amber-400" />
            Trade History & Reconciliation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative log of contracts executed by DBOT. Distinguishes live Deriv contracts from simulated paper trades.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
        >
          <Download className="w-4 h-4 text-amber-400" />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filters:</span>
        </div>

        {/* Symbol filter */}
        <input
          type="text"
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          placeholder="Filter Market (e.g. Volatility 100)..."
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
        />

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Outcomes</option>
          <option value="WON">Won Only</option>
          <option value="LOST">Lost Only</option>
        </select>

        {/* Mode filter */}
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Execution Modes</option>
          <option value="LIVE">Live Contracts Only</option>
          <option value="PAPER">Paper Trades Only</option>
        </select>
      </div>

      {/* Trades Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-xs">Loading execution records...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">No matching trades recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Contract ID</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Contract Type</th>
                  <th className="py-2.5 px-3">Stake</th>
                  <th className="py-2.5 px-3">Payout</th>
                  <th className="py-2.5 px-3">Profit / Loss</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Entry Time</th>
                  <th className="py-2.5 px-3">Execution Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trades.map((t) => {
                  const won = t.status === 'WON';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        #{t.contractId ?? t.id.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-400">{formatSymbolName(t.symbol)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{t.contractType}</td>
                      <td className="py-2.5 px-3 text-slate-300">${t.stake.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-400">${t.payout.toFixed(2)}</td>
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
                        {new Date(t.entryTime).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.isPaperTrade
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {t.isPaperTrade ? 'Paper' : 'Live Deriv'}
                        </span>
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
