/**
 * realDataService.ts - A股真实行情与数据接口交互服务
 * 基于 A-Stock-Data 标准直连底层金融数据源 (腾讯/东财/同花顺/交易所)
 */

import { DailyBar, StockMeta, IndexBar } from '../../types/quant';
import { getCachedStockFromDb, saveStockToDbCache } from '../../lib/firebase';

export interface RealQuote {
  symbol: string;
  code: string;
  prefix: string;
  name: string;
  price: number;
  lastClose: number;
  open: number;
  high: number;
  low: number;
  changeAmt: number;
  changePct: number;
  volume: number; // 手
  amount: number; // 元
  amountWan: number;
  turnoverPct: number;
  peTtm: number;
  peStatic: number;
  pb: number;
  floatMcapYi: number; // 亿元
  mcapYi: number; // 亿元
  limitUp: number;
  limitDown: number;
  volRatio: number;
  isStale?: boolean;
}

export interface RealFundFlow {
  history: Array<{
    date: string;
    mainNet: number;
    smallNet: number;
    midNet: number;
    largeNet: number;
    superNet: number;
    mainNetPct: number;
  }>;
  recent20MainNet: number;
}

export interface RealStockBundle {
  meta: StockMeta;
  quote: RealQuote;
  bars: DailyBar[];
  blocks: {
    total: number;
    boards: Array<{ name: string; code: string; changePct: number; leadStock: string }>;
    conceptTags: string[];
  };
  fundFlow: RealFundFlow;
}

export interface RealMarketSentiment {
  date: string;
  ztCount: number;
  zbCount: number;
  dtCount: number;
  breakRate: number;
  maxHeight: number;
  ladder: Record<number, number>;
  ztPool: Array<{
    code: string;
    name: string;
    price: number;
    pct: number;
    sealFund: number;
    limitDays: number;
    breakTimes: number;
    industry: string;
    ztStat: string;
  }>;
}

const bundleCache = new Map<string, { bundle: RealStockBundle; time: number }>();
let indexCache: { bars: IndexBar[]; time: number } | null = null;
let screenerCache: any[] | null = null;
let sentimentCache: RealMarketSentiment | null = null;

export type StockDataSource = 'memory' | 'database' | 'api' | 'api_timeout_fallback';

/**
 * 获取单只 A 股全套真实数据 (行情/K线/基本面/题材板块/资金流)
 * 严格执行【先查数据库，超时即刻切换查 API，未命中查 API，并自动写回数据库】策略
 */
