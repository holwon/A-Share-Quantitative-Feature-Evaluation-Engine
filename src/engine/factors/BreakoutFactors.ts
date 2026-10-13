/**
 * 2.4 突破特征 (Breakout Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, FactorItemResult } from '../../types/quant';
import { calculateDonchianChannel, calculateSMA, calculateBollingerBands } from '../indicators';

export class BreakoutFactors implements IFactor {
  category = 'breakout' as const;
  categoryName = '突破特征';

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
        explanation: '历史数据不足以分析周期高低点突破形态。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const highs = bars.map(b => b.high);
    const volumes = bars.map(b => b.volume);
    const lastBar = bars[len - 1];

    const getPeriodHigh = (window: number) => {
      const slice = highs.slice(Math.max(0, len - window));
      return Math.max(...slice);
    };

    const high5D = getPeriodHigh(5);
    const high20D = getPeriodHigh(20);
    const high60D = getPeriodHigh(60);
    const high120D = getPeriodHigh(Math.min(120, len));
    const high250D = getPeriodHigh(Math.min(250, len));

    const priceTo60DHigh = high60D > 0 ? lastBar.close / high60D : 1;
    const priceTo250DHigh = high250D > 0 ? lastBar.close / high250D : 1;

    // 前几日的高点 (除去今日)
    const prevHigh20 = Math.max(...highs.slice(Math.max(0, len - 21), len - 1));
    const prevHigh60 = Math.max(...highs.slice(Math.max(0, len - 61), len - 1));

    // Donchian 与布林带宽度 (检测突破前压缩)
    const donchian = calculateDonchianChannel(bars, 20);
    const bb = calculateBollingerBands(closes, 20, 2);
    const prevBbw = bb.bandwidth[Math.max(0, len - 5)];
    const isVolSqueezed = prevBbw < 0.12; // 波动率显著压缩

    const volMa20 = calculateSMA(volumes, 20)[len - 1];
    const isVolumeConfirmed = volMa20 > 0 && lastBar.volume / volMa20 >= 1.5;

    // 突破检测逻辑
    const isBreaking60D = lastBar.close > prevHigh60;
    const isBreaking20D = lastBar.close > prevHigh20;

    // 检查假突破：昨日或前日突破，但今日长阴线拉回
    let isFakeBreakout = false;
    if (len >= 5) {
      const day1Break = bars[len - 2].high > prevHigh20;
      const day0Pullback = lastBar.close < prevHigh20 && lastBar.close < bars[len - 2].close * 0.97;
      if (day1Break && day0Pullback) {
        isFakeBreakout = true;
      }
    }

    // 检查突破回踩确认
    let isRetestSuccess = false;
    if (len >= 6) {
      const broke3DaysAgo = bars[len - 4].close > Math.max(...highs.slice(Math.max(0, len - 25), len - 4));
      const holdingSupport = lastBar.close >= prevHigh20 * 0.99;
      const shrinkingVol = lastBar.volume < volMa20;
      if (broke3DaysAgo && holdingSupport && shrinkingVol) {
        isRetestSuccess = true;
      }
    }

    let state = 'NoBreakout';
    let stateName = '无明显突破形态';
    let baseScore = 50;
    let signal: -1 | 0 | 1 = 0;
    let confidence = 0.6;

    if (isFakeBreakout) {
      state = 'FakeBreakout';
      stateName = '假突破(高位冲高回落诱多)';
      baseScore = 20;
      signal = -1;
      confidence = 0.85;
    } else if (isRetestSuccess) {
      state = 'BreakoutRetest';
      stateName = '突破后回踩成功确认支撑';
      baseScore = 88;
      signal = 1;
      confidence = 0.85;
    } else if (isBreaking60D && isVolumeConfirmed) {
      state = 'BreakoutConfirmed';
      stateName = '放量突破60日中期平台高点';
      baseScore = 92;
      signal = 1;
      confidence = 0.92;
    } else if (isBreaking20D && isVolumeConfirmed) {
      state = 'InBreakout';
      stateName = '放量突破20日阶段新高';
      baseScore = 80;
      signal = 1;
      confidence = 0.82;
    } else if (priceTo60DHigh >= 0.97 && priceTo60DHigh < 1.0 && isVolSqueezed) {
      state = 'PreBreakoutSqueeze';
      stateName = '突破前夕(低波动压缩蓄势)';
      baseScore = 75;
      signal = 1;
      confidence = 0.75;
    } else if (priceTo250DHigh >= 0.99) {
      state = 'AllTimeHighProximity';
      stateName = '创或临近250日/历史新高';
      baseScore = 85;
      signal = 1;
      confidence = 0.8;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;

    const breakoutMagPct = prevHigh60 > 0 ? ((lastBar.close - prevHigh60) / prevHigh60) * 100 : 0;

    const explanation = `当前价格 ¥${lastBar.close.toFixed(2)}，距离60日高点(¥${high60D.toFixed(2)}) 比例 ${ (priceTo60DHigh * 100).toFixed(1)}%，距离250日高点(¥${high250D.toFixed(2)}) 比例 ${(priceTo250DHigh * 100).toFixed(1)}%。${isVolSqueezed ? '突破前经历了布林通道极度收窄压缩。' : ''}${isVolumeConfirmed ? '突破伴随1.5倍以上放量确认。' : ''}当前突破判定为 [${stateName}]。`;

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
        High_5D: Number(high5D.toFixed(2)),
        High_20D: Number(high20D.toFixed(2)),
        High_60D: Number(high60D.toFixed(2)),
        High_120D: Number(high120D.toFixed(2)),
        High_250D: Number(high250D.toFixed(2)),
        Price_To_60D_High_Ratio: Number(priceTo60DHigh.toFixed(3)),
        Price_To_250D_High_Ratio: Number(priceTo250DHigh.toFixed(3)),
        Donchian_Upper20: Number(donchian.upper[len - 1].toFixed(2)),
        Donchian_Lower20: Number(donchian.lower[len - 1].toFixed(2)),
        Breakout_Magnitude_Pct: Number(breakoutMagPct.toFixed(2)),
        Is_Vol_Squeezed: isVolSqueezed,
        Is_Volume_Confirmed: isVolumeConfirmed,
      },
    };
  }
}
