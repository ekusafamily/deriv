// DDBOt Native Toolbox Sidebar Component (ported directly from DDBOt / Deriv native architecture)
import React, { useState } from 'react';
import {
  ChevronDown,
  Search,
  X,
  Sparkles,
  Zap,
  Sliders,
  ShoppingCart,
  DollarSign,
  RotateCcw,
  Activity,
  Calculator,
  Type,
  GitBranch,
  Bell,
  Wrench
} from 'lucide-react';

interface ToolboxProps {
  onInsertBlock: (blockType: string) => void;
  onOpenQuickStrategy: () => void;
  onOpenAiGenerator: () => void;
}

interface BlockItem {
  type: string;
  label: string;
  description: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
  blocks: BlockItem[];
}

export const Toolbox: React.FC<ToolboxProps> = ({
  onInsertBlock,
  onOpenQuickStrategy,
  onOpenAiGenerator
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    trade_parameters: true,
    purchase_conditions: true,
    sell_conditions: false,
    restart_conditions: false,
    analysis: true,
    math: false,
    text: false,
    logic: false,
    utility: false,
    bulk_tools: true
  });

  const categories: CategoryGroup[] = [
    {
      id: 'trade_parameters',
      name: 'Trade parameters',
      color: '#0f3b5f',
      icon: <Sliders className="w-3.5 h-3.5 text-blue-400" />,
      blocks: [
        { type: 'trade_definition', label: '1. Trade Parameters Root', description: 'Sets symbol, trade type and stake initialization' },
        { type: 'trade_definition_market', label: 'Market & Asset', description: 'Asset, market and submarket selector' },
        { type: 'trade_definition_tradetype', label: 'Trade Type', description: 'Rise/Fall, Digits, Accumulators' },
        { type: 'trade_definition_contracttype', label: 'Contract Type', description: 'Call, Put, Even, Odd, Differs' },
        { type: 'trade_definition_tradeoptions', label: 'Trade Options', description: 'Duration, stake amount and prediction' },
        { type: 'trade_definition_multiplier', label: 'Multiplier Parameters', description: 'Defines multiplier leverage ratio' },
        { type: 'trade_definition_accumulator', label: 'Accumulator Growth', description: 'Configures accumulator tick growth rate' },
        { type: 'accumulator_take_profit', label: 'Accumulator Take Profit', description: 'Sets target profit threshold' }
      ]
    },
    {
      id: 'purchase_conditions',
      name: 'Purchase conditions',
      color: '#00a86b',
      icon: <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />,
      blocks: [
        { type: 'before_purchase', label: '2. Purchase Conditions Root', description: 'Trigger criteria required before contract purchase' },
        { type: 'purchase', label: 'Purchase Contract', description: 'Executes purchase of chosen contract' },
        { type: 'apollo_purchase', label: 'Apollo Purchase', description: 'Vendor alias for purchase trigger' },
        { type: 'ask_price', label: 'Ask Price', description: 'Current proposal ask quote' },
        { type: 'payout', label: 'Payout Quote', description: 'Expected payout on win' }
      ]
    },
    {
      id: 'sell_conditions',
      name: 'Sell conditions (optional)',
      color: '#e53935',
      icon: <DollarSign className="w-3.5 h-3.5 text-rose-400" />,
      blocks: [
        { type: 'during_purchase', label: '3. Sell Conditions Root', description: 'Monitors open contract to exit early' },
        { type: 'check_sell', label: 'Sell is Available', description: 'Checks if early buyout is permitted' },
        { type: 'sell_at_market', label: 'Sell at Market', description: 'Immediately closes open contract' },
        { type: 'sell_price', label: 'Current Sell Price', description: 'Current market buyout price' }
      ]
    },
    {
      id: 'restart_conditions',
      name: 'Restart trading conditions',
      color: '#00796b',
      icon: <RotateCcw className="w-3.5 h-3.5 text-teal-400" />,
      blocks: [
        { type: 'after_purchase', label: '4. Restart Conditions Root', description: 'Evaluates win/loss and decides next cycle' },
        { type: 'trade_again', label: 'Trade Again', description: 'Instructs bot to loop and buy next contract' },
        { type: 'contract_check_result', label: 'Contract Result is Win/Loss', description: 'Checks outcome of prior contract' },
        { type: 'read_details', label: 'Contract Detail', description: 'Profit/Loss, Payout, Entry spot' }
      ]
    },
    {
      id: 'analysis',
      name: 'Analysis',
      color: '#00838f',
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
      blocks: [
        { type: 'tick_analysis', label: 'Tick Analysis Root', description: 'Runs script synchronously on every incoming tick' },
        { type: 'tick', label: 'Last Tick Price', description: 'Most recent price tick' },
        { type: 'ticks', label: 'Tick List', description: 'Array of recent market prices' },
        { type: 'last_digit', label: 'Last Digit', description: 'Last digit of latest tick' },
        { type: 'lastDigitList', label: 'Last Digit List', description: 'Array of recent digits' },
        { type: 'ohlc', label: 'Candles (OHLC) List', description: 'Array of candle bars' },
        { type: 'get_ohlc', label: 'Get Candle from End', description: 'Candle object at offset' },
        { type: 'stat', label: 'Analysis Stat', description: 'Stat metrics calculation' }
      ]
    },
    {
      id: 'math',
      name: 'Math',
      color: '#42a5f5',
      icon: <Calculator className="w-3.5 h-3.5 text-sky-400" />,
      blocks: [
        { type: 'math_number', label: 'Number', description: 'Static numeric value' },
        { type: 'math_number_positive', label: 'Positive Number', description: 'Positive numeric value' },
        { type: 'math_arithmetic', label: 'Arithmetic (+, -, ×, ÷)', description: 'Math calculations' },
        { type: 'math_single', label: 'Math Function (sqrt, abs, ln)', description: 'Advanced operations' },
        { type: 'math_change', label: 'Change Variable', description: 'Increments or decrements variable' },
        { type: 'math_round', label: 'Round Number', description: 'Rounds number up, down, or nearest' },
        { type: 'math_random_int', label: 'Random Integer', description: 'Generates random number in range' }
      ]
    },
    {
      id: 'text',
      name: 'Text',
      color: '#f57c00',
      icon: <Type className="w-3.5 h-3.5 text-amber-400" />,
      blocks: [
        { type: 'text', label: 'Text String', description: 'Plain text constant' },
        { type: 'text_join', label: 'Text Join', description: 'Concatenates multiple strings' },
        { type: 'text_statement', label: 'Text Statement Item', description: 'Item container for text_join' },
        { type: 'text_append', label: 'Append Text to Variable', description: 'Appends text to variable' },
        { type: 'text_print', label: 'Print / Log Text', description: 'Outputs text message' }
      ]
    },
    {
      id: 'logic',
      name: 'Logic',
      color: '#5c6bc0',
      icon: <GitBranch className="w-3.5 h-3.5 text-indigo-400" />,
      blocks: [
        { type: 'controls_if', label: 'If / Else Condition', description: 'Executes branch based on condition' },
        { type: 'logic_compare', label: 'Compare (=, ≠, <, >)', description: 'Equality or relational test' },
        { type: 'logic_operation', label: 'Boolean Operation (AND / OR)', description: 'Logical conjunction or disjunction' },
        { type: 'logic_negate', label: 'Negation (NOT)', description: 'Inverts boolean expression' },
        { type: 'logic_boolean', label: 'Boolean (TRUE / FALSE)', description: 'Boolean literal value' },
        { type: 'check_direction', label: 'Direction is Rising/Falling', description: 'Trend direction test' }
      ]
    },
    {
      id: 'utility',
      name: 'Utility & Notifications',
      color: '#e65100',
      icon: <Bell className="w-3.5 h-3.5 text-orange-400" />,
      blocks: [
        { type: 'notify', label: 'Notify (Deriv Bot Toast)', description: 'Emits toast message with audio sound' },
        { type: 'btnotify', label: 'BinaryTool Notify', description: 'Vendor toast notification with sound' },
        { type: 'notify_telegram', label: 'Telegram Alert', description: 'Dispatches alert to Telegram Bot' },
        { type: 'timeout', label: 'Timeout Delay', description: 'Pauses execution for specified seconds' },
        { type: 'balance', label: 'Account Balance', description: 'Current live account balance' },
        { type: 'total_profit', label: 'Total Profit', description: 'Session net profit or loss' },
        { type: 'total_runs', label: 'Total Runs', description: 'Count of trades placed' },
        { type: 'lists_statement', label: 'List Item Statement', description: 'Item container for list structures' }
      ]
    },
    {
      id: 'bulk_tools',
      name: 'BULK TRADERS Tools',
      color: '#8e24aa',
      icon: <Wrench className="w-3.5 h-3.5 text-purple-400" />,
      blocks: [
        { type: 'sma_statement', label: 'Simple Moving Average (SMA)', description: 'SMA price indicator value' },
        { type: 'ema_statement', label: 'Exponential Moving Average (EMA)', description: 'EMA price indicator value' },
        { type: 'rsi_statement', label: 'Relative Strength Index (RSI)', description: 'RSI momentum oscillator' },
        { type: 'macda_statement', label: 'MACD Indicator', description: 'Moving Average Convergence Divergence' },
        { type: 'bb_statement', label: 'Bollinger Bands', description: 'Upper, middle or lower band price' },
        { type: 'set_tp', label: 'Target Profit Stop', description: 'Safeguard exit on profit target' },
        { type: 'set_sl', label: 'Stop Loss Exit', description: 'Safeguard exit on max drawdown' }
      ]
    }
  ];

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter blocks by search query
  const filteredCategories = categories
    .map((cat) => {
      if (!searchQuery.trim()) return cat;
      const q = searchQuery.toLowerCase();
      const matchingBlocks = cat.blocks.filter(
        (b) =>
          b.label.toLowerCase().includes(q) ||
          b.type.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      );
      return matchingBlocks.length > 0 ? { ...cat, blocks: matchingBlocks } : null;
    })
    .filter(Boolean) as CategoryGroup[];

  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-800/80 bg-[#0c1222] flex flex-col h-full z-20 select-none">
      {/* Quick Strategy Button & AI Generator Button (Matching DDBOt ToolbarButton) */}
      <div className="p-2.5 border-b border-slate-800/80 space-y-1.5">
        <button
          onClick={onOpenQuickStrategy}
          data-testid="db-toolbar__get-started-button"
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs tracking-wide shadow-md shadow-amber-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
          title="Open Deriv Quick Strategy (Martingale, D'Alembert, Oscar's Grind, 1-3-2-6)"
        >
          <Zap className="w-3.5 h-3.5 fill-slate-950" />
          <span>Quick Strategy</span>
        </button>

        <button
          onClick={onOpenAiGenerator}
          className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-95"
        >
          <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
          <span>AI Bot Generator</span>
        </button>
      </div>

      {/* Blocks Menu Collapsible Header */}
      <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between bg-[#0a0f1d]">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-300 hover:text-white"
        >
          <span>Blocks menu</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isOpen ? '' : '-rotate-90'
            }`}
          />
        </div>
        <span className="text-[10px] text-slate-500 font-mono">DDBOt v2.0</span>
      </div>

      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Box (SearchBox.tsx matching DDBOt) */}
          <div className="p-2.5 border-b border-slate-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blocks..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Accordion */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No blocks match "{searchQuery}"
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isCatExpanded = searchQuery.trim() ? true : expandedCategories[cat.id];
                return (
                  <div key={cat.id} className="rounded-lg overflow-hidden border border-slate-800/40 bg-slate-900/30">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-200 hover:bg-slate-800/50 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {cat.icon}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 transition-transform ${
                          isCatExpanded ? '' : '-rotate-90'
                        }`}
                      />
                    </button>

                    {isCatExpanded && (
                      <div className="px-1.5 pb-1.5 pt-0.5 space-y-1 border-t border-slate-800/40">
                        {cat.blocks.map((b) => (
                          <button
                            key={b.type}
                            onClick={() => onInsertBlock(b.type)}
                            title={b.description}
                            className="w-full text-left py-1 px-2 rounded-md hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white flex items-center justify-between group transition-colors"
                          >
                            <span className="truncate">{b.label}</span>
                            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 font-mono">
                              +
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
