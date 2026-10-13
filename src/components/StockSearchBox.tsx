/**
 * StockSearchBox.tsx - 真正 A 股实时智能搜索与联想组件
 * 支持：全市场 5000+ 只股票中文名、拼音缩写 (如 gzmt/byd/zjxc)、6位代码无缝搜索
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Search, Loader2, TrendingUp, Clock, X, Sparkles, Building, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import { searchRealStocks, StockSearchResult } from '../engine/data/realDataService';
import { PREDEFINED_STOCKS, PredefinedStock } from '../engine/data/mockDataGenerator';

interface Props {
  selectedStock: PredefinedStock;
  onSelectSearchResult: (result: StockSearchResult) => void;
  onSelectPredefined: (stock: PredefinedStock) => void;
  realPrice?: number;
  realChangePct?: number;
}

// 明星热门标的快速标签
const HOT_STOCKS: Array<{ name: string; code: string; symbol: string; marketName: string; tag: string }> = [
  { name: '贵州茅台', code: '600519', symbol: '600519.SH', marketName: '沪主板', tag: '消费龙头' },
  { name: '宁德时代', code: '300750', symbol: '300750.SZ', marketName: '创业板', tag: '新能源' },
  { name: '中际旭创', code: '300308', symbol: '300308.SZ', marketName: '创业板', tag: '光模块CPO' },
  { name: '寒武纪', code: '688256', symbol: '688256.SH', marketName: '科创板', tag: 'AI算力芯片' },
  { name: '比亚迪', code: '002594', symbol: '002594.SZ', marketName: '深主板', tag: '新能源车' },
  { name: '东方财富', code: '300059', symbol: '300059.SZ', marketName: '创业板', tag: '互联网券商' },
  { name: '赛力斯', code: '601127', symbol: '601127.SH', marketName: '沪主板', tag: '智驾汽车' },
  { name: '同花顺', code: '300033', symbol: '300033.SZ', marketName: '创业板', tag: '金融科技' },
  { name: '中芯国际', code: '688981', symbol: '688981.SH', marketName: '科创板', tag: '半导体制造' },
  { name: '工业富联', code: '601138', symbol: '601138.SH', marketName: '沪主板', tag: 'AI服务器' },
];

const RECENT_KEY = 'A_STOCK_QUANT_SEARCH_HISTORY';

export const StockSearchBox: React.FC<Props> = ({
  selectedStock,
  onSelectSearchResult,
  onSelectPredefined,
  realPrice,
  realChangePct,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<StockSearchResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'preset' | 'hot'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // 加载搜索历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 8));
      }
    } catch {
      // ignore
    }
  }, []);

  // 快捷键 ⌘K / Ctrl+K 或 / 全局监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 点击外部自动收起
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      inputRef.current?.focus();
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 防抖智能搜索
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchRealStocks(query);
        startTransition(() => {
          setResults(data);
          setActiveIndex(0);
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Search error:', err);
        setIsLoading(false);
      }
    }, 160);

    return () => clearTimeout(timer);
  }, [query]);

  // 记录搜索历史并选中标的
  const handleSelect = (item: StockSearchResult) => {
    // 存入搜索历史
    try {
      const updated = [item, ...recentSearches.filter(r => r.code !== item.code)].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    onSelectSearchResult(item);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectPreset = (stock: PredefinedStock) => {
    onSelectPredefined(stock);
    setIsOpen(false);
    setQuery('');
  };

  // 键盘操作：上/下/回车/退出
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex(prev => (prev + 1) % results.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex(prev => (prev - 1 + results.length) % results.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      } else if (query.trim()) {
        const clean = query.replace(/[^\d]/g, '').slice(-6);
        if (clean) {
          handleSelect({
            code: clean,
            symbol: `${clean}.${clean.startsWith('6') || clean.startsWith('9') ? 'SH' : 'SZ'}`,
            name: `股票${clean}`,
            prefix: clean.startsWith('6') || clean.startsWith('9') ? 'sh' : 'sz',
            marketName: 'A股',
          });
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
  };

  return (
    <div className="relative" ref={containerRef} id="stock-search-box-container">
      {/* 顶部常驻触发输入胶囊 */}
      <div
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 bg-neutral-950/90 hover:bg-neutral-900 border border-white/10 hover:border-emerald-500/50 rounded-lg px-3 py-1.5 cursor-pointer transition-all duration-200 shadow-inner group min-w-[240px] sm:min-w-[280px]"
        title="点击或按 ⌘K 搜索任意 A 股股票"
      >
        <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-mono text-xs font-bold text-white">
              {selectedStock.meta.symbol}
            </span>
            <span className="text-xs text-slate-200 font-medium truncate">
              {selectedStock.meta.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            {realPrice !== undefined && (
              <span className={`text-[11px] font-mono font-bold ${realChangePct !== undefined && realChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ¥{realPrice.toFixed(2)}
              </span>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-neutral-800 rounded border border-white/10">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* 实时搜索下拉弹窗 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[460px] bg-neutral-900/98 border border-emerald-500/30 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-slate-200">
          
          {/* 输入框 Header */}
          <div className="p-3 border-b border-white/5 bg-neutral-950/60 flex items-center gap-2.5">
            <Search className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="输入股票名称、拼音缩写或代码 (如 茅台 / byd / 688256)..."
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none flex-1 font-mono"
              autoComplete="off"
              spellCheck="false"
            />
            {isLoading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />}
            {query && !isLoading && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 分类快捷切换 Tabs */}
          {!query && (
            <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-white/5 text-[11px] font-mono">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded transition-colors ${activeCategory === 'all' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                全景推荐
              </button>
              <button
                onClick={() => setActiveCategory('hot')}
                className={`px-2.5 py-1 rounded transition-colors ${activeCategory === 'hot' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                热门明星股
              </button>
              <button
                onClick={() => setActiveCategory('preset')}
                className={`px-2.5 py-1 rounded transition-colors ${activeCategory === 'preset' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                量化预设基准
              </button>
            </div>
          )}

          {/* 搜索结果列表 */}
          <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
            {query.trim() !== '' ? (
              results.length > 0 ? (
                <>
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>A 股联想结果 ({results.length})</span>
                    <span>按 ↑↓ 切换 · Enter 选中</span>
                  </div>
                  {results.map((item, idx) => {
                    const isSelected = idx === activeIndex;
                    const isPositive = item.changePct !== undefined && item.changePct >= 0;
                    return (
                      <div
                        key={item.code}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-500/15 border border-emerald-500/40 text-white' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-neutral-950 px-2 py-0.5 rounded border border-white/5">
                            {item.symbol}
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                                {item.marketName}
                              </span>
                            </div>
                            {item.mcapYi ? (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                流通市值: {item.mcapYi.toFixed(1)} 亿
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {item.price ? (
                          <div className="text-right font-mono shrink-0 pl-2">
                            <div className="text-xs font-bold text-white">¥{item.price.toFixed(2)}</div>
                            <div className={`text-[10px] flex items-center justify-end font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              <span>{isPositive ? `+${item.changePct?.toFixed(2)}%` : `${item.changePct?.toFixed(2)}%`}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400/80 font-mono px-2 py-0.5 bg-emerald-500/10 rounded">
                            点击评估
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : !isLoading ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <p className="text-xs">未找到匹配的股票标的 "{query}"</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    尝试输入 6 位数字代码 (如 600519 / 000001) 或纯中文简称 (如 茅台 / 招行)
                  </p>
                </div>
              ) : null
            ) : (
              <>
                {/* 历史搜索 */}
                {recentSearches.length > 0 && activeCategory === 'all' && (
                  <div className="mb-3">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> 最近访问
                      </span>
                      <button
                        onClick={clearHistory}
                        className="hover:text-rose-400 text-[10px] transition-colors cursor-pointer"
                      >
                        清空
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-1.5">
                      {recentSearches.map(item => (
                        <button
                          key={item.code}
                          onClick={() => handleSelect(item)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-white/5 hover:border-emerald-500/30 rounded-md text-xs font-mono text-slate-300 hover:text-emerald-400 transition-colors"
                        >
                          <span className="text-[10px] text-emerald-400 font-bold">{item.code}</span>
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 热门明星股票快速标签 */}
                {(activeCategory === 'all' || activeCategory === 'hot') && (
                  <div className="mb-3">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> 市场热门明星标的
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1">
                      {HOT_STOCKS.map(item => (
                        <button
                          key={item.code}
                          onClick={() =>
                            handleSelect({
                              code: item.code,
                              symbol: item.symbol,
                              name: item.name,
                              prefix: item.code.startsWith('6') ? 'sh' : 'sz',
                              marketName: item.marketName,
                            })
                          }
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-left transition-colors group"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 flex items-center gap-1">
                              <span>{item.name}</span>
                              <span className="text-[9px] font-mono text-slate-500">[{item.code}]</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Tag className="w-2.5 h-2.5 text-emerald-500/70" />
                              <span>{item.tag}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                            {item.marketName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 量化基准预设股票 */}
                {(activeCategory === 'all' || activeCategory === 'preset') && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" /> 预设形态对照组 (8大典型量化形态)
                    </div>
                    <div className="space-y-1 p-1">
                      {PREDEFINED_STOCKS.map(stk => (
                        <button
                          key={stk.meta.symbol}
                          onClick={() => handleSelectPreset(stk)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            selectedStock.meta.symbol === stk.meta.symbol
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                              : 'bg-neutral-950/40 hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">{stk.meta.symbol}</span>
                            <span className="text-xs font-medium text-white">{stk.meta.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {stk.meta.industry}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部功能提示 */}
          <div className="p-2 border-t border-white/5 bg-neutral-950/80 text-[10px] font-mono text-slate-500 flex items-center justify-between px-3">
            <span>支持 沪/深/北/科创/创业板 实时数据直连</span>
            <span>Esc 退出</span>
          </div>

        </div>
      )}
    </div>
  );
};
