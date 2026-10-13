/**
 * A股量化特征评估引擎 - 核心 FactorEngine 因子集成器
 */

import { DailyBar, StockMeta, IndexBar, QuantEvaluationResult, FactorItemResult } from '../types/quant';
import { TrendFactors } from './factors/TrendFactors';
import { MomentumFactors } from './factors/MomentumFactors';
import { VolumePriceFactors } from './factors/VolumePriceFactors';
import { BreakoutFactors } from './factors/BreakoutFactors';
import { VolatilityFactors } from './factors/VolatilityFactors';
import { MeanReversionFactors } from './factors/MeanReversionFactors';
import { LiquidityFactors } from './factors/LiquidityFactors';
import { RiskFactors } from './factors/RiskFactors';
import { RelativeStrengthFactors } from './factors/RelativeStrengthFactors';
import { calculateSMA, calculateReturn } from './indicators';

export class FactorEngine {
  private trendFactor = new TrendFactors();
  private momentumFactor = new MomentumFactors();
  private volumePriceFactor = new VolumePriceFactors();
  private breakoutFactor = new BreakoutFactors();
  private volatilityFactor = new VolatilityFactors();
  private meanReversionFactor = new MeanReversionFactors();
  private liquidityFactor = new LiquidityFactors();
  private riskFactor = new RiskFactors();
  private relativeStrengthFactor = new RelativeStrengthFactors();

  // 默认权重设置 (符合 section 4 规范)
  private defaultWeights: Record<string, number> = {
    trend: 0.20,
    momentum: 0.20,
    volume_price: 0.15,
    breakout: 0.15,
    volatility: 0.10,
    relative_strength: 0.10,
    liquidity: 0.10,
  };

