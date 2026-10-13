/**
 * Navbar.tsx - 顶部导航与股票选择器、评估日期切换组件
 */

import React from 'react';
import { PredefinedStock } from '../engine/data/mockDataGenerator';
import { Calendar, Database, Code, RefreshCw, Radio } from 'lucide-react';
import { StockSearchBox } from './StockSearchBox';
import { StockSearchResult, StockDataSource } from '../engine/data/realDataService';

interface NavbarProps {
  selectedStock: PredefinedStock;
  onSelectStock: (stock: PredefinedStock) => void;
  onSelectSearchResult: (result: StockSearchResult) => void;
  onSearchSymbol?: (symbol: string) => void;
  asOfDate: string;
  onDateChange: (date: string) => void;
  availableDates: string[];
  activeTab: 'summary' | 'chart' | 'factors' | 'formulas' | 'qlib' | 'cloud' | 'cross_sectional' | 'screener' | 'backtest';
  onTabChange: (tab: 'summary' | 'chart' | 'factors' | 'formulas' | 'qlib' | 'cloud' | 'cross_sectional' | 'screener' | 'backtest') => void;
  onOpenJsonModal: () => void;
  onOpenCustomDataModal: () => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
  realPrice?: number;
  realChangePct?: number;
  dataSource?: StockDataSource;
  latencyMs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedStock,
  onSelectStock,
  onSelectSearchResult,
  asOfDate,
  onDateChange,
  availableDates,
  activeTab,
  onTabChange,
  onOpenJsonModal,
  onOpenCustomDataModal,
  isLoading,
  onRefresh,
  lastUpdated,
  realPrice,
  realChangePct,
  dataSource = 'database',
  latencyMs,
}) => {
  return (
    <header className="bg-neutral-900/90 border-b border-white/5 text-slate-200 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-black text-xs shadow-lg shadow-emerald-500/20">
              QE
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  A股股票量化特征评估引擎
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> 真实A股直连
                </span>
                {dataSource === 'database' ? (
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold flex items-center gap-1" title="优先从云端数据库直读缓存 (5分钟内自动更新)">
                    ⚡ Firestore 数据库直读缓存 {latencyMs !== undefined ? `(${latencyMs}ms)` : ''}
                  </span>
                ) : dataSource === 'memory' ? (
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold flex items-center gap-1" title="优先从本地内存直读缓存 (1分钟内自动更新)">
                    ⚡ 内存秒开
                  </span>
                ) : dataSource === 'api_timeout_fallback' ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse" title="数据库查询超时，已自动快速降级切换至 API 拉取最新实时数据">
                    ⏱️ 数据库超时 ➔ API 实时拉取
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                    🌐 API 实时拉取 (已回写DB)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block font-mono">
                腾讯 / 东财 / 同花顺 实时行情直连 · 240日真实K线 · 9大类量化因子画像
              </p>
            </div>
          </div>

          {/* Stock Selector & As-Of Date Selector */}
          <div className="flex items-center gap-3">
            
            {/* 股票智能实时搜索与全市场直连 */}
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-0.5 flex items-center justify-between">
                <span>标的直连</span>
                <span className="text-[9px] text-emerald-400 font-mono">5000+ A股可搜</span>
              </div>
              <StockSearchBox
                selectedStock={selectedStock}
                onSelectSearchResult={onSelectSearchResult}
                onSelectPredefined={onSelectStock}
                realPrice={realPrice}
                realChangePct={realChangePct}
              />
            </div>

            <div className="h-8 w-px bg-white/10 hidden md:block"></div>

            {/* 基准评估日 T 切换 */}
            <div className="text-right hidden md:block">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">数据基准日 (无未来)</div>
              <div className="flex items-center gap-1.5 bg-neutral-800/80 border border-white/10 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={asOfDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
                >
                  {availableDates.slice(-30).reverse().map((d) => (
                    <option key={d} value={d} className="bg-neutral-900 text-slate-200">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 刷新实时数据按钮 */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-slate-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-md transition-colors border border-white/10 flex items-center gap-1 text-xs font-mono"
                title="刷新实时真实数据"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-[11px]">刷新数据</span>
              </button>
            )}

            {/* 自定义数据与JSON导出 */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCustomDataModal}
                className="p-2 text-slate-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-md transition-colors border border-white/10 flex items-center gap-1.5 text-xs font-mono"
                title="导入自定义股票/行情数据"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline text-[11px]">导入数据</span>
              </button>

              <button
                onClick={onOpenJsonModal}
                className="p-2 text-slate-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors border border-emerald-500/20 flex items-center gap-1.5 text-xs font-mono"
                title="查看结构化 JSON 输出结果"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">JSON 输出</span>
              </button>
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-white/5 text-xs font-medium scrollbar-none">
          <button
            onClick={() => onTabChange('summary')}
            className={`px-3 py-1.5 rounded transition-all font-mono ${
              activeTab === 'summary'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            量化画像与得分
          </button>

          <button
            onClick={() => onTabChange('chart')}
            className={`px-3 py-1.5 rounded transition-all font-mono ${
              activeTab === 'chart'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            技术指标与真实K线
          </button>

          <button
            onClick={() => onTabChange('factors')}
            className={`px-3 py-1.5 rounded transition-all font-mono ${
              activeTab === 'factors'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            单项因子与原始指标
          </button>

          <button
            onClick={() => onTabChange('formulas')}
            className={`px-3 py-1.5 rounded transition-all font-mono flex items-center gap-1.5 ${
              activeTab === 'formulas'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>🧮 评分原理与数学模型</span>
          </button>

          <button
            onClick={() => onTabChange('qlib')}
            className={`px-3 py-1.5 rounded transition-all font-mono flex items-center gap-1.5 ${
              activeTab === 'qlib'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span className="text-blue-400 font-bold">🔬 微软 Qlib Alpha158</span>
          </button>

          <button
            onClick={() => onTabChange('cloud')}
            className={`px-3 py-1.5 rounded transition-all font-mono flex items-center gap-1.5 ${
              activeTab === 'cloud'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span className="text-emerald-400">☁️ 云端自选与策略</span>
          </button>

          <button
            onClick={() => onTabChange('cross_sectional')}
            className={`px-3 py-1.5 rounded transition-all font-mono ${
              activeTab === 'cross_sectional'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            横截面与相对强弱
          </button>

          <button
            onClick={() => onTabChange('screener')}
            className={`px-3 py-1.5 rounded transition-all font-mono ${
              activeTab === 'screener'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            全市场多股量化选股
          </button>

          <button
            onClick={() => onTabChange('backtest')}
            className={`px-3 py-1.5 rounded transition-all font-mono ${
              activeTab === 'backtest'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            因子 IC / 有效性验证
          </button>
        </div>

      </div>
    </header>
  );
};

