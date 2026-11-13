// DBOT Deriv WebSocket API Client
// Connects to Deriv WebSocket cluster with multi-endpoint fallback, request correlation, and resilient streaming

import WebSocket from 'ws';
import {
  ActiveSymbol,
  CandleData,
  DerivProposalRequest,
  DerivProposalResponse,
  DerivBuyResponse,
  OpenContractStatus,
  TickData
} from '../../../shared/types';

export interface DerivClientOptions {
  appId: string | number;
  endpoint?: string;
  onTick?: (tick: TickData) => void;
  onBalance?: (balance: number, currency: string, accountId?: string) => void;
  onContractUpdate?: (contract: OpenContractStatus) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

export interface DerivClientCallbacks {
  onTick?: (tick: TickData) => void;
  onBalance?: (balance: number, currency: string, accountId?: string) => void;
  onContractUpdate?: (contract: OpenContractStatus) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

export const DEFAULT_DERIV_SYMBOLS: ActiveSymbol[] = [
  { symbol: 'R_100', display_name: 'Volatility 100 Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.01, spot: 1254.30 },
  { symbol: 'R_75', display_name: 'Volatility 75 Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.01, spot: 832.45 },
  { symbol: 'R_50', display_name: 'Volatility 50 Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.01, spot: 341.12 },
  { symbol: 'R_25', display_name: 'Volatility 25 Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.01, spot: 215.80 },
  { symbol: 'R_10', display_name: 'Volatility 10 Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.001, spot: 6512.45 },
  { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.01, spot: 954.20 },
  { symbol: '1HZ50V', display_name: 'Volatility 50 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived Indices', submarket: 'random_index', submarket_display_name: 'Continuous Indices', is_trading_suspended: 0, pip: 0.01, spot: 412.30 },
  { symbol: 'frxEURUSD', display_name: 'EUR/USD', market: 'forex', market_display_name: 'Forex', submarket: 'major_pairs', submarket_display_name: 'Major Pairs', is_trading_suspended: 0, pip: 0.0001, spot: 1.0850 },
  { symbol: 'frxGBPUSD', display_name: 'GBP/USD', market: 'forex', market_display_name: 'Forex', submarket: 'major_pairs', submarket_display_name: 'Major Pairs', is_trading_suspended: 0, pip: 0.0001, spot: 1.2980 },
  { symbol: 'cryBTCUSD', display_name: 'BTC/USD', market: 'cryptocurrency', market_display_name: 'Cryptocurrencies', submarket: 'crypto', submarket_display_name: 'Crypto', is_trading_suspended: 0, pip: 0.01, spot: 67500.00 }
];

export class DerivClient {
  private ws: WebSocket | null = null;
  private appId: string | number;
  private endpoints: string[];
  private currentEndpointIndex = 0;
  private reqIdCounter = 1;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();
  private activeSubscriptions = new Map<string, string>(); // type -> subscription_id
  private pingInterval: NodeJS.Timeout | null = null;
  private tickGenerators = new Map<string, NodeJS.Timeout>();
  private isConnecting = false;
  private isDestroyed = false;
  private wasConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private token: string | null = null;
  public isAuthorized = false;
  public authorizedAccount: any = null;
  /** True only when a real Deriv socket is open (not running on the offline simulation). */
  public get isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  private callbacks: DerivClientCallbacks = {};

  constructor(private options: DerivClientOptions) {
    this.appId = options.appId || 1089;
    this.endpoints = [
      `wss://red.derivws.com/websockets/v3?app_id=${this.appId}&l=EN&brand=deriv`,
      `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=EN&brand=deriv`,
      `wss://blue.derivws.com/websockets/v3?app_id=${this.appId}&l=EN&brand=deriv`,
      `wss://green.derivws.com/websockets/v3?app_id=${this.appId}&l=EN&brand=deriv`
    ];
    if (options.endpoint) {
      this.endpoints.unshift(options.endpoint);
    }
    // Initialize callbacks from options
    this.callbacks = {
      onTick: options.onTick,
      onBalance: options.onBalance,
      onContractUpdate: options.onContractUpdate,
      onError: options.onError,
      onClose: options.onClose,
      onOpen: options.onOpen
    };
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Walk the whole endpoint cluster until one accepts the handshake. Previously only a
    // single endpoint was attempted, so one bad node silently degraded the app to offline mode.
    for (let attempt = 0; attempt < this.endpoints.length; attempt++) {
      const targetEndpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];
      const ok = await this.tryEndpoint(targetEndpoint);
      if (ok) {
        this.currentEndpointIndex = this.currentEndpointIndex % this.endpoints.length;
        const isReconnect = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.wasConnected = true;
        this.isConnecting = false;
        if (isReconnect) await this.restoreSession();
        return;
      }
      // Handshake failed - rotate to the next cluster node and retry.
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
    }

    this.isConnecting = false;
    return;
  }

  private tryEndpoint(endpoint: string, timeoutMs: number = 8000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const timer = setTimeout(() => {
        try {
          ws.removeAllListeners();
          ws.close();
        } catch {
          /* ignore */
        }
        finish(false);
      }, timeoutMs);

      let ws: WebSocket;
      try {
        ws = new WebSocket(endpoint, {
          headers: {
            'User-Agent': 'DBOT-Deriv-Quantitative-Engine/1.0',
            'Origin': 'https://app.deriv.com'
          }
        });
      } catch (err: any) {
        if (this.callbacks.onError) this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        finish(false);
        return;
      }

      ws.on('open', () => {
        this.ws = ws;
        this.startHeartbeat();
        if (this.callbacks.onOpen) this.callbacks.onOpen();
        finish(true);
      });

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleIncomingMessage(data.toString());
      });

      ws.on('error', (err) => {
        if (this.callbacks.onError) this.callbacks.onError(err);
        if (this.ws !== ws) {
          // Handshake-phase failure: tear down and let the caller try the next endpoint.
          try {
            ws.removeAllListeners();
            ws.close();
          } catch {
            /* ignore */
          }
        }
        // Errors on an established socket are always followed by 'close',
        // which triggers reconnection.
        finish(false);
      });

      ws.on('close', () => {
        this.stopHeartbeat();
        if (this.ws === ws) {
          this.ws = null;
          this.isAuthorized = false;
          if (this.callbacks.onClose) this.callbacks.onClose();
          // Only auto-reconnect sockets that were previously established.
          if (this.wasConnected) this.scheduleReconnect();
        }
        finish(false);
      });
    });
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer || this.isConnecting) return;

    this.reconnectAttempts++;
    const backoff = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isDestroyed) return;
      this.connect().catch(() => {
        /* connect() never rejects; defensive */
      });
    }, backoff);
  }

  /**
   * Re-establish the session after a reconnect and resubscribe to prior streams.
   */
  private async restoreSession(): Promise<void> {
    if (!this.isConnected) return;

    if (this.token) {
      try {
        await this.authorize(this.token);
      } catch {
        /* token may be invalid after reconnect; surface via isAuthorized */
      }
    }

    if (this.activeSubscriptions.has('balance')) {
      await this.subscribeBalance().catch((err) => {
        console.warn('Failed to resubscribe balance stream on Deriv reconnect:', err.message);
      });
    }

    for (const key of Array.from(this.activeSubscriptions.keys())) {
      if (key.startsWith('ticks_')) {
        const symbol = key.slice('ticks_'.length);
        this.activeSubscriptions.delete(key);
        // Drop any offline simulation for this symbol so real ticks are not duplicated.
        if (this.tickGenerators.has(symbol)) {
          clearInterval(this.tickGenerators.get(symbol)!);
          this.tickGenerators.delete(symbol);
        }
        await this.subscribeTicks(symbol).catch(() => {});
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRequest({ ping: 1 }).catch(() => {});
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public async sendRequest<T = any>(payload: Record<string, any>, timeoutMs: number = 8000): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const reqId = this.reqIdCounter++;
    const message = { ...payload, req_id: reqId };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Deriv API request timeout (${Object.keys(payload)[0]} req_id: ${reqId})`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, { resolve, reject, timer });

      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
        } else {
          clearTimeout(timer);
          this.pendingRequests.delete(reqId);
          reject(new Error('WebSocket not connected'));
        }
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(reqId);
        reject(err);
      }
    });
  }

  private handleIncomingMessage(raw: string) {
    try {
      const data = JSON.parse(raw);

      // Handle errors from Deriv
      if (data.error) {
        if (data.req_id && this.pendingRequests.has(data.req_id)) {
          const { reject, timer } = this.pendingRequests.get(data.req_id)!;
          clearTimeout(timer);
          this.pendingRequests.delete(data.req_id);
          reject(new Error(data.error.message || 'Deriv API Error'));
          return;
        }
      }

      // Check request correlation
      if (data.req_id && this.pendingRequests.has(data.req_id)) {
        const { resolve, timer } = this.pendingRequests.get(data.req_id)!;
        clearTimeout(timer);
        this.pendingRequests.delete(data.req_id);
        resolve(data);
      }

      // Handle Stream Subscriptions
      const msgType = data.msg_type;

      if (msgType === 'tick' && data.tick) {
        if (this.callbacks.onTick) {
          this.callbacks.onTick({
            symbol: data.tick.symbol,
            quote: data.tick.quote,
            epoch: data.tick.epoch,
            pip_size: data.tick.pip_size
          });
        }
      }

      if (msgType === 'balance' && data.balance !== undefined) {
        const balObj = data.balance;
        const balNum = typeof balObj === 'object' && balObj !== null ? Number(balObj.balance) : Number(balObj);
        const curStr = typeof balObj === 'object' && balObj !== null ? (balObj.currency || 'USD') : (data.currency || 'USD');
        const loginidStr = typeof balObj === 'object' && balObj !== null ? balObj.loginid : undefined;
        if (!isNaN(balNum) && this.callbacks.onBalance) {
          this.callbacks.onBalance(balNum, curStr, loginidStr);
        }
      }

      if (msgType === 'proposal_open_contract' && data.proposal_open_contract) {
        const c = data.proposal_open_contract;
        if (this.callbacks.onContractUpdate) {
          this.callbacks.onContractUpdate({
            contract_id: c.contract_id,
            symbol: c.underlying,
            contract_type: c.contract_type,
            buy_price: c.buy_price,
            payout: c.payout,
            profit: c.profit,
            status: c.status,
            is_expired: c.is_expired,
            is_sold: c.is_sold,
            entry_spot: c.entry_spot,
            exit_spot: c.exit_tick,
            current_spot: c.current_spot,
            barrier: c.barrier,
            date_start: c.date_start,
            date_expiry: c.date_expiry
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse Deriv WS message:', e);
    }
  }

  /**
   * Authorize with token
   */
  public async authorize(token: string): Promise<any> {
    this.token = token;
    const resp = await this.sendRequest({ authorize: token });
    if (resp.authorize) {
      this.isAuthorized = true;
      this.authorizedAccount = resp.authorize;
      if (this.callbacks.onBalance && typeof resp.authorize.balance === 'number') {
        this.callbacks.onBalance(
          resp.authorize.balance,
          resp.authorize.currency || 'USD',
          resp.authorize.loginid
        );
      }
    }
    return resp.authorize;
  }

  /**
   * Fetch Active Symbols
   */
  public async getActiveSymbols(): Promise<ActiveSymbol[]> {
    try {
      const resp = await this.sendRequest({
        active_symbols: 'brief',
        product_type: 'basic'
      }, 5000);
      if (resp.active_symbols && resp.active_symbols.length > 0) {
        return resp.active_symbols;
      }
    } catch (e) {
      // Use fallback catalog
    }
    return DEFAULT_DERIV_SYMBOLS;
  }

  /**
   * Subscribe to Live Ticks for a Symbol
   */
  public async subscribeTicks(symbol: string): Promise<void> {
    try {
      const resp = await this.sendRequest({
        ticks: symbol,
        subscribe: 1
      }, 4000);
      if (resp.subscription?.id) {
        this.activeSubscriptions.set(`ticks_${symbol}`, resp.subscription.id);
        return;
      }
    } catch (e) {
      // If Deriv rejects or is offline, start simulated tick generator for paper trading
      this.startSimulatedTicks(symbol);
    }
  }

  private startSimulatedTicks(symbol: string) {
    if (this.tickGenerators.has(symbol)) return;

    const baseObj = DEFAULT_DERIV_SYMBOLS.find((s) => s.symbol === symbol);
    let quote = baseObj?.spot ?? 1000.0;

    const interval = setInterval(() => {
      const delta = (Math.random() - 0.495) * (quote * 0.001);
      quote = Number((quote + delta).toFixed(2));
      const tick: TickData = {
        symbol,
        quote,
        epoch: Math.floor(Date.now() / 1000),
        pip_size: 2
      };
      if (this.callbacks.onTick) {
        this.options.onTick(tick);
      }
    }, 1000);

    this.tickGenerators.set(symbol, interval);
  }

  /**
   * Unsubscribe from Ticks
   */
  public async unsubscribeTicks(symbol: string): Promise<void> {
    if (this.tickGenerators.has(symbol)) {
      clearInterval(this.tickGenerators.get(symbol)!);
      this.tickGenerators.delete(symbol);
    }

    const subId = this.activeSubscriptions.get(`ticks_${symbol}`);
    if (subId) {
      await this.sendRequest({ forget: subId }).catch(() => {});
      this.activeSubscriptions.delete(`ticks_${symbol}`);
    } else {
      await this.sendRequest({ forget_all: 'ticks' }).catch(() => {});
    }
  }

  /**
   * Get Historical Candles
   */
  public async getCandles(symbol: string, granularity: number = 60, count: number = 100): Promise<CandleData[]> {
    try {
      const resp = await this.sendRequest({
        ticks_history: symbol,
        end: 'latest',
        count,
        style: 'candles',
        granularity
      }, 5000);
      if (resp.candles && resp.candles.length > 0) {
        return resp.candles;
      }
    } catch (e) {
      // Fallback: Generate continuous synthetic candles
    }

    const baseObj = DEFAULT_DERIV_SYMBOLS.find((s) => s.symbol === symbol);
    let currentPrice = baseObj?.spot ?? 1000.0;
    const candles: CandleData[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = count; i >= 0; i--) {
      const epoch = now - i * granularity;
      const open = currentPrice;
      const change = (Math.random() - 0.49) * (currentPrice * 0.005);
      const close = Number((open + change).toFixed(2));
      const high = Number((Math.max(open, close) + Math.random() * (currentPrice * 0.002)).toFixed(2));
      const low = Number((Math.min(open, close) - Math.random() * (currentPrice * 0.002)).toFixed(2));
      currentPrice = close;

      candles.push({ epoch, open, high, low, close });
    }

    return candles;
  }

  /**
   * Subscribe to Balance stream from Deriv
   */
  public async subscribeBalance(): Promise<any> {
    this.activeSubscriptions.set('balance', 'subscribed');
    const resp = await this.sendRequest({
      balance: 1,
      subscribe: 1
    });
    if (resp.subscription?.id) {
      this.activeSubscriptions.set('balance', resp.subscription.id);
    }
    if (resp.balance !== undefined && this.callbacks.onBalance) {
      const balObj = resp.balance;
      const balNum = typeof balObj === 'object' && balObj !== null ? Number(balObj.balance) : Number(balObj);
      const curStr = typeof balObj === 'object' && balObj !== null ? (balObj.currency || 'USD') : (resp.currency || 'USD');
      const loginidStr = typeof balObj === 'object' && balObj !== null ? balObj.loginid : undefined;
      if (!isNaN(balNum)) {
        this.callbacks.onBalance(balNum, curStr, loginidStr);
      }
    }
    return resp;
  }

  /**
   * Unsubscribe from Balance stream
   */
  public async unsubscribeBalance(): Promise<void> {
    const subId = this.activeSubscriptions.get('balance');
    this.activeSubscriptions.delete('balance');
    if (subId && subId !== 'subscribed') {
      await this.sendRequest({ forget: subId }).catch(() => {});
    }
  }

  /**
   * Top up / Reset Demo Account Virtual Balance
   */
  public async topupVirtual(): Promise<any> {
    return this.sendRequest({
      topup_virtual: 1
    });
  }

  /**
   * Request Price Proposal
   */
  public async getProposal(req: DerivProposalRequest): Promise<DerivProposalResponse> {
    try {
      const resp = await this.sendRequest(req, 6000);
      if (resp.proposal) {
        return resp.proposal;
      }
    } catch (e) {
      // Fallback for simulation
    }

    const askPrice = req.amount;
    const payout = askPrice * 1.95;
    return {
      id: 'prop_' + Math.random().toString(36).substring(2, 10),
      ask_price: askPrice,
      payout,
      spot: 1000.0,
      spot_time: Math.floor(Date.now() / 1000),
      longcode: `Win payout if ${req.symbol} is higher after ${req.duration} ${req.duration_unit}`,
      display_value: `${askPrice}`
    };
  }

  /**
   * Purchase Contract with Proposal ID
   */
  public async buy(proposalId: string, maxPrice: number): Promise<DerivBuyResponse> {
    try {
      const resp = await this.sendRequest({
        buy: proposalId,
        price: maxPrice
      }, 6000);
      if (resp.buy) {
        return resp.buy;
      }
    } catch (e) {
      // Fallback for simulation
    }

    return {
      buy: {
        contract_id: Math.floor(100000000 + Math.random() * 900000000),
        purchase_time: Math.floor(Date.now() / 1000),
        shortcode: 'CALL_' + proposalId,
        start_time: Math.floor(Date.now() / 1000),
        buy_price: maxPrice,
        balance_after: 9990.0
      }
    };
  }

  /**
   * Track Open Contract via subscription
   */
  public async trackContract(contractId: number): Promise<void> {
    const resp = await this.sendRequest({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1
    }).catch(() => {});
    if (resp?.subscription?.id) {
      this.activeSubscriptions.set(`contract_${contractId}`, resp.subscription.id);
    }
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const timer of this.tickGenerators.values()) {
      clearInterval(timer);
    }
    this.tickGenerators.clear();
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Client disconnected'));
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.activeSubscriptions.clear();
  }

  // Callback setters for dynamic registration after construction
  public setTickCallback(cb: (tick: TickData) => void): void {
    this.callbacks.onTick = cb;
  }

  public setBalanceCallback(cb: (balance: number, currency: string, accountId?: string) => void): void {
    this.callbacks.onBalance = cb;
  }

  public setContractUpdateCallback(cb: (contract: OpenContractStatus) => void): void {
    this.callbacks.onContractUpdate = cb;
  }

  public setErrorCallback(cb: (err: Error) => void): void {
    this.callbacks.onError = cb;
  }

  public setCloseCallback(cb: () => void): void {
    this.callbacks.onClose = cb;
  }

  public setOpenCallback(cb: () => void): void {
    this.callbacks.onOpen = cb;
  }
}
