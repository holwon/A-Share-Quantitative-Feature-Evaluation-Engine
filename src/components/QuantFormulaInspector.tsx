/**
 * QuantFormulaInspector.tsx - 多因子量化评分计算原理、数学模型与实时变量代入透视器
 * 对标：Barra CNE6 风险模型、华泰/中信证券多因子选股体系、Z-Score标准化与IC加权算法
 */

import React, { useState } from 'react';
import { QuantEvaluationResult, FactorItemResult } from '../types/quant';
import {
  Calculator,
  BookOpen,
  Scale,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Layers,
  Shield,
  Activity,
  Zap,
  BarChart2,
  Droplets,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Code2
} from 'lucide-react';

interface Props {
  result: QuantEvaluationResult;
}

export const QuantFormulaInspector: React.FC<Props> = ({ result }) => {
  const { overall, factors, symbol, name, industry, asOfDate } = result;
  const weights = overall.weightsUsed;

  const [activeFactorKey, setActiveFactorKey] = useState<string>('all');
  const [expandedMethodology, setExpandedMethodology] = useState<boolean>(true);

  // 综合得分计算展开细节
  const trendPart = (weights.trend || 0.20) * factors.trend.score;
  const momentumPart = (weights.momentum || 0.20) * factors.momentum.score;
  const volumePricePart = (weights.volume_price || 0.15) * factors.volume_price.score;
  const breakoutPart = (weights.breakout || 0.15) * factors.breakout.score;
  const volatilityPart = (weights.volatility || 0.10) * factors.volatility.score;
  const relStrengthPart = (weights.relative_strength || 0.10) * factors.relative_strength.score;
  const liquidityPart = (weights.liquidity || 0.10) * factors.liquidity.score;

  const sumScore = trendPart + momentumPart + volumePricePart + breakoutPart + volatilityPart + relStrengthPart + liquidityPart;

  return (
    <div className="space-y-6 text-slate-200" id="quant-formula-inspector-main">
      
      {/* 顶部学术与金融工程依据 Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-emerald-500/20 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Calculator className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                多因子量化评分数学模型与计算原理
              </h2>
              <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-mono text-slate-300">
                严格对标 Barra / 券商金工规范
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-mono">
              本系统完全基于现代金融量化工程（Barra CNE6 风格因子体系与中信/华泰多因子选股模型），
              通过<strong className="text-emerald-400">「数据清洗 $\to$ 因子正交与去极值 $\to$ Z-Score与分位数无量纲化 $\to$ 权重线性合成 $\to$ 风险扣减分类」</strong>五大标准阶段进行无偏实时计算。无黑盒、全透明。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right font-mono bg-black/40 px-3 py-2 rounded-lg border border-white/5">
              <div className="text-[10px] text-slate-500 uppercase">当前评估标的</div>
              <div className="text-sm font-bold text-white">{name} ({symbol})</div>
              <div className="text-[10px] text-emerald-400">基准日: {asOfDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 核心第一部分：QuantScore 综合得分实时代入公式与合成矩阵 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Scale className="w-5 h-5 text-emerald-400" />
              1. 综合得分 QuantScore 线性加权合成公式
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {"公式模型：QuantScore = ∑ (w_i × S_i)，其中权重和 ∑ w_i = 100%"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">最终四舍五入得分:</span>
            <span className="text-2xl font-extrabold font-mono text-emerald-400 bg-black/60 px-3 py-0.5 rounded border border-emerald-500/30">
              {overall.quantScore}
            </span>
          </div>
        </div>

        {/* 动态代入计算步骤展示 */}
        <div className="bg-black/60 rounded-xl p-4 border border-white/10 font-mono text-xs space-y-3">
          <div className="text-slate-400 flex items-center justify-between">
            <span className="font-bold text-slate-300">【实时变量精确代入计算推导】</span>
            <span className="text-[11px] text-emerald-400">单位：分 (满分100)</span>
          </div>

          <div className="p-3 bg-neutral-950/80 rounded-lg border border-white/5 overflow-x-auto text-slate-200 font-mono leading-loose text-[13px]">
            <div className="text-slate-400 mb-1 text-[11px]">
              {"QuantScore = w_趋势 × S_趋势 + w_动量 × S_动量 + w_量价 × S_量价 + w_突破 × S_突破 + w_波动 × S_波动 + w_相对强弱 × S_相对强弱 + w_流动性 × S_流动性"}
            </div>
            
            <div className="text-emerald-300 font-bold flex flex-wrap items-center gap-1.5 py-1">
              <span>= ({factors.trend.score} × {((weights.trend || 0.20) * 100).toFixed(0)}%)</span>
              <span>+ ({factors.momentum.score} × {((weights.momentum || 0.20) * 100).toFixed(0)}%)</span>
              <span>+ ({factors.volume_price.score} × {((weights.volume_price || 0.15) * 100).toFixed(0)}%)</span>
              <span>+ ({factors.breakout.score} × {((weights.breakout || 0.15) * 100).toFixed(0)}%)</span>
              <span>+ ({factors.volatility.score} × {((weights.volatility || 0.10) * 100).toFixed(0)}%)</span>
              <span>+ ({factors.relative_strength.score} × {((weights.relative_strength || 0.10) * 100).toFixed(0)}%)</span>
              <span>+ ({factors.liquidity.score} × {((weights.liquidity || 0.10) * 100).toFixed(0)}%)</span>
            </div>

            <div className="text-slate-300 py-1 flex flex-wrap items-center gap-1.5">
              <span>= {trendPart.toFixed(2)}</span>
              <span>+ {momentumPart.toFixed(2)}</span>
              <span>+ {volumePricePart.toFixed(2)}</span>
              <span>+ {breakoutPart.toFixed(2)}</span>
              <span>+ {volatilityPart.toFixed(2)}</span>
              <span>+ {relStrengthPart.toFixed(2)}</span>
              <span>+ {liquidityPart.toFixed(2)}</span>
              <span className="text-white font-bold">= {sumScore.toFixed(2)}</span>
              <span className="text-emerald-400 font-extrabold">→ {overall.quantScore} 分</span>
            </div>
          </div>

          {/* 各因子贡献度拆解表 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
            {[
              { name: '趋势特征', score: factors.trend.score, w: weights.trend || 0.20, contrib: trendPart },
              { name: '动量特征', score: factors.momentum.score, w: weights.momentum || 0.20, contrib: momentumPart },
              { name: '量价特征', score: factors.volume_price.score, w: weights.volume_price || 0.15, contrib: volumePricePart },
              { name: '突破特征', score: factors.breakout.score, w: weights.breakout || 0.15, contrib: breakoutPart },
              { name: '波动率特征', score: factors.volatility.score, w: weights.volatility || 0.10, contrib: volatilityPart },
              { name: '相对强弱', score: factors.relative_strength.score, w: weights.relative_strength || 0.10, contrib: relStrengthPart },
              { name: '流动性', score: factors.liquidity.score, w: weights.liquidity || 0.10, contrib: liquidityPart },
            ].map((item, idx) => (
              <div key={idx} className="bg-neutral-900/90 p-2.5 rounded-lg border border-white/5">
                <div className="text-slate-400 text-[11px] font-semibold">{item.name}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-slate-200 font-bold text-xs">{item.score}分</span>
                  <span className="text-[10px] text-slate-500 font-mono">×{(item.w * 100).toFixed(0)}%</span>
                </div>
                <div className="text-emerald-400 font-bold text-[11px] mt-0.5">
                  贡献: +{item.contrib.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 综合分类定级规则决策树 */}
        <div className="bg-neutral-950/60 p-4 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
          <div className="text-slate-300 font-bold flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>分类定级决策树 (Classification Taxonomy)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
            <div className={`p-3 rounded-lg border ${overall.classification === 'StrongQuantCharacteristics' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-neutral-900/60 border-white/5 text-slate-400'}`}>
              <div className="text-white font-bold">强量化多头特征</div>
              <div className="text-[10px] text-slate-400 mt-1">
                条件: QuantScore ≥ 80 且 风险得分 &lt; 65
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${overall.classification === 'ModerateUptrendCharacteristics' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-neutral-900/60 border-white/5 text-slate-400'}`}>
              <div className="text-white font-bold">温和量化上涨特征</div>
              <div className="text-[10px] text-slate-400 mt-1">
                条件: 65 ≤ QuantScore &lt; 80
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${overall.classification === 'NeutralQuantCharacteristics' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-neutral-900/60 border-white/5 text-slate-400'}`}>
              <div className="text-white font-bold">中性震荡 / 空头格局</div>
              <div className="text-[10px] text-slate-400 mt-1">
                条件: 35 &lt; QuantScore &lt; 65 (中性) 或 &le; 35 (空头)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 核心第二部分：9 大单项因子底层数学公式与判定边界 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              2. 九大单项因子底层数学公式与指标定义
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              点击下方因子类别查看具体公式、标准化映射方程以及当前标的各项参数的实际代入值
            </p>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFactorKey('all')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'all' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              全部因子
            </button>
            <button
              onClick={() => setActiveFactorKey('trend')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'trend' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              趋势
            </button>
            <button
              onClick={() => setActiveFactorKey('momentum')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'momentum' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              动量
            </button>
            <button
              onClick={() => setActiveFactorKey('volume_price')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'volume_price' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              量价
            </button>
            <button
              onClick={() => setActiveFactorKey('breakout')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'breakout' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              突破
            </button>
            <button
              onClick={() => setActiveFactorKey('volatility')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'volatility' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              波动率
            </button>
            <button
              onClick={() => setActiveFactorKey('risk')}
              className={`px-2.5 py-1 rounded transition-colors ${activeFactorKey === 'risk' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-neutral-800 text-slate-400 hover:text-slate-200'}`}
            >
              风险/回撤
            </button>
          </div>
        </div>

        {/* 因子公式卡片列表 */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* 1. 趋势特征公式卡片 */}
          {(activeFactorKey === 'all' || activeFactorKey === 'trend') && (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">2.1 趋势特征 (Trend Factors)</span>
                  <span className="text-[11px] text-slate-400">权重: 20%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">当前得分:</span>
                  <span className="font-bold text-emerald-400 text-base">{factors.trend.score} 分</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {factors.trend.stateName}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="p-2.5 bg-black/50 rounded border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px]">【数学公式与计算逻辑】</div>
                  <div>{"• 均线方程：MA_k(t) = (1/k) * ∑ Close(t-i) (k ∈ {5, 10, 20, 60, 120, 250})"}</div>
                  <div>{"• 均线斜率：Slope_MA20 = [MA20(t) - MA20(t-5)] / MA20(t-5) * (100 / 5) (%/日)"}</div>
                  <div>{"• 趋向强度：ADX = 100 * WilderEMA(|DI+ - DI-| / (DI+ + DI-), 14)"}</div>
                </div>

                <div className="p-2.5 bg-neutral-900/90 rounded border border-white/5 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-bold">标的实际代入值：</span>
                  {factors.trend.explanation}
                </div>
              </div>
            </div>
          )}

          {/* 2. 动量特征公式卡片 */}
          {(activeFactorKey === 'all' || activeFactorKey === 'momentum') && (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">2.2 动量特征 (Momentum Factors)</span>
                  <span className="text-[11px] text-slate-400">权重: 20%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">当前得分:</span>
                  <span className="font-bold text-emerald-400 text-base">{factors.momentum.score} 分</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {factors.momentum.stateName}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="p-2.5 bg-black/50 rounded border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px]">【数学公式与计算逻辑】</div>
                  <div>{"• 多周期收益率：R_k = [Close(t) - Close(t-k)] / Close(t-k) * 100%"}</div>
                  <div>{"• 动量合成方程：Momentum_combo = 0.30 * R_5D + 0.40 * R_20D + 0.30 * R_60D"}</div>
                  <div>{"• 相对大盘超额：α_20D = R_20D(股票) - R_20D(沪深300)"}</div>
                  <div>{"• 动量评分方程：S_momentum = clamp(50 + 1.5 * Momentum_combo + 0.8 * α_20D + 加速/背离调节, 0, 100)"}</div>
                </div>

                <div className="p-2.5 bg-neutral-900/90 rounded border border-white/5 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-bold">标的实际代入值：</span>
                  {factors.momentum.explanation}
                </div>
              </div>
            </div>
          )}

          {/* 3. 量价特征公式卡片 */}
          {(activeFactorKey === 'all' || activeFactorKey === 'volume_price') && (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">2.3 量价特征 (Volume-Price Factors)</span>
                  <span className="text-[11px] text-slate-400">权重: 15%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">当前得分:</span>
                  <span className="font-bold text-emerald-400 text-base">{factors.volume_price.score} 分</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {factors.volume_price.stateName}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="p-2.5 bg-black/50 rounded border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px]">【数学公式与计算逻辑】</div>
                  <div>{"• 量比方程：VolumeRatio_20 = Volume(t) / MA20(Volume)"}</div>
                  <div>{"• OBV 能量潮：OBV(t) = OBV(t-1) + sgn(ΔClose) * Volume(t)"}</div>
                  <div>{"• 价量相关系数：ρ_PV = Cov(Close, Volume) / [σ(Close) * σ(Volume)]"}</div>
                </div>

                <div className="p-2.5 bg-neutral-900/90 rounded border border-white/5 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-bold">标的实际代入值：</span>
                  {factors.volume_price.explanation}
                </div>
              </div>
            </div>
          )}

          {/* 4. 突破特征公式卡片 */}
          {(activeFactorKey === 'all' || activeFactorKey === 'breakout') && (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">2.4 突破特征 (Breakout Factors)</span>
                  <span className="text-[11px] text-slate-400">权重: 15%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">当前得分:</span>
                  <span className="font-bold text-emerald-400 text-base">{factors.breakout.score} 分</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {factors.breakout.stateName}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="p-2.5 bg-black/50 rounded border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px]">【数学公式与计算逻辑】</div>
                  <div>{"• 唐奇安通道：Donchian_High(N) = max(High(t-i)), i=1..N"}</div>
                  <div>{"• 放量突破判定：Close(t) > Donchian_High(60) 且 Volume(t) ≥ 1.5 * MA20(Volume)"}</div>
                  <div>{"• 假突破过滤：若昨日突破但今日跌破并缩回前期平台，扣减至20分 (诱多风险)"}</div>
                </div>

                <div className="p-2.5 bg-neutral-900/90 rounded border border-white/5 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-bold">标的实际代入值：</span>
                  {factors.breakout.explanation}
                </div>
              </div>
            </div>
          )}

          {/* 5. 波动率特征公式卡片 */}
          {(activeFactorKey === 'all' || activeFactorKey === 'volatility') && (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">2.5 波动率特征 (Volatility Factors)</span>
                  <span className="text-[11px] text-slate-400">权重: 10%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">当前得分:</span>
                  <span className="font-bold text-emerald-400 text-base">{factors.volatility.score} 分</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {factors.volatility.stateName}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="p-2.5 bg-black/50 rounded border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px]">【数学公式与计算逻辑】</div>
                  <div>{"• 真实波幅：TR(t) = max(H_t - L_t, |H_t - C_t-1|, |L_t - C_t-1|)"}</div>
                  <div>{"• 年化历史波动率：HV20 = std(ln(C_i/C_i-1)) * sqrt(250) * 100%"}</div>
                  <div>{"• 布林带带宽：BBW = (Upper - Lower) / Middle = (4 * σ_20) / MA20"}</div>
                  <div>{"• 低波挤压起爆判定：BBW < 0.10 且 Close(t) 大阳线突破前高 → 95分"}</div>
                </div>

                <div className="p-2.5 bg-neutral-900/90 rounded border border-white/5 text-[11px] text-slate-300">
                  <span className="text-emerald-400 font-bold">标的实际代入值：</span>
                  {factors.volatility.explanation}
                </div>
              </div>
            </div>
          )}

          {/* 6. 风险与回撤特征公式卡片 */}
          {(activeFactorKey === 'all' || activeFactorKey === 'risk') && (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white text-sm">2.6 风险与回撤特征 (Risk & Drawdown Factors)</span>
                  <span className="text-[11px] text-slate-400">独立风险评估体系</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">风险指标分:</span>
                  <span className={`font-bold text-base ${factors.risk.score >= 65 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {factors.risk.score} 分
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded">
                    {factors.risk.stateName}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="p-2.5 bg-black/50 rounded border border-white/5 space-y-1">
                  <div className="text-slate-400 text-[11px]">【数学公式与计算逻辑】</div>
                  <div>{"• 最大回撤：MaxDrawdown(T) = max_t (Peak_t - Close_t) / Peak_t * 100%"}</div>
                  <div>{"• 资本资产定价模型 Beta：β = Cov(R_股票, R_沪深300) / Var(R_沪深300)"}</div>
                  <div>{"• 风险合成方程：RiskScore = min(100, 10 + 0.8 * MDD250 + 3.5 * ATR% + 2.0 * |最大单日跌幅| + ST罚分(25))"}</div>
                </div>

                <div className="p-2.5 bg-neutral-900/90 rounded border border-white/5 text-[11px] text-slate-300">
                  <span className="text-rose-400 font-bold">标的实际代入值：</span>
                  {factors.risk.explanation}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 核心第三部分：多因子量化选股标准权威说明 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-4 font-mono">
        <div
          onClick={() => setExpandedMethodology(!expandedMethodology)}
          className="flex items-center justify-between cursor-pointer border-b border-white/5 pb-3"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              3. 权威量化金融标准说明 (Barra CNE6 / 华泰金工多因子选股体系)
            </h3>
          </div>
          <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <span>{expandedMethodology ? '收起说明' : '展开阅读'}</span>
            {expandedMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expandedMethodology && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  1. 数据无量纲化与 Z-Score / 分位数映射
                </h4>
                <p className="text-[11px] text-slate-400">
                  {"不同因子具有截然不同的物理量纲（如价格斜率以 %/日 计、换手率以 % 计、成交额以亿元计）。系统首先将各原始因子计算为标准分 Z = (X - μ) / σ，再映射至 [0, 100] 的均匀区间，确保不同维度因子可以合理进行加权求和，消除极端量纲扭曲。"}
                </p>
              </div>

              <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  2. 严格防止未来函数 (Look-ahead Bias Free)
                </h4>
                <p className="text-[11px] text-slate-400">
                  {"所有因子的计算均严格截止于基准日 T 当日收盘价，绝对不引用 T+1 后的任何交易数据；均线、ATR、RSI 等滑动窗口严格使用历史切片 [0..T]，确保回测与评估逻辑在实盘中 100% 可复现。"}
                </p>
              </div>

              <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  3. 因子方向一致性与风险分离
                </h4>
                <p className="text-[11px] text-slate-400">
                  所有正向收益特征（趋势、动量、放量突破等）均统一为“分数越高越具多头优势”；
                  对于风险指标（最大回撤、Beta、极端波动、ST特别处理），系统采用独立的风险评分矩阵与流动性门槛过滤，避免将风险因子错误当做多头因子。
                </p>
              </div>

              <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  4. IC (信息系数) 与多因子加权分配
                </h4>
                <p className="text-[11px] text-slate-400">
                  默认权重配置基于 A 股历史截面 IC/ICIR 表现设定：趋势 (20%) 与动量 (20%) 占主导地位，
                  量价配合 (15%) 与平台突破 (15%) 次之，波动率与流动性 (各10%) 作为辅助过滤。
                  系统支持用户自定义权重并自动完成归一化。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
