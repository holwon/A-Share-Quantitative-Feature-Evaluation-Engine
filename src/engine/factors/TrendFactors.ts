/**
 * 2.1 趋势特征 (Trend Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, IndexBar, FactorItemResult } from '../../types/quant';
import { calculateSMA, calculateMASlope, calculateADX } from '../indicators';

export class TrendFactors implements IFactor {
  category = 'trend' as const;
  categoryName = '趋势特征';

  calculate(bars: DailyBar[], stockMeta: StockMeta): FactorItemResult {
    const len = bars.length;
    if (len < 20) {
      return {
        category: this.category,
        categoryName: this.categoryName,
        score: 50,
        normalizedValue: 0,
        signal: 0,
        state: 'InsufficientData',
        stateName: '数据不足(低于20日)',
        confidence: 0.2,
        explanation: '历史交易天数不足以判断趋势结构。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const lastPrice = closes[len - 1];

    const ma5Arr = calculateSMA(closes, 5);
    const ma10Arr = calculateSMA(closes, 10);
    const ma20Arr = calculateSMA(closes, 20);
    const ma60Arr = calculateSMA(closes, 60);
    const ma120Arr = calculateSMA(closes, 120);
    const ma250Arr = calculateSMA(closes, 250);

    const ma5 = ma5Arr[len - 1];
    const ma10 = ma10Arr[len - 1];
    const ma20 = ma20Arr[len - 1];
    const ma60 = ma60Arr[len - 1];
    const ma120 = len >= 120 ? ma120Arr[len - 1] : ma60;
    const ma250 = len >= 250 ? ma250Arr[len - 1] : ma120;

    const slopeMA5 = calculateMASlope(ma5Arr, 5);
    const slopeMA20 = calculateMASlope(ma20Arr, 5);
    const slopeMA60 = calculateMASlope(ma60Arr, 10);

    const priceMa20Ratio = ma20 > 0 ? lastPrice / ma20 : 1;
    const priceMa60Ratio = ma60 > 0 ? lastPrice / ma60 : 1;

    const { adx, diPlus, diMinus } = calculateADX(bars, 14);
    const curADX = adx[len - 1];
    const curDIPlus = diPlus[len - 1];
    const curDIMinus = diMinus[len - 1];

    // 排列特征判定
    const isBullishAlignment = ma5 > ma10 && ma10 > ma20 && ma20 > ma60;
    const isBearishAlignment = ma5 < ma10 && ma10 < ma20 && ma20 < ma60;
    const isAboveLongTermMA = lastPrice > ma120 && lastPrice > ma250;

    let state = 'Sideways';
    let stateName = '震荡整理';
    let baseScore = 50;
    let signal: -1 | 0 | 1 = 0;
    let confidence = 0.5;

    if (isBullishAlignment && slopeMA20 > 0 && curADX > 25) {
      state = 'StrongUptrend';
      stateName = '强劲多头排列趋势';
      baseScore = 85 + Math.min(15, (curADX - 25) * 0.5);
      signal = 1;
      confidence = 0.9;
    } else if (lastPrice > ma20 && ma20 > ma60 && curDIPlus > curDIMinus) {
      state = 'Uptrend';
      stateName = '温和上涨趋势';
      baseScore = 68 + Math.min(15, slopeMA20 * 10);
      signal = 1;
      confidence = 0.75;
    } else if (isBearishAlignment && slopeMA20 < 0 && curADX > 25) {
      state = 'StrongDowntrend';
      stateName = '强劲空头排列趋势';
      baseScore = 15 - Math.min(10, (curADX - 25) * 0.5);
      signal = -1;
      confidence = 0.9;
    } else if (lastPrice < ma20 && ma20 < ma60 && curDIMinus > curDIPlus) {
      state = 'Downtrend';
      stateName = '下跌趋势';
      baseScore = 32 - Math.min(15, Math.abs(slopeMA20) * 10);
      signal = -1;
      confidence = 0.75;
    } else {
      state = 'Sideways';
      stateName = '无明显趋势/震荡';
      baseScore = 48 + (curDIPlus > curDIMinus ? 5 : -5);
      signal = 0;
      confidence = 0.6;
    }

    if (isAboveLongTermMA && signal >= 0) {
      baseScore += 5;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50; // -1 to +1

    const explanation = `最新价 ¥${lastPrice.toFixed(2)}，MA5(${ma5.toFixed(2)}) > MA10(${ma10.toFixed(2)}) > MA20(${ma20.toFixed(2)}) 均线排列为${isBullishAlignment ? '典型多头' : isBearishAlignment ? '典型空头' : '无缝交织'}，MA20五日斜率为 ${slopeMA20 > 0 ? '+' : ''}${slopeMA20.toFixed(2)}%/日。ADX为 ${curADX.toFixed(1)}，DI+(${curDIPlus.toFixed(1)}) vs DI-(${curDIMinus.toFixed(1)})。综合趋势状态判定为 [${stateName}]。`;

    return {
      category: this.category,
      categoryName: this.categoryName,
      score: finalScore,
      normalizedValue: Number(normalizedVal.toFixed(2)),
      signal,
      state,
      stateName,
      confidence: Number(confidence.toFixed(2)),
      explanation,
      rawIndicators: {
        MA5: Number(ma5.toFixed(2)),
        MA10: Number(ma10.toFixed(2)),
        MA20: Number(ma20.toFixed(2)),
        MA60: Number(ma60.toFixed(2)),
        MA120: Number(ma120.toFixed(2)),
        MA250: Number(ma250.toFixed(2)),
        MA20_Slope_Pct: Number(slopeMA20.toFixed(2)),
        MA60_Slope_Pct: Number(slopeMA60.toFixed(2)),
        Price_MA20_Ratio: Number(priceMa20Ratio.toFixed(3)),
        Price_MA60_Ratio: Number(priceMa60Ratio.toFixed(3)),
        ADX_14: Number(curADX.toFixed(2)),
        DI_Plus_14: Number(curDIPlus.toFixed(2)),
        DI_Minus_14: Number(curDIMinus.toFixed(2)),
        Is_Bullish_Alignment: isBullishAlignment,
        Is_Bearish_Alignment: isBearishAlignment,
      },
    };
  }
}
