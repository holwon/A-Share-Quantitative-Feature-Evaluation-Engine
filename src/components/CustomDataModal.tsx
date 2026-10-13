/**
 * CustomDataModal.tsx - 导入自定义股票行情与指标数据集 Modal
 */

import React, { useState } from 'react';
import { DailyBar, StockMeta } from '../types/quant';
import { X, Upload, Database, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomData: (stockMeta: StockMeta, customBars: DailyBar[]) => void;
}

export const CustomDataModal: React.FC<Props> = ({ isOpen, onClose, onImportCustomData }) => {
  const [symbol, setSymbol] = useState('000001.SZ');
  const [name, setName] = useState('自定义股票');
  const [industry, setIndustry] = useState('科技制造');
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleApplySample = () => {
    const sampleBars: DailyBar[] = [];
    let basePrice = 50.0;
    const now = new Date();

    for (let i = 120; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const changePct = (Math.random() - 0.47) * 0.04;
      const close = Number((basePrice * (1 + changePct)).toFixed(2));
      const open = Number((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2));
      const high = Math.max(open, close) + 0.5;
      const low = Math.min(open, close) - 0.5;
      const vol = Math.round(50000 + Math.random() * 80000);

      sampleBars.push({
        date: dateStr,
        open,
        high,
        low,
        close,
        volume: vol,
        amount: vol * close * 100,
        turnoverRate: 2.5,
        pctChange: Number((changePct * 100).toFixed(2)),
      });
      basePrice = close;
    }

    setJsonText(JSON.stringify(sampleBars, null, 2));
    setErrorMsg('');
  };

  const handleImport = () => {
    try {
      if (!jsonText.trim()) {
        setErrorMsg('请先粘贴或生成 K 线 JSON 数据');
        return;
      }
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length < 5) {
        setErrorMsg('数据格式错误：必须为包含至少 5 日 daily bars 的数组');
        return;
      }

      const meta: StockMeta = {
        symbol,
        name,
        industry,
        listDate: '2020-01-01',
        isST: false,
        totalCapital: 100000,
        floatCapital: 80000,
      };

      onImportCustomData(meta, parsed);
      onClose();
    } catch (e: any) {
      setErrorMsg(`JSON 解析语法错误: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-neutral-900 border border-white/5 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">导入自定义 A 股行情数据</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-200">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">股票代码:</label>
              <input
                type="text"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">股票名称:</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">所属行业:</label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">日线 OHLCV JSON 数组 (含 date, open, high, low, close, volume):</label>
              <button
                onClick={handleApplySample}
                className="text-emerald-400 hover:underline font-mono font-bold cursor-pointer"
              >
                生成 120 日测试样例数据
              </button>
            </div>
            <textarea
              rows={8}
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='[ { "date": "2026-08-01", "open": 10.0, "high": 10.5, "low": 9.8, "close": 10.3, "volume": 50000 }, ... ]'
              className="w-full bg-black border border-white/5 rounded p-3 font-mono text-emerald-400 focus:outline-none focus:border-white/20"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded font-mono">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 font-mono">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-slate-300 rounded font-semibold border border-white/5"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              className="px-5 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 rounded font-bold flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-4 h-4" /> 确定导入并计算量化特征
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
