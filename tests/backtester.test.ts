import { describe, it, expect } from 'vitest';
import { HistoricalBacktester } from '../server/src/engine/backtester';
import { StrategyAST, CandleData } from '../shared/types';

describe('Historical Backtester Engine', () => {
  const dummyStrategy: StrategyAST = {
    id: 'backtest_bot',
    name: 'Backtest Bot',
    market: {
      symbol: 'R_100',
      contract_type: 'CALL',
      duration: 3,
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
      initial_stake: 10,
      max_stake: 50,
      take_profit: 200,
      stop_loss: 100,
      max_consecutive_losses: 4,
      cooldown_seconds: 0,
      max_trades: 20
    },
    progression: {
      type: 'FIXED',
      multiplier: 1,
      max_level: 1,
      reset_on_win: true
    }
  };

  it('runs backtest simulation chronologically and generates full report', () => {
    // Generate 100 simulated candles with an upward trend
    const candles: CandleData[] = Array.from({ length: 100 }, (_, i) => ({
      epoch: 1700000000 + i * 60,
      open: 100 + i * 0.5,
      high: 101 + i * 0.5,
      low: 99.5 + i * 0.5,
      close: 100.8 + i * 0.5
    }));

    const report = HistoricalBacktester.run({
      strategy: dummyStrategy,
      candles,
      initialBalance: 1000
    });

    expect(report).toBeDefined();
    expect(report.totalTrades).toBeGreaterThan(0);
    expect(report.equityCurve.length).toBeGreaterThan(0);
    expect(report.finalBalance).toBeDefined();
    expect(report.winRate).toBeGreaterThanOrEqual(0);
    expect(report.winRate).toBeLessThanOrEqual(100);
    expect(report.maxDrawdown).toBeGreaterThanOrEqual(0);
  });
});
