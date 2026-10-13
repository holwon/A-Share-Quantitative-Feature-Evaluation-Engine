/**
 * FactorDetailsInspector.tsx - 单项因子明细与原始指标深度 Inspect 视图
 */

import React, { useState } from 'react';
import { QuantEvaluationResult, FactorCategory } from '../types/quant';
import { Search, Code, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Terminal, Database } from 'lucide-react';

interface Props {
  result: QuantEvaluationResult;
}

const FACTOR_FORMULAS: Record<string, { formula: string; logic: string }> = {
  trend: {
    formula: 'MA_k = \\frac{1}{k}\\sum Close, \\; Slope_{20} = \\frac{\\Delta MA20}{MA20} \\times 20\\%, \\; ADX = 100 \\times \\text{EMA}(\\frac{|DI^+ - DI^-|}{DI^+ + DI^-}, 14)',
    logic: '均线排列完整度 (40分) + MA20斜率向上 (35分) + ADX趋势强弱度 (25分)',
  },
  momentum: {
    formula: 'Momentum = 0.3 R_{5D} + 0.4 R_{20D} + 0.3 R_{60D}, \\; \\alpha_{20} = R_{20}^{stk} - R_{20}^{index}',
    logic: '综合动量得分 = 50 + 1.5 × Momentum + 0.8 × 相对超额 + 加速/背离奖惩',
  },
  volume_price: {
    formula: 'VolumeRatio = \\frac{Vol_t}{MA_{20}(Vol)}, \\; OBV_t = OBV_{t-1} + \\text{sgn}(\\Delta P)Vol_t, \\; \\rho_{PV} = \\text{Corr}(P, Vol)',
    logic: '放量上攻配合 (82~95分) | 缩量健康回调 (65分) | 价涨量缩/放量杀跌扣减惩罚',
  },
  breakout: {
    formula: 'Donchian_{High}(N) = \\max(High_{t-N \\dots t}), \\; BBW = \\frac{Upper - Lower}{Middle} < 0.10',
    logic: '突破60日高点伴随1.5倍量 (92分) | 低波动收窄后放量突破 (95分) | 假突破扣至20分',
  },
  volatility: {
    formula: 'HV_{20} = \\sigma(\\ln(P_t/P_{t-1}))\\sqrt{250}, \\; TR = \\max(H-L, |H-C_p|, |L-C_p|), \\; ATR\\%',
    logic: '低波动极度压缩变盘前夕 (75~95分) | 剧烈非理性洗盘波动扣分惩罚',
  },
  mean_reversion: {
    formula: 'RSI_{14}, \\; \\%B = \\frac{Close - Lower}{Upper - Lower}, \\; Z_{20} = \\frac{Close - MA_{20}}{\\sigma_{20}}',
    logic: '主升浪健康回踩 (82分) | RSI<30 极度超跌黄金弹射 (90分) | 破位杀跌预警 (15分)',
  },
  liquidity: {
    formula: 'AMT_{20} = \\frac{1}{20}\\sum Amount, \\; Turnover_{20} = \\frac{1}{20}\\sum Turnover',
    logic: '日均成交额>10亿 (95分) | 3~10亿 (82分) | 1~3亿 (68分) | <5000万/ST (15~40分)',
  },
  risk: {
    formula: 'MDD_{250} = \\max(\\frac{P_{peak} - P}{P_{peak}}), \\; \\beta = \\frac{\\text{Cov}(R_i, R_m)}{\\text{Var}(R_m)}, \\; MaxDrop_{60D}',
    logic: '风险综合评分 = 10 + 0.8 × MDD250 + 3.5 × ATR% + 2.0 × 最大单日跌幅 + ST罚分',
  },
  relative_strength: {
    formula: '\\alpha_{20} = R_{20}^{stk} - R_{20}^{CSI300}, \\; RankPct = \\text{clamp}(50 + 2.5 \\times \\alpha_{20}, 1, 99)',
    logic: '全市场 5200+ 标的及申万行业截面分位数与相对超额收益映射',
  },
};

