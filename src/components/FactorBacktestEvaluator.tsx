/**
 * FactorBacktestEvaluator.tsx - 因子 IC / ICIR / 胜率 / 衰减验证分析视图
 */

import React, { useMemo } from 'react';
import { DailyBar, StockMeta } from '../types/quant';
import { FactorEvaluator } from '../engine/backtest/factorEvaluator';
import { TestTube, Info, TrendingUp, CheckCircle, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  bars: DailyBar[];
  stockMeta: StockMeta;
}

export const FactorBacktestEvaluator: React.FC<Props> = ({ bars, stockMeta }) => {
  const evaluator = useMemo(() => new FactorEvaluator(), []);
  const icResults = useMemo(() => evaluator.evaluateFactorEfficacy(bars, stockMeta, 5), [evaluator, bars, stockMeta]);

  return (
    <div className="space-y-6 text-slate-200">

      {/* 顶部分析 Header */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TestTube className="w-5 h-5 text-emerald-400" />
              因子有效性与 IC / ICIR 回测验证平台 (Factor Efficacy & Backtest)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              基于 Rolling T 历史时间序列滑动窗口，评估每个量化因子对未来 5 日 (T+5) 前瞻收益率的预测能力 (Information Coefficient)。
            </p>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
            采样时间窗口: 近 {bars.length} 交易日
          </span>
        </div>

        {/* 量化因子评估标准知识卡片 */}
        <div className="bg-black/40 rounded-lg p-4 border border-white/5 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 font-mono">
            <span className="font-bold text-emerald-400">A 股量化因子有效性评判经验法则 (Rule of Thumb):</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
              <div>• <span className="font-semibold text-slate-200">IC Mean &gt; 0.03</span>: 因子具备显著正向预测 Alpha 效果。</div>
              <div>• <span className="font-semibold text-slate-200">ICIR &gt; 0.50</span>: 因子在不同行情周期下稳定性极佳。</div>
              <div>• <span className="font-semibold text-slate-200">胜率 &gt; 55%</span>: 极高因子触发概率保障系统安全边际。</div>
            </div>
          </div>
        </div>
      </div>

      {/* 因子 IC / Rank IC / ICIR 表格 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-4">
        <h4 className="text-sm font-bold text-white mb-2">各因子 5 日前瞻 IC 统计与 ICIR 指标汇总表</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/60 text-slate-400 border-b border-white/5 uppercase tracking-wider font-semibold font-mono">
                <th className="py-3 px-4">因子名称</th>
                <th className="py-3 px-4">Mean IC (信息系数)</th>
                <th className="py-3 px-4">Rank IC (秩相关)</th>
                <th className="py-3 px-4">ICIR (IC/Std)</th>
                <th className="py-3 px-4">前瞻预测胜率 (%)</th>
                <th className="py-3 px-4">多空分位数收益 (%)</th>
                <th className="py-3 px-4">衰减半衰期 (天)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono font-medium">
              {icResults.map((r) => (
                <tr key={r.factorKey} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200 font-sans">{r.factorName}</td>

                  <td className="py-3 px-4">
                    <span className={`font-extrabold ${r.icMean >= 0.03 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {r.icMean >= 0 ? '+' : ''}{r.icMean}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-200">
                    {r.rankIcMean >= 0 ? '+' : ''}{r.rankIcMean}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`font-bold ${r.icir >= 0.5 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {r.icir}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`font-bold ${r.winRate >= 55 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {r.winRate}%
                    </span>
                  </td>

                  <td className="py-3 px-4 text-emerald-400 font-extrabold">
                    +{r.longShortReturn}%
                  </td>

                  <td className="py-3 px-4 text-slate-400 font-sans">
                    ~ {r.decayDays} 交易日
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IC 柱状图对比 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl">
        <h4 className="text-sm font-bold text-white mb-4">各因子 IC Mean 柱状分布 (Information Coefficient Bar Chart)</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={icResults} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="factorName" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="icMean" fill="#10b981" radius={[4, 4, 0, 0]} name="IC 均值" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
