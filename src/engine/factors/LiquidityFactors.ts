/**
 * 2.7 流动性特征 (Liquidity Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, FactorItemResult } from '../../types/quant';

export class LiquidityFactors implements IFactor {
  category = 'liquidity' as const;
  categoryName = '流动性特征';

  // 最低流动性门槛 (20日日均成交额低于 5,000 万元视为流动性不足)
  private minAmountThresholdYuan = 50_000_000;

  calculate(bars: DailyBar[], stockMeta: StockMeta): FactorItemResult {
    const len = bars.length;
    if (len === 0) {
      return {
        category: this.category,
        categoryName: this.categoryName,
        score: 0,
        normalizedValue: -1,
        signal: -1,
        state: 'Avoid',
        stateName: '极度不合规',
        confidence: 1,
        explanation: '无有效历史数据。',
        rawIndicators: {},
      };
    }

    const window20 = Math.min(20, len);
    const window60 = Math.min(60, len);

    const slice20 = bars.slice(len - window20);
    const slice60 = bars.slice(len - window60);

    const sumAmt20 = slice20.reduce((acc, b) => acc + b.amount, 0);
    const avgAmount20Yuan = sumAmt20 / window20; // 元

    const sumAmt60 = slice60.reduce((acc, b) => acc + b.amount, 0);
    const avgAmount60Yuan = sumAmt60 / window60;

    const avgVol20 = slice20.reduce((acc, b) => acc + b.volume, 0) / window20;
    const avgVol60 = slice60.reduce((acc, b) => acc + b.volume, 0) / window60;

    const avgTurnover20 = slice20.reduce((acc, b) => acc + (b.turnoverRate || 1.5), 0) / window20;

    const avgAmount20InYi = avgAmount20Yuan / 100_000_000; // 亿元
    const avgAmount60InYi = avgAmount60Yuan / 100_000_000;

    const isEligible = avgAmount20Yuan >= this.minAmountThresholdYuan && !stockMeta.isST;

    let grade: 'Excellent' | 'Good' | 'Normal' | 'Poor' | 'Avoid' = 'Normal';
    let gradeName = '普通流动性';
    let baseScore = 50;

    if (avgAmount20InYi >= 10.0) {
      grade = 'Excellent';
      gradeName = '充沛极佳(日均成交额>10亿)';
      baseScore = 95;
    } else if (avgAmount20InYi >= 3.0) {
      grade = 'Good';
      gradeName = '良好充裕(日均成交额3~10亿)';
      baseScore = 82;
    } else if (avgAmount20InYi >= 1.0) {
      grade = 'Normal';
      gradeName = '适中正常(日均成交额1~3亿)';
      baseScore = 68;
    } else if (avgAmount20InYi >= 0.5) {
      grade = 'Poor';
      gradeName = '偏低(日均成交额5000万~1亿)';
      baseScore = 40;
    } else {
      grade = 'Avoid';
      gradeName = '极差(日均成交额<5000万/流动性陷阱)';
      baseScore = 15;
    }

    if (stockMeta.isST) {
      grade = 'Avoid';
      gradeName = 'ST特别处理股票(高流动性折价风险)';
      baseScore = Math.min(baseScore, 20);
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;
    const signal: -1 | 0 | 1 = isEligible ? (finalScore >= 70 ? 1 : 0) : -1;

    const explanation = `近20日日均成交额约 ¥${avgAmount20InYi.toFixed(2)} 亿元 (60日 ¥${avgAmount60InYi.toFixed(2)} 亿)，日均换手率 ${avgTurnover20.toFixed(2)}%。${isEligible ? '满足量化交易最低流动性门槛。' : '低于5000万日均成交额门槛，存在流动性折价风险。'}分级为 [${gradeName}]。`;

    return {
      category: this.category,
      categoryName: this.categoryName,
      score: finalScore,
      normalizedValue: Number(normalizedVal.toFixed(2)),
      signal,
      state: grade,
      stateName: gradeName,
      confidence: 0.95,
      explanation,
      rawIndicators: {
        AVG_Amount_20D_Yi: Number(avgAmount20InYi.toFixed(2)),
        AVG_Amount_60D_Yi: Number(avgAmount60InYi.toFixed(2)),
        AVG_Volume_20D: Math.round(avgVol20),
        AVG_Volume_60D: Math.round(avgVol60),
        AVG_Turnover_Rate_20D_Pct: Number(avgTurnover20.toFixed(2)),
        Liquidity_Eligible: isEligible,
        Is_ST: stockMeta.isST,
      },
    };
  }
}
