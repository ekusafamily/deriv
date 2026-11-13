// DBOT Strategy Execution Engine
// Implements full trading state machine, proposal-buy workflow, and risk controls

import { EventEmitter } from 'events';
import {
  StrategyAST,
  BotExecutionState,
  BotStateSnapshot,
  OpenContractStatus,
  TickData
} from '../../../shared/types';
import { IndicatorCalculator } from '../../../shared/indicators';
import { RiskManager, RiskEvaluationContext } from '../../../shared/risk-rules';
import { DerivClient } from '../deriv/deriv-client';

export interface StrategyRunnerOptions {
  botId: string;
  name: string;
  strategy: StrategyAST;
  derivClient: DerivClient;
  isPaperTrading: boolean;
  isRealMoney: boolean;
  initialBalance?: number;
  onStateChange?: (state: BotStateSnapshot) => void;
  onTradeCompleted?: (trade: any) => void;
  onLog?: (log: { timestamp: number; level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; message: string }) => void;
}

export class StrategyRunner extends EventEmitter {
  public botId: string;
  public name: string;
  public strategy: StrategyAST;
  private derivClient: DerivClient;
  public isPaperTrading: boolean;
  public isRealMoney: boolean;

  private state: BotExecutionState = 'IDLE';
  private tickHistory: number[] = [];
  private currentStake: number;
  private totalTrades = 0;
  private winningTrades = 0;
  private losingTrades = 0;
  private consecutiveLosses = 0;
  private totalProfit = 0;
  private progressionLevel = 1;
  private lastTradeOutcomeTime = 0;
  private activeContract: OpenContractStatus | null = null;
  private lastError: string | null = null;
  private isProcessingTick = false;
  private cooldownTimer: NodeJS.Timeout | null = null;
  private paperTradeTimer: NodeJS.Timeout | null = null;
  private paperSettlementDueAt = 0;
  private stateBeforePause: BotExecutionState = 'ANALYZING';
  private lastPipSize = 2;
  private simulatedBalance = 10000;
  private accountCurrency = 'USD';
  private logs: { timestamp: number; level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; message: string }[] = [];

  constructor(private options: StrategyRunnerOptions) {
    super();
    this.botId = options.botId;
    this.name = options.name;
    this.strategy = options.strategy;
    this.derivClient = options.derivClient;
    this.isPaperTrading = options.isPaperTrading;
    this.isRealMoney = options.isRealMoney;
    this.currentStake = options.strategy.risk_management.initial_stake;
    if (options.initialBalance) {
      this.simulatedBalance = options.initialBalance;
    }
  }

  public getSnapshot(): BotStateSnapshot {
    return {
      botId: this.botId,
      name: this.name,
      status: this.state,
      symbol: this.strategy.market.symbol,
      currentStake: this.currentStake,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      consecutiveLosses: this.consecutiveLosses,
      totalProfit: this.totalProfit,
      progressionLevel: this.progressionLevel,
      lastTickPrice: this.tickHistory.length > 0 ? this.tickHistory[this.tickHistory.length - 1] : undefined,
      activeContract: this.activeContract,
      lastError: this.lastError,
      isPaperTrading: this.isPaperTrading,
      isRealMoney: this.isRealMoney,
      accountCurrency: this.accountCurrency,
      logs: this.logs.slice(-30)
    };
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string) {
    const entry = { timestamp: Date.now(), level, message };
    this.logs.push(entry);
    if (this.options.onLog) this.options.onLog(entry);
    this.emit('log', entry);
    this.notifyState();
  }

  private notifyState() {
    const snap = this.getSnapshot();
    if (this.options.onStateChange) this.options.onStateChange(snap);
    this.emit('state', snap);
  }

  private setState(newState: BotExecutionState) {
    this.state = newState;
    this.notifyState();
  }

  /**
   * Start Bot Execution
   */
  public async start(): Promise<void> {
    if (this.state !== 'IDLE' && this.state !== 'STOPPED' && this.state !== 'ERROR') {
      return;
    }

    this.setState('INITIALIZING');
    this.log('INFO', `Starting bot "${this.name}" in ${this.isPaperTrading ? 'PAPER' : this.isRealMoney ? 'REAL MONEY' : 'DEMO'} mode.`);

    try {
      this.setState('SUBSCRIBING_MARKET');
      await this.derivClient.subscribeTicks(this.strategy.market.symbol);
      this.log('SUCCESS', `Subscribed to live market ticks for ${this.strategy.market.symbol}`);

      this.setState('ANALYZING');
    } catch (err: any) {
      this.lastError = err.message || 'Initialization failed';
      this.setState('ERROR');
      this.log('ERROR', `Failed to start bot: ${this.lastError}`);
    }
  }