export async function fetchRealStockBundle(
  codeOrSymbol: string,
  forceRefresh: boolean = false,
  dbTimeoutMs: number = 1000
): Promise<{ bundle: RealStockBundle; source: StockDataSource; latencyMs?: number }> {
  const startTime = Date.now();
  const clean = codeOrSymbol.replace(/[^\d]/g, '').slice(-6);

  // 1. 优先内存命中 (1分钟 TTL)
  if (!forceRefresh && bundleCache.has(clean)) {
    const memCached = bundleCache.get(clean)!;
    if (Date.now() - memCached.time < 60 * 1000) {
      return {
        bundle: memCached.bundle,
        source: 'memory',
        latencyMs: Date.now() - startTime,
      };
    } else {
      bundleCache.delete(clean);
      console.log(`[内存 Cache 过期] 股票 ${clean} 内存缓存已过期 (超过1分钟)，重新发起查询`);
    }
  }

  let dbTimedOutOrFailed = false;

  // 2. 优先查数据库 Firestore Cache (设定超时熔断，若超过 dbTimeoutMs 则立即切换至 API 查询)
  if (!forceRefresh && dbTimeoutMs > 0) {
    try {
      const dbStart = Date.now();
      const dbCached = await getCachedStockFromDb(clean, dbTimeoutMs);
      const dbDuration = Date.now() - dbStart;

      if (dbCached && dbCached.bundle && dbCached.bundle.meta) {
        // 检查缓存是否过期 (默认 5 分钟 TTL)
        const cacheTime = new Date(dbCached.cachedAt).getTime();
        const now = Date.now();
        const maxAgeMs = 5 * 60 * 1000; // 5分钟

        if (now - cacheTime > maxAgeMs) {
          console.log(`[DB Cache 过期] 股票 ${clean} 缓存已过期 (超过5分钟)，转为请求 API...`);
          // 故意不 return，让代码继续往下走到 API 请求
        } else {
          console.log(`[DB Cache 命中] 股票 ${clean} 从 Firestore 数据库直读成功 (${dbDuration}ms, 缓存时间: ${dbCached.cachedAt})`);
          bundleCache.set(clean, { bundle: dbCached.bundle, time: Date.now() });
          return {
            bundle: dbCached.bundle,
            source: 'database',
            latencyMs: Date.now() - startTime,
          };
        }
      } else if (dbDuration >= dbTimeoutMs) {
        dbTimedOutOrFailed = true;
        console.warn(`[DB 超时熔断] 股票 ${clean} 数据库查询超过 ${dbTimeoutMs}ms，立即切换至金融 API 查询`);
      }
    } catch (dbErr) {
      dbTimedOutOrFailed = true;
      console.warn(`[DB Cache 检查异常] 股票 ${clean}, 降级继续请求 API:`, dbErr);
    }
  }

  // 3. 数据库未命中或超时熔断时，立即切换查询外部 API
  const apiStart = Date.now();
  console.log(`[API 请求] ${dbTimedOutOrFailed ? '数据库超时/异常切换' : '数据库未命中'} ${clean}，直连金融数据源 API 拉取...`);
  const res = await fetch(`/api/stock/full?symbol=${clean}&count=240`);
  if (!res.ok) {
    throw new Error(`无法获取股票 ${codeOrSymbol} 的真实数据: HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || `股票 ${codeOrSymbol} 数据解析失败`);
  }

  const bundle: RealStockBundle = json.data;
  bundleCache.set(clean, { bundle, time: Date.now() });

  // 4. 异步自动写回 Firestore 数据库缓存，下次查询直接 0 延迟秒开
  saveStockToDbCache(clean, bundle).catch((e) => {
    console.warn(`[DB Cache 回写失败] ${clean}:`, e);
  });

  return {
    bundle,
    source: dbTimedOutOrFailed ? 'api_timeout_fallback' : 'api',
    latencyMs: Date.now() - startTime,
  };
}

/**
 * 批量预热并缓存全市场核心股票至 Firestore 数据库
 */
export async function preloadAndCacheCoreStocksToDb(
  symbols: string[],
  onProgress?: (current: number, total: number, symbol: string) => void
): Promise<number> {
  let cachedCount = 0;
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    try {
      if (onProgress) onProgress(i + 1, symbols.length, sym);
      await fetchRealStockBundle(sym, false);
      cachedCount++;
      // 适度间隔避免瞬间打满并发
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      console.warn(`预热缓存 ${sym} 失败:`, err);
    }
  }
  return cachedCount;
}

/**
 * 获取沪深300指数真实日K线 (用于横截面相对收益基准)
 */
export async function fetchRealIndexBars(symbol: string = 'sh000300'): Promise<IndexBar[]> {
  if (indexCache && indexCache.bars.length > 0 && Date.now() - indexCache.time < 5 * 60 * 1000) {
    return indexCache.bars;
  }

  try {
    const res = await fetch(`/api/stock/index-kline?symbol=${symbol}&count=240`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const bars: IndexBar[] = json.data.map((b: any) => ({
        date: b.date,
        close: b.close,
        pctChange: b.pctChange || 0,
      }));
      indexCache = { bars, time: Date.now() };
      return bars;
    }
  } catch (err) {
    console.warn('Failed to load real index bars:', err);
  }

  return [];
}

/**
 * 获取全市场选股池真实标的与行情
 */
export async function fetchRealScreenerUniverse(): Promise<any[]> {
  if (screenerCache && screenerCache.length > 0) {
    return screenerCache;
  }

  const res = await fetch('/api/stock/screener-universe');
  const json = await res.json();
  if (json.success && Array.isArray(json.data)) {
    screenerCache = json.data;
    return json.data;
  }
  return [];
}

/**
 * 获取实时市场打板与短线情绪数据
 */
export async function fetchRealMarketSentiment(): Promise<RealMarketSentiment | null> {
  if (sentimentCache) {
    return sentimentCache;
  }

  try {
    const res = await fetch('/api/stock/sentiment');
    const json = await res.json();
    if (json.success && json.data) {
      sentimentCache = json.data;
      return json.data;
    }
  } catch (err) {
    console.warn('Failed to load market sentiment:', err);
  }
  return null;
}

/**
 * 股票搜索结果数据结构
 */
export interface StockSearchResult {
  code: string;
  symbol: string;
  name: string;
  prefix: string;
  marketName: string;
  price?: number;
  changePct?: number;
  mcapYi?: number;
  turnoverPct?: number;
}

/**
 * 真正全市场模糊与智能联想搜索 (支持股票中文名、拼音缩写、6位代码)
 */
export async function searchRealStocks(query: string): Promise<StockSearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch(`/api/stock/search?q=${encodeURIComponent(clean)}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.warn('Search stocks error:', err);
  }
  return [];
}

/**
 * 刷新单只股票真实数据缓存
 */
export function invalidateStockCache(code?: string) {
  if (code) {
    const clean = code.replace(/[^\d]/g, '').slice(-6);
    bundleCache.delete(clean);
  } else {
    bundleCache.clear();
    indexCache = null;
    screenerCache = null;
    sentimentCache = null;
  }
}
