import { describe, it, expect } from 'vitest';
import { RiskManager } from '../shared/risk-rules';
import { StrategyAST } from '../shared/types';

describe('Independent Risk Management Engine', () => {
  const baseStrategy: StrategyAST = {
    id: 'test_bot',
    name: 'Risk Test Bot',
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
          rightOperand: { type: 'CONSTANT', value: 100 }
        }
      ],
      action: 'BUY'
    },
    risk_management: {
      initial_stake: 5.0,
      max_stake: 25.0,
      take_profit: 50.0,
      stop_loss: 40.0,
      max_consecutive_losses: 3,
      cooldown_seconds: 5,
      max_trades: 10
    },
    progression: {
      type: 'MARTINGALE',
      multiplier: 2.0,
      max_level: 3,
      reset_on_win: true
    }
  };

  it('allows trade when all risk limits are respected', () => {
    const res = RiskManager.evaluatePreTrade(baseStrategy, {
      initialStake: 5.0,
      currentStake: 5.0,
      totalProfit: 10.0,
      totalTrades: 2,
      consecutiveLosses: 0,
      progressionLevel: 1
    });

    expect(res.allowed).toBe(true);
    expect(res.nextStake).toBe(5.0);
  });

  it('halts trading when Take Profit target is achieved', () => {
    const res = RiskManager.evaluatePreTrade(baseStrategy, {
      initialStake: 5.0,
      currentStake: 5.0,
      totalProfit: 55.0, // >= 50.0 target
      totalTrades: 5,
      consecutiveLosses: 0,
      progressionLevel: 1
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Take Profit target reached');
  });

  it('halts trading when Stop Loss threshold is breached', () => {
    const res = RiskManager.evaluatePreTrade(baseStrategy, {
      initialStake: 5.0,
      currentStake: 5.0,
      totalProfit: -42.0, // <= -40.0 stop loss
      totalTrades: 4,
      consecutiveLosses: 2,
      progressionLevel: 2
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Stop Loss threshold triggered');
  });

  it('halts trading when consecutive losses exceed limit', () => {
    const res = RiskManager.evaluatePreTrade(baseStrategy, {
      initialStake: 5.0,
      currentStake: 20.0,
      totalProfit: -20.0,
      totalTrades: 3,
      consecutiveLosses: 3, // >= max_consecutive_losses (3)
      progressionLevel: 3
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Consecutive losses limit exceeded');
  });

  it('enforces cooldown period between trades', () => {
    const now = Date.now();
    const res = RiskManager.evaluatePreTrade(
      baseStrategy,
      {
        initialStake: 5.0,
        currentStake: 5.0,
        totalProfit: 5.0,
        totalTrades: 1,
        consecutiveLosses: 0,
        progressionLevel: 1,
        lastTradeOutcomeTime: now - 2000 // Only 2s elapsed, cooldown is 5s
      },
      now
    );

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('In cooldown period');
  });

  it('caps stake strictly at max_stake', () => {
    const res = RiskManager.evaluatePreTrade(baseStrategy, {
      initialStake: 5.0,
      currentStake: 35.0, // Exceeds max_stake 25.0
      totalProfit: 0,
      totalTrades: 1,
      consecutiveLosses: 0,
      progressionLevel: 1
    });

    // Min capped at max_stake
    expect(res.nextStake).toBe(25.0);
  });

  it('calculates Martingale progression correctly', () => {
    const ctx = {
      initialStake: 5.0,
      currentStake: 5.0,
      totalProfit: 0,
      totalTrades: 1,
      consecutiveLosses: 1,
      progressionLevel: 1
    };

    // After loss: 5.0 * 2 = 10.0
    const lossProg = RiskManager.calculateNextProgression(baseStrategy, ctx, false);
    expect(lossProg.nextStake).toBe(10.0);
    expect(lossProg.nextLevel).toBe(2);

    // After win: resets to initial stake 5.0
    const winProg = RiskManager.calculateNextProgression(baseStrategy, { ...ctx, currentStake: 10.0, progressionLevel: 2 }, true);
    expect(winProg.nextStake).toBe(5.0);
    expect(winProg.nextLevel).toBe(1);
  });
});