export const FactorDetailsInspector: React.FC<Props> = ({ result }) => {
  const { factors, allRawIndicators } = result;
  const [selectedCategory, setSelectedCategory] = useState<FactorCategory | 'all'>('all');
  const [indicatorSearch, setIndicatorSearch] = useState('');

  const allFactors = [
    factors.trend,
    factors.momentum,
    factors.volume_price,
    factors.breakout,
    factors.volatility,
    factors.mean_reversion,
    factors.liquidity,
    factors.risk,
    factors.relative_strength,
  ];

  const factorList = allFactors.filter(f => selectedCategory === 'all' || f.category === selectedCategory);

  // 原始指标搜索过滤
  const filteredRawKeys = Object.keys(allRawIndicators).filter(k =>
    k.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-200">

      {/* 顶部分类 Tab 切换 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-2 overflow-x-auto shadow-xl">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                : 'bg-neutral-800 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            全部 9 大因子类别
          </button>

          {allFactors.map(f => (
            <button
              key={f.category}
              onClick={() => setSelectedCategory(f.category)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === f.category
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'bg-neutral-800 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {f.categoryName}
            </button>
          ))}
        </div>
      </div>

      {/* 单项因子卡片明细列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {factorList.map(f => {
          const isPositive = f.signal === 1;
          const isNegative = f.signal === -1;

          return (
            <div
              key={f.category}
              className="bg-neutral-900 border border-white/5 rounded-xl p-5 shadow-xl hover:border-white/10 transition-all space-y-4"
            >
              {/* 头部信息 */}
              <div className="flex items-start justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white">{f.categoryName}</span>
                    <span className="text-xs font-mono text-slate-500">({f.category})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block">{f.stateName}</span>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-3xl font-extrabold font-mono text-white">{f.score}</span>
                    <span className="text-xs text-slate-500 font-mono">/ 100</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    {isPositive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" /> 多头看多 (+1)
                      </span>
                    )}
                    {isNegative && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-0.5">
                        <ArrowDownRight className="w-3 h-3" /> 空头/风险 (-1)
                      </span>
                    )}
                    {!isPositive && !isNegative && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-slate-400 border border-white/5 flex items-center gap-0.5">
                        <Minus className="w-3 h-3" /> 中性信号 (0)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 置信度与标准分 */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-black/40 rounded-lg p-3 border border-white/5 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Standardized Value</span>
                  <span className="font-bold text-slate-200 text-sm">{f.normalizedValue > 0 ? `+${f.normalizedValue}` : f.normalizedValue}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Confidence Level</span>
                  <span className="font-bold text-emerald-400 text-sm">{Math.round(f.confidence * 100)}%</span>
                </div>
              </div>

              {/* 详细量化逻辑解释 */}
              <p className="text-xs text-slate-300 leading-relaxed bg-white/5 rounded-lg p-3 border border-white/5">
                <span className="font-semibold text-slate-200">量化评估解释：</span> {f.explanation}
              </p>

              {/* 数学公式与模型映射透视 */}
              {FACTOR_FORMULAS[f.category] && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-[11px] font-mono space-y-1.5">
                  <div className="text-emerald-400 font-bold flex items-center justify-between">
                    <span>【底层数学公式】</span>
                    <span className="text-[10px] text-slate-400 font-normal">无未来函数 T 日切片</span>
                  </div>
                  <div className="text-slate-300 text-[10px] bg-black/40 p-2 rounded border border-white/5 overflow-x-auto">
                    ${FACTOR_FORMULAS[f.category].formula}$
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <strong className="text-slate-300">定级映射：</strong>{FACTOR_FORMULAS[f.category].logic}
                  </div>
                </div>
              )}

              {/* 该因子关联的原始数学指标列表 */}
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2">
                  RAW INDICATOR TABLE:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(f.rawIndicators).map(([rk, rv]) => (
                    <div key={rk} className="bg-black/40 rounded p-2 border border-white/5 flex items-center justify-between">
                      <span className="text-slate-400 truncate max-w-[130px]">{rk}</span>
                      <span className="font-bold text-slate-200">
                        {typeof rv === 'boolean' ? (rv ? 'TRUE' : 'FALSE') : rv}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* 完整原始指标表导出预览 (Requirement 9 Inspector) */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              全局原始技术指标保留表 (Complete Raw Indicator Dump)
            </h3>
            <p className="text-xs text-slate-400">
              遵照 Requirement 9 要求：包含所有计算过程中使用的原始技术指标值，便于后置回测、参数调优、特征工程与机器学习迭代。
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-800 border border-white/10 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-emerald-500">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索指标 Key (如 MA20, RSI, ATR)..."
              value={indicatorSearch}
              onChange={e => setIndicatorSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-100 focus:outline-none w-48 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs max-h-96 overflow-y-auto pr-2">
          {filteredRawKeys.map(key => {
            const val = allRawIndicators[key];
            return (
              <div key={key} className="bg-black/40 rounded p-2.5 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400 truncate max-w-[150px]" title={key}>{key}</span>
                <span className="font-bold text-emerald-400">
                  {typeof val === 'boolean' ? (val ? 'true' : 'false') : val}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
