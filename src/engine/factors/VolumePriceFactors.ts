/**
 * 2.3 量价特征 (Volume-Price Factors)
 */

import { IFactor, normalizeScore } from './IFactor';
import { DailyBar, StockMeta, FactorItemResult } from '../../types/quant';
import { calculateSMA, calculateOBV, calculatePriceVolumeCorrelation } from '../indicators';

export class VolumePriceFactors implements IFactor {
  category = 'volume_price' as const;
  categoryName = '量价特征';

  calculate(bars: DailyBar[], stockMeta: StockMeta): FactorItemResult {
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
        explanation: '历史交易数据不足以进行量价配合度分析。',
        rawIndicators: { len },
      };
    }

    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);
    const lastBar = bars[len - 1];

    const volMa5Arr = calculateSMA(volumes, 5);
    const volMa10Arr = calculateSMA(volumes, 10);
    const volMa20Arr = calculateSMA(volumes, 20);

    const volMa5 = volMa5Arr[len - 1];
    const volMa10 = volMa10Arr[len - 1];
    const volMa20 = volMa20Arr[len - 1];

    const volumeRatio = volMa5 > 0 ? lastBar.volume / volMa5 : 1;
    const volRatio20 = volMa20 > 0 ? lastBar.volume / volMa20 : 1;

    // OBV 及价格-成交量相关性
    const obvArr = calculateOBV(bars);
    const obvMa10 = calculateSMA(obvArr, 10)[len - 1];
    const isObvRising = obvArr[len - 1] > obvMa10;

    const pvCorr = calculatePriceVolumeCorrelation(closes, volumes, 20);

    // 计算近10日上涨日与下跌日成交量比例 (Up/Down Volume)
    let upVolSum = 0;
    let downVolSum = 0;
    const lookback = Math.min(20, len - 1);

    for (let i = len - lookback; i < len; i++) {
      if (bars[i].close >= bars[i - 1].close) {
        upVolSum += bars[i].volume;
      } else {
        downVolSum += bars[i].volume;
      }
    }
    const upDownVolRatio = downVolSum > 0 ? upVolSum / downVolSum : 1.5;

    // 单日量价模式判定
    const isPriceUp = lastBar.close > bars[len - 2].close;
    const isVolUp = lastBar.volume > volMa5;

    let pattern = 'Normal';
    let patternName = '平稳量价';

    if (isPriceUp && volRatio20 > 1.5) {
      pattern = 'PriceUpVolUp';
      patternName = '价涨量增(放量上攻)';
    } else if (isPriceUp && volRatio20 < 0.7) {
      pattern = 'PriceUpVolDown';
      patternName = '价涨量缩(量能背离)';
    } else if (!isPriceUp && volRatio20 > 1.5) {
      pattern = 'PriceDownVolUp';
      patternName = '价跌量增(恐慌抛盘)';
    } else if (!isPriceUp && volRatio20 < 0.7) {
      pattern = 'PriceDownVolDown';
      patternName = '价跌量缩(正常洗盘)';
    }

    let state = 'NormalVolume';
    let stateName = '量价匹配一般';
    let baseScore = 50;
    let signal: -1 | 0 | 1 = 0;
    let confidence = 0.6;

    if (pattern === 'PriceUpVolUp' && pvCorr > 0.3 && isObvRising) {
      state = 'StrongConfirmation';
      stateName = '强劲放量配合';
      baseScore = 82 + Math.min(15, (volRatio20 - 1.5) * 10);
      signal = 1;
      confidence = 0.88;
    } else if (pattern === 'PriceDownVolDown' && isPriceUp === false) {
      state = 'ShrinkingPullback';
      stateName = '缩量无量回调(筹码稳定)';
      baseScore = 65;
      signal = 1;
      confidence = 0.7;
    } else if (pattern === 'PriceDownVolUp') {
      state = 'HeavySelling';
      stateName = '放量阴线(资金流出)';
      baseScore = 25;
      signal = -1;
      confidence = 0.85;
    } else if (pattern === 'PriceUpVolDown' || (isPriceUp && pvCorr < -0.3)) {
      state = 'VolumePriceDivergence';
      stateName = '价涨量缩背离(动能不足)';
      baseScore = 35;
      signal = -1;
      confidence = 0.75;
    } else if (volRatio20 > 2.8) {
      state = 'AbnormalVolumeSpike';
      stateName = '异常巨量(高换手交投)';
      baseScore = 60;
      signal = 0;
      confidence = 0.65;
    }

    const finalScore = normalizeScore(baseScore);
    const normalizedVal = (finalScore - 50) / 50;

    const turnoverPct = lastBar.turnoverRate ?? (stockMeta.floatCapital > 0 ? (lastBar.volume / (stockMeta.floatCapital * 100)) * 100 : 2.5);

    const explanation = `最新成交量较20日均量比为 ${volRatio20.toFixed(2)}，单日换手率约 ${turnoverPct.toFixed(2)}%。近20日价量相关系数为 ${pvCorr.toFixed(2)}，上涨日/下跌日成交量比值 ${upDownVolRatio.toFixed(2)}。量价结构属于 [${patternName}]，综合判定为 [${stateName}]。`;

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
        Volume: lastBar.volume,
        Volume_MA5: Math.round(volMa5),
        Volume_MA10: Math.round(volMa10),
        Volume_MA20: Math.round(volMa20),
        Volume_Ratio_5D: Number(volumeRatio.toFixed(2)),
        Volume_Ratio_20D: Number(volRatio20.toFixed(2)),
        Turnover_Rate_Pct: Number(turnoverPct.toFixed(2)),
        OBV_Value: Math.round(obvArr[len - 1]),
        OBV_MA10: Math.round(obvMa10),
        Price_Volume_Correlation: Number(pvCorr.toFixed(2)),
        Up_Down_Volume_Ratio: Number(upDownVolRatio.toFixed(2)),
        Pattern: patternName,
      },
    };
  }
}
