// DBOT Market Watch & Asset Catalog
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { MarketChart } from '../components/charts/MarketChart';
import { ActiveSymbol } from '../../../shared/types';
import {
  Search,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  Filter,
  Check
} from 'lucide-react';

export const MarketWatchPage: React.FC = () => {
  const {
    symbols,
    setSymbols,
    selectedSymbol,
    setSelectedSymbol,
    latestTicks
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/symbols')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSymbols(data);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter symbols
  const filteredSymbols = symbols.filter((sym) => {
    const matchesQuery =
      sym.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sym.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedMarket === 'all') return matchesQuery;
    return matchesQuery && sym.market === selectedMarket;
  });

  // Extract unique market categories
  const categories = ['all', ...Array.from(new Set(symbols.map((s) => s.market)))];

  const currentTick = latestTicks[selectedSymbol];
  const activeSymbolObj = symbols.find((s) => s.symbol === selectedSymbol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            Market Watch & Asset Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse real-time streaming assets from Deriv across Synthetic Indices, Major Forex, Crypto, and Commodities.
          </p>
        </div>

        {/* Selected Asset Spotlight */}
        {activeSymbolObj && (
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-700/80 px-4 py-2 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Selection</span>
              <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span>{activeSymbolObj.display_name}</span>
                <span className="text-xs text-amber-400 font-medium">({activeSymbolObj.market_display_name})</span>
              </div>
            </div>
            {currentTick && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Live Quote</span>
                <div className="text-sm font-black font-mono text-emerald-400">
                  ${currentTick.quote.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Chart on Top/Left, Asset Catalog on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Candlestick Chart */}
        <div className="lg:col-span-2 space-y-4">
          <MarketChart symbol={selectedSymbol} height={460} showIndicators={true} />
        </div>

        {/* Right 1 Col: Asset Search & Selection Directory */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col h-[520px]">
          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbols (e.g. Volatility, EUR, BTC)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedMarket(cat)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize shrink-0 transition-colors ${
                  selectedMarket === cat
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Markets' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Symbol List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {isLoading ? (
              <div className="text-center py-10 text-xs text-slate-500">Loading active symbols...</div>
            ) : filteredSymbols.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">No matching assets found.</div>
            ) : (
              filteredSymbols.map((sym) => {
                const isSelected = sym.symbol === selectedSymbol;
                const tick = latestTicks[sym.symbol];

                return (
                  <div
                    key={sym.symbol}
                    onClick={() => setSelectedSymbol(sym.symbol)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{sym.display_name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {sym.market_display_name}
                      </div>
                    </div>

                    <div className="text-right">
                      {tick ? (
                        <span className="text-xs font-mono font-bold text-slate-100">
                          ${tick.quote.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-mono">--</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
