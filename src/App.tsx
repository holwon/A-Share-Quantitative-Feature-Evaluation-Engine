/**
 * App.tsx - A股股票量化特征评估引擎主程序入口 (A-Stock-Data 真实行情直连版)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PREDEFINED_STOCKS, PredefinedStock, generateStockDailyBars, generateIndexDailyBars } from './engine/data/mockDataGenerator';
import { FactorEngine } from './engine/FactorEngine';
import { DailyBar, StockMeta, IndexBar } from './types/quant';
import { Navbar } from './components/Navbar';
import { QuantProfileSummary } from './components/QuantProfileSummary';
import { TechnicalChart } from './components/TechnicalChart';
import { FactorDetailsInspector } from './components/FactorDetailsInspector';
import { CrossSectionalMatrix } from './components/CrossSectionalMatrix';
import { StockScreener } from './components/StockScreener';
import { FactorBacktestEvaluator } from './components/FactorBacktestEvaluator';
import { QuantFormulaInspector } from './components/QuantFormulaInspector';
import { QlibAlphaInspector } from './components/QlibAlphaInspector';
import { CloudPortfolioManager } from './components/CloudPortfolioManager';
import { JsonExportModal } from './components/JsonExportModal';
import { CustomDataModal } from './components/CustomDataModal';
import { fetchRealStockBundle, fetchRealIndexBars, RealStockBundle, invalidateStockCache, StockSearchResult, StockDataSource } from './engine/data/realDataService';
import { initFirebaseAuth, testFirestoreConnection } from './lib/firebase';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedStock, setSelectedStock] = useState<PredefinedStock>(PREDEFINED_STOCKS[0]);
  const [activeTab, setActiveTab] = useState<'summary' | 'chart' | 'factors' | 'formulas' | 'qlib' | 'cloud' | 'cross_sectional' | 'screener' | 'backtest'>('summary');
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isCustomDataModalOpen, setIsCustomDataModalOpen] = useState(false);

  // 真实数据与加载状态
  const [realBundle, setRealBundle] = useState<RealStockBundle | null>(null);
  const [realIndexBars, setRealIndexBars] = useState<IndexBar[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [realDataError, setRealDataError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [dataSource, setDataSource] = useState<StockDataSource>('database');
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [dbTimeoutMs, setDbTimeoutMs] = useState<number>(800);

  // 自定义行情数据（若用户上传）
  const [customBars, setCustomBars] = useState<{ meta: StockMeta; bars: DailyBar[] } | null>(null);

  // 加载股票真实数据方法 (先查 Firestore 数据库缓存，若超时或未命中立即切换外部 API，并自动写回数据库)
  const loadStockRealData = useCallback(async (codeOrSymbol: string, forceRefresh: boolean = false) => {
    setIsLoadingReal(true);
    setRealDataError(null);
    try {
      const [stockResult, idxBars] = await Promise.all([
        fetchRealStockBundle(codeOrSymbol, forceRefresh, dbTimeoutMs),
        fetchRealIndexBars('sh000300'),
      ]);

      const bundle = stockResult.bundle;
      setRealBundle(bundle);
      setDataSource(stockResult.source);
      setLatencyMs(stockResult.latencyMs);

      if (idxBars && idxBars.length > 0) {
        setRealIndexBars(idxBars);
      }

      // 更新选中的股票元数据
      setSelectedStock(prev => ({
        ...prev,
        meta: bundle.meta,
        basePrice: bundle.quote.price,
      }));

      // 基准评估日设为最新一根K线的日期
      if (bundle.bars.length > 0) {
        setAsOfDate(bundle.bars[bundle.bars.length - 1].date);
      }

      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    } catch (err: any) {
      console.warn('Real data fetch failed, using local model:', err);
      setRealDataError(err.message || '真实数据加载失败');
    } finally {
      setIsLoadingReal(false);
    }
  }, [dbTimeoutMs]);

  // 初始加载第一个股票 (贵州茅台) 的真实数据与 Firebase 连接
  useEffect(() => {
    initFirebaseAuth().catch(console.warn);
    testFirestoreConnection().catch(console.warn);
    loadStockRealData('600519');
  }, [loadStockRealData]);

  // 全量 K 线数据 (优先使用真实K线，其次自定义K线，最后模拟K线)
  const fullStockBars = useMemo(() => {
    if (customBars && customBars.meta.symbol === selectedStock.meta.symbol) {
      return customBars.bars;
    }
    if (realBundle && realBundle.bars.length > 0 && realBundle.meta.symbol.startsWith(selectedStock.meta.symbol.replace(/[^\d]/g, ''))) {
      return realBundle.bars;
    }
    return generateStockDailyBars(selectedStock, 240);
  }, [selectedStock, customBars, realBundle]);

  // 可选的基准评估日 T 列表
  const availableDates = useMemo(() => {
    return fullStockBars.map(b => b.date);
  }, [fullStockBars]);

  // 当前选中的评估截止日 T
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    return availableDates[availableDates.length - 1] || '2026-08-18';
  });

  // 当切换股票时
  const handleSelectStock = (stock: PredefinedStock) => {
    setSelectedStock(stock);
    loadStockRealData(stock.meta.symbol);
  };

  // 用户通过智能联想搜索选中全市场任意股票
  const handleSelectSearchResult = (item: StockSearchResult) => {
    const clean = item.code.replace(/[^\d]/g, '').slice(-6);
    const found = PREDEFINED_STOCKS.find(s => s.meta.symbol.includes(clean));
    if (found) {
      setSelectedStock(found);
    } else {
      const prefix = item.prefix || (clean.startsWith('6') || clean.startsWith('9') ? 'sh' : clean.startsWith('92') || clean.startsWith('4') || clean.startsWith('8') ? 'bj' : 'sz');
      const tempStock: PredefinedStock = {
        meta: {
          symbol: item.symbol || `${clean}.${prefix.toUpperCase()}`,
          name: item.name,
          industry: item.marketName || 'A股上市公司',
          listDate: '2015-01-01',
          isST: item.name.includes('ST'),
          totalCapital: item.mcapYi && item.price ? Math.round((item.mcapYi * 100000000) / item.price / 10000) : 100000,
          floatCapital: 80000,
        },
        basePrice: item.price || 20.0,
        volatility: 0.25,
        trendBias: 0.0005,
        patternType: 'uptrend',
      };
      setSelectedStock(tempStock);
    }
    loadStockRealData(clean);
  };

  // 用户通过代码搜索框直接输入任意 6 位代码
  const handleSearchSymbol = (queryCode: string) => {
    const clean = queryCode.replace(/[^\d]/g, '').slice(-6);
    if (!clean) return;

    // 检查是否已有预设
    const found = PREDEFINED_STOCKS.find(s => s.meta.symbol.includes(clean));
    if (found) {
      handleSelectStock(found);
    } else {
      // 动态构建自选
      const tempStock: PredefinedStock = {
        meta: {
          symbol: `${clean}.${clean.startsWith('6') || clean.startsWith('9') ? 'SH' : clean.startsWith('92') || clean.startsWith('4') || clean.startsWith('8') ? 'BJ' : 'SZ'}`,
          name: `股票${clean}`,
          industry: 'A股上市公司',
          listDate: '2015-01-01',
          isST: false,
          totalCapital: 100000,
          floatCapital: 80000,
        },
        basePrice: 20.0,
        volatility: 0.25,
        trendBias: 0.0005,
        patternType: 'uptrend',
      };
      setSelectedStock(tempStock);
      loadStockRealData(clean);
    }
  };

  // 手动刷新真实行情 (强制穿透缓存查 API 并更新数据库)
  const handleRefresh = () => {
    invalidateStockCache(selectedStock.meta.symbol);
    loadStockRealData(selectedStock.meta.symbol, true);
  };

  // 大盘沪深300及行业指数 (使用真实指数或合成指数)
  const marketIndexBars = useMemo(() => {
    if (realIndexBars.length > 0) {
      return realIndexBars;
    }
    return generateIndexDailyBars('300', fullStockBars.length);
  }, [realIndexBars, fullStockBars.length]);

  const industryIndexBars = useMemo(() => generateIndexDailyBars('industry', fullStockBars.length), [fullStockBars.length]);

  // 严格根据 asOfDate 截取无未来函数的历史数据切片 [0 ... T]
  const slicedStockBars = useMemo(() => {
    const targetIdx = fullStockBars.findIndex(b => b.date === asOfDate);
    if (targetIdx !== -1) {
      return fullStockBars.slice(0, targetIdx + 1);
    }
    return fullStockBars;
  }, [fullStockBars, asOfDate]);

  const slicedMarketBars = useMemo(() => {
    return marketIndexBars.slice(0, slicedStockBars.length);
  }, [marketIndexBars, slicedStockBars]);

  const slicedIndustryBars = useMemo(() => {
    return industryIndexBars.slice(0, slicedStockBars.length);
  }, [industryIndexBars, slicedStockBars]);

  // 实例化引擎并执行计算
  const factorEngine = useMemo(() => new FactorEngine(), []);

  const quantResult = useMemo(() => {
    const baseEval = factorEngine.evaluate(
      slicedStockBars,
      selectedStock.meta,
      slicedMarketBars,
      slicedIndustryBars
    );

    // 注入真实行情与资金流数据
    if (realBundle && realBundle.quote) {
      baseEval.realQuote = {
        price: realBundle.quote.price,
        lastClose: realBundle.quote.lastClose,
        open: realBundle.quote.open,
        high: realBundle.quote.high,
        low: realBundle.quote.low,
        changeAmt: realBundle.quote.changeAmt,
        changePct: realBundle.quote.changePct,
        turnoverPct: realBundle.quote.turnoverPct,
        peTtm: realBundle.quote.peTtm,
        peStatic: realBundle.quote.peStatic,
        pb: realBundle.quote.pb,
        floatMcapYi: realBundle.quote.floatMcapYi,
        mcapYi: realBundle.quote.mcapYi,
        volume: realBundle.quote.volume,
        amount: realBundle.quote.amount,
        limitUp: realBundle.quote.limitUp,
        limitDown: realBundle.quote.limitDown,
      };
      baseEval.conceptTags = realBundle.blocks?.conceptTags || [];
      baseEval.recent20MainNet = realBundle.fundFlow?.recent20MainNet;
    }

    return baseEval;
  }, [factorEngine, slicedStockBars, selectedStock, slicedMarketBars, slicedIndustryBars, realBundle]);

  // 导入自定义数据处理
  const handleImportCustomData = (meta: StockMeta, bars: DailyBar[]) => {
    setCustomBars({ meta, bars });
    const customStock: PredefinedStock = {
      meta,
      basePrice: bars[bars.length - 1]?.close || 10.0,
      volatility: 0.25,
      trendBias: 0.0005,
      patternType: 'uptrend',
    };
    setSelectedStock(customStock);
    if (bars.length > 0) {
      setAsOfDate(bars[bars.length - 1].date);
    }
    setActiveTab('summary');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-200 font-sans selection:bg-emerald-500 selection:text-black pb-12">
      
      {/* 顶部导航 */}
      <Navbar
        selectedStock={selectedStock}
        onSelectStock={handleSelectStock}
        onSelectSearchResult={handleSelectSearchResult}
        onSearchSymbol={handleSearchSymbol}
        asOfDate={asOfDate}
        onDateChange={setAsOfDate}
        availableDates={availableDates}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onOpenCustomDataModal={() => setIsCustomDataModalOpen(true)}
        isLoading={isLoadingReal}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        realPrice={realBundle?.quote?.price}
        realChangePct={realBundle?.quote?.changePct}
        dataSource={dataSource}
        latencyMs={latencyMs}
      />

      {/* 真实数据错误提示 (若有) */}
      {realDataError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>数据接口提示: {realDataError} (已自动启用稳健量化评估模式)</span>
            </div>
            <button
              onClick={handleRefresh}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-rose-200 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> 重试
            </button>
          </div>
        </div>
      )}

      {/* 主视图区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isLoadingReal && (
          <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-emerald-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>正在直连 A 股金融终端拉取 {selectedStock.meta.symbol} 真实行情与 240 日日K线...</span>
          </div>
        )}

        {activeTab === 'summary' && (
          <QuantProfileSummary result={quantResult} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'chart' && (
          <TechnicalChart bars={slicedStockBars} asOfDate={asOfDate} />
        )}

        {activeTab === 'factors' && (
          <FactorDetailsInspector result={quantResult} />
        )}

        {activeTab === 'formulas' && (
          <QuantFormulaInspector result={quantResult} />
        )}

        {activeTab === 'qlib' && (
          <QlibAlphaInspector result={quantResult} historyBars={slicedStockBars} />
        )}

        {activeTab === 'cloud' && (
          <CloudPortfolioManager
            currentStock={selectedStock}
            currentScore={quantResult.overall.quantScore}
            onSelectStock={handleSelectStock}
            onSelectSymbol={(sym) => {
              loadStockRealData(sym);
              setActiveTab('summary');
            }}
            dbTimeoutMs={dbTimeoutMs}
            onDbTimeoutChange={setDbTimeoutMs}
          />
        )}

        {activeTab === 'cross_sectional' && (
          <CrossSectionalMatrix result={quantResult} />
        )}

        {activeTab === 'screener' && (
          <StockScreener
            onSelectStock={(stock) => {
              handleSelectStock(stock);
              setActiveTab('summary');
            }}
          />
        )}

        {activeTab === 'backtest' && (
          <FactorBacktestEvaluator bars={slicedStockBars} stockMeta={selectedStock.meta} />
        )}
      </main>

      {/* JSON 导出 Modal */}
      <JsonExportModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        result={quantResult}
      />

      {/* 自定义数据 Modal */}
      <CustomDataModal
        isOpen={isCustomDataModalOpen}
        onClose={() => setIsCustomDataModalOpen(false)}
        onImportCustomData={handleImportCustomData}
      />

    </div>
  );
}
