// DBOT Historical Backtesting Simulation Engine
// Chronological tick/candle replay without lookahead bias

import { StrategyAST, CandleData } from '../../../shared/types';
import { IndicatorCalculator } from '../../../shared/indicators';
import { RiskManager, RiskEvaluationContext } from '../../../shared/risk-rules';

export interface BacktestRequest {
  strategy: StrategyAST;
  candles: CandleData[];
  initialBalance?: number;
}

export interface BacktestTradeResult {
  tradeIndex: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  stake: number;
  profit: number;
  outcome: 'WON' | 'LOST';
  balanceAfter: number;
  progressionLevel: number;
}

export interface BacktestReport {
  initialBalance: number;
  finalBalance: number;
  netProfit: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  equityCurve: { time: number; balance: number }[];
  trades: BacktestTradeResult[];
}

export class HistoricalBacktester {
  public static run(request: BacktestRequest): BacktestReport {
    const { strategy, candles } = request;
    const initialBalance = request.initialBalance ?? 1000;
    let balance = initialBalance;
    let peakBalance = initialBalance;
    let maxDrawdown = 0;
    let currentStake = strategy.risk_management.initial_stake;
    let progressionLevel = 1;
    let consecutiveLosses = 0;
    let consecutiveWins = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    const trades: BacktestTradeResult[] = [];
    const equityCurve: { time: number; balance: number }[] = [
      { time: candles[0]?.epoch ?? Date.now(), balance: initialBalance }
    ];

    const priceHistory: number[] = [];
    const duration = strategy.market.duration || 5;

    // Minimum warmup period for indicators
    const warmup = 25;

    for (let i = 0; i < candles.length - duration; i++) {
      const candle = candles[i];
      priceHistory.push(candle.close);

      if (i < warmup) continue;

      // Evaluate risk checks
      const riskCtx: RiskEvaluationContext = {
        initialStake: strategy.risk_management.initial_stake,
        currentStake,
        totalProfit: balance - initialBalance,
        totalTrades: trades.length,
        consecutiveLosses,
        progressionLevel,
        currentBalance: balance
      };

      const riskCheck = RiskManager.evaluatePreTrade(strategy, riskCtx);
      if (!riskCheck.allowed) {
        // Strategy hit risk limit (Take Profit / Stop Loss / Max Trades)
        break;
      }

      currentStake = riskCheck.nextStake;

      // Check entry conditions
      const signal = this.evaluateEntry(strategy, priceHistory, candle.close);
      if (signal) {
        // Trade placed! Contract resolves at i + duration
        const exitCandle = candles[i + duration];
        const entryPrice = candle.close;
        const exitPrice = exitCandle.close;
        let isWin = false;

        const contractType = strategy.market.contract_type;
        if (contractType === 'CALL') {
          isWin = exitPrice > entryPrice;
        } else if (contractType === 'PUT') {
          isWin = exitPrice < entryPrice;
        } else if (contractType === 'DIGITDIFF') {
          const exitDigit = IndicatorCalculator.getLastDigit(exitPrice);
          isWin = exitDigit !== (strategy.market.prediction ?? 5);
        } else {
          isWin = exitPrice >= entryPrice;
        }

        // Realistic payout calculations
        const payoutMultiplier = contractType === 'DIGITDIFF' ? 0.095 : 0.95;
        const profit = isWin ? currentStake * payoutMultiplier : -currentStake;

        balance += profit;
        if (profit > 0) {
          grossProfit += profit;
          consecutiveWins++;
          consecutiveLosses = 0;
          if (consecutiveWins > maxConsecutiveWins) maxConsecutiveWins = consecutiveWins;
        } else {
          grossLoss += Math.abs(profit);
          consecutiveLosses++;
          consecutiveWins = 0;
          if (consecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = consecutiveLosses;
        }

        if (balance > peakBalance) peakBalance = balance;
        const currentDrawdown = peakBalance - balance;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

        trades.push({
          tradeIndex: trades.length + 1,
          entryTime: candle.epoch,
          exitTime: exitCandle.epoch,
          entryPrice,
          exitPrice,
          stake: currentStake,
          profit,
          outcome: isWin ? 'WON' : 'LOST',
          balanceAfter: balance,
          progressionLevel
        });

        equityCurve.push({ time: exitCandle.epoch, balance });

        // Update progression
        const nextProg = RiskManager.calculateNextProgression(strategy, riskCtx, isWin);
        currentStake = nextProg.nextStake;
        progressionLevel = nextProg.nextLevel;

        // Skip to end of contract to prevent overlapping entry if configured
        i += duration - 1;
      }
    }

    const winningTrades = trades.filter((t) => t.outcome === 'WON').length;
    const losingTrades = trades.filter((t) => t.outcome === 'LOST').length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 1;
    const maxDrawdownPercent = peakBalance > 0 ? (maxDrawdown / peakBalance) * 100 : 0;

    return {
      initialBalance,
      finalBalance: balance,
      netProfit: balance - initialBalance,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      maxDrawdown,
      maxDrawdownPercent,
      profitFactor,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      equityCurve,
      trades
    };
  }

  private static evaluateEntry(strategy: StrategyAST, priceHistory: number[], currentPrice: number): boolean {
    const { gate, conditions } = strategy.entry_conditions;
    if (!conditions || conditions.length === 0) return false;

    const results = conditions.map((cond) => {
      const left = this.resolveOperand(cond.leftOperand, priceHistory, currentPrice);
      const right = this.resolveOperand(cond.rightOperand, priceHistory, currentPrice);

      if (left === null || right === null) return false;

      switch (cond.operator) {
        case 'GREATER_THAN':
          return left > right;
        case 'LESS_THAN':
          return left < right;
        case 'EQUALS':
          return left === right;
        case 'GREATER_EQUAL':
          return left >= right;
        case 'LESS_EQUAL':
          return left <= right;
        case 'NOT_EQUALS':
          return left !== right;
        default:
          return false;
      }
    });

    return gate === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private static resolveOperand(operand: any, prices: number[], currentPrice: number): number | null {
    if (operand.type === 'PRICE') return currentPrice;
    if (operand.type === 'CONSTANT') return operand.value ?? 0;
    if (operand.type === 'LAST_DIGIT') return IndicatorCalculator.getLastDigit(currentPrice);
    if (operand.type === 'INDICATOR') {
      switch (operand.indicatorName) {
        case 'SMA':
          return IndicatorCalculator.sma(prices, operand.period || 10);
        case 'EMA':
          return IndicatorCalculator.ema(prices, operand.period || 10);
        case 'RSI':
          return IndicatorCalculator.rsi(prices, operand.period || 14);
        case 'MACD': {
          const m = IndicatorCalculator.macd(prices);
          return m ? m.macd : null;
        }
        case 'BOLLINGER_UPPER': {
          const bb = IndicatorCalculator.bollingerBands(prices, operand.period || 20);
          return bb ? bb.upper : null;
        }
        case 'BOLLINGER_LOWER': {
          const bb = IndicatorCalculator.bollingerBands(prices, operand.period || 20);
          return bb ? bb.lower : null;
        }
        default:
          return null;
      }
    }
    return null;
  }
}
