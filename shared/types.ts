// DBOT - Core Type Definitions
// Compliant with official Deriv API v3 protocols

export type DerivContractType =
  | 'CALL'
  | 'PUT'
  | 'HIGHER'
  | 'LOWER'
  | 'ONETOUCH'
  | 'NOTOUCH'
  | 'DIGITMATCH'
  | 'DIGITDIFF'
  | 'DIGITOVER'
  | 'DIGITUNDER'
  | 'DIGITEVEN'
  | 'DIGITODD';

export type DurationUnit = 't' | 's' | 'm' | 'h' | 'd';

export interface ActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  is_trading_suspended: number;
  pip: number;
  spot?: number;
}

export interface TickData {
  symbol: string;
  quote: number;
  epoch: number;
  pip_size?: number;
}

export interface CandleData {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DerivProposalRequest {
  proposal: 1;
  amount: number;
  basis: 'stake' | 'payout';
  contract_type: DerivContractType;
  currency: string;
  duration: number;
  duration_unit: DurationUnit;
  symbol: string;
  barrier?: string;
  barrier2?: string;
  selected_tick?: number;
}

export interface DerivProposalResponse {
  id: string;
  ask_price: number;
  payout: number;
  spot: number;
  spot_time: number;
  longcode: string;
  display_value: string;
}

export interface DerivBuyResponse {
  buy: {
    contract_id: number;
    purchase_time: number;
    shortcode: string;
    start_time: number;
    buy_price: number;
    balance_after: number;
  };
}

export interface OpenContractStatus {
  contract_id: number;
  symbol: string;
  contract_type: string;
  buy_price: number;
  payout: number;
  profit: number;
  status: 'open' | 'won' | 'lost';
  is_expired: number;
  is_sold: number;
  entry_spot?: number;
  exit_spot?: number;
  current_spot?: number;
  barrier?: string;
  date_start?: number;
  date_expiry?: number;
}

// Strategy AST Structure
export type ConditionOperator =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EQUALS'
  | 'GREATER_EQUAL'
  | 'LESS_EQUAL'
  | 'NOT_EQUALS'
  | 'CROSSES_ABOVE'
  | 'CROSSES_BELOW';

export type LogicalGate = 'AND' | 'OR';

export interface StrategyCondition {
  id: string;
  leftOperand: {
    type: 'INDICATOR' | 'PRICE' | 'LAST_DIGIT' | 'CONSTANT';
    indicatorName?: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BOLLINGER_UPPER' | 'BOLLINGER_LOWER';
    period?: number;
    value?: number;
  };
  operator: ConditionOperator;
  rightOperand: {
    type: 'INDICATOR' | 'PRICE' | 'LAST_DIGIT' | 'CONSTANT';
    indicatorName?: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BOLLINGER_UPPER' | 'BOLLINGER_LOWER';
    period?: number;
    value?: number;
  };
}

export interface StrategyAST {
  id: string;
  name: string;
  description?: string;
  market: {
    symbol: string;
    contract_type: DerivContractType;
    duration: number;
    duration_unit: DurationUnit;
    currency: string;
    barrier?: string;
    prediction?: number;
  };
  entry_conditions: {
    gate: LogicalGate;
    conditions: StrategyCondition[];
    action: 'BUY';
  };
  risk_management: {
    initial_stake: number;
    max_stake: number;
    take_profit: number;
    stop_loss: number;
    max_consecutive_losses: number;
    cooldown_seconds: number;
    max_trades: number;
  };
  progression: {
    type: 'FIXED' | 'MARTINGALE' | 'DALEMBERT' | 'OSCARS_GRIND';
    multiplier: number;
    max_level: number;
    reset_on_win: boolean;
  };
}

export type BotExecutionState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'SUBSCRIBING_MARKET'
  | 'ANALYZING'
  | 'REQUESTING_PROPOSAL'
  | 'PURCHASING'
  | 'MONITORING_CONTRACT'
  | 'COOLDOWN'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR';

export interface BotStateSnapshot {
  botId: string;
  name: string;
  status: BotExecutionState;
  symbol: string;
  currentStake: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  consecutiveLosses: number;
  totalProfit: number;
  progressionLevel: number;
  lastTickPrice?: number;
  activeContract?: OpenContractStatus | null;
  lastError?: string | null;
  isPaperTrading: boolean;
  isRealMoney: boolean;
  accountCurrency: string;
  logs: { timestamp: number; level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; message: string }[];
}

export interface AccountSession {
  token: string;
  accountId: string;
  currency: string;
  isVirtual: boolean;
  balance: number;
}

// ==========================================
// DERIV MARKET SYMBOLS DISPLAY NAMES MAPPING
// ==========================================
export const DERIV_SYMBOL_NAMES: Record<string, string> = {
  // Continuous Volatility (1s) Indices
  '1HZ10V': 'Volatility 10 (1s) Index',
  '1HZ15V': 'Volatility 15 (1s) Index',
  '1HZ25V': 'Volatility 25 (1s) Index',
  '1HZ30V': 'Volatility 30 (1s) Index',
  '1HZ50V': 'Volatility 50 (1s) Index',
  '1HZ75V': 'Volatility 75 (1s) Index',
  '1HZ90V': 'Volatility 90 (1s) Index',
  '1HZ100V': 'Volatility 100 (1s) Index',
  '1HZ150V': 'Volatility 150 (1s) Index',
  '1HZ200V': 'Volatility 200 (1s) Index',
  '1HZ250V': 'Volatility 250 (1s) Index',
  '1HZ300V': 'Volatility 300 (1s) Index',

  // Continuous Volatility Indices
  'R_10': 'Volatility 10 Index',
  'R_25': 'Volatility 25 Index',
  'R_50': 'Volatility 50 Index',
  'R_75': 'Volatility 75 Index',
  'R_100': 'Volatility 100 Index',
  'R_100V': 'Volatility 100 Index',

  // Crash / Boom
  'BOOM300': 'Boom 300 Index',
  'BOOM500': 'Boom 500 Index',
  'BOOM1000': 'Boom 1000 Index',
  'BOOM_300': 'Boom 300 Index',
  'BOOM_500': 'Boom 500 Index',
  'BOOM_1000': 'Boom 1000 Index',
  'CRASH300': 'Crash 300 Index',
  'CRASH500': 'Crash 500 Index',
  'CRASH1000': 'Crash 1000 Index',
  'CRASH_300': 'Crash 300 Index',
  'CRASH_500': 'Crash 500 Index',
  'CRASH_1000': 'Crash 1000 Index',

  // Jump Indices
  'JD10': 'Jump 10 Index',
  'JD25': 'Jump 25 Index',
  'JD50': 'Jump 50 Index',
  'JD75': 'Jump 75 Index',
  'JD100': 'Jump 100 Index',
  'JUMP_10': 'Jump 10 Index',
  'JUMP_25': 'Jump 25 Index',
  'JUMP_50': 'Jump 50 Index',
  'JUMP_75': 'Jump 75 Index',
  'JUMP_100': 'Jump 100 Index',

  // Step Indices
  'stpRNG': 'Step Index',
  'STEP_INDEX': 'Step Index',
  'STEP_200': 'Step 200 Index',
  'STEP_500': 'Step 500 Index',

  // Daily Reset & Bull/Bear
  'RDBEAR': 'Bear Market Index',
  'RDBULL': 'Bull Market Index',

  // Forex Majors & Crosses
  'frxEURUSD': 'EUR/USD',
  'frxGBPUSD': 'GBP/USD',
  'frxUSDJPY': 'USD/JPY',
  'frxAUDUSD': 'AUD/USD',
  'frxUSDCAD': 'USD/CAD',
  'frxUSDCHF': 'USD/CHF',
  'frxEURGBP': 'EUR/GBP',
  'frxEURJPY': 'EUR/JPY',
  'frxGBPJPY': 'GBP/JPY',

  // Cryptocurrencies
  'cryBTCUSD': 'BTC/USD',
  'cryETHUSD': 'ETH/USD',
  'cryLTCUSD': 'LTC/USD',

  // Commodities
  'frxXAUUSD': 'Gold/USD',
  'frxXAGUSD': 'Silver/USD'
};

export const formatSymbolName = (symbol: string | undefined | null): string => {
  if (!symbol) return '';
  const trimmed = symbol.trim();
  if (DERIV_SYMBOL_NAMES[trimmed]) {
    return DERIV_SYMBOL_NAMES[trimmed];
  }
  // Dynamic pattern matching:
  // 1HZ100V -> Volatility 100 (1s) Index
  const hzMatch = trimmed.match(/^1HZ(\d+)V$/i);
  if (hzMatch) {
    return `Volatility ${hzMatch[1]} (1s) Index`;
  }
  // R_100 -> Volatility 100 Index
  const rMatch = trimmed.match(/^R_(\d+)$/i);
  if (rMatch) {
    return `Volatility ${rMatch[1]} Index`;
  }
  // frxEURUSD -> EUR/USD
  const frxMatch = trimmed.match(/^frx([A-Za-z]{3})([A-Za-z]{3})$/i);
  if (frxMatch) {
    return `${frxMatch[1].toUpperCase()}/${frxMatch[2].toUpperCase()}`;
  }
  // cryBTCUSD -> BTC/USD
  const cryMatch = trimmed.match(/^cry([A-Za-z]{3})([A-Za-z]{3})$/i);
  if (cryMatch) {
    return `${cryMatch[1].toUpperCase()}/${cryMatch[2].toUpperCase()}`;
  }
  return trimmed;
};
