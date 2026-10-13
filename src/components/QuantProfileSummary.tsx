/**
 * QuantProfileSummary.tsx - 综合量化得分与画像视图
 */

import React, { useState } from 'react';
import { QuantEvaluationResult } from '../types/quant';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ShieldAlert, TrendingUp, Zap, BarChart3, AlertTriangle, Layers, Award, CheckCircle2, Calculator, ChevronRight, Scale, Info } from 'lucide-react';

interface Props {
  result: QuantEvaluationResult;
  onNavigateTab?: (tab: 'summary' | 'chart' | 'factors' | 'formulas' | 'qlib' | 'cross_sectional' | 'screener' | 'backtest') => void;
}

export const QuantProfileSummary: React.FC<Props> = ({ result, onNavigateTab }) => {
  const { overall, profile, factors, multiPeriodTrend, dataWarnings, asOfDate, symbol, name, industry, realQuote, conceptTags, recent20MainNet } = result;
  const [showFormulaBreakdown, setShowFormulaBreakdown] = useState(true);

  const weights = overall.weightsUsed;
  const trendPart = (weights.trend || 0.20) * factors.trend.score;
  const momentumPart = (weights.momentum || 0.20) * factors.momentum.score;
  const volumePricePart = (weights.volume_price || 0.15) * factors.volume_price.score;
  const breakoutPart = (weights.breakout || 0.15) * factors.breakout.score;
  const volatilityPart = (weights.volatility || 0.10) * factors.volatility.score;
  const relStrengthPart = (weights.relative_strength || 0.10) * factors.relative_strength.score;
  const liquidityPart = (weights.liquidity || 0.10) * factors.liquidity.score;
  const sumScore = trendPart + momentumPart + volumePricePart + breakoutPart + volatilityPart + relStrengthPart + liquidityPart;

  // 雷达图 8 个维度的因子数据
  const radarData = [
    { subject: '趋势', score: factors.trend.score, fullMark: 100 },
    { subject: '动量', score: factors.momentum.score, fullMark: 100 },
    { subject: '量价', score: factors.volume_price.score, fullMark: 100 },
    { subject: '突破', score: factors.breakout.score, fullMark: 100 },
    { subject: '波动率', score: factors.volatility.score, fullMark: 100 },
    { subject: '均值回归', score: factors.mean_reversion.score, fullMark: 100 },
    { subject: '流动性', score: factors.liquidity.score, fullMark: 100 },
    { subject: '相对强弱', score: factors.relative_strength.score, fullMark: 100 },
  ];

  return (
    <div className="space-y-6 text-slate-200">

      {/* 真实 A 股行情与基本面统计卡片 */}
      {realQuote && (
        <div className="bg-neutral-900 border border-white/5 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-white font-mono flex items-center gap-2">
                <span>{name}</span>
                <span className="text-sm font-normal text-slate-400">({symbol})</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/20">
                {industry}
              </span>
            </div>

            <div className="flex items-baseline gap-3 font-mono">
              <span className="text-2xl font-bold text-white">¥{realQuote.price.toFixed(2)}</span>
              <span className={`text-sm font-bold ${realQuote.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {realQuote.changePct >= 0 ? `+${realQuote.changePct.toFixed(2)}%` : `${realQuote.changePct.toFixed(2)}%`}
              </span>
              <span className="text-xs text-slate-500">
                (涨跌 ¥{realQuote.changeAmt >= 0 ? `+${realQuote.changeAmt.toFixed(2)}` : realQuote.changeAmt.toFixed(2)})
              </span>
            </div>
          </div>

          {/* 实时核心指标网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono pt-1">
            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">市盈率 PE (TTM)</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">{realQuote.peTtm > 0 ? `${realQuote.peTtm.toFixed(1)}x` : '--'}</div>
            </div>

            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">市净率 PB</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">{realQuote.pb > 0 ? `${realQuote.pb.toFixed(2)}x` : '--'}</div>
            </div>

            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">总市值</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">{realQuote.mcapYi > 0 ? `¥${realQuote.mcapYi.toFixed(1)} 亿` : '--'}</div>
            </div>

            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">流通市值</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">{realQuote.floatMcapYi > 0 ? `¥${realQuote.floatMcapYi.toFixed(1)} 亿` : '--'}</div>
            </div>

            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">换手率</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">{realQuote.turnoverPct.toFixed(2)}%</div>
            </div>

            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">涨停 / 跌停价</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">
                <span className="text-rose-400">¥{realQuote.limitUp.toFixed(2)}</span> / <span className="text-emerald-400">¥{realQuote.limitDown.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-black/40 p-2.5 rounded border border-white/5">
              <div className="text-slate-500 text-[10px]">近20日主力资金</div>
              <div className={`font-bold text-sm mt-0.5 ${recent20MainNet && recent20MainNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {recent20MainNet !== undefined ? `${(recent20MainNet / 100000000).toFixed(2)} 亿` : '--'}
              </div>
            </div>
          </div>

          {/* 概念与板块归属标签 */}
          {conceptTags && conceptTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 text-[11px] font-mono">
              <span className="text-slate-500 mr-1">题材/概念归属:</span>
              {conceptTags.slice(0, 8).map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-neutral-800 text-slate-300 rounded border border-white/5 hover:border-emerald-500/30 transition-colors">
                  {tag}
                </span>
              ))}
              {conceptTags.length > 8 && (
                <span className="text-slate-500 text-[10px]">+{conceptTags.length - 8} 个板块</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 风险与数据警示 */}
      {dataWarnings.length > 0 && (
        <div className="bg-neutral-900 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-rose-200 uppercase tracking-wider">数据质量提示 & 风险预警：</span>
            <ul className="list-disc list-inside space-y-0.5 text-rose-300/90 font-mono">
              {dataWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Hero Grid Section - Elegant Dark Layout */}
      <div className="grid grid-cols-12 gap-5">
        
        {/* 左侧：QuantScore 综合评分 & 核心特征强度 */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          
          {/* QuantScore 卡片 */}
          <div className="bg-neutral-900 p-6 rounded-xl border border-white/5 flex flex-col justify-center items-center relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-2">QuantScore 综合评分</div>
            <div className="text-7xl font-light text-emerald-400 font-mono tracking-tight">{overall.quantScore}</div>
            <div className="mt-3 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-full uppercase tracking-wider font-mono font-bold">
              {overall.classificationName}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              {symbol} {name} · {industry}
            </div>

            {/* 评分计算公式实时透视折叠条 */}
            <div className="w-full mt-4 pt-3 border-t border-white/5 font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1 text-slate-300 font-bold">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  评分如何算出的？
                </span>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('formulas')}
                    className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-0.5"
                  >
                    <span>公式推导透视</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {showFormulaBreakdown && (
                <div className="bg-black/60 p-2.5 rounded-lg border border-white/5 text-[10px] text-slate-300 space-y-1.5">
                  <div className="text-slate-500 text-[9px] uppercase">
                    线性加权公式: QuantScore = ∑ (因子得分 × 权重)
                  </div>
                  <div className="text-emerald-300 leading-relaxed font-mono">
                    = ({factors.trend.score}×20%) + ({factors.momentum.score}×20%) + ({factors.volume_price.score}×15%) + ({factors.breakout.score}×15%) + ({factors.volatility.score}×10%) + ({factors.relative_strength.score}×10%) + ({factors.liquidity.score}×10%)
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-white/5 text-slate-400">
                    <span>精确计算结果:</span>
                    <span className="font-bold text-white text-xs">{sumScore.toFixed(2)} → {overall.quantScore}分</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 核心特征强度条 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 flex flex-col gap-3 shadow-xl">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 font-mono">
              核心特征强度画像
            </h3>
            
            <div className="space-y-3 font-mono">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-sans">趋势强度 (Trend)</span>
                  <span className="text-emerald-400">{factors.trend.score}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${factors.trend.score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-sans">动量强度 (Momentum)</span>
                  <span className="text-emerald-400">{factors.momentum.score}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${factors.momentum.score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-sans">突破确认 (Breakout)</span>
                  <span className="text-blue-400">{factors.breakout.score}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${factors.breakout.score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-sans">量价协调 (Volume)</span>
                  <span className="text-amber-400">{factors.volume_price.score}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${factors.volume_price.score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-sans">相对强弱 (Rank)</span>
                  <span className="text-purple-400">{factors.relative_strength.score}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${factors.relative_strength.score}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 微软 Qlib Alpha158 快速入口 */}
          {onNavigateTab && (
            <div
              onClick={() => onNavigateTab('qlib')}
              className="bg-neutral-900 hover:bg-neutral-850 p-4 rounded-xl border border-blue-500/20 hover:border-blue-500/40 cursor-pointer transition-all shadow-xl flex items-center justify-between group font-mono"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                  Qlib
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    <span>微软 Qlib Alpha158 因子引擎</span>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] rounded">AI量化</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    查看微软 158 维算子矩阵与 AI 预测
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
          )}

        </section>

        {/* 右侧：6 大维度模块矩阵 */}
        <section className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 趋势特征 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 shadow-xl space-y-3">
            <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 趋势特征 (Trend)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">状态判定</div>
                <div className="font-medium text-emerald-300">{factors.trend.stateName}</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">得分与置信度</div>
                <div className="font-medium text-emerald-300">{factors.trend.score} 分 ({Math.round(factors.trend.confidence * 100)}%)</div>
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-slate-400 bg-black/40 p-2.5 rounded border border-white/5">
              <div className="flex justify-between"><span>MA5/10/20/60</span><span className="text-emerald-400 font-bold">{factors.trend.rawIndicators.maArrangement || 'N/A'}</span></div>
              <div className="flex justify-between"><span>ADX 趋势强度</span><span className="text-white">{factors.trend.rawIndicators.adx14 || 'N/A'}</span></div>
              <div className="flex justify-between"><span>MA20 偏离率</span><span className="text-white">{factors.trend.rawIndicators.ma20Bias || 'N/A'}%</span></div>
            </div>
          </div>

          {/* 突破特征 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 shadow-xl space-y-3">
            <h4 className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> 突破形态 (Breakout)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">突破阶段</div>
                <div className="font-medium text-blue-300">{factors.breakout.stateName}</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">突破得分为</div>
                <div className="font-medium text-blue-300">{factors.breakout.score} 分</div>
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-slate-400 bg-black/40 p-2.5 rounded border border-white/5">
              <div className="flex justify-between"><span>60日新高突破</span><span className="text-blue-400 font-bold">{factors.breakout.rawIndicators.is60DayHigh ? 'TRUE' : 'FALSE'}</span></div>
              <div className="flex justify-between"><span>假突破预警</span><span className="text-white">{factors.breakout.rawIndicators.fakeBreakoutRisk ? '有风险' : '无'}</span></div>
              <div className="flex justify-between"><span>平台整理缩量</span><span className="text-white">{factors.breakout.rawIndicators.consolidationDays || 0} 日</span></div>
            </div>
          </div>

          {/* 量价识别 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 shadow-xl space-y-3">
            <h4 className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> 量价识别 (Volume)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">量价配合</div>
                <div className="font-medium text-amber-300">{factors.volume_price.stateName}</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">得分</div>
                <div className="font-medium text-amber-300">{factors.volume_price.score} 分</div>
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-slate-400 bg-black/40 p-2.5 rounded border border-white/5">
              <div className="flex justify-between"><span>量比 (Volume Ratio)</span><span className="text-amber-400 font-bold">{factors.volume_price.rawIndicators.volumeRatio || 1.0}x</span></div>
              <div className="flex justify-between"><span>OBV 5日趋势</span><span className="text-white">{factors.volume_price.rawIndicators.obvTrend || 'Flat'}</span></div>
              <div className="flex justify-between"><span>价量相关性</span><span className="text-white">{factors.volume_price.rawIndicators.priceVolCorr || 0}</span></div>
            </div>
          </div>

          {/* 相对强度 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 shadow-xl space-y-3">
            <h4 className="text-[11px] font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> 相对强度 (Rank)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">全市场分位数</div>
                <div className="font-medium text-purple-300">Top {result.relativeStrength.marketPercentile}%</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded">
                <div className="text-slate-500 text-[10px] uppercase">行业分位数</div>
                <div className="font-medium text-purple-300">Top {result.relativeStrength.industryPercentile}%</div>
              </div>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-slate-400 bg-black/40 p-2.5 rounded border border-white/5">
              <div className="flex justify-between"><span>全市场推算排名</span><span className="text-purple-400 font-bold">{result.relativeStrength.marketRank} / {result.relativeStrength.marketTotal}</span></div>
              <div className="flex justify-between"><span>行业推算排名</span><span className="text-white">{result.relativeStrength.industryRank} / {result.relativeStrength.industryTotal}</span></div>
              <div className="flex justify-between"><span>20日相对超额</span><span className="text-white">+{result.relativeStrength.relativeStrength20}%</span></div>
            </div>
          </div>

          {/* 风险控制 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 shadow-xl space-y-3">
            <h4 className="text-[11px] font-semibold text-rose-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> 风险控制 (Risk)
            </h4>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-mono leading-none text-white">{factors.risk.score}</span>
              <span className="text-xs text-rose-400 pb-0.5 font-mono">{profile.riskLevel} Risk</span>
            </div>
            <div className="space-y-2 font-mono text-[10px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-1"><span>Max Drawdown (60D)</span><span>{factors.risk.rawIndicators.maxDrawdown60 || 0}%</span></div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (factors.risk.rawIndicators.maxDrawdown60 || 0) * 3)}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 mb-1"><span>Volatility (ATR%)</span><span>{factors.risk.rawIndicators.atrPct || 0}%</span></div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (factors.risk.rawIndicators.atrPct || 0) * 10)}%` }}></div></div>
              </div>
            </div>
          </div>

          {/* 流动性 */}
          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 shadow-xl space-y-3">
            <h4 className="text-[11px] font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> 流动性 (Liquidity)
            </h4>
            <div className="text-2xl font-mono text-cyan-400">{factors.liquidity.stateName}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Trading Capacity: {overall.liquidityEligible ? 'Eligible' : 'Warning'}</div>
            <div className="bg-black/40 p-2.5 rounded border border-white/5 text-[10px] font-mono space-y-1">
              <div className="flex justify-between text-slate-400"><span>Avg Amount (20D)</span><span className="text-white">{factors.liquidity.rawIndicators.avgAmount20D || 'N/A'} 万</span></div>
              <div className="flex justify-between text-slate-400"><span>ST Stock Risk</span><span className="text-white">{factors.liquidity.rawIndicators.isST ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

        </section>

      </div>

      {/* 底部 Footer - 多周期趋势矩阵 & 8 维因子雷达图 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-5 shadow-xl flex flex-col md:flex-row gap-6">
        
        {/* 多周期趋势 */}
        <div className="flex-1 space-y-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono border-b border-white/5 pb-1">
            多周期趋势矩阵 (Multi-Period View)
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-neutral-800 rounded border border-white/5 text-[11px] flex flex-col items-center min-w-[90px]">
              <span className="text-slate-500 text-[9px] uppercase font-mono">Short (5D)</span>
              <span className="text-emerald-400 font-bold mt-0.5">{multiPeriodTrend.shortTerm.state}</span>
            </div>
            <div className="px-4 py-2 bg-neutral-800 rounded border border-white/5 text-[11px] flex flex-col items-center min-w-[90px]">
              <span className="text-slate-500 text-[9px] uppercase font-mono">Medium (20D)</span>
              <span className="text-emerald-400 font-bold mt-0.5">{multiPeriodTrend.mediumTerm.state}</span>
            </div>
            <div className="px-4 py-2 bg-neutral-800 rounded border border-white/5 text-[11px] flex flex-col items-center min-w-[90px]">
              <span className="text-slate-500 text-[9px] uppercase font-mono">Long (250D)</span>
              <span className="text-slate-300 font-bold mt-0.5">{multiPeriodTrend.longTerm.state}</span>
            </div>
          </div>
        </div>

        <div className="w-px bg-white/5 hidden md:block"></div>

        {/* 底层原始因子预览 */}
        <div className="flex-1 space-y-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono border-b border-white/5 pb-1">
            底层核心原始指标抽样 (Raw Indicator Dump)
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400">
            <div>RSI: <span className="text-white font-bold">{result.allRawIndicators.rsi14 || 'N/A'}</span></div>
            <div>ATR: <span className="text-white font-bold">{result.allRawIndicators.atr14 || 'N/A'}</span></div>
            <div>MA20: <span className="text-white font-bold">{result.allRawIndicators.ma20 || 'N/A'}</span></div>
            <div>MA60: <span className="text-white font-bold">{result.allRawIndicators.ma60 || 'N/A'}</span></div>
            <div>ADX: <span className="text-white font-bold">{result.allRawIndicators.adx14 || 'N/A'}</span></div>
            <div>VolRatio: <span className="text-white font-bold">{result.allRawIndicators.volumeRatio || 'N/A'}</span></div>
            <div>Z-Score: <span className="text-white font-bold">{result.allRawIndicators.zScore20 || 'N/A'}</span></div>
            <div>Drawdown: <span className="text-white font-bold">{result.allRawIndicators.maxDrawdown60 || '0'}%</span></div>
          </div>
        </div>

      </div>

    </div>
  );
};
