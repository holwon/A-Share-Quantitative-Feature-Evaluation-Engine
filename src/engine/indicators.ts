/**
 * A股量化特征评估引擎 - 基础技术指标与数据计算工具
 */

import { DailyBar } from '../types/quant';

/**
 * 计算简单移动平均线 (SMA)
 */
export function calculateSMA(data: number[], window: number): number[] {
  const result: number[] = new Array(data.length).fill(0);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= window) {
      sum -= data[i - window];
    }
    if (i >= window - 1) {
      result[i] = sum / window;
    } else {
      result[i] = sum / (i + 1);
    }
  }
  return result;
}

/**
 * 计算指数移动平均线 (EMA)
 */
export function calculateEMA(data: number[], window: number): number[] {
  const result: number[] = new Array(data.length).fill(0);
  if (data.length === 0) return result;
  
  const k = 2 / (window + 1);
  result[0] = data[0];
  
  for (let i = 1; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * 计算均线斜率 (以百分比/日计)
 */
export function calculateMASlope(maValues: number[], window: number = 5): number {
  const len = maValues.length;
  if (len < window || maValues[len - window] === 0) return 0;
  const startVal = maValues[len - window];
  const endVal = maValues[len - 1];
  return ((endVal - startVal) / startVal) * (100 / window);
}

/**
 * 计算相对强弱指标 (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsi;
}

/**
 * 计算真实波幅 (TR) 与 真实波幅均值 (ATR)
 */
export function calculateATR(bars: DailyBar[], period: number = 14): { tr: number[]; atr: number[]; atrPct: number[] } {
  const len = bars.length;
  const tr: number[] = new Array(len).fill(0);
  const atr: number[] = new Array(len).fill(0);
  const atrPct: number[] = new Array(len).fill(0);

  if (len === 0) return { tr, atr, atrPct };

  tr[0] = bars[0].high - bars[0].low;
  for (let i = 1; i < len; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const prevClose = bars[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
  }

  // 计算 Wilder's Smoothing ATR
  let sumTR = 0;
  for (let i = 0; i < Math.min(period, len); i++) {
    sumTR += tr[i];
  }
  atr[Math.min(period, len) - 1] = sumTR / Math.min(period, len);

  for (let i = period; i < len; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  for (let i = 0; i < len; i++) {
    if (bars[i].close > 0) {
      atrPct[i] = (atr[i] / bars[i].close) * 100;
    }
  }

  return { tr, atr, atrPct };
}

/**
 * 计算平均趋向指标 ADX, DI+, DI-
 */
export function calculateADX(bars: DailyBar[], period: number = 14): { adx: number[]; diPlus: number[]; diMinus: number[] } {
  const len = bars.length;
  const adx = new Array(len).fill(20);
  const diPlus = new Array(len).fill(20);
  const diMinus = new Array(len).fill(20);

  if (len <= period) return { adx, diPlus, diMinus };

  const { tr } = calculateATR(bars, period);
  const dmPlus = new Array(len).fill(0);
  const dmMinus = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;

    if (upMove > downMove && upMove > 0) {
      dmPlus[i] = upMove;
    }
    if (downMove > upMove && downMove > 0) {
      dmMinus[i] = downMove;
    }
  }

  // 平滑 TR, DM+, DM-
  let smoothTR = 0;
  let smoothDMPlus = 0;
  let smoothDMMinus = 0;

  for (let i = 1; i <= period; i++) {
    smoothTR += tr[i];
    smoothDMPlus += dmPlus[i];
    smoothDMMinus += dmMinus[i];
  }

  const dxList = new Array(len).fill(0);

  for (let i = period; i < len; i++) {
    if (i > period) {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothDMPlus = smoothDMPlus - smoothDMPlus / period + dmPlus[i];
      smoothDMMinus = smoothDMMinus - smoothDMMinus / period + dmMinus[i];
    }

    const plusDIVal = smoothTR > 0 ? (smoothDMPlus / smoothTR) * 100 : 0;
    const minusDIVal = smoothTR > 0 ? (smoothDMMinus / smoothTR) * 100 : 0;

    diPlus[i] = plusDIVal;
    diMinus[i] = minusDIVal;

    const diSum = plusDIVal + minusDIVal;
    const diDiff = Math.abs(plusDIVal - minusDIVal);
    dxList[i] = diSum > 0 ? (diDiff / diSum) * 100 : 0;
  }

  // 计算 ADX (DX的滑动平均)
  let sumDX = 0;
  for (let i = period; i < period * 2 && i < len; i++) {
    sumDX += dxList[i];
  }
  if (len >= period * 2) {
    adx[period * 2 - 1] = sumDX / period;
    for (let i = period * 2; i < len; i++) {
      adx[i] = (adx[i - 1] * (period - 1) + dxList[i]) / period;
    }
  }

  return { adx, diPlus, diMinus };
}

/**
 * 计算唐奇安通道 (Donchian Channel)
 */
export function calculateDonchianChannel(bars: DailyBar[], window: number = 20): { upper: number[]; lower: number[]; middle: number[] } {
  const len = bars.length;
  const upper = new Array(len).fill(0);
  const lower = new Array(len).fill(0);
  const middle = new Array(len).fill(0);

  for (let i = 0; i < len; i++) {
    const startIdx = Math.max(0, i - window + 1);
    let maxHigh = -Infinity;
    let minLow = Infinity;

    for (let j = startIdx; j <= i; j++) {
      if (bars[j].high > maxHigh) maxHigh = bars[j].high;
      if (bars[j].low < minLow) minLow = bars[j].low;
    }

    upper[i] = maxHigh;
    lower[i] = minLow;
    middle[i] = (maxHigh + minLow) / 2;
  }

  return { upper, lower, middle };
}

/**
 * 计算布林带 (Bollinger Bands)
 */
export function calculateBollingerBands(closes: number[], window: number = 20, multiplier: number = 2): {
  middle: number[];
  upper: number[];
  lower: number[];
  bandwidth: number[];
  percentB: number[];
} {
  const len = closes.length;
  const sma = calculateSMA(closes, window);
  const upper = new Array(len).fill(0);
  const lower = new Array(len).fill(0);
  const bandwidth = new Array(len).fill(0);
  const percentB = new Array(len).fill(0.5);

  for (let i = 0; i < len; i++) {
    const startIdx = Math.max(0, i - window + 1);
    const count = i - startIdx + 1;
    let varianceSum = 0;

    for (let j = startIdx; j <= i; j++) {
      varianceSum += Math.pow(closes[j] - sma[i], 2);
    }

    const std = Math.sqrt(varianceSum / count);
    upper[i] = sma[i] + multiplier * std;
    lower[i] = sma[i] - multiplier * std;

    if (sma[i] > 0) {
      bandwidth[i] = (upper[i] - lower[i]) / sma[i];
    }

    const bandRange = upper[i] - lower[i];
    if (bandRange > 0) {
      percentB[i] = (closes[i] - lower[i]) / bandRange;
    }
  }

  return { middle: sma, upper, lower, bandwidth, percentB };
}

/**
 * 计算能量潮指标 (OBV)
 */
export function calculateOBV(bars: DailyBar[]): number[] {
  const len = bars.length;
  const obv = new Array(len).fill(0);
  if (len === 0) return obv;

  obv[0] = bars[0].volume;
  for (let i = 1; i < len; i++) {
    if (bars[i].close > bars[i - 1].close) {
      obv[i] = obv[i - 1] + bars[i].volume;
    } else if (bars[i].close < bars[i - 1].close) {
      obv[i] = obv[i - 1] - bars[i].volume;
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return obv;
}

/**
 * 计算 Z-Score
 */
export function calculateZScore(data: number[], window: number = 20): number[] {
  const len = data.length;
  const zscore = new Array(len).fill(0);
  const sma = calculateSMA(data, window);

  for (let i = 0; i < len; i++) {
    const startIdx = Math.max(0, i - window + 1);
    const count = i - startIdx + 1;
    let varSum = 0;

    for (let j = startIdx; j <= i; j++) {
      varSum += Math.pow(data[j] - sma[i], 2);
    }

    const std = Math.sqrt(varSum / count);
    if (std > 0) {
      zscore[i] = (data[i] - sma[i]) / std;
    }
  }

  return zscore;
}

/**
 * 计算 N 日收益率 (%)
 */
export function calculateReturn(closes: number[], period: number): number {
  const len = closes.length;
  if (len <= period || closes[len - 1 - period] === 0) return 0;
  const current = closes[len - 1];
  const past = closes[len - 1 - period];
  return ((current - past) / past) * 100;
}

/**
 * 计算 N 日最大回撤 (%)
 */
export function calculateMaxDrawdown(closes: number[], window: number = 250): { maxDrawdown: number; currentDrawdown: number } {
  const len = closes.length;
  if (len === 0) return { maxDrawdown: 0, currentDrawdown: 0 };

  const startIdx = Math.max(0, len - window);
  const slice = closes.slice(startIdx);

  let maxPrice = slice[0];
  let maxDd = 0;

  for (let i = 0; i < slice.length; i++) {
    if (slice[i] > maxPrice) {
      maxPrice = slice[i];
    }
    const dd = (maxPrice - slice[i]) / maxPrice;
    if (dd > maxDd) {
      maxDd = dd;
    }
  }

  const currentMax = Math.max(...slice);
  const currentPrice = slice[slice.length - 1];
  const currentDd = currentMax > 0 ? (currentMax - currentPrice) / currentMax : 0;

  return {
    maxDrawdown: maxDd * 100,
    currentDrawdown: currentDd * 100,
  };
}

/**
 * 计算历史波动率 (年化 %)
 */
export function calculateHistoricalVolatility(closes: number[], window: number = 20): number {
  if (closes.length < window + 1) return 0;

  const returns: number[] = [];
  const startIdx = closes.length - window - 1;

  for (let i = startIdx + 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const varSum = returns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const sampleStd = Math.sqrt(varSum / Math.max(1, returns.length - 1));

  // 252 交易日年化
  return sampleStd * Math.sqrt(252) * 100;
}

/**
 * 计算皮尔逊价格-成交量相关系数
 */
export function calculatePriceVolumeCorrelation(closes: number[], volumes: number[], window: number = 20): number {
  const len = Math.min(closes.length, volumes.length);
  if (len < window) return 0;

  const pSlice = closes.slice(len - window);
  const vSlice = volumes.slice(len - window);

  const meanP = pSlice.reduce((a, b) => a + b, 0) / window;
  const meanV = vSlice.reduce((a, b) => a + b, 0) / window;

  let num = 0;
  let denP = 0;
  let denV = 0;

  for (let i = 0; i < window; i++) {
    const diffP = pSlice[i] - meanP;
    const diffV = vSlice[i] - meanV;
    num += diffP * diffV;
    denP += diffP * diffP;
    denV += diffV * diffV;
  }

  if (denP === 0 || denV === 0) return 0;
  return num / Math.sqrt(denP * denV);
}
