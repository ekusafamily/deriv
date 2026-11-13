import React, { useState } from 'react';
import { X, Play, Sliders, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { DERIV_SYMBOL_NAMES } from '@shared/types';

export interface QuickStrategyParams {
  strategy: 'martingale' | 'dalembert' | 'oscars_grind' | 'reverse_martingale' | 'reverse_dalembert' | '1_3_2_6';
  symbol: string;
  duration: number;
  durationUnit: 't' | 's' | 'm' | 'h' | 'd';
  stake: number;
  sizeOrMultiplier: number;
  profitThreshold: number;
  lossThreshold: number;
}

interface QuickStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStrategy: (params: QuickStrategyParams, xmlString: string) => Promise<void>;
}

const STRATEGY_DEFINITIONS: Array<{
  id: QuickStrategyParams['strategy'];
  title: string;
  badge: string;
  description: string;
  hasMultiplier: boolean;
  multiplierLabel: string;
  multiplierDefault: number;
}> = [
  {
    id: 'martingale',
    title: 'Martingale',
    badge: 'Popular',
    description: 'Double your stake after every loss to recover losses plus a profit equal to your initial stake upon winning.',
    hasMultiplier: true,
    multiplierLabel: 'Size / Multiplier',
    multiplierDefault: 2
  },
  {
    id: 'dalembert',
    title: "D'Alembert",
    badge: 'Conservative',
    description: 'Increase your stake by 1 unit after a loss, and decrease by 1 unit after a win for a balanced progression.',
    hasMultiplier: true,
    multiplierLabel: 'Unit increment',
    multiplierDefault: 1
  },
  {
    id: 'oscars_grind',
    title: "Oscar's Grind",
    badge: 'Steady',
    description: 'Increase your stake by 1 unit only after a winning trade that follows a loss, aiming for 1 unit profit per cycle.',
    hasMultiplier: true,
    multiplierLabel: 'Unit increment',
    multiplierDefault: 1
  },
  {
    id: 'reverse_martingale',
    title: 'Reverse Martingale',
    badge: 'Aggressive',
    description: 'Double your stake after each win to ride winning streaks, returning to base stake after any loss.',
    hasMultiplier: true,
    multiplierLabel: 'Size / Multiplier',
    multiplierDefault: 2
  },
  {
    id: 'reverse_dalembert',
    title: "Reverse D'Alembert",
    badge: 'Trend follower',
    description: 'Increase stake after a win and decrease after a loss to capitalize on consecutive positive runs.',
    hasMultiplier: true,
    multiplierLabel: 'Unit increment',
    multiplierDefault: 1
  },
  {
    id: '1_3_2_6',
    title: '1-3-2-6 System',
    badge: 'Cycle based',
    description: 'Progress through a fixed 1-3-2-6 sequence of units on consecutive wins, locking in profits while minimizing risk.',
    hasMultiplier: false,
    multiplierLabel: 'Unit multiplier',
    multiplierDefault: 1
  }
];

