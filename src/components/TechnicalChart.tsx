/**
 * TechnicalChart.tsx - 交互式技术 K 线图与多副图指标组件
 */

import React, { useState } from 'react';
import { DailyBar } from '../types/quant';
import {
  calculateSMA,
  calculateBollingerBands,
  calculateDonchianChannel,
  calculateRSI,
  calculateADX,
  calculateATR,
  calculateOBV,
} from '../engine/indicators';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { LineChart as ChartIcon, Eye, EyeOff, Layers } from 'lucide-react';

interface Props {
  bars: DailyBar[];
  asOfDate: string;
}

export const TechnicalChart: React.FC<Props> = ({ bars, asOfDate }) => {
  const [subChart, setSubChart] = useState<'rsi' | 'adx' | 'atr' | 'obv'>('rsi');
  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showDonchian, setShowDonchian] = useState(false);

  if (bars.length === 0) {
    return (
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-12 text-center text-slate-500 font-mono text-xs">
        暂无可显示的 K 线行情数据
      </div>
    );
  }

  // 取近 120 个交易日以清晰绘图
  const displayBars = bars.slice(Math.max(0, bars.length - 120));
  const closes = bars.map(b => b.close);

  // 统一计算主图叠加指标
  const ma5 = calculateSMA(closes, 5);
  const ma10 = calculateSMA(closes, 10);
  const ma20 = calculateSMA(closes, 20);
  const ma60 = calculateSMA(closes, 60);
  const ma120 = calculateSMA(closes, 120);

  const bb = calculateBollingerBands(closes, 20, 2);
  const donchian = calculateDonchianChannel(bars, 20);

  // 统一计算副图指标
  const rsi = calculateRSI(closes, 14);
  const { adx, diPlus, diMinus } = calculateADX(bars, 14);
  const { atrPct } = calculateATR(bars, 14);
  const obv = calculateOBV(bars);

  // 拼接图表所需结构
  const chartData = displayBars.map((b, idx) => {
    const globalIdx = bars.length - displayBars.length + idx;

    return {
      date: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: Math.round(b.volume / 100), // 手 -> 百手
      isUp: b.close >= b.open,

      ma5: Number(ma5[globalIdx]?.toFixed(2)),
      ma10: Number(ma10[globalIdx]?.toFixed(2)),
      ma20: Number(ma20[globalIdx]?.toFixed(2)),
      ma60: Number(ma60[globalIdx]?.toFixed(2)),
      ma120: Number(ma120[globalIdx]?.toFixed(2)),

      bbUpper: Number(bb.upper[globalIdx]?.toFixed(2)),
      bbLower: Number(bb.lower[globalIdx]?.toFixed(2)),
      bbMiddle: Number(bb.middle[globalIdx]?.toFixed(2)),

      donchianUpper: Number(donchian.upper[globalIdx]?.toFixed(2)),
      donchianLower: Number(donchian.lower[globalIdx]?.toFixed(2)),

      rsi: Number(rsi[globalIdx]?.toFixed(1)),
      adx: Number(adx[globalIdx]?.toFixed(1)),
      diPlus: Number(diPlus[globalIdx]?.toFixed(1)),
      diMinus: Number(diMinus[globalIdx]?.toFixed(1)),
      atrPct: Number(atrPct[globalIdx]?.toFixed(2)),
      obv: Math.round(obv[globalIdx] / 10000), // 万手
    };
  });

  return (
    <div className="space-y-4">

      {/* 控制工具栏 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Layers className="w-4 h-4 text-emerald-400" /> 主图图层叠加:
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showMA}
              onChange={e => setShowMA(e.target.checked)}
              className="rounded bg-neutral-800 border-white/10 text-emerald-500 focus:ring-0"
            />
            <span>均线组 (MA5/10/20/60)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showBB}
              onChange={e => setShowBB(e.target.checked)}
              className="rounded bg-neutral-800 border-white/10 text-emerald-500 focus:ring-0"
            />
            <span>布林带 (BOLL 20,2)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showDonchian}
              onChange={e => setShowDonchian(e.target.checked)}
              className="rounded bg-neutral-800 border-white/10 text-emerald-500 focus:ring-0"
            />
            <span>唐奇安通道 (20D)</span>
          </label>
        </div>

        {/* 副图切换 */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium font-mono text-[11px] uppercase tracking-wider">副图指标:</span>
          {(['rsi', 'adx', 'atr', 'obv'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSubChart(type)}
              className={`px-3 py-1 rounded-md uppercase font-mono font-bold transition-colors ${
                subChart === type
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-neutral-800 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 主图: K 线收盘价/最高最低 + 叠加均线/布林带 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-emerald-400" />
            日线价格走势 & 技术指标 (基准评估日: <span className="text-emerald-400 font-mono">{asOfDate}</span>)
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
            <span className="text-amber-400">MA5</span>
            <span className="text-blue-400">MA10</span>
            <span className="text-emerald-400">MA20</span>
            <span className="text-purple-400">MA60</span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#a3a3a3', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#a3a3a3', fontWeight: 'bold' }}
              />

              {/* 收盘价折线 */}
              <Line type="monotone" dataKey="close" stroke="#f8fafc" strokeWidth={2.5} dot={false} name="收盘价" />

              {/* 均线 */}
              {showMA && (
                <>
                  <Line type="monotone" dataKey="ma5" stroke="#f59e0b" strokeWidth={1.2} dot={false} name="MA5" />
                  <Line type="monotone" dataKey="ma10" stroke="#3b82f6" strokeWidth={1.2} dot={false} name="MA10" />
                  <Line type="monotone" dataKey="ma20" stroke="#10b981" strokeWidth={1.5} dot={false} name="MA20" />
                  <Line type="monotone" dataKey="ma60" stroke="#a855f7" strokeWidth={1.5} dot={false} name="MA60" />
                </>
              )}

              {/* 布林带 */}
              {showBB && (
                <>
                  <Line type="monotone" dataKey="bbUpper" stroke="#ec4899" strokeDasharray="3 3" dot={false} name="BOLL上轨" />
                  <Line type="monotone" dataKey="bbLower" stroke="#06b6d4" strokeDasharray="3 3" dot={false} name="BOLL下轨" />
                </>
              )}

              {/* 唐奇安通道 */}
              {showDonchian && (
                <>
                  <Line type="monotone" dataKey="donchianUpper" stroke="#eab308" strokeDasharray="5 5" dot={false} name="唐奇安20D上轨" />
                  <Line type="monotone" dataKey="donchianLower" stroke="#eab308" strokeDasharray="5 5" dot={false} name="唐奇安20D下轨" />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 副图 1: 成交量 Volume */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-4 shadow-xl">
        <div className="text-xs font-bold text-slate-300 mb-1 px-2 font-mono">
          成交量 (Volume / 百手)
        </div>
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" hide />
              <YAxis orientation="right" tick={{ fill: '#737373', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar
                dataKey="volume"
                name="成交量(百手)"
                fill="#10b981"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 副图 2: 切换的指标图表 */}
      <div className="bg-neutral-900 border border-white/5 rounded-xl p-4 shadow-xl">
        <div className="text-xs font-bold text-slate-300 mb-1 px-2 flex items-center justify-between">
          <span className="uppercase font-mono text-emerald-400 font-extrabold">{subChart} 指标图表</span>
          <span className="text-[11px] text-slate-500 font-mono uppercase">Indicator View</span>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis orientation="right" tick={{ fill: '#a3a3a3', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
              />

              {subChart === 'rsi' && (
                <>
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '超买 70', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ value: '超跌 30', fill: '#10b981', fontSize: 10 }} />
                  <Line type="monotone" dataKey="rsi" stroke="#3b82f6" strokeWidth={2} dot={false} name="RSI(14)" />
                </>
              )}

              {subChart === 'adx' && (
                <>
                  <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="adx" stroke="#f59e0b" strokeWidth={2} dot={false} name="ADX" />
                  <Line type="monotone" dataKey="diPlus" stroke="#10b981" strokeWidth={1.5} dot={false} name="DI+" />
                  <Line type="monotone" dataKey="diMinus" stroke="#ef4444" strokeWidth={1.5} dot={false} name="DI-" />
                </>
              )}

              {subChart === 'atr' && (
                <Line type="monotone" dataKey="atrPct" stroke="#a855f7" strokeWidth={2} dot={false} name="ATR%" />
              )}

              {subChart === 'obv' && (
                <Line type="monotone" dataKey="obv" stroke="#06b6d4" strokeWidth={2} dot={false} name="OBV能量潮(万手)" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
