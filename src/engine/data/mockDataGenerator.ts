/**
 * A股股票行情与指标模拟生成器
 */

import { DailyBar, StockMeta, IndexBar } from '../../types/quant';

export interface PredefinedStock {
  meta: StockMeta;
  basePrice: number;
  volatility: number; // 基础年化波动率
  trendBias: number;  // 长期趋势偏置 (-0.001 ~ +0.002)
  patternType: 'breakout' | 'uptrend' | 'squeeze' | 'oversold' | 'downtrend' | 'high_vol';
}

export const PREDEFINED_STOCKS: PredefinedStock[] = [
  {
    meta: {
      symbol: '600519.SH',
      name: '贵州茅台',
      industry: '白酒',
      listDate: '2001-08-27',
      isST: false,
      totalCapital: 125619,
      floatCapital: 125619,
    },
    basePrice: 1680.0,
    volatility: 0.18,
    trendBias: 0.0006,
    patternType: 'breakout',
  },
  {
    meta: {
      symbol: '300750.SZ',
      name: '宁德时代',
      industry: '电力设备/新能源电池',
      listDate: '2018-06-11',
      isST: false,
      totalCapital: 439800,
      floatCapital: 388000,
    },
    basePrice: 245.5,
    volatility: 0.32,
    trendBias: 0.0012,
    patternType: 'uptrend',
  },
  {
    meta: {
      symbol: '002594.SZ',
      name: '比亚迪',
      industry: '汽车/新能源车',
      listDate: '2011-06-30',
      isST: false,
      totalCapital: 291100,
      floatCapital: 181000,
    },
    basePrice: 288.0,
    volatility: 0.28,
    trendBias: 0.0010,
    patternType: 'squeeze',
  },
  {
    meta: {
      symbol: '600036.SH',
      name: '招商银行',
      industry: '银行业',
      listDate: '2002-04-09',
      isST: false,
      totalCapital: 2522000,
      floatCapital: 2062000,
    },
    basePrice: 38.2,
    volatility: 0.16,
    trendBias: 0.0004,
    patternType: 'uptrend',
  },
  {
    meta: {
      symbol: '688981.SH',
      name: '中芯国际',
      industry: '半导体芯片',
      listDate: '2020-07-16',
      isST: false,
      totalCapital: 795000,
      floatCapital: 198000,
    },
    basePrice: 88.6,
    volatility: 0.42,
    trendBias: 0.0015,
    patternType: 'high_vol',
  },
  {
    meta: {
      symbol: '300059.SZ',
      name: '东方财富',
      industry: '证券/金融科技',
      listDate: '2010-03-19',
      isST: false,
      totalCapital: 1585000,
      floatCapital: 1320000,
    },
    basePrice: 22.4,
    volatility: 0.38,
    trendBias: 0.0008,
    patternType: 'breakout',
  },
  {
    meta: {
      symbol: '601138.SH',
      name: '工业富联',
      industry: 'AI算力服务器',
      listDate: '2018-06-08',
      isST: false,
      totalCapital: 1986000,
      floatCapital: 1986000,
    },
    basePrice: 26.8,
    volatility: 0.35,
    trendBias: 0.0014,
    patternType: 'uptrend',
  },
  {
    meta: {
      symbol: '601127.SH',
      name: '赛力斯',
      industry: '智能网联汽车',
      listDate: '2016-06-15',
      isST: false,
      totalCapital: 150900,
      floatCapital: 150900,
    },
    basePrice: 96.5,
    volatility: 0.45,
    trendBias: 0.0018,
    patternType: 'breakout',
  },
  {
    meta: {
      symbol: '601899.SH',
      name: '紫金矿业',
      industry: '有色金属/黄金',
      listDate: '2008-04-25',
      isST: false,
      totalCapital: 2630000,
      floatCapital: 2050000,
    },
    basePrice: 17.6,
    volatility: 0.25,
    trendBias: 0.0009,
    patternType: 'uptrend',
  },
  {
    meta: {
      symbol: '000001.SZ',
      name: '平安银行',
      industry: '银行业',
      listDate: '1991-04-03',
      isST: false,
      totalCapital: 1940000,
      floatCapital: 1940000,
    },
    basePrice: 11.8,
    volatility: 0.19,
    trendBias: -0.0003,
    patternType: 'oversold',
  },
  {
    meta: {
      symbol: '000002.SZ',
      name: '*ST万科',
      industry: '房地产',
      listDate: '1991-01-29',
      isST: true,
      totalCapital: 1193000,
      floatCapital: 971000,
    },
    basePrice: 6.8,
    volatility: 0.36,
    trendBias: -0.0015,
    patternType: 'downtrend',
  },
];