export const QuickStrategyModal: React.FC<QuickStrategyModalProps> = ({
  isOpen,
  onClose,
  onApplyStrategy
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<QuickStrategyParams['strategy']>('martingale');
  const [symbol, setSymbol] = useState('1HZ100V');
  const [duration, setDuration] = useState(5);
  const [durationUnit, setDurationUnit] = useState<QuickStrategyParams['durationUnit']>('t');
  const [stake, setStake] = useState(1);
  const [sizeOrMultiplier, setSizeOrMultiplier] = useState(2);
  const [profitThreshold, setProfitThreshold] = useState(10);
  const [lossThreshold, setLossThreshold] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const currentStratDef = STRATEGY_DEFINITIONS.find((s) => s.id === selectedStrategy)!;

  const handleSelectStrategy = (stratId: QuickStrategyParams['strategy']) => {
    setSelectedStrategy(stratId);
    const def = STRATEGY_DEFINITIONS.find((s) => s.id === stratId);
    if (def) {
      setSizeOrMultiplier(def.multiplierDefault);
    }
  };

  const handleApply = async () => {
    setIsLoading(true);
    try {
      // Fetch corresponding XML template
      const xmlResp = await fetch(`/src/xml/${selectedStrategy}.xml`);
      let rawXml = '';
      if (xmlResp.ok) {
        rawXml = await xmlResp.text();
      } else {
        // Fallback fetch via relative path or throw
        const altResp = await fetch(`/xml/${selectedStrategy}.xml`);
        if (altResp.ok) {
          rawXml = await altResp.text();
        } else {
          throw new Error(`Unable to load template for strategy: ${selectedStrategy}`);
        }
      }

      // Parse XML into DOM
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawXml, 'application/xml');

      // Update Symbol
      const symbolFields = xmlDoc.querySelectorAll('field[name="SYMBOL_LIST"]');
      symbolFields.forEach((f) => {
        f.textContent = symbol;
      });

      // Update Duration Unit
      const durationTypeFields = xmlDoc.querySelectorAll('field[name="DURATIONTYPE_LIST"]');
      durationTypeFields.forEach((f) => {
        f.textContent = durationUnit;
      });

      // Update Value Inputs by strategy_value attribute
      const updateValueByStrategy = (attr: string, numVal: number) => {
        const nodes = xmlDoc.querySelectorAll(`value[strategy_value="${attr}"]`);
        nodes.forEach((n) => {
          n.innerHTML = `<shadow type="math_number"><field name="NUM">${numVal}</field></shadow>`;
        });
      };

      updateValueByStrategy('duration', duration);
      updateValueByStrategy('stake', stake);
      updateValueByStrategy('profit', profitThreshold);
      updateValueByStrategy('loss', lossThreshold);
      updateValueByStrategy('size', sizeOrMultiplier);
      updateValueByStrategy('alembert_unit', sizeOrMultiplier);
      updateValueByStrategy('oscar_unit', sizeOrMultiplier);

      const serializer = new XMLSerializer();
      const customizedXml = serializer.serializeToString(xmlDoc);

      await onApplyStrategy(
        {
          strategy: selectedStrategy,
          symbol,
          duration,
          durationUnit,
          stake,
          sizeOrMultiplier,
          profitThreshold,
          lossThreshold
        },
        customizedXml
      );
      onClose();
    } catch (err: any) {
      alert(`Error building quick strategy: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#121c32]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Quick Strategy Builder
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                  Deriv Bot 2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose a proven progression strategy and configure parameters for instant workspace generation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Strategy Selector | Right Parameters */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Strategy List */}
          <div className="w-full md:w-[320px] border-r border-slate-800/80 bg-[#0c1322] p-4 overflow-y-auto space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Select Strategy
            </p>
            {STRATEGY_DEFINITIONS.map((strat) => {
              const isSelected = selectedStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => handleSelectStrategy(strat.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-red-950/30 border-red-500/60 text-white shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{strat.title}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {strat.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {strat.description}
                    </p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Right Column: Parameters Form */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#0e1628]">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">Selected: {currentStratDef.title}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Full XML block logic
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentStratDef.description}
              </p>
            </div>

            <div className="space-y-4">
              {/* Asset / Market Symbol */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Market Asset
                </label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                >
                  {Object.entries(DERIV_SYMBOL_NAMES).map(([sym, name]) => (
                    <option key={sym} value={sym}>
                      {name} ({sym})
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration & Duration Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 1)}
                    className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration Unit
                  </label>
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as any)}
                    className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="t">Ticks</option>
                    <option value="s">Seconds</option>
                    <option value="m">Minutes</option>
                    <option value="h">Hours</option>
                  </select>
                </div>
              </div>

              {/* Stake & Multiplier/Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Initial Stake (USD)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.35"
                    value={stake}
                    onChange={(e) => setStake(Number(e.target.value) || 0.35)}
                    className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {currentStratDef.multiplierLabel}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    disabled={!currentStratDef.hasMultiplier}
                    value={sizeOrMultiplier}
                    onChange={(e) => setSizeOrMultiplier(Number(e.target.value) || 1)}
                    className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Profit & Loss Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1.5">
                    Profit Threshold (Take Profit)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={profitThreshold}
                    onChange={(e) => setProfitThreshold(Number(e.target.value) || 1)}
                    className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-400 mb-1.5">
                    Loss Threshold (Stop Loss)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={lossThreshold}
                    onChange={(e) => setLossThreshold(Number(e.target.value) || 1)}
                    className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#121c32]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-900/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Building workspace...</span>
            ) : (
              <>
                <span>Load to Builder</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
