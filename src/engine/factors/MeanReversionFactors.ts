/**
 * 2.6 均值回归 / 超跌特征 (Mean Reversion / Oversold Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, FactorItemResult } from '../../types/quant';
import { calculateRSI, calculateBollingerBands, calculateZScore, calculateSMA } from '../indicators';

export class MeanReversionFactors implements IFactor {
  category = 'mean_reversion' as const;
  categoryName = '均值回归/超跌特征';

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
        stateName: '数据不足',
        confidence: 0.2,
        explanation: '历史数据不足以评估超跌与均值回归特征。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const lastPrice = closes[len - 1];

    const rsiArr = calculateRSI(closes, 14);
    const currentRSI = rsiArr[len - 1];

    const bb = calculateBollingerBands(closes, 20, 2);
    const curPercentB = bb.percentB[len - 1];
    const lowerBB = bb.lower[len - 1];

    const zScore5 = calculateZScore(closes, 5)[len - 1];
    const zScore10 = calculateZScore(closes, 10)[len - 1];
    const zScore20 = calculateZScore(closes, 20)[len - 1];

    const ma20 = calculateSMA(closes, 20)[len - 1];
    const ma60 = calculateSMA(closes, 60)[len - 1];

    // 计算连续下跌天数
    let consecutiveDownDays = 0;
    for (let i = len - 1; i >= 1; i--) {
      if (bars[i].close < bars[i - 1].close) {
        consecutiveDownDays++;
      } else {
        break;
      }
    }

    // 短期5日最大跌幅
    const maxShortTermDrop = len >= 5 ? ((lastPrice - Math.max(...closes.slice(len - 5))) / Math.max(...closes.slice(len - 5))) * 100 : 0;

    // 严谨区分：1) 正常回调 (主升浪中) 2) 经典超跌反弹 3) 趋势破坏杀跌 (非超跌机会!)
    const isMajorUptrend = ma20 > ma60 && ma60 > 0;
    const isOversoldConditions = currentRSI < 30 && curPercentB < 0.05 && zScore20 < -2.0;

    let state = 'NotOversold';
    let stateName = '非超跌状态';
    let baseScore = 30; // 默认均值回归得分偏低
    let signal: -1 | 0 | 1 = 0;
    let confidence = 0.6;

    if (isMajorUptrend && lastPrice < ma20 && currentRSI >= 40 && currentRSI <= 55) {
      state = 'NormalPullback';
      stateName = '上升趋势中的健康回调(支撑有效)';
      baseScore = 82;
      signal = 1;
      confidence = 0.85;
    } else if (isOversoldConditions && isMajorUptrend) {
      state = 'OversoldInUptrend';
      stateName = '上升趋势严重洗盘超跌(黄金弹射点)';
      baseScore = 90;
      signal = 1;
      confidence = 0.9;
    } else if (isOversoldConditions && !isMajorUptrend) {
      state = 'ExtremeOversold';
      stateName = '技术性严重超跌(强反弹预期)';
      baseScore = 72;
      signal = 1;
      confidence = 0.75;
    } else if (lastPrice < ma60 * 0.9 && zScore20 < -1.5 && !isMajorUptrend) {
      state = 'TrendBreakdownFall';
      stateName = '【警告】破位破势杀跌(非抄底契机)';
      baseScore = 15;
      signal = -1;
      confidence = 0.88;
    } else if (currentRSI > 75 || curPercentB > 1.0) {
      state = 'Overbought';
      stateName = '严重超买(回调压力累积)';
      baseScore = 20;
      signal = -1;
      confidence = 0.8;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;

    const explanation = `RSI(14)为 ${currentRSI.toFixed(1)}，布林带 %B位置 ${(curPercentB * 100).toFixed(1)}%，20日Z-Score为 ${zScore20.toFixed(2)}。近5日最大跌幅 ${maxShortTermDrop.toFixed(2)}%，连续下跌 ${consecutiveDownDays} 天。结合长期均线结构，评估为 [${stateName}]。`;

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
        RSI_14: Number(currentRSI.toFixed(1)),
        Bollinger_PercentB: Number(curPercentB.toFixed(3)),
        Bollinger_Lower: Number(lowerBB.toFixed(2)),
        ZScore_5D: Number(zScore5.toFixed(2)),
        ZScore_10D: Number(zScore10.toFixed(2)),
        ZScore_20D: Number(zScore20.toFixed(2)),
        Price_MA20_Ratio: Number((lastPrice / ma20).toFixed(3)),
        Consecutive_Down_Days: consecutiveDownDays,
        Max_ShortTerm_Drop_Pct: Number(maxShortTermDrop.toFixed(2)),
      },
    };
  }
}
