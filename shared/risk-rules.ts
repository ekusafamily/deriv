// DBOT Independent Risk Management Engine
// Pure functional safeguards evaluated before every proposal and buy request

import { StrategyAST } from './types';

export interface RiskEvaluationContext {
  initialStake: number;
  currentStake: number;
  totalProfit: number;
  totalTrades: number;
  consecutiveLosses: number;
  progressionLevel: number;
  lastTradeOutcomeTime?: number;
  currentBalance?: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  nextStake: number;
  progressionLevel: number;
}

export class RiskManager {
  /**
   * Evaluate whether a bot is permitted to initiate a new trade.
   * STRICT FAIL-CLOSED: Any violated rule halts trading immediately.
   */
  static evaluatePreTrade(
    strategy: StrategyAST,
    ctx: RiskEvaluationContext,
    currentTime: number = Date.now()
  ): RiskCheckResult {
    const risk = strategy.risk_management;
    const progression = strategy.progression;

    // 1. Max trades cap
    if (ctx.totalTrades >= risk.max_trades) {
      return {
        allowed: false,
        reason: `Maximum trades limit reached (${ctx.totalTrades}/${risk.max_trades})`,
        nextStake: ctx.currentStake,
        progressionLevel: ctx.progressionLevel
      };
    }

    // 2. Take Profit reached
    if (ctx.totalProfit >= risk.take_profit) {
      return {
        allowed: false,
        reason: `Take Profit target reached (Profit: $${ctx.totalProfit.toFixed(2)} >= Target: $${risk.take_profit.toFixed(2)})`,
        nextStake: ctx.currentStake,
        progressionLevel: ctx.progressionLevel
      };
    }

    // 3. Stop Loss reached
    if (ctx.totalProfit <= -risk.stop_loss) {
      return {
        allowed: false,
        reason: `Stop Loss threshold triggered (Loss: $${Math.abs(ctx.totalProfit).toFixed(2)} >= Limit: $${risk.stop_loss.toFixed(2)})`,
        nextStake: ctx.currentStake,
        progressionLevel: ctx.progressionLevel
      };
    }

    // 4. Maximum Consecutive Losses
    if (ctx.consecutiveLosses >= risk.max_consecutive_losses) {
      return {
        allowed: false,
        reason: `Consecutive losses limit exceeded (${ctx.consecutiveLosses} >= ${risk.max_consecutive_losses})`,
        nextStake: ctx.currentStake,
        progressionLevel: ctx.progressionLevel
      };
    }

    // 5. Cooldown period check
    if (ctx.lastTradeOutcomeTime && risk.cooldown_seconds > 0) {
      const elapsedSeconds = (currentTime - ctx.lastTradeOutcomeTime) / 1000;
      if (elapsedSeconds < risk.cooldown_seconds) {
        return {
          allowed: false,
          reason: `In cooldown period (${(risk.cooldown_seconds - elapsedSeconds).toFixed(1)}s remaining)`,
          nextStake: ctx.currentStake,
          progressionLevel: ctx.progressionLevel
        };
      }
    }

    // 6. Stake Bounds
    const stake = Math.min(ctx.currentStake || risk.initial_stake, risk.max_stake);
    if (stake > risk.max_stake) {
      return {
        allowed: false,
        reason: `Calculated stake ($${stake}) exceeds maximum allowable stake ($${risk.max_stake})`,
        nextStake: risk.max_stake,
        progressionLevel: ctx.progressionLevel
      };
    }

    // 7. Minimum Balance Check
    if (ctx.currentBalance !== undefined && ctx.currentBalance < stake) {
      return {
        allowed: false,
        reason: `Insufficient account balance ($${ctx.currentBalance.toFixed(2)}) for required stake ($${stake.toFixed(2)})`,
        nextStake: stake,
        progressionLevel: ctx.progressionLevel
      };
    }

    return {
      allowed: true,
      nextStake: stake,
      progressionLevel: ctx.progressionLevel
    };
  }

  /**
   * Calculate next stake after trade outcome (Win/Loss)
   */
  static calculateNextProgression(
    strategy: StrategyAST,
    ctx: RiskEvaluationContext,
    isWin: boolean
  ): { nextStake: number; nextLevel: number } {
    const progression = strategy.progression;
    const initialStake = strategy.risk_management.initial_stake;
    const maxStake = strategy.risk_management.max_stake;

    if (isWin) {
      if (progression.reset_on_win || progression.type === 'FIXED') {
        return { nextStake: initialStake, nextLevel: 1 };
      }
      if (progression.type === 'OSCARS_GRIND') {
        const nextLevel = ctx.progressionLevel + 1;
        const nextStake = Math.min(initialStake * nextLevel, maxStake);
        return { nextStake, nextLevel };
      }
      return { nextStake: initialStake, nextLevel: 1 };
    }

    // If Loss
    switch (progression.type) {
      case 'MARTINGALE': {
        const nextLevel = ctx.progressionLevel + 1;
        if (nextLevel > progression.max_level) {
          // Reset to initial stake if maximum progression exceeded
          return { nextStake: initialStake, nextLevel: 1 };
        }
        const calculated = ctx.currentStake * progression.multiplier;
        const nextStake = Math.min(calculated, maxStake);
        return { nextStake, nextLevel };
      }

      case 'DALEMBERT': {
        const nextLevel = ctx.progressionLevel + 1;
        if (nextLevel > progression.max_level) {
          return { nextStake: initialStake, nextLevel: 1 };
        }
        const nextStake = Math.min(ctx.currentStake + initialStake, maxStake);
        return { nextStake, nextLevel };
      }

      case 'OSCARS_GRIND': {
        // In Oscar's grind, stake remains same after a loss
        return { nextStake: ctx.currentStake, nextLevel: ctx.progressionLevel };
      }

      case 'FIXED':
      default:
        return { nextStake: initialStake, nextLevel: 1 };
    }
  }
}
