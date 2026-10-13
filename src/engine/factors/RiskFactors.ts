/**
 * 2.8 回撤 / 风险特征 (Risk & Drawdown Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, IndexBar, FactorItemResult } from '../../types/quant';
import { calculateMaxDrawdown, calculateATR, calculateHistoricalVolatility } from '../indicators';

export class RiskFactors implements IFactor {
  category = 'risk' as const;
  categoryName = '回撤与风险特征';

  calculate(
    bars: DailyBar[],
    stockMeta: StockMeta,
    marketIndexBars?: IndexBar[]
  ): FactorItemResult {
    const len = bars.length;
    if (len < 10) {
      return {
        category: this.category,
        categoryName: this.categoryName,
        score: 50,
        normalizedValue: 0,
        signal: 0,
        state: 'MediumRisk',
        stateName: '中等风险(数据不足)',
        confidence: 0.3,
        explanation: '历史数据不足以评估全面风险指标。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);

    const dd20 = calculateMaxDrawdown(closes, 20);
    const dd60 = calculateMaxDrawdown(closes, 60);
    const dd120 = calculateMaxDrawdown(closes, 120);
    const dd250 = calculateMaxDrawdown(closes, Math.min(250, len));

    const { atrPct } = calculateATR(bars, 14);
    const currentAtrPct = atrPct[len - 1];

    const hv20 = calculateHistoricalVolatility(closes, 20);

    // 最大单日跌幅 (近60日)
    let maxSingleDayDrop = 0;
    for (let i = Math.max(1, len - 60); i < len; i++) {
      const drop = ((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100;
      if (drop < maxSingleDayDrop) {
        maxSingleDayDrop = drop;
      }
    }

    // 计算 Beta 相对大盘
    let beta = 1.0;
    if (marketIndexBars && marketIndexBars.length >= 20 && len >= 2) {
      const stockReturns: number[] = [];
      const marketReturns: number[] = [];
      const sliceLen = Math.min(60, len - 1, marketIndexBars.length - 1);
      const mktLen = marketIndexBars.length;

      for (let k = 0; k < sliceLen; k++) {
        const stkIdx = len - sliceLen + k;
        const mktIdx = mktLen - sliceLen + k;
        const stkBar = bars[stkIdx];
        const stkPrev = bars[stkIdx - 1];
        const mktBar = marketIndexBars[mktIdx];
        const mktPrev = marketIndexBars[mktIdx - 1];

        if (stkBar && stkPrev && mktBar && mktPrev && stkPrev.close > 0 && mktPrev.close > 0) {
          stockReturns.push((stkBar.close - stkPrev.close) / stkPrev.close);
          marketReturns.push((mktBar.close - mktPrev.close) / mktPrev.close);
        }
      }

      if (stockReturns.length >= 10) {
        const actualLen = stockReturns.length;
        const mktMean = marketReturns.reduce((a, b) => a + b, 0) / actualLen;
        const stkMean = stockReturns.reduce((a, b) => a + b, 0) / actualLen;

        let cov = 0;
        let varMkt = 0;
        for (let j = 0; j < actualLen; j++) {
          cov += (stockReturns[j] - stkMean) * (marketReturns[j] - mktMean);
          varMkt += Math.pow(marketReturns[j] - mktMean, 2);
        }

        if (varMkt > 0) {
          beta = cov / varMkt;
        }
      }
    }

    // 风险综合评分 (分数越高代表风险越大)
    let rawRiskScore = 10;
    rawRiskScore += Math.min(30, dd250.maxDrawdown * 0.8);
    rawRiskScore += Math.min(25, currentAtrPct * 3.5);
    rawRiskScore += Math.min(20, Math.abs(maxSingleDayDrop) * 2.0);
    if (beta > 1.3) rawRiskScore += 10;

    if (stockMeta.isST) rawRiskScore += 25;

    const riskScore = normalizeScore(rawRiskScore);

    let level: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Medium';
    let levelName = '中等风险';

    if (riskScore < 35) {
      level = 'Low';
      levelName = '低风险(波动回撤可控)';
    } else if (riskScore < 60) {
      level = 'Medium';
      levelName = '中等风险(正常市场波动)';
    } else if (riskScore < 80) {
      level = 'High';
      levelName = '高风险(深幅回撤/剧烈波动)';
    } else {
      level = 'Extreme';
      levelName = '极高风险(严重爆破性下行)';
    }

    const explanation = `近250日最大回撤 ${dd250.maxDrawdown.toFixed(1)}% (20日 ${dd20.maxDrawdown.toFixed(1)}%)，ATR%为 ${currentAtrPct.toFixed(2)}%，近60日最大单日跌幅 ${maxSingleDayDrop.toFixed(2)}%。相对于沪深300指数 Beta 值为 ${beta.toFixed(2)}。风险评估为 [${levelName}]。`;

    return {
      category: this.category,
      categoryName: this.categoryName,
      score: riskScore, // 注意：此处分数为风险得分
      normalizedValue: Number(((riskScore - 50) / 50).toFixed(2)),
      signal: riskScore > 65 ? -1 : riskScore < 35 ? 1 : 0,
      state: level,
      stateName: levelName,
      confidence: 0.9,
      explanation,
      rawIndicators: {
        Max_Drawdown_20D_Pct: Number(dd20.maxDrawdown.toFixed(2)),
        Max_Drawdown_60D_Pct: Number(dd60.maxDrawdown.toFixed(2)),
        Max_Drawdown_120D_Pct: Number(dd120.maxDrawdown.toFixed(2)),
        Max_Drawdown_250D_Pct: Number(dd250.maxDrawdown.toFixed(2)),
        Current_Drawdown_250D_Pct: Number(dd250.currentDrawdown.toFixed(2)),
        ATR_Pct: Number(currentAtrPct.toFixed(2)),
        HV_20D_Annualized: Number(hv20.toFixed(2)),
        Beta_vs_CSI300: Number(beta.toFixed(2)),
        Max_Single_Day_Drop_Pct: Number(maxSingleDayDrop.toFixed(2)),
      },
    };
  }
}
