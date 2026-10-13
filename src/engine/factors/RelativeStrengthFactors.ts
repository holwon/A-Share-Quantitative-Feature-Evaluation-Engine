/**
 * 2.9 横截面强弱特征 (Relative Strength / Cross-Sectional Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, IndexBar, FactorItemResult } from '../../types/quant';
import { calculateReturn } from '../indicators';

export class RelativeStrengthFactors implements IFactor {
  category = 'relative_strength' as const;
  categoryName = '横截面相对强弱';

  calculate(
    bars: DailyBar[],
    stockMeta: StockMeta,
    marketIndexBars?: IndexBar[],
    industryIndexBars?: IndexBar[]
  ): FactorItemResult {
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
        explanation: '历史数据不足以计算横截面相对强弱。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const stkR20 = calculateReturn(closes, 20);
    const stkR60 = calculateReturn(closes, 60);
    const stkR120 = calculateReturn(closes, Math.min(120, len - 1));

    let mktR20 = 0;
    let mktR60 = 0;
    if (marketIndexBars && marketIndexBars.length >= 20) {
      const mktCloses = marketIndexBars.map(m => m.close);
      mktR20 = calculateReturn(mktCloses, 20);
      mktR60 = calculateReturn(mktCloses, Math.min(60, marketIndexBars.length - 1));
    }

    let indR20 = 0;
    let indR60 = 0;
    if (industryIndexBars && industryIndexBars.length >= 20) {
      const indCloses = industryIndexBars.map(m => m.close);
      indR20 = calculateReturn(indCloses, 20);
      indR60 = calculateReturn(indCloses, Math.min(60, industryIndexBars.length - 1));
    }

    const relStrength20VsMarket = stkR20 - mktR20;
    const relStrength60VsMarket = stkR60 - mktR60;
    const relStrength20VsIndustry = stkR20 - indR20;

    // 估算横截面百分位 (0~100)
    // 根据20日超额收益模拟横截面百分位
    const marketPercentile = Math.min(99, Math.max(1, Math.round(50 + relStrength20VsMarket * 2.5)));
    const industryPercentile = Math.min(99, Math.max(1, Math.round(50 + relStrength20VsIndustry * 3.0)));

    const marketTotal = 5200;
    const industryTotal = 120;

    const marketRank = Math.max(1, Math.round(marketTotal * (1 - marketPercentile / 100)));
    const industryRank = Math.max(1, Math.round(industryTotal * (1 - industryPercentile / 100)));

    let state = 'MarketAverage';
    let stateName = '市场平均水平';
    let baseScore = 50;
    let signal: -1 | 0 | 1 = 0;

    if (relStrength20VsMarket > 10 && relStrength20VsIndustry > 5) {
      state = 'TopMarketLeader';
      stateName = '全市场及行业领头强庄股';
      baseScore = 90;
      signal = 1;
    } else if (relStrength20VsMarket > 3) {
      state = 'OutperformingMarket';
      stateName = '跑赢大盘超额活跃';
      baseScore = 75;
      signal = 1;
    } else if (relStrength20VsMarket < -10) {
      state = 'SeverelyLaggard';
      stateName = '严重跑输大盘(弱势沉闷)';
      baseScore = 20;
      signal = -1;
    } else if (relStrength20VsMarket < -3) {
      state = 'Underperforming';
      stateName = '弱于大盘表现';
      baseScore = 38;
      signal = -1;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;

    const explanation = `20日相对沪深300超额收益 ${relStrength20VsMarket > 0 ? '+' : ''}${relStrength20VsMarket.toFixed(2)}%，相对所属行业超额收益 ${relStrength20VsIndustry > 0 ? '+' : ''}${relStrength20VsIndustry.toFixed(2)}%。全市场推算排名约 ${marketRank} / ${marketTotal} (前 ${marketPercentile}%)，行业推算排名 ${industryRank} / ${industryTotal}。评估为 [${stateName}]。`;

    return {
      category: this.category,
      categoryName: this.categoryName,
      score: finalScore,
      normalizedValue: Number(normalizedVal.toFixed(2)),
      signal,
      state,
      stateName,
      confidence: 0.85,
      explanation,
      rawIndicators: {
        RelStrength_20D_vs_CSI300: Number(relStrength20VsMarket.toFixed(2)),
        RelStrength_60D_vs_CSI300: Number(relStrength60VsMarket.toFixed(2)),
        RelStrength_20D_vs_Industry: Number(relStrength20VsIndustry.toFixed(2)),
        Market_Percentile: marketPercentile,
        Industry_Percentile: industryPercentile,
        Market_Rank_Estimated: marketRank,
        Market_Total: marketTotal,
        Industry_Rank_Estimated: industryRank,
        Industry_Total: industryTotal,
      },
    };
  }
}