  /**
   * Pause Bot Execution
   */
  public pause(): void {
    if (this.state === 'PAUSED' || this.state === 'IDLE' || this.state === 'STOPPED' || this.state === 'ERROR') {
      return;
    }

    // Remember where we were so resume() returns to the correct stage instead of
    // always forcing ANALYZING (which would strand an in-flight contract).
    this.stateBeforePause = this.state;
    this.setState('PAUSED');
    this.log('WARN', `Bot paused by user (was ${this.stateBeforePause}). In-flight contracts continue to be tracked.`);
  }

  /**
   * Resume Bot Execution
   */
  public resume(): void {
    if (this.state !== 'PAUSED') return;

    const target = this.stateBeforePause === 'COOLDOWN' ? 'COOLDOWN' : 'ANALYZING';

    if (target === 'COOLDOWN') {
      this.setState('COOLDOWN');
      this.scheduleCooldownReturn();
    } else {
      this.setState('ANALYZING');
    }

    // Kick any paper-trade settlement that was deferred while paused.
    if (this.paperTradeTimer === null && this.activeContract && this.paperSettlementDueAt) {
      this.armPaperSettlement();
    }

    this.log('INFO', `Bot resumed (${target}).`);
  }

  /**
   * Stop Bot Execution
   */
  public async stop(): Promise<void> {
    if (this.state === 'STOPPED') return;

    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    if (this.paperTradeTimer) {
      clearTimeout(this.paperTradeTimer);
      this.paperTradeTimer = null;
    }
    this.paperSettlementDueAt = 0;
    this.activeContract = null;
    this.isProcessingTick = false;

    this.setState('STOPPED');
    this.log('WARN', 'Bot stopped. No new trades will be placed.');

    try {
      await this.derivClient.unsubscribeTicks(this.strategy.market.symbol);
    } catch (e) {
      // Ignore unsubscribe errors on stop
    }
  }

  /**
   * Emergency Kill Switch
   */
  public async emergencyStop(): Promise<void> {
    this.log('ERROR', 'EMERGENCY STOP TRIGGERED! Immediately halting bot.');
    await this.stop();
  }

  /**
   * Feed new tick into runner state machine
   */
  public onTick(tick: TickData): void {
    if (tick.symbol !== this.strategy.market.symbol) return;

    this.tickHistory.push(tick.quote);
    if (this.tickHistory.length > 500) {
      this.tickHistory.shift();
    }

    // Keep the symbol's pip size for digit-contract settlement, which must read the
    // last digit at the same precision Deriv quotes the market at.
    if (typeof tick.pip_size === 'number' && tick.pip_size > 0) {
      this.lastPipSize = tick.pip_size;
    }

    if (this.activeContract && this.activeContract.status === 'open') {
      this.activeContract = { ...this.activeContract, current_spot: tick.quote };
    }

    if (this.state !== 'ANALYZING' || this.isProcessingTick) {
      return;
    }

    this.processEntrySignal(tick);
  }

