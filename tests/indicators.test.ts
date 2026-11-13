import { describe, it, expect } from 'vitest';
import { IndicatorCalculator } from '../shared/indicators';

describe('Technical Indicators Calculation Engine', () => {
  const samplePrices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  it('calculates Simple Moving Average (SMA) correctly', () => {
    const sma5 = IndicatorCalculator.sma(samplePrices, 5);
    // Last 5 prices: 16, 17, 18, 19, 20 => avg = 18
    expect(sma5).toBe(18);

    const nullSma = IndicatorCalculator.sma([10, 20], 5);
    expect(nullSma).toBeNull();
  });

  it('calculates Exponential Moving Average (EMA) with proper weighting', () => {
    const ema5 = IndicatorCalculator.ema(samplePrices, 5);
    expect(ema5).toBeGreaterThan(17);
    expect(ema5).toBeLessThanOrEqual(20);
  });

  it('calculates Relative Strength Index (RSI)', () => {
    // Monotonically increasing prices should have RSI 100
    const risingPrices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const rsiHigh = IndicatorCalculator.rsi(risingPrices, 14);
    expect(rsiHigh).toBe(100);

    // Monotonically decreasing prices
    const fallingPrices = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15];
    const rsiLow = IndicatorCalculator.rsi(fallingPrices, 14);
    expect(rsiLow).toBeLessThan(10);
  });

  it('calculates MACD line, signal line, and histogram', () => {
    const longPrices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 10);
    const macdResult = IndicatorCalculator.macd(longPrices, 12, 26, 9);
    expect(macdResult).not.toBeNull();
    if (macdResult) {
      expect(macdResult).toHaveProperty('macd');
      expect(macdResult).toHaveProperty('signal');
      expect(macdResult).toHaveProperty('histogram');
      expect(macdResult.histogram).toBeCloseTo(macdResult.macd - macdResult.signal, 5);
    }
  });

  it('calculates Bollinger Bands (Middle, Upper, Lower)', () => {
    const bb = IndicatorCalculator.bollingerBands(samplePrices, 5, 2);
    expect(bb).not.toBeNull();
    if (bb) {
      expect(bb.middle).toBe(18);
      expect(bb.upper).toBeGreaterThan(bb.middle);
      expect(bb.lower).toBeLessThan(bb.middle);
    }
  });

  it('correctly extracts the last digit according to pip size', () => {
    expect(IndicatorCalculator.getLastDigit(1234.56, 2)).toBe(6);
    expect(IndicatorCalculator.getLastDigit(1234.567, 3)).toBe(7);
    expect(IndicatorCalculator.getLastDigit(1234.5, 1)).toBe(5);
    expect(IndicatorCalculator.getLastDigit(1230, 0)).toBe(0);
  });
});
