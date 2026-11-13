// DBOT Built-in Strategy Templates Library
// Fully documented, configurable templates with risk warnings

import { StrategyAST } from './types';

export interface StrategyTemplate {
  id: string;
  name: string;
  category: 'TREND' | 'REVERSAL' | 'DIGITS' | 'PROGRESSION' | 'CONSERVATIVE';
  description: string;
  riskWarning: string;
  recommendedMarkets: string[];
  supportedContracts: string[];
  ast: StrategyAST;
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'template_basic_rise_fall',
    name: 'Basic Rise / Fall Trend Bot',
    category: 'TREND',
    description: 'Enters a CALL (Rise) contract when the current tick price rises above the 10-period Simple Moving Average.',
    riskWarning: 'Trend strategies may experience consecutive losses during choppy or sideways consolidating markets.',
    recommendedMarkets: ['R_100', 'R_50', 'R_25', '1HZ100V'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_basic_rise_fall',
      name: 'Basic Rise / Fall Trend Bot',
      description: 'Buys CALL when Price > SMA(10)',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'PRICE' },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'INDICATOR', indicatorName: 'SMA', period: 10 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 1.0,
        max_stake: 20.0,
        take_profit: 25.0,
        stop_loss: 20.0,
        max_consecutive_losses: 4,
        cooldown_seconds: 3,
        max_trades: 30
      },
      progression: {
        type: 'FIXED',
        multiplier: 1.0,
        max_level: 1,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_sma_crossover',
    name: 'SMA Golden Crossover Bot',
    category: 'TREND',
    description: 'Fast SMA(7) crossing above Slow SMA(21) signals an upward momentum surge for Rise contracts.',
    riskWarning: 'Moving average crossovers lag real-time price action; false breakouts can trigger rapid drawdowns.',
    recommendedMarkets: ['R_100', 'R_75', 'frxEURUSD'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_sma_crossover',
      name: 'SMA Golden Crossover Bot',
      description: 'Buys CALL when Fast SMA(7) > Slow SMA(21)',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'INDICATOR', indicatorName: 'SMA', period: 7 },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'INDICATOR', indicatorName: 'SMA', period: 21 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 2.0,
        max_stake: 25.0,
        take_profit: 30.0,
        stop_loss: 25.0,
        max_consecutive_losses: 3,
        cooldown_seconds: 5,
        max_trades: 40
      },
      progression: {
        type: 'FIXED',
        multiplier: 1.0,
        max_level: 1,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_rsi_mean_reversion',
    name: 'RSI Mean Reversion Bot',
    category: 'REVERSAL',
    description: 'Identifies oversold market conditions when RSI(14) drops below 30, anticipating a bullish rebound.',
    riskWarning: 'Strong trends can keep RSI oversold or overbought for sustained periods without reversing.',
    recommendedMarkets: ['R_50', 'R_100', '1HZ50V'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_rsi_mean_reversion',
      name: 'RSI Mean Reversion Bot',
      description: 'Buys CALL when RSI(14) < 30',
      market: {
        symbol: 'R_50',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'INDICATOR', indicatorName: 'RSI', period: 14 },
            operator: 'LESS_THAN',
            rightOperand: { type: 'CONSTANT', value: 30 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 1.5,
        max_stake: 30.0,
        take_profit: 20.0,
        stop_loss: 20.0,
        max_consecutive_losses: 4,
        cooldown_seconds: 4,
        max_trades: 35
      },
      progression: {
        type: 'FIXED',
        multiplier: 1.0,
        max_level: 1,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_macd_momentum',
    name: 'MACD Momentum Breakout',
    category: 'TREND',
    description: 'Executes trades when MACD line crosses above zero and shows accelerating bullish divergence.',
    riskWarning: 'Divergence and momentum indicators can produce whipsaws in low-volatility sessions.',
    recommendedMarkets: ['R_100', '1HZ100V', 'R_75'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_macd_momentum',
      name: 'MACD Momentum Breakout',
      description: 'Buys CALL when MACD is bullish',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'INDICATOR', indicatorName: 'MACD' },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'CONSTANT', value: 0 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 2.0,
        max_stake: 30.0,
        take_profit: 40.0,
        stop_loss: 30.0,
        max_consecutive_losses: 3,
        cooldown_seconds: 5,
        max_trades: 50
      },
      progression: {
        type: 'FIXED',
        multiplier: 1.0,
        max_level: 1,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_digit_differs',
    name: 'Digit Differs High-Probability Bot',
    category: 'DIGITS',
    description: 'High win-rate strategy predicting that the last digit will differ from the designated digit.',
    riskWarning: 'Payout is low (~9-10%), meaning a single loss requires ~10-11 consecutive wins to recover without progression.',
    recommendedMarkets: ['R_100', 'R_50', 'R_10'],
    supportedContracts: ['DIGITDIFF'],
    ast: {
      id: 'template_digit_differs',
      name: 'Digit Differs High-Probability Bot',
      description: 'Buys DIGITDIFF when last digit is not 5',
      market: {
        symbol: 'R_100',
        contract_type: 'DIGITDIFF',
        duration: 1,
        duration_unit: 't',
        currency: 'USD',
        prediction: 5
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'LAST_DIGIT' },
            operator: 'NOT_EQUALS',
            rightOperand: { type: 'CONSTANT', value: 5 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 5.0,
        max_stake: 25.0,
        take_profit: 15.0,
        stop_loss: 15.0,
        max_consecutive_losses: 2,
        cooldown_seconds: 2,
        max_trades: 25
      },
      progression: {
        type: 'FIXED',
        multiplier: 1.0,
        max_level: 1,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_martingale_progression',
    name: 'Martingale Progression Bot (Strict Guard)',
    category: 'PROGRESSION',
    description: 'Doubles stake following a loss to recover the deficit plus a base unit on the subsequent win. HARD-CAPPED at Level 4.',
    riskWarning: 'CRITICAL WARNING: Martingale progression carries exponential risk of account drawdown. Never run without strict maximum stake and loss limits.',
    recommendedMarkets: ['R_100', 'R_50'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_martingale_progression',
      name: 'Martingale Progression Bot',
      description: 'CALL with 2.0x Martingale after loss, capped at 4 steps',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'PRICE' },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'INDICATOR', indicatorName: 'SMA', period: 5 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 1.0,
        max_stake: 16.0,
        take_profit: 20.0,
        stop_loss: 30.0,
        max_consecutive_losses: 4,
        cooldown_seconds: 5,
        max_trades: 30
      },
      progression: {
        type: 'MARTINGALE',
        multiplier: 2.0,
        max_level: 4,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_dalembert_progression',
    name: "D'Alembert Conservative Progression Bot",
    category: 'PROGRESSION',
    description: 'Increases stake by 1 unit after a loss and decreases by 1 unit after a win. Lower variance than Martingale.',
    riskWarning: "Progression stakes can accumulate during prolonged losing streaks. Strict loss limits must remain active.",
    recommendedMarkets: ['R_100', 'R_75'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_dalembert_progression',
      name: "D'Alembert Progression Bot",
      description: "Linear progression (+1 unit on loss, reset on target)",
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'PRICE' },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'INDICATOR', indicatorName: 'EMA', period: 10 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 2.0,
        max_stake: 12.0,
        take_profit: 25.0,
        stop_loss: 25.0,
        max_consecutive_losses: 5,
        cooldown_seconds: 3,
        max_trades: 40
      },
      progression: {
        type: 'DALEMBERT',
        multiplier: 1.0,
        max_level: 5,
        reset_on_win: true
      }
    }
  },
  {
    id: 'template_oscars_grind',
    name: "Oscar's Grind Cycle Bot",
    category: 'PROGRESSION',
    description: 'Aims to gain exactly 1 unit of profit per cycle. Stake increases by 1 unit only following a win.',
    riskWarning: 'Can take multiple trades to complete a single profit cycle during choppy market runs.',
    recommendedMarkets: ['R_100', 'R_25'],
    supportedContracts: ['CALL', 'PUT'],
    ast: {
      id: 'template_oscars_grind',
      name: "Oscar's Grind Cycle Bot",
      description: 'Cycle target progression with capital preservation focus',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't',
        currency: 'USD'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'PRICE' },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'INDICATOR', indicatorName: 'SMA', period: 8 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 2.0,
        max_stake: 10.0,
        take_profit: 15.0,
        stop_loss: 20.0,
        max_consecutive_losses: 4,
        cooldown_seconds: 4,
        max_trades: 35
      },
      progression: {
        type: 'OSCARS_GRIND',
        multiplier: 1.0,
        max_level: 4,
        reset_on_win: true
      }
    }
  }
];
