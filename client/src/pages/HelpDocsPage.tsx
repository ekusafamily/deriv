// DBOT Comprehensive Help Centre & Documentation
import React, { useState } from 'react';
import {
  HelpCircle,
  Key,
  Cpu,
  Shield,
  FlaskConical,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface FaqItem {
  question: string;
  category: string;
  answer: string | React.ReactNode;
}

const faqs: FaqItem[] = [
  {
    category: 'Authentication',
    question: 'How do I connect my Deriv account to DBOT?',
    answer: (
      <div className="space-y-2">
        <p>You can connect using a Personal API Token:</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-300">
          <li>Log in to your Deriv dashboard.</li>
          <li>Navigate to <strong>Account Settings &gt; API Token</strong>.</li>
          <li>Create a new token with <strong>Read</strong> and <strong>Trade</strong> scopes checked.</li>
          <li>Copy the token and paste it in DBOT under <strong>Settings &gt; Connect Token</strong>.</li>
        </ol>
      </div>
    )
  },
  {
    category: 'Authentication',
    question: 'How does account permission scoping work?',
    answer:
      'DBOT only requests the minimal permissions required to stream market data, retrieve price proposals, and execute authorized bot orders. DBOT never asks for or stores your account password, and cannot process withdrawals.'
  },
  {
    category: 'Bot Builder',
    question: 'How do the visual Blockly blocks work?',
    answer:
      'DBOT translates connected visual blocks into a validated internal Abstract Syntax Tree (AST). The root "Market & Trade Configuration" block specifies the asset, contract type, and initial stake. The "Purchase Conditions" block defines the entry logic (e.g. Price > SMA), and the "Risk Management" block enforces progression and stop conditions.'
  },
  {
    category: 'Paper vs Live',
    question: 'What is the difference between Paper Trading and Live Trading?',
    answer:
      'Paper Trading replays real-time live market ticks from Deriv and calculates contract win/loss without debiting real account balances. Live Trading sends real proposal quotes and buy requests to Deriv servers.'
  },
  {
    category: 'Risk Management',
    question: 'How does the independent Risk Guard protect my balance?',
    answer:
      'The Risk Guard runs before EVERY proposal and buy request. If your cumulative session loss reaches the stop loss limit, if consecutive losses exceed the ceiling, or if the next calculated progression stake exceeds the maximum single stake, the bot is halted immediately (Fail-Closed).'
  },
  {
    category: 'Progression Systems',
    question: 'What are Martingale, D\'Alembert, and Oscar\'s Grind?',
    answer: (
      <div className="space-y-2">
        <p><strong>Martingale:</strong> Doubles stake after each loss. High risk; capped by DBOT at maximum progression levels.</p>
        <p><strong>D\'Alembert:</strong> Increases stake by 1 unit after a loss, and decreases by 1 unit after a win.</p>
        <p><strong>Oscar\'s Grind:</strong> Increases stake by 1 unit only following a win, aiming for exactly 1 unit of profit per cycle.</p>
      </div>
    )
  }
];

export const HelpDocsPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Authentication', 'Bot Builder', 'Paper vs Live', 'Risk Management', 'Progression Systems'];

  const filtered = selectedCategory === 'ALL'
    ? faqs
    : faqs.filter((f) => f.category === selectedCategory);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-amber-950/20">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-amber-400" />
          Documentation & Help Centre
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete architectural guide, block syntax reference, and risk protection manual for DBOT.
        </p>

        {/* Legal Disclaimer */}
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            INDEPENDENT THIRD-PARTY PLATFORM NOTICE
          </div>
          <p className="leading-relaxed">
            DBOT is an independent third-party trading application developed using the official Deriv API. DBOT is not affiliated with, endorsed by, or an official product of Deriv. Automated algorithmic trading involves substantial risk of capital loss. Past performance does not guarantee future results.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        {filtered.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between text-sm font-bold text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                <span>{item.question}</span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 bg-slate-950/30">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