/**
 * 生成符合物理几何属性的真实感 A 股历史 K 线数据 (300 个交易日)
 */
export function generateStockDailyBars(stockDef: PredefinedStock, daysCount: number = 300): DailyBar[] {
  const bars: DailyBar[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Math.round(daysCount * 1.5));

  let currentPrice = stockDef.basePrice;
  const baseVol = stockDef.volatility / Math.sqrt(252);
  let currentDate = new Date(startDate);

  let currentVolMA = 100000; // 基础量

  for (let i = 0; i < daysCount; i++) {
    // 过滤周末
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const dateStr = currentDate.toISOString().split('T')[0];

    // 特殊形态演变注入
    let patternFactor = 0;
    let volumeMultiplier = 1.0;

    // 近30日注入形态特征
    if (i >= daysCount - 25) {
      if (stockDef.patternType === 'breakout') {
        patternFactor = 0.008; // 强突破
        volumeMultiplier = i >= daysCount - 5 ? 2.4 : 1.2;
      } else if (stockDef.patternType === 'squeeze') {
        patternFactor = (i % 2 === 0 ? 0.001 : -0.001); // 布林带极窄收窄
        volumeMultiplier = 0.6;
      } else if (stockDef.patternType === 'oversold') {
        if (i < daysCount - 5) {
          patternFactor = -0.012; // 连续急跌
          volumeMultiplier = 1.6;
        } else {
          patternFactor = 0.015; // 破位超跌弹射
          volumeMultiplier = 2.2;
        }
      } else if (stockDef.patternType === 'downtrend') {
        patternFactor = -0.007;
        volumeMultiplier = 0.9;
      }
    }

    // 随机漫步收益率
    const z = gaussianRandom();
    const dailyReturn = stockDef.trendBias + patternFactor + z * baseVol;

    const open = currentPrice * (1 + (Math.random() - 0.48) * 0.006);
    const close = Math.max(1.0, currentPrice * (1 + dailyReturn));

    const high = Math.max(open, close) * (1 + Math.abs(gaussianRandom()) * baseVol * 0.8);
    const low = Math.min(open, close) * (1 - Math.abs(gaussianRandom()) * baseVol * 0.8);

    // 成交量模拟 (量价联动效应)
    const priceChangePct = Math.abs((close - open) / open);
    const volNoise = Math.exp(gaussianRandom() * 0.3);
    const vol = Math.round(currentVolMA * (1 + priceChangePct * 15) * volumeMultiplier * volNoise);

    // 成交额 (元)
    const avgBarPrice = (open + close + high + low) / 4;
    const amount = Math.round(vol * avgBarPrice * 100);

    const turnoverRate = Number(((vol / (stockDef.meta.floatCapital * 100)) * 100).toFixed(2));
    const pctChange = Number((((close - (bars[i - 1]?.close || open)) / (bars[i - 1]?.close || open)) * 100).toFixed(2));

    bars.push({
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: vol,
      amount,
      turnoverRate: Math.max(0.1, turnoverRate),
      pctChange,
      isSuspended: false,
    });

    currentPrice = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return bars;
}

/**
 * 生成对标大盘指数 (如 沪深300) 行情
 */
export function generateIndexDailyBars(symbol: string, daysCount: number = 300): IndexBar[] {
  const bars: IndexBar[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Math.round(daysCount * 1.5));

  let currentPrice = symbol.includes('300') ? 3950 : 5800;
  let currentDate = new Date(startDate);

  for (let i = 0; i < daysCount; i++) {
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const dateStr = currentDate.toISOString().split('T')[0];
    const z = gaussianRandom();
    const ret = 0.0002 + z * 0.009; // 沪深300日波动率约 0.9%

    const close = Number((currentPrice * (1 + ret)).toFixed(2));
    const prevClose = bars[i - 1]?.close || currentPrice;
    const pctChange = Number((((close - prevClose) / prevClose) * 100).toFixed(2));

    bars.push({
      date: dateStr,
      close,
      pctChange,
    });

    currentPrice = close;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return bars;
}

// 高斯标准正态分布随机数生成 (Box-Muller Transform)
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
