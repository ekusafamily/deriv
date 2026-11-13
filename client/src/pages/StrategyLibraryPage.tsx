// DBOT Built-in Strategy Library
import React, { useState } from 'react';
import { STRATEGY_TEMPLATES, StrategyTemplate } from '../../../shared/strategy-templates';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Play,
  FlaskConical,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Cpu
} from 'lucide-react';

export const StrategyLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'TREND', 'REVERSAL', 'DIGITS', 'PROGRESSION'];

  const filtered = selectedCategory === 'ALL'
    ? STRATEGY_TEMPLATES
    : STRATEGY_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleOpenInBuilder = (template: StrategyTemplate) => {
    // Navigate to builder with template id in query
    navigate(`/builder?template=${template.id}`);
  };

  const handleQuickBacktest = (template: StrategyTemplate) => {
    navigate(`/backtest?template=${template.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-amber-950/20 border border-slate-800 p-6 rounded-2xl glass-panel">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-400" />
          Quantitative Strategy Library
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Pre-built, configurable algorithmic strategy templates designed for Deriv synthetic indices and forex markets. Inspect logic, customize parameters, or run instant simulations.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {tpl.category}
                </span>
                <span className="text-xs font-mono text-slate-400">{tpl.ast.market.contract_type}</span>
              </div>

              <h2 className="text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                {tpl.name}
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed">
                {tpl.description}
              </p>

              {/* Markets & Stake tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
                <span className="text-slate-400">Markets:</span>
                {tpl.recommendedMarkets.map((m) => (
                  <span key={m} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300">
                    {m}
                  </span>
                ))}
              </div>

              {/* Prominent Risk Warning */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="leading-snug">{tpl.riskWarning}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
              <button
                onClick={() => handleQuickBacktest(tpl)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                title="Backtest Strategy"
              >
                <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                Backtest
              </button>

              <button
                onClick={() => handleOpenInBuilder(tpl)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all hover:scale-105"
              >
                <Cpu className="w-3.5 h-3.5" />
                Open Builder
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
