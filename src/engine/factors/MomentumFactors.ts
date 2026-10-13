/**
 * 2.2 动量特征 (Momentum Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, IndexBar, FactorItemResult } from '../../types/quant';
import { calculateReturn, calculateRSI } from '../indicators';

export class MomentumFactors implements IFactor {
  category = 'momentum' as const;
  categoryName = '动量特征';

  calculate(
    bars: DailyBar[],
    stockMeta: StockMeta,
    marketIndexBars?: IndexBar[],
    industryIndexBars?: IndexBar[]
  ): FactorItemResult {
    const len = bars.length;
    if (len < 10) {
      return {
        category: this.category,
        categoryName: this.categoryName,
        score: 50,
        normalizedValue: 0,
        signal: 0,
        state: 'InsufficientData',
        stateName: '数据不足',
        confidence: 0.2,
        explanation: '历史数据不足以分析价格动量。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const r1D = calculateReturn(closes, 1);
    const r3D = calculateReturn(closes, 3);
    const r5D = calculateReturn(closes, 5);
    const r10D = calculateReturn(closes, 10);
    const r20D = calculateReturn(closes, 20);
    const r60D = calculateReturn(closes, 60);
    const r120D = calculateReturn(closes, 120);
    const r250D = calculateReturn(closes, 250);

    const rsiArr = calculateRSI(closes, 14);
    const currentRSI = rsiArr[len - 1];

    // 计算对标大盘及行业相对收益
    let relMarket20D = 0;
    let relIndustry60D = 0;

    if (marketIndexBars && marketIndexBars.length >= 20) {
      const idxCloses = marketIndexBars.map(m => m.close);
      const marketR20 = calculateReturn(idxCloses, 20);
      relMarket20D = r20D - marketR20;
    }

    if (industryIndexBars && industryIndexBars.length >= 60) {
      const indCloses = industryIndexBars.map(m => m.close);
      const indR60 = calculateReturn(indCloses, 60);
      relIndustry60D = r60D - indR60;
    }

    // 动量加速度/衰减/背离识别
    const isAccelerating = r5D > 3 && r20D > 0 && r5D * 4 > r20D;
    const isDecelerating = r20D > 8 && r5D < -1;
    
    // RSI 顶背离: 近20日创新高但RSI下降
    let isRsiDivergence = false;
    if (len >= 30) {
      const maxPrice20 = Math.max(...closes.slice(len - 20));
      const last10RSI = rsiArr.slice(len - 10);
      const prev10RSI = rsiArr.slice(len - 20, len - 10);
      if (closes[len - 1] >= maxPrice20 * 0.98 && Math.max(...last10RSI) < Math.max(...prev10RSI) - 5) {
        isRsiDivergence = true;
      }
    }

    let state = 'NeutralMomentum';
    let stateName = '中性动量';
    let baseScore = 50;
    let signal: -1 | 0 | 1 = 0;
    let confidence = 0.6;

    // 评分模型: 短/中/长动量加权
    const momentumCombined = r5D * 0.3 + r20D * 0.4 + r60D * 0.3;
    baseScore = 50 + momentumCombined * 1.5 + relMarket20D * 0.8;

    if (isAccelerating) {
      state = 'AcceleratingMomentum';
      stateName = '动量加速向上';
      baseScore += 10;
      signal = 1;
      confidence = 0.85;
    } else if (r20D > 10 && r60D > 15) {
      state = 'StrongMomentum';
      stateName = '强劲中长期动量';
      signal = 1;
      confidence = 0.8;
    } else if (isDecelerating) {
      state = 'DeceleratingMomentum';
      stateName = '高位动量减弱';
      baseScore -= 10;
      signal = 0;
      confidence = 0.7;
    } else if (isRsiDivergence) {
      state = 'MomentumDivergence';
      stateName = 'RSI顶背离预警';
      baseScore -= 15;
      signal = -1;
      confidence = 0.75;
    } else if (r20D < -10 && r60D < -15) {
      state = 'NegativeMomentum';
      stateName = '显著负向动量';
      signal = -1;
      confidence = 0.8;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;

    const explanation = `近20日收益率 ${r20D > 0 ? '+' : ''}${r20D.toFixed(2)}%，60日收益率 ${r60D > 0 ? '+' : ''}${r60D.toFixed(2)}%，相较沪深300指数超额收益 ${relMarket20D > 0 ? '+' : ''}${relMarket20D.toFixed(2)}%。14日RSI为 ${currentRSI.toFixed(1)}。${isAccelerating ? '短期5日动量快速爆发呈现明显加速状态。' : isRsiDivergence ? '价格接近高位但RSI指标出现顶背离迹象。' : '动量与大盘风格相符。'}`;

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
        Return_1D_Pct: Number(r1D.toFixed(2)),
        Return_3D_Pct: Number(r3D.toFixed(2)),
        Return_5D_Pct: Number(r5D.toFixed(2)),
        Return_10D_Pct: Number(r10D.toFixed(2)),
        Return_20D_Pct: Number(r20D.toFixed(2)),
        Return_60D_Pct: Number(r60D.toFixed(2)),
        Return_120D_Pct: Number(r120D.toFixed(2)),
        Return_250D_Pct: Number(r250D.toFixed(2)),
        RSI_14: Number(currentRSI.toFixed(1)),
        RelReturn20D_vs_CSI300: Number(relMarket20D.toFixed(2)),
        RelReturn60D_vs_Industry: Number(relIndustry60D.toFixed(2)),
        Is_Accelerating: isAccelerating,
        Is_Rsi_Divergence: isRsiDivergence,
      },
    };
  }
}
