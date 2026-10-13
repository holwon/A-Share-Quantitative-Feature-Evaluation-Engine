/**
 * CrossSectionalMatrix.tsx - 2.9 横截面强弱与行业/大盘对比矩阵视图
 */

import React from 'react';
import { QuantEvaluationResult } from '../types/quant';
import { Award, Compass, BarChart2, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface Props {
  result: QuantEvaluationResult;
}

export const CrossSectionalMatrix: React.FC<Props> = ({ result }) => {
  const { relativeStrength, name, symbol, industry } = result;

  // 对比柱状图数据
  const peerComparisonData = [
    { name: `${name} (${symbol})`, return20: relativeStrength.relativeStrength20, isCurrent: true },
    { name: '所属行业平均', return20: 1.8, isCurrent: false },
    { name: '沪深300指数', return20: 0.5, isCurrent: false },
    { name: '中证1000指数', return20: -1.2, isCurrent: false },
  ];

  return (
    <div className="space-y-6 text-slate-200">

      {/* 顶部横截面排名 Hero Card */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              横截面强弱与相对收益分析 (Cross-Sectional Ranking Matrix)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              对比 {name} ({symbol}) 相较于沪深300、中证1000指数及所属行业板块 ({industry}) 的相对 Alpha 超额收益。
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="px-3 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              全市场百分位: 前 {relativeStrength.marketPercentile}%
            </span>
            <span className="px-3 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              行业百分位: 前 {relativeStrength.industryPercentile}%
            </span>
          </div>
        </div>

        {/* 核心排名与相对收益数据 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="bg-black/40 rounded-lg p-4 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">20日相对沪深300超额收益</span>
            <div className={`text-2xl font-extrabold font-mono flex items-center ${relativeStrength.relativeStrength20 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {relativeStrength.relativeStrength20 >= 0 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              {relativeStrength.relativeStrength20 >= 0 ? '+' : ''}{relativeStrength.relativeStrength20.toFixed(2)}%
            </div>
            <span className="text-[11px] font-mono text-slate-500 mt-1 block uppercase">Short-term Momentum</span>
          </div>

          <div className="bg-black/40 rounded-lg p-4 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">60日相对沪深300超额收益</span>
            <div className={`text-2xl font-extrabold font-mono flex items-center ${relativeStrength.relativeStrength60 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {relativeStrength.relativeStrength60 >= 0 ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              {relativeStrength.relativeStrength60 >= 0 ? '+' : ''}{relativeStrength.relativeStrength60.toFixed(2)}%
            </div>
            <span className="text-[11px] font-mono text-slate-500 mt-1 block uppercase">Mid-term Alpha</span>
          </div>

          <div className="bg-black/40 rounded-lg p-4 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">所属行业全成员推算排名</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 flex items-baseline gap-1">
              <span>{relativeStrength.industryRank}</span>
              <span className="text-xs text-slate-500 font-normal">/ {relativeStrength.industryTotal}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 mt-1 block uppercase">Industry Rank</span>
          </div>

          <div className="bg-black/40 rounded-lg p-4 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">全市场 5200 只股票推算排名</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 flex items-baseline gap-1">
              <span>{relativeStrength.marketRank}</span>
              <span className="text-xs text-slate-500 font-normal">/ {relativeStrength.marketTotal}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 mt-1 block uppercase">Market Percentile</span>
          </div>

        </div>
      </div>

      {/* 近20日相对强弱对比图表 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          近20日相对超额收益横向对比 (20D Relative Return Benchmark)
        </h4>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peerComparisonData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis type="number" tick={{ fill: '#a3a3a3', fontSize: 11 }} unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fill: '#d4d4d4', fontSize: 12, fontWeight: 'bold' }} width={140} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any) => [`${val >= 0 ? '+' : ''}${val}%`, '20日相对收益']}
              />
              <Bar dataKey="return20" radius={[0, 4, 4, 0]}>
                {peerComparisonData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isCurrent ? '#10b981' : entry.return20 >= 0 ? '#059669' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