  /**
   * Evaluate strategy entry conditions
   */
  private async processEntrySignal(tick: TickData): Promise<void> {
    this.isProcessingTick = true;

    try {
      // Need sufficient warmup data for indicators
      if (this.tickHistory.length < 5) {
        this.isProcessingTick = false;
        return;
      }

      const signalTriggered = this.evaluateEntryConditions(tick);
      if (!signalTriggered) {
        this.isProcessingTick = false;
        return;
      }

      this.log('INFO', `Signal confirmed for ${this.strategy.market.contract_type} on ${tick.symbol} at ${tick.quote}`);

      // Evaluate Risk Rules
      const riskCtx: RiskEvaluationContext = {
        initialStake: this.strategy.risk_management.initial_stake,
        currentStake: this.currentStake,
        totalProfit: this.totalProfit,
        totalTrades: this.totalTrades,
        consecutiveLosses: this.consecutiveLosses,
        progressionLevel: this.progressionLevel,
        lastTradeOutcomeTime: this.lastTradeOutcomeTime,
        currentBalance: this.isPaperTrading ? this.simulatedBalance : undefined
      };

      const riskCheck = RiskManager.evaluatePreTrade(this.strategy, riskCtx);
      if (!riskCheck.allowed) {
        this.log('WARN', `Trade blocked by Risk Guard: ${riskCheck.reason}`);
        if (
          riskCheck.reason?.includes('Take Profit') ||
          riskCheck.reason?.includes('Stop Loss') ||
          riskCheck.reason?.includes('Maximum trades') ||
          riskCheck.reason?.includes('Consecutive losses')
        ) {
          await this.stop();
        }
        this.isProcessingTick = false;
        return;
      }

      this.currentStake = riskCheck.nextStake;

      // Execute Trade
      if (this.isPaperTrading) {
        await this.executePaperTrade(tick);
      } else {
        await this.executeLiveTrade();
      }
    } catch (err: any) {
      this.log('ERROR', `Execution error: ${err.message || err}`);
    } finally {
      this.isProcessingTick = false;
    }
  }

