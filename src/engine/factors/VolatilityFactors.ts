/**
 * 2.5 波动率特征 (Volatility Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, FactorItemResult } from '../../types/quant';
import { calculateATR, calculateBollingerBands, calculateHistoricalVolatility, calculateSMA } from '../indicators';

export class VolatilityFactors implements IFactor {
  category = 'volatility' as const;
  categoryName = '波动率特征';

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
        explanation: '历史数据不足以分析波动率特征。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);
    const lastBar = bars[len - 1];

    const hv20 = calculateHistoricalVolatility(closes, 20);
    const hv60 = calculateHistoricalVolatility(closes, Math.min(60, len - 1));

    const { atr, atrPct } = calculateATR(bars, 14);
    const currentATR = atr[len - 1];
    const currentATRPct = atrPct[len - 1];

    const bb = calculateBollingerBands(closes, 20, 2);
    const curBBW = bb.bandwidth[len - 1];
    
    // 计算近20日布林带最小宽度 (用来评估收缩程度)
    const bbw20Slice = bb.bandwidth.slice(Math.max(0, len - 20));
    const minBBW20 = Math.min(...bbw20Slice);

    const volMa20 = calculateSMA(volumes, 20)[len - 1];
    const isVolumeSpike = volMa20 > 0 && lastBar.volume / volMa20 >= 1.4;

    // 前5日内是否出现极度收窄 (<10%分位)
    const isVolSqueezeInPast5 = curBBW < 0.10 || minBBW20 < 0.08;
    const isPriceBreakout5D = lastBar.close > Math.max(...closes.slice(Math.max(0, len - 20), len - 1));

    // 重点组合检测：低波动压缩 + 成交量增加 + 价格突破 (趋势启动信号)
    const isSqueezeBreakoutCombo = isVolSqueezeInPast5 && isVolumeSpike && isPriceBreakout5D;

    let state = 'NormalVolatility';
    let stateName = '正常波动区间';
    let baseScore = 50;
    let signal: -1 | 0 | 1 = 0;
    let confidence = 0.6;

    if (isSqueezeBreakoutCombo) {
      state = 'VolSqueezeBreakoutLaunch';
      stateName = '【关键信号】低波动压缩+放量突破 (趋势爆发起涨)';
      baseScore = 95;
      signal = 1;
      confidence = 0.95;
    } else if (isVolSqueezeInPast5) {
      state = 'VolatilityContraction';
      stateName = '波动率收缩变盘前夕';
      baseScore = 75;
      signal = 1;
      confidence = 0.8;
    } else if (curBBW > prevBbw(bb.bandwidth, len) * 1.3 && isPriceBreakout5D) {
      state = 'VolatilityExpansion';
      stateName = '波动率正向扩张突破';
      baseScore = 80;
      signal = 1;
      confidence = 0.85;
    } else if (hv20 > 60 || currentATRPct > 6) {
      state = 'ExtremeHighVolatility';
      stateName = '高剧烈波动(洗盘/风险放大)';
      baseScore = 35;
      signal = -1;
      confidence = 0.75;
    } else if (hv20 < hv60 * 0.7) {
      state = 'VolatilityDrying';
      stateName = '波动率平缓归于平静';
      baseScore = 58;
      signal = 0;
      confidence = 0.65;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;

    const explanation = `20日年化历史波动率 ${hv20.toFixed(1)}% (60日 ${hv60.toFixed(1)}%)，ATR(14)为 ¥${currentATR.toFixed(2)} (${currentATRPct.toFixed(2)}%)，布林带宽度为 ${(curBBW * 100).toFixed(1)}%。${isSqueezeBreakoutCombo ? '触发极为珍贵的“低波动收窄+放量大阳线突破”爆发组合。' : isVolSqueezeInPast5 ? '布林带缩窄至极限，随时准备选向突破。' : '波动率维持平稳分布。'}`;

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
        HV_20D_Annualized_Pct: Number(hv20.toFixed(2)),
        HV_60D_Annualized_Pct: Number(hv60.toFixed(2)),
        ATR_14: Number(currentATR.toFixed(2)),
        ATR_Pct: Number(currentATRPct.toFixed(2)),
        Bollinger_Bandwidth_Pct: Number((curBBW * 100).toFixed(2)),
        BBW_Min20D_Pct: Number((minBBW20 * 100).toFixed(2)),
        Combo_Squeeze_Breakout: isSqueezeBreakoutCombo,
      },
    };
  }
}

function prevBbw(bandwidth: number[], len: number): number {
  return bandwidth[Math.max(0, len - 5)] || 0.1;
}
