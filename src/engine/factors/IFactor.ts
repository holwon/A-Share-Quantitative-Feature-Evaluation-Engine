/**
 * A股量化特征评估引擎 - IFactor 因子计算接口定义与通用计算函数
 */

import { DailyBar, StockMeta, IndexBar, FactorItemResult, FactorCategory } from '../../types/quant';

export interface IFactor {
  category: FactorCategory;
  categoryName: string;

  /**
   * 计算指定截止日 (as-of date T) 及之前的单项因子
   * 严格防止未来函数 (Look-ahead bias)
   */
  calculate(
    bars: DailyBar[],
    stockMeta: StockMeta,
    marketIndexBars?: IndexBar[],
    industryIndexBars?: IndexBar[]
  ): FactorItemResult;
}

/**
 * 限制数值在 [min, max] 范围内
 */
export function clamp(val: number, min: number = 0, max: number = 100): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * 将任意原始得分规范化为 0~100 分数
 */
export function normalizeScore(score: number): number {
  return Math.round(clamp(score, 0, 100));
}
