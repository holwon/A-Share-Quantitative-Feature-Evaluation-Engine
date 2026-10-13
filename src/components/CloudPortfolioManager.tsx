/**
 * CloudPortfolioManager.tsx - 个人自选股云端同步与多因子策略云端管理
 */

import React, { useState, useEffect } from 'react';
import {
  CloudWatchlistItem,
  CloudCustomStrategy,
  CloudBacktestRecord,
  saveWatchlistItem,
  removeWatchlistItem,
  subscribeUserWatchlist,
  saveCustomStrategy,
  getUserStrategies,
  getUserBacktests,
  getAllCachedStocksFromDb,
} from '../lib/firebase';
import { PredefinedStock, PREDEFINED_STOCKS } from '../engine/data/mockDataGenerator';
import { preloadAndCacheCoreStocksToDb } from '../engine/data/realDataService';
import {
  Cloud,
  BookmarkPlus,
  Trash2,
  CheckCircle2,
  FolderSync,
  Sliders,
  TrendingUp,
  Database,
  Play,
  Loader2,
  Zap,
  Server,
} from 'lucide-react';

interface Props {
  currentStock: PredefinedStock;
  currentScore?: number;
  onSelectStock: (stock: PredefinedStock) => void;
  onSelectSymbol?: (symbol: string) => void;
  dbTimeoutMs?: number;
  onDbTimeoutChange?: (ms: number) => void;
}

