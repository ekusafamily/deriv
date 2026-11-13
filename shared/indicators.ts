// DBOT Technical Analysis & Indicators Engine
// High precision mathematical indicator calculations

export class IndicatorCalculator {
  /**
   * Simple Moving Average (SMA)
   */
  static sma(prices: number[], period: number): number | null {
    if (prices.length < period || period <= 0) return null;
    const slice = prices.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  /**
   * Exponential Moving Average (EMA)
   */
  static ema(prices: number[], period: number): number | null {
    if (prices.length < period || period <= 0) return null;
    const k = 2 / (period + 1);
    
    // Initial SMA for first EMA seed
    let ema = prices.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  /**
   * Relative Strength Index (RSI - Wilder's smoothed method)
   */
  static rsi(prices: number[], period: number = 14): number | null {
    if (prices.length <= period || period <= 0) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Moving Average Convergence Divergence (MACD)
   */
  static macd(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number; signal: number; histogram: number } | null {
    if (prices.length < slowPeriod + signalPeriod) return null;

    // Calculate MACD series across points to compute EMA of MACD (Signal Line)
    const macdSeries: number[] = [];
    const kFast = 2 / (fastPeriod + 1);
    const kSlow = 2 / (slowPeriod + 1);

    let fastEma = prices.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
    for (let i = fastPeriod; i < slowPeriod; i++) {
      fastEma = prices[i] * kFast + fastEma * (1 - kFast);
    }

    let slowEma = prices.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
    macdSeries.push(fastEma - slowEma);

    for (let i = slowPeriod; i < prices.length; i++) {
      fastEma = prices[i] * kFast + fastEma * (1 - kFast);
      slowEma = prices[i] * kSlow + slowEma * (1 - kSlow);
      macdSeries.push(fastEma - slowEma);
    }

    if (macdSeries.length < signalPeriod) return null;
    const signal = this.ema(macdSeries, signalPeriod);
    const currentMacd = macdSeries[macdSeries.length - 1];

    if (signal === null) return null;
    return {
      macd: currentMacd,
      signal,
      histogram: currentMacd - signal
    };
  }

  /**
   * Bollinger Bands (SMA, Upper Band, Lower Band)
   */
  static bollingerBands(
    prices: number[],
    period: number = 20,
    multiplier: number = 2
  ): { middle: number; upper: number; lower: number } | null {
    if (prices.length < period) return null;

    const middle = this.sma(prices, period);
    if (middle === null) return null;

    const slice = prices.slice(-period);
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      middle,
      upper: middle + multiplier * stdDev,
      lower: middle - multiplier * stdDev
    };
  }

  /**
   * Extract last digit of quote based on pip precision
   */
  static getLastDigit(quote: number, pipSize: number = 2): number {
    const factor = Math.pow(10, pipSize);
    const rounded = Math.round(quote * factor);
    return Math.abs(rounded % 10);
  }

  /**
   * Price Momentum / Rate of Change
   */
  static momentum(prices: number[], period: number = 5): number | null {
    if (prices.length <= period) return null;
    const current = prices[prices.length - 1];
    const prev = prices[prices.length - 1 - period];
    return current - prev;
  }
}