  /**
   * 执行完整的量化特征判定与评分计算
   */
  public evaluate(
    bars: DailyBar[],
    stockMeta: StockMeta,
    marketIndexBars?: IndexBar[],
    industryIndexBars?: IndexBar[],
    customWeights?: Record<string, number>
  ): QuantEvaluationResult {
    const dataWarnings: string[] = [];

    // 严谨数据与异常状态拦截
    if (bars.length < 10) {
      dataWarnings.push('历史交易天数极短(小于10日)，部分长周期因子计算不可靠。');
    }
    if (stockMeta.isST) {
      dataWarnings.push('当前股票为ST/特别处理股票，退市与流动性风险极高。');
    }

    const lastBar = bars[bars.length - 1];
    if (lastBar?.isSuspended) {
      dataWarnings.push('评估基准日股票处于停牌状态。');
    }

    // 上市天数评估
    if (stockMeta.listDate) {
      const listTs = new Date(stockMeta.listDate).getTime();
      const currentTs = new Date(lastBar?.date || Date.now()).getTime();
      const diffDays = (currentTs - listTs) / (1000 * 3600 * 24);
      if (diffDays < 180) {
        dataWarnings.push(`次新股警告：上市时间约 ${Math.round(diffDays)} 天，次新股价格易受投机挤压。`);
      }
    }

    // 依次计算 9 个核心因子
    const trendResult = this.trendFactor.calculate(bars, stockMeta);
    const momentumResult = this.momentumFactor.calculate(bars, stockMeta, marketIndexBars, industryIndexBars);
    const volumePriceResult = this.volumePriceFactor.calculate(bars, stockMeta);
    const breakoutResult = this.breakoutFactor.calculate(bars, stockMeta);
    const volatilityResult = this.volatilityFactor.calculate(bars, stockMeta);
    const meanReversionResult = this.meanReversionFactor.calculate(bars, stockMeta);
    const liquidityResult = this.liquidityFactor.calculate(bars, stockMeta);
    const riskResult = this.riskFactor.calculate(bars, stockMeta, marketIndexBars);
    const relativeStrengthResult = this.relativeStrengthFactor.calculate(bars, stockMeta, marketIndexBars, industryIndexBars);

    const weights = customWeights || this.defaultWeights;

    // 计算综合得分 (QuantScore)
    const rawQuantScore =
      (weights.trend || 0.20) * trendResult.score +
      (weights.momentum || 0.20) * momentumResult.score +
      (weights.volume_price || 0.15) * volumePriceResult.score +
      (weights.breakout || 0.15) * breakoutResult.score +
      (weights.volatility || 0.10) * volatilityResult.score +
      (weights.relative_strength || 0.10) * relativeStrengthResult.score +
      (weights.liquidity || 0.10) * liquidityResult.score;

    const quantScore = Math.round(Math.min(100, Math.max(0, rawQuantScore)));

    // 是否满足最低流动性门槛
    const liquidityEligible = Boolean(liquidityResult.rawIndicators.Liquidity_Eligible ?? true);

    // 综合判定分类
    let classification = 'NeutralQuantCharacteristics';
    let classificationName = '中性量化特征';

    if (quantScore >= 80 && riskResult.score < 65) {
      classification = 'StrongQuantCharacteristics';
      classificationName = '具有强量化多头特征';
    } else if (quantScore >= 80 && riskResult.score >= 65) {
      classification = 'HighRiskStrongQuantCharacteristics';
      classificationName = '强量化多头特征(高风险)';
    } else if (quantScore >= 65) {
      classification = 'ModerateUptrendCharacteristics';
      classificationName = '具有温和量化上涨特征';
    } else if (quantScore <= 35) {
      classification = 'WeakQuantCharacteristics';
      classificationName = '量化特征较弱/空头格局';
    } else if (meanReversionResult.score >= 80) {
      classification = 'OversoldReboundSetup';
      classificationName = '超跌反弹博弈特征';
    }

    // 汇总所有原始指标 (符合 Requirement 9)
    const allRawIndicators: Record<string, number | string | boolean> = {
      ...trendResult.rawIndicators,
      ...momentumResult.rawIndicators,
      ...volumePriceResult.rawIndicators,
      ...breakoutResult.rawIndicators,
      ...volatilityResult.rawIndicators,
      ...meanReversionResult.rawIndicators,
      ...liquidityResult.rawIndicators,
      ...riskResult.rawIndicators,
      ...relativeStrengthResult.rawIndicators,
    };

    // 计算多周期趋势
    const multiPeriodTrend = this.computeMultiPeriodTrend(bars);

    // 抽取横截面信息
    const relIndicators = relativeStrengthResult.rawIndicators;
    const relativeStrength = {
      relativeStrength20: Number(relIndicators.RelStrength_20D_vs_CSI300 || 0),
      relativeStrength60: Number(relIndicators.RelStrength_60D_vs_CSI300 || 0),
      relativeStrength120: Number(momentumResult.rawIndicators.Return_120D_Pct || 0),
      industryRank: Number(relIndicators.Industry_Rank_Estimated || 10),
      industryTotal: Number(relIndicators.Industry_Total || 120),
      marketRank: Number(relIndicators.Market_Rank_Estimated || 500),
      marketTotal: Number(relIndicators.Market_Total || 5200),
      industryPercentile: Number(relIndicators.Industry_Percentile || 80),
      marketPercentile: Number(relIndicators.Market_Percentile || 80),
    };

    // 构建量化特征标签
    const tags: string[] = [];
    if (trendResult.score >= 80) tags.push('强趋势多头');
    if (breakoutResult.score >= 80) tags.push('放量平台突破');
    if (volumePriceResult.score >= 80) tags.push('价涨量增配合');
    if (volatilityResult.state === 'VolSqueezeBreakoutLaunch') tags.push('低波收紧起爆');
    if (meanReversionResult.state === 'OversoldInUptrend') tags.push('多头牛回弹射');
    if (liquidityResult.score >= 85) tags.push('充沛流动性');
    if (riskResult.score >= 70) tags.push('高波动风险');

    const profile = {
      trendState: trendResult.stateName,
      momentumState: momentumResult.stateName,
      volumePriceConfirmation: volumePriceResult.stateName,
      breakoutState: breakoutResult.stateName,
      meanReversionState: meanReversionResult.stateName,
      liquidityGrade: liquidityResult.state as any,
      riskLevel: riskResult.state === 'Low' ? 'Low' : riskResult.state === 'High' ? 'High' : riskResult.state === 'Extreme' ? 'Extreme' : 'Medium',
      quantQuality: quantScore >= 75 ? 'High' : quantScore >= 55 ? 'Medium' : 'Low',
      tags,
    } as const;

    return {
      symbol: stockMeta.symbol,
      name: stockMeta.name,
      industry: stockMeta.industry,
      asOfDate: lastBar?.date || new Date().toISOString().split('T')[0],
      dataLength: bars.length,

      factors: {
        trend: trendResult,
        momentum: momentumResult,
        volume_price: volumePriceResult,
        breakout: breakoutResult,
        volatility: volatilityResult,
        mean_reversion: meanReversionResult,
        liquidity: liquidityResult,
        risk: riskResult,
        relative_strength: relativeStrengthResult,
      },

      allRawIndicators,
      multiPeriodTrend,
      relativeStrength,
      profile,

      overall: {
        quantScore,
        riskScore: riskResult.score,
        liquidityEligible,
        classification,
        classificationName,
        weightsUsed: weights,
      },

      dataWarnings,
    };
  }