export const CloudPortfolioManager: React.FC<Props> = ({
  currentStock,
  currentScore,
  onSelectStock,
  onSelectSymbol,
  dbTimeoutMs = 800,
  onDbTimeoutChange,
}) => {
  const [watchlist, setWatchlist] = useState<CloudWatchlistItem[]>([]);
  const [strategies, setStrategies] = useState<CloudCustomStrategy[]>([]);
  const [backtests, setBacktests] = useState<CloudBacktestRecord[]>([]);
  const [cachedDbStocks, setCachedDbStocks] = useState<Array<{ symbol: string; name: string; cachedAt: string }>>([]);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'strategies' | 'backtests' | 'db_cache'>('db_cache');

  const [savingMsg, setSavingMsg] = useState<string | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupProgress, setWarmupProgress] = useState<{ current: number; total: number; symbol: string } | null>(null);

  // 监听自选股实时同步
  useEffect(() => {
    const unsubscribe = subscribeUserWatchlist((items) => {
      setWatchlist(items);
    });
    return () => unsubscribe();
  }, []);

  // 加载策略、回测和数据库缓存列表
  const refreshDbCacheList = () => {
    getAllCachedStocksFromDb().then(setCachedDbStocks).catch(console.warn);
  };

  useEffect(() => {
    getUserStrategies().then(setStrategies).catch(console.warn);
    getUserBacktests().then(setBacktests).catch(console.warn);
    refreshDbCacheList();
  }, []);

  const isCurrentInWatchlist = watchlist.some((w) => w.symbol === currentStock.meta.symbol);

  // 添加至云端自选
  const handleToggleWatchlist = async () => {
    const symbol = currentStock.meta.symbol;
    if (isCurrentInWatchlist) {
      const target = watchlist.find((w) => w.symbol === symbol);
      if (target) {
        await removeWatchlistItem(target.id);
        setSavingMsg('已从云端自选移除');
      }
    } else {
      const id = symbol.replace('.', '_') + '_' + Date.now();
      await saveWatchlistItem({
        id,
        symbol,
        name: currentStock.meta.name,
        industry: currentStock.meta.industry,
        addedAt: new Date().toISOString(),
        quantScoreSnapshot: currentScore || 75,
      });
      setSavingMsg('已保存至云端自选');
    }
    setTimeout(() => setSavingMsg(null), 2500);
  };

  // 一键批量预热/缓存全市场核心标的到 Firestore 数据库
  const handleBatchPreloadToDb = async () => {
    if (isWarmingUp) return;
    setIsWarmingUp(true);
    const targetSymbols = [
      '600519', // 贵州茅台
      '300750', // 宁德时代
      '002594', // 比亚迪
      '601318', // 中国平安
      '000858', // 五粮液
      '600036', // 招商银行
      '000333', // 美的集团
      '688981', // 中芯国际
      '002415', // 海康威视
      '600900', // 长江电力
      '601899', // 紫金矿业
      '601012', // 隆基绿能
      '300059', // 东方财富
      '601166', // 兴业银行
      '002475', // 立讯精密
    ];

    try {
      await preloadAndCacheCoreStocksToDb(targetSymbols, (current, total, symbol) => {
        setWarmupProgress({ current, total, symbol });
      });
      setSavingMsg(`批量缓存完成！已成功将 ${targetSymbols.length} 只 A 股核心龙头写入 Firestore 数据库`);
      refreshDbCacheList();
    } catch (err: any) {
      setSavingMsg(`批量预热异常: ${err.message}`);
    } finally {
      setIsWarmingUp(false);
      setWarmupProgress(null);
      setTimeout(() => setSavingMsg(null), 4000);
    }
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 shadow-2xl space-y-5 text-slate-200">
      
      {/* 顶部标题与云数据库状态 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-mono">
                数据库直读缓存与云端持久化
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 先查数据库 · 查不到查API
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              全市场 A 股缓存池 (已缓存 {cachedDbStocks.length} 股) · 毫秒级直读 · 自动回写同步
            </p>
          </div>
        </div>

        {/* 快捷按钮组 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBatchPreloadToDb}
            disabled={isWarmingUp}
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            title="将沪深龙头股一键写入数据库缓存"
          >
            {isWarmingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{isWarmingUp ? '正在写入数据库...' : '一键缓存核心A股到数据库'}</span>
          </button>

          <button
            onClick={handleToggleWatchlist}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-lg ${
              isCurrentInWatchlist
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>
              {isCurrentInWatchlist ? '移出自选' : `加 ${currentStock.meta.name} 入自选`}
            </span>
          </button>
        </div>
      </div>

      {savingMsg && (
        <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300 font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{savingMsg}</span>
        </div>
      )}

      {isWarmingUp && warmupProgress && (
        <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-blue-300">
            <span>正在预热缓存股票 [{warmupProgress.symbol}] 到 Firestore 数据库...</span>
            <span>{warmupProgress.current} / {warmupProgress.total}</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-400 h-full transition-all duration-300"
              style={{ width: `${(warmupProgress.current / warmupProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 标签栏 */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('db_cache')}
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'db_cache'
              ? 'bg-neutral-800 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>⚡ 数据库直读缓存池 ({cachedDbStocks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('watchlist')}
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'watchlist'
              ? 'bg-neutral-800 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
          <span>我的云端自选 ({watchlist.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('strategies')}
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'strategies'
              ? 'bg-neutral-800 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>已存策略 ({strategies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backtests')}
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'backtests'
              ? 'bg-neutral-800 text-white font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
          <span>云端回测归档 ({backtests.length})</span>
        </button>
      </div>

      {/* 0. 数据库缓存池 */}
      {activeTab === 'db_cache' && (
        <div className="space-y-4 font-mono">
          <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-blue-300 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span>数据库优先查询与超时熔断切换机制 (DB-First & Timeout Fallback)</span>
              </div>
              
              {/* 超时切换阈值设置 */}
              {onDbTimeoutChange && (
                <div className="flex items-center gap-2 text-xs bg-black/40 px-3 py-1.5 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[11px]">DB超时熔断阈值:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '300ms 极速', val: 300 },
                      { label: '800ms 推荐', val: 800 },
                      { label: '1500ms 宽松', val: 1500 },
                      { label: '纯API', val: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => onDbTimeoutChange(opt.val)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                          dbTimeoutMs === opt.val
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-black/30 p-2.5 rounded border border-white/5">
                <div className="font-bold text-blue-400 mb-1">1. 优先查数据库</div>
                <div>每次用户切换或搜索股票代码，引擎首先向 Firestore `stock_cache` 集合发起直读查询。</div>
              </div>
              <div className="bg-black/30 p-2.5 rounded border border-amber-500/20 bg-amber-950/10">
                <div className="font-bold text-amber-300 mb-1">2. 超时即刻切换 API</div>
                <div>若数据库查询超过 <span className="text-amber-400 font-bold">{dbTimeoutMs > 0 ? `${dbTimeoutMs}ms` : '0ms'}</span> 未响应或未收录，<strong>立即终止等待并切换至金融 API 实时拉取</strong>，保证无卡顿。</div>
              </div>
              <div className="bg-black/30 p-2.5 rounded border border-white/5">
                <div className="font-bold text-emerald-400 mb-1">3. 自动回写数据库</div>
                <div>API 拉取成功后自动异步写回 Firestore 数据库供后续秒开，形成高效自闭环缓存。</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>当前已缓存至数据库的股票列表 ({cachedDbStocks.length} 只)</span>
            <button
              onClick={refreshDbCacheList}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              刷新列表
            </button>
          </div>

          {cachedDbStocks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-black/30 rounded-lg border border-white/5 space-y-2">
              <div>数据库缓存池为空。</div>
              <div className="text-slate-400">点击右上角「一键缓存核心A股到数据库」可快速将常用龙头股写入数据库。</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {cachedDbStocks.map((s) => (
                <div
                  key={s.symbol}
                  onClick={() => {
                    if (onSelectSymbol) onSelectSymbol(s.symbol);
                  }}
                  className="p-2.5 bg-black/40 border border-white/5 hover:border-blue-500/40 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-500">{s.symbol}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold">
                      DB直读
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. 自选股列表 */}
      {activeTab === 'watchlist' && (
        <div className="space-y-3 font-mono">
          {watchlist.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-black/30 rounded-lg border border-white/5">
              暂无云端自选标的。在上方点击「加 {currentStock.meta.name} 入自选」可一键同步至云数据库。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    item.symbol === currentStock.meta.symbol
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-xs text-slate-400">{item.symbol}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        行业: {item.industry}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">入选评分</div>
                      <div className="text-base font-bold text-emerald-400">
                        {item.quantScoreSnapshot || 75} 分
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(item.addedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (onSelectSymbol) {
                            onSelectSymbol(item.symbol);
                          }
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                      >
                        查看标的
                      </button>
                      <button
                        onClick={() => removeWatchlistItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. 策略方案 */}
      {activeTab === 'strategies' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">当前多因子权重方案:</span>
            <span className="text-emerald-400 font-bold">Barra CNE6 / 华泰金工标准默认组合</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-black/30 rounded-lg border border-white/5 space-y-2">
              <div className="font-bold text-white">方案 1: 均衡多因子稳健组合</div>
              <div className="text-slate-400 text-[11px]">
                趋势(20%) + 动量(20%) + 量价(15%) + 突破(15%) + 波动率(10%) + 相对强弱(10%) + 流动性(10%)
              </div>
              <div className="text-[10px] text-slate-500">云端已持久化</div>
            </div>

            <div className="p-4 bg-black/30 rounded-lg border border-white/5 space-y-2">
              <div className="font-bold text-white">方案 2: 动量强势突破组合</div>
              <div className="text-slate-400 text-[11px]">
                趋势(30%) + 动量(30%) + 突破(25%) + 量价(15%) (适合主升浪与题材龙头追踪)
              </div>
              <div className="text-[10px] text-slate-500">云端已持久化</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 回测归档 */}
      {activeTab === 'backtests' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="py-6 text-center text-slate-500 bg-black/30 rounded-lg border border-white/5">
            在「因子 IC / 有效性验证」运行历史回测后，收益率曲线与回测绩效将自动归档至此处。
          </div>
        </div>
      )}

    </div>
  );
};