  /**
   * Evaluate AST condition logic tree
   */
  private evaluateEntryConditions(tick: TickData): boolean {
    const { gate, conditions } = this.strategy.entry_conditions;
    if (!conditions || conditions.length === 0) return false;

    const results = conditions.map((cond) => {
      const left = this.resolveOperandValue(cond.leftOperand, tick);
      const right = this.resolveOperandValue(cond.rightOperand, tick);

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

  private resolveOperandValue(operand: any, tick: TickData): number | null {
    if (operand.type === 'PRICE') {
      return tick.quote;
    }
    if (operand.type === 'CONSTANT') {
      return operand.value ?? 0;
    }
    if (operand.type === 'LAST_DIGIT') {
      return IndicatorCalculator.getLastDigit(tick.quote, tick.pip_size || 2);
    }
    if (operand.type === 'INDICATOR') {
      switch (operand.indicatorName) {
        case 'SMA':
          return IndicatorCalculator.sma(this.tickHistory, operand.period || 10);
        case 'EMA':
          return IndicatorCalculator.ema(this.tickHistory, operand.period || 10);
        case 'RSI':
          return IndicatorCalculator.rsi(this.tickHistory, operand.period || 14);
        case 'MACD': {
          const m = IndicatorCalculator.macd(this.tickHistory);
          return m ? m.macd : null;
        }
        case 'BOLLINGER_UPPER': {
          const bb = IndicatorCalculator.bollingerBands(this.tickHistory, operand.period || 20);
          return bb ? bb.upper : null;
        }
        case 'BOLLINGER_LOWER': {
          const bb = IndicatorCalculator.bollingerBands(this.tickHistory, operand.period || 20);
          return bb ? bb.lower : null;
        }
        default:
          return null;
      }
    }
    return null;
  }

  /**
   * Execute Real Deriv Live Contract
   */
  private async executeLiveTrade(): Promise<void> {
    this.setState('REQUESTING_PROPOSAL');
    this.log('INFO', `Requesting Deriv proposal for ${this.strategy.market.contract_type} ($${this.currentStake})...`);

    const proposal = await this.derivClient.getProposal({
      proposal: 1,
      amount: this.currentStake,
      basis: 'stake',
      contract_type: this.strategy.market.contract_type,
      currency: this.strategy.market.currency,
      duration: this.strategy.market.duration,
      duration_unit: this.strategy.market.duration_unit,
      symbol: this.strategy.market.symbol,
      barrier: this.strategy.market.barrier
    });

    this.setState('PURCHASING');
    this.log('INFO', `Proposal accepted. Buying contract with ask price $${proposal.ask_price}...`);

    const buyResp = await this.derivClient.buy(proposal.id, proposal.ask_price);
    const contractId = buyResp.buy.contract_id;

    this.setState('MONITORING_CONTRACT');
    this.log('SUCCESS', `Contract #${contractId} opened successfully at $${buyResp.buy.buy_price}!`);

    this.activeContract = {
      contract_id: contractId,
      symbol: this.strategy.market.symbol,
      contract_type: this.strategy.market.contract_type,
      buy_price: buyResp.buy.buy_price,
      payout: proposal.payout,
      profit: 0,
      status: 'open',
      is_expired: 0,
      is_sold: 0,
      current_spot: proposal.spot
    };
    this.notifyState();

    await this.derivClient.trackContract(contractId);
  }

  /**
   * Called by Deriv client on open contract stream updates
   */
  public onContractUpdate(contract: OpenContractStatus): void {
    if (!this.activeContract || this.activeContract.contract_id !== contract.contract_id) {
      return;
    }

    this.activeContract = { ...this.activeContract, ...contract };
    this.notifyState();

    if (contract.is_expired || contract.is_sold || contract.status !== 'open') {
      const isWin = contract.status === 'won';
      const profit = contract.profit;

      this.handleTradeOutcome(isWin, profit, contract);
    }
  }

  /**
   * Execute Paper Simulated Contract
   */
  private async executePaperTrade(entryTick: TickData): Promise<void> {
    this.setState('PURCHASING');
    const contractId = Math.floor(100000000 + Math.random() * 900000000);
    const stake = this.currentStake;

    // Ask Deriv for a real proposal so the simulated payout reflects actual market
    // pricing. getProposal falls back to a simulated quote when the API is unreachable.
    let payout = stake * 1.95;
    try {
      const proposal = await this.derivClient.getProposal({
        proposal: 1,
        amount: stake,
        basis: 'stake',
        contract_type: this.strategy.market.contract_type,
        currency: this.strategy.market.currency,
        duration: this.strategy.market.duration,
        duration_unit: this.strategy.market.duration_unit,
        symbol: this.strategy.market.symbol,
        barrier: this.strategy.market.barrier,
        ...(this.strategy.market.prediction !== undefined ? { prediction: this.strategy.market.prediction } : {})
      } as any);
      if (proposal && typeof proposal.payout === 'number' && proposal.payout > 0) {
        payout = proposal.payout;
      }
    } catch {
      this.log('WARN', 'Paper proposal unavailable; using simulated 1.95x payout.');
    }

    if (this.state === 'STOPPED' || this.state === 'PAUSED') {
      // Stop/pause arrived while awaiting the proposal - do not open a phantom trade.
      if (this.state === 'PAUSED') this.stateBeforePause = 'ANALYZING';
      return;
    }

    this.setState('MONITORING_CONTRACT');
    this.log('INFO', `[PAPER TRADING] Contract #${contractId} entered at ${entryTick.quote} for $${stake.toFixed(2)} (payout $${payout.toFixed(2)})`);

    this.activeContract = {
      contract_id: contractId,
      symbol: this.strategy.market.symbol,
      contract_type: this.strategy.market.contract_type,
      buy_price: stake,
      payout,
      profit: 0,
      status: 'open',
      is_expired: 0,
      is_sold: 0,
      entry_spot: entryTick.quote,
      current_spot: entryTick.quote
    };
    this.notifyState();

    // Duration simulation in paper trading (1 tick per 1 second or duration ticks)
    const durationTicks = this.strategy.market.duration_unit === 't' ? this.strategy.market.duration : 3;
    const waitMs = Math.max(durationTicks * 1000, 2000);

    this.paperSettlementDueAt = Date.now() + waitMs;
    this.armPaperSettlement();
  }

  /**
   * Arm (or re-arm) the paper settlement timer. Deferred while PAUSED so a paused
   * bot never settles a contract behind the user's back; resume() re-arms it.
   */
  private armPaperSettlement(): void {
    if (this.paperTradeTimer) {
      clearTimeout(this.paperTradeTimer);
      this.paperTradeTimer = null;
    }
    if (!this.paperSettlementDueAt || this.state === 'PAUSED' || this.state === 'STOPPED') return;

    const delay = Math.max(this.paperSettlementDueAt - Date.now(), 0);
    this.paperTradeTimer = setTimeout(() => {
      this.paperTradeTimer = null;
      if (this.state === 'PAUSED') {
        // Settle once the user resumes rather than dropping the contract entirely.
        return;
      }
      this.settlePaperTrade();
    }, delay);
  }

  private settlePaperTrade(): void {
    this.paperSettlementDueAt = 0;
    if (this.state === 'STOPPED') return;

    const contract = this.activeContract;
    if (!contract || contract.status !== 'open') return;

    const contractId = contract.contract_id;
    const stake = contract.buy_price;
    const payout = contract.payout;
    const entryQuote = contract.entry_spot ?? this.tickHistory[0] ?? 0;

    const exitPrice = this.tickHistory[this.tickHistory.length - 1] || entryQuote;
    const prediction = this.strategy.market.prediction ?? 5;
    const exitDigit = IndicatorCalculator.getLastDigit(exitPrice, this.lastPipSize);
    const contractType = this.strategy.market.contract_type;
    let isWin = false;

    if (contractType === 'CALL') {
      isWin = exitPrice > entryQuote;
    } else if (contractType === 'PUT') {
      isWin = exitPrice < entryQuote;
    } else if (contractType === 'DIGITMATCH') {
      isWin = exitDigit === prediction;
    } else if (contractType === 'DIGITDIFF') {
      isWin = exitDigit !== prediction;
    } else if (contractType === 'DIGITOVER') {
      isWin = exitDigit > prediction;
    } else if (contractType === 'DIGITUNDER') {
      isWin = exitDigit < prediction;
    } else if (contractType === 'DIGITEVEN') {
      isWin = exitDigit % 2 === 0;
    } else if (contractType === 'DIGITODD') {
      isWin = exitDigit % 2 === 1;
    } else {
      isWin = exitPrice >= entryQuote;
    }

    const profit = isWin ? payout - stake : -stake;

    const finalContract: OpenContractStatus = {
      contract_id: contractId,
      symbol: this.strategy.market.symbol,
      contract_type: this.strategy.market.contract_type,
      buy_price: stake,
      payout,
      profit,
      status: isWin ? 'won' : 'lost',
      is_expired: 1,
      is_sold: 1,
      entry_spot: entryQuote,
      exit_spot: exitPrice,
      current_spot: exitPrice
    };

    this.handleTradeOutcome(isWin, profit, finalContract);
  }

  /**
   * Re-arm the cooldown timer (used by resume after a pause during COOLDOWN).
   */
  private scheduleCooldownReturn(): void {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    const cooldownSeconds = this.strategy.risk_management.cooldown_seconds || 3;
    this.cooldownTimer = setTimeout(() => {
      this.cooldownTimer = null;
      if (this.state === 'COOLDOWN') {
        this.setState('ANALYZING');
      }
    }, cooldownSeconds * 1000);
  }

  /**
   * Reconcile outcome, progression, and cooldown
   */
  private handleTradeOutcome(isWin: boolean, profit: number, contract: OpenContractStatus): void {
    this.totalTrades++;
    this.totalProfit += profit;
    this.lastTradeOutcomeTime = Date.now();
    this.activeContract = null;

    if (isWin) {
      this.winningTrades++;
      this.consecutiveLosses = 0;
      this.log('SUCCESS', `Trade #${this.totalTrades} WON! Profit: +$${profit.toFixed(2)} (Total P/L: $${this.totalProfit.toFixed(2)})`);
    } else {
      this.losingTrades++;
      this.consecutiveLosses++;
      this.log('WARN', `Trade #${this.totalTrades} LOST. Deficit: -$${Math.abs(profit).toFixed(2)} (Consecutive: ${this.consecutiveLosses})`);
    }

    if (this.isPaperTrading) {
      this.simulatedBalance += profit;
    }

    // Progression calculation
    const progressionResult = RiskManager.calculateNextProgression(
      this.strategy,
      {
        initialStake: this.strategy.risk_management.initial_stake,
        currentStake: this.currentStake,
        totalProfit: this.totalProfit,
        totalTrades: this.totalTrades,
        consecutiveLosses: this.consecutiveLosses,
        progressionLevel: this.progressionLevel
      },
      isWin
    );

    this.currentStake = progressionResult.nextStake;
    this.progressionLevel = progressionResult.nextLevel;

    if (this.options.onTradeCompleted) {
      this.options.onTradeCompleted(contract);
    }
    this.emit('trade_completed', contract);

    // Enter cooldown (a live contract may settle while the bot is paused - keep it paused
    // and remember that resume should land in COOLDOWN).
    const cooldownSeconds = this.strategy.risk_management.cooldown_seconds || 3;
    if (this.state === 'PAUSED') {
      this.stateBeforePause = 'COOLDOWN';
      this.log('INFO', `Contract settled while paused. Cooldown of ${cooldownSeconds}s will start on resume.`);
      return;
    }
    this.setState('COOLDOWN');
    this.log('INFO', `Cooldown active for ${cooldownSeconds}s before next entry scan.`);
    this.scheduleCooldownReturn();
  }
}