  /**
   * 多周期趋势划分 (Section 5 Requirement)
   */
  private computeMultiPeriodTrend(bars: DailyBar[]) {
    const len = bars.length;
    if (len === 0) {
      return {
        shortTerm: { period: '1D-10D' as const, state: 'Sideways', score: 50 },
        mediumTerm: { period: '20D-60D' as const, state: 'Sideways', score: 50 },
        longTerm: { period: '120D-250D' as const, state: 'Sideways', score: 50 },
      };
    }

    const closes = bars.map(b => b.close);

    const r5D = calculateReturn(closes, 5);
    const r20D = calculateReturn(closes, 20);
    const r120D = calculateReturn(closes, Math.min(120, len - 1));

    const ma20 = calculateSMA(closes, 20)[len - 1];
    const ma60 = calculateSMA(closes, 60)[len - 1];
    const lastPrice = closes[len - 1];

    // 短期 (1D-10D)
    let shortState = 'Sideways';
    let shortScore = 50;
    if (r5D > 3.0) {
      shortState = 'Strong Uptrend';
      shortScore = 85;
    } else if (r5D > 0) {
      shortState = 'Uptrend';
      shortScore = 65;
    } else if (r5D < -3.0) {
      shortState = 'Strong Downtrend';
      shortScore = 20;
    } else {
      shortState = 'Downtrend';
      shortScore = 40;
    }

    // 中期 (20D-60D)
    let mediumState = 'Sideways';
    let mediumScore = 50;
    if (lastPrice > ma20 && ma20 > ma60) {
      mediumState = 'Uptrend';
      mediumScore = 78;
    } else if (lastPrice < ma20 && ma20 < ma60) {
      mediumState = 'Downtrend';
      mediumScore = 25;
    }

    // 长期 (120D-250D)
    let longState = 'Sideways';
    let longScore = 50;
    if (r120D > 15) {
      longState = 'Strong Bull Market';
      longScore = 88;
    } else if (r120D < -15) {
      longState = 'Bear Market';
      longScore = 25;
    }

    return {
      shortTerm: { period: '1D-10D' as const, state: shortState, score: shortScore },
      mediumTerm: { period: '20D-60D' as const, state: mediumState, score: mediumScore },
      longTerm: { period: '120D-250D' as const, state: longState, score: longScore },
    };
  }
}
