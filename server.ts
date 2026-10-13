import express from "express";
import path from "path";
import iconv from "iconv-lite";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Common Headers
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SH_INDEX = new Set(["000300", "000905", "000016", "000688", "000852", "000010"]);

function getPrefix(code: string): string {
  const c = code.toLowerCase().trim();
  if (c.startsWith("sh") || c.startsWith("sz") || c.startsWith("bj")) return c.slice(0, 2);
  if (c.startsWith("92")) return "bj";
  if (c.startsWith("5") || c.startsWith("6") || c.startsWith("9")) return "sh";
  if (c.startsWith("4") || c.startsWith("8")) return "bj";
  if (SH_INDEX.has(c)) return "sh";
  return "sz";
}

function normTicker(code: string): string {
  const clean = code.replace(/[^\d]/g, "");
  return clean.padStart(6, "0").slice(-6);
}

// 1. Real-time Quote from Tencent Finance API
async function fetchTencentQuotes(symbols: string[]) {
  const prefixed = symbols.map(s => {
    const clean = normTicker(s);
    const prefix = getPrefix(s);
    return `${prefix}${clean}`;
  });

  const url = `https://qt.gtimg.cn/q=${prefixed.join(",")}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Referer": "https://gu.qq.com/",
    },
  });

  const buffer = await resp.arrayBuffer();
  const text = iconv.decode(Buffer.from(buffer), "gbk");

  const results: Record<string, any> = {};
  const lines = text.split(";");

  for (const line of lines) {
    if (!line.trim() || !line.includes("=") || !line.includes('"')) continue;
    const parts = line.split("=");
    const key = parts[0].trim().replace(/^v_/, "");
    const rawVal = parts[1].replace(/"/g, "").trim();
    const vals = rawVal.split("~");
    if (vals.length < 40) continue;

    const rawCode = vals[2] || key.slice(2);
    const prefix = key.slice(0, 2);
    const symbol = `${rawCode}.${prefix.toUpperCase()}`;

    const price = parseFloat(vals[3]) || 0;
    const lastClose = parseFloat(vals[4]) || 0;
    const open = parseFloat(vals[5]) || 0;
    const high = parseFloat(vals[33]) || 0;
    const low = parseFloat(vals[34]) || 0;
    const changeAmt = parseFloat(vals[31]) || 0;
    const changePct = parseFloat(vals[32]) || 0;
    const volumeHands = parseFloat(vals[36]) || 0; // 手
    const amountWan = parseFloat(vals[37]) || 0; // 万元
    const turnoverPct = parseFloat(vals[38]) || 0;
    const peTtm = parseFloat(vals[39]) || 0;
    const floatMcapYi = parseFloat(vals[44]) || 0; // 流通市值 (亿)
    const mcapYi = parseFloat(vals[45]) || 0; // 总市值 (亿)
    const pb = parseFloat(vals[46]) || 0;
    const limitUp = parseFloat(vals[47]) || 0;
    const limitDown = parseFloat(vals[48]) || 0;
    const volRatio = parseFloat(vals[49]) || 0;
    const peStatic = parseFloat(vals[52]) || 0;

    results[rawCode] = {
      symbol,
      code: rawCode,
      prefix,
      name: vals[1],
      price,
      lastClose,
      open,
      high,
      low,
      changeAmt,
      changePct,
      volume: volumeHands,
      amount: amountWan * 10000,
      amountWan,
      turnoverPct,
      peTtm,
      peStatic,
      pb,
      floatMcapYi,
      mcapYi,
      limitUp,
      limitDown,
      volRatio,
      isStale: amountWan === 0 && price === lastClose && price > 0,
    };
  }

  return results;
}

// 2. Real Historical Daily K-lines with 前复权 (Tencent Finance)
async function fetchTencentKline(code: string, count = 240) {
  const clean = normTicker(code);
  const prefix = getPrefix(code);
  const param = `${prefix}${clean}`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${param},day,,,${count},qfq`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Referer": "https://gu.qq.com/",
    },
  });

  const json: any = await resp.json();
  const stockData = json?.data?.[param];
  if (!stockData) {
    throw new Error(`No kline data found for ${param}`);
  }

  const rawBars = stockData.qfqday || stockData.day || [];
  const bars = rawBars.map((b: any[], idx: number) => {
    const date = b[0];
    const open = parseFloat(b[1]) || 0;
    const close = parseFloat(b[2]) || 0;
    const high = parseFloat(b[3]) || 0;
    const low = parseFloat(b[4]) || 0;
    const volume = parseFloat(b[5]) || 0; // 手
    const prevClose = idx > 0 ? (parseFloat(rawBars[idx - 1][2]) || close) : close;
    const pctChange = prevClose > 0 ? parseFloat((((close - prevClose) / prevClose) * 100).toFixed(2)) : 0;
    const amount = volume * ((open + close + high + low) / 4) * 100; // 推算成交额 (元)

    return {
      date,
      open,
      close,
      high,
      low,
      volume,
      amount,
      pctChange,
      turnoverRate: b[6] ? parseFloat(b[6]) : undefined,
    };
  });

  return bars;
}

// 3. Eastmoney Concept Blocks & Industry Affiliation
async function fetchEastmoneyBlocks(code: string) {
  const clean = normTicker(code);
  const marketCode = clean.startsWith("6") || clean.startsWith("9") ? 1 : 0;
  const url = `https://push2.eastmoney.com/api/qt/slist/get?fltt=2&invt=2&secid=${marketCode}.${clean}&spt=3&pi=0&pz=200&po=1&fields=f12,f14,f3,f128`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://quote.eastmoney.com/",
      },
    });
    const json: any = await resp.json();
    const diff = json?.data?.diff || [];
    const items = Array.isArray(diff) ? diff : Object.values(diff);

    const boards = items.map((it: any) => ({
      name: it.f14 || "",
      code: it.f12 || "",
      changePct: parseFloat(it.f3) || 0,
      leadStock: it.f128 || "",
    }));

    return {
      total: boards.length,
      boards,
      conceptTags: boards.map((b: any) => b.name).filter(Boolean),
    };
  } catch (err) {
    return { total: 0, boards: [], conceptTags: [] };
  }
}

// 4. Eastmoney Real-time & Historical Fund Flow
async function fetchEastmoneyFundFlow(code: string) {
  const clean = normTicker(code);
  const marketCode = clean.startsWith("6") || clean.startsWith("9") ? 1 : 0;
  
  // 120 Day Daily Fund Flow
  const dayUrl = `https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?secid=${marketCode}.${clean}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&lmt=120`;
  
  try {
    const resp = await fetch(dayUrl, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://quote.eastmoney.com/",
      },
    });
    const json: any = await resp.json();
    const klines = json?.data?.klines || [];
    const history = klines.map((line: string) => {
      const p = line.split(",");
      return {
        date: p[0],
        mainNet: parseFloat(p[1]) || 0,
        smallNet: parseFloat(p[2]) || 0,
        midNet: parseFloat(p[3]) || 0,
        largeNet: parseFloat(p[4]) || 0,
        superNet: parseFloat(p[5]) || 0,
        mainNetPct: parseFloat(p[6]) || 0,
      };
    });

    const recent20 = history.slice(-20);
    const totalMain20 = recent20.reduce((acc: number, cur: any) => acc + cur.mainNet, 0);

    return {
      history,
      recent20MainNet: totalMain20,
    };
  } catch (err) {
    return { history: [], recent20MainNet: 0 };
  }
}

// 5. Real Market Sentiment & Limit-Up Pool (Eastmoney & THS)
async function fetchMarketSentiment() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  try {
    const [ztResp, zbResp, dtResp] = await Promise.allSettled([
      fetch(`https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=100&sort=fbt:asc&date=${dateStr}`, { headers: { "User-Agent": UA, "Referer": "https://quote.eastmoney.com/" } }).then(r => r.json()),
      fetch(`https://push2ex.eastmoney.com/getTopicZBPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=100&sort=fbt:asc&date=${dateStr}`, { headers: { "User-Agent": UA, "Referer": "https://quote.eastmoney.com/" } }).then(r => r.json()),
      fetch(`https://push2ex.eastmoney.com/getTopicDTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=100&sort=fund:asc&date=${dateStr}`, { headers: { "User-Agent": UA, "Referer": "https://quote.eastmoney.com/" } }).then(r => r.json()),
    ]);

    const ztPool = ztResp.status === "fulfilled" ? (ztResp.value as any)?.data?.pool || [] : [];
    const zbPool = zbResp.status === "fulfilled" ? (zbResp.value as any)?.data?.pool || [] : [];
    const dtPool = dtResp.status === "fulfilled" ? (dtResp.value as any)?.data?.pool || [] : [];

    const ladder: Record<number, number> = {};
    let maxHeight = 0;

    const ztItems = ztPool.map((p: any) => {
      const limitDays = p.lbc || 1;
      ladder[limitDays] = (ladder[limitDays] || 0) + 1;
      if (limitDays > maxHeight) maxHeight = limitDays;
      return {
        code: p.c,
        name: p.n,
        price: p.p ? p.p / 1000 : 0,
        pct: p.zdp,
        sealFund: p.fund,
        limitDays,
        breakTimes: p.zbc,
        industry: p.hybk || "",
        ztStat: p.zttj ? `${p.zttj.days}天${p.zttj.ct}板` : `${limitDays}连板`,
      };
    });

    const totalZt = ztPool.length;
    const totalZb = zbPool.length;
    const breakRate = totalZt + totalZb > 0 ? parseFloat(((totalZb / (totalZt + totalZb)) * 100).toFixed(1)) : 0;

    return {
      date: dateStr,
      ztCount: totalZt,
      zbCount: totalZb,
      dtCount: dtPool.length,
      breakRate,
      maxHeight,
      ladder,
      ztPool: ztItems.slice(0, 30),
    };
  } catch (err) {
    return {
      date: dateStr,
      ztCount: 0,
      zbCount: 0,
      dtCount: 0,
      breakRate: 0,
      maxHeight: 0,
      ladder: {},
      ztPool: [],
    };
  }
}

// 6. Predefined Popular Universe for Multi-Stock Screener
const POPULAR_SYMBOLS = [
  "600519", // 贵州茅台 (白酒)
  "300750", // 宁德时代 (电池/新能源)
  "002594", // 比亚迪 (汽车)
  "600036", // 招商银行 (银行)
  "688981", // 中芯国际 (半导体)
  "300059", // 东方财富 (证券/金融科技)
  "601318", // 中国平安 (保险)
  "601899", // 紫金矿业 (有色金属)
  "002475", // 立讯精密 (消费电子/苹果链)
  "688017", // 绿的谐波 (机器人/减速器)
  "300308", // 中际旭创 (光模块/CPO/AI算力)
  "000001", // 平安银行 (银行)
  "000858", // 五粮液 (白酒)
  "601138", // 工业富联 (AI服务器)
  "600900", // 长江电力 (电力公用)
  "688041", // 海光信息 (国产CPU/AI芯片)
  "002230", // 科大讯飞 (人工智能)
  "600276", // 恒瑞医药 (创新药)
  "002463", // 沪电股份 (PCB/算力)
  "601888", // 中国中免 (旅游零售)
];

// API ROUTE: Real Index Kline (e.g., sh000300 for CSI 300, sh000001 for SSE)
app.get("/api/stock/index-kline", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "sh000300";
    const count = parseInt(req.query.count as string) || 240;
    const bars = await fetchTencentKline(symbol, count);
    res.json({ success: true, symbol, count: bars.length, data: bars });
  } catch (err: any) {
    console.error("Index kline error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API ROUTE: Quick Stock Search / Validation (Search by Name, Pinyin, Code)
app.get("/api/stock/search", async (req, res) => {
  try {
    const query = ((req.query.q as string) || "").trim();
    if (!query) {
      return res.json({ success: true, data: [] });
    }

    const matchedItems: Array<{ code: string; name: string; prefix: string; symbol: string; marketName: string }> = [];
    const seenCodes = new Set<string>();

    const getMarketName = (code: string) => {
      if (code.startsWith("688")) return "科创板";
      if (code.startsWith("300") || code.startsWith("301")) return "创业板";
      if (code.startsWith("600") || code.startsWith("601") || code.startsWith("603") || code.startsWith("605")) return "沪主板";
      if (code.startsWith("000") || code.startsWith("001") || code.startsWith("002") || code.startsWith("003")) return "深主板";
      if (code.startsWith("920") || code.startsWith("8") || code.startsWith("4")) return "北交所";
      return "A股";
    };

    // 1. Query Sina Suggest API for name / pinyin / code search
    try {
      const suggestUrl = `https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=${encodeURIComponent(query)}`;
      const sResp = await fetch(suggestUrl, {
        headers: { "User-Agent": UA, "Referer": "https://finance.sina.com.cn/" },
      });
      const buf = await sResp.arrayBuffer();
      const text = iconv.decode(Buffer.from(buf), "gbk");
      const match = text.match(/"(.*)"/);
      if (match && match[1]) {
        const rows = match[1].split(";").filter(Boolean);
        for (const row of rows) {
          const parts = row.split(",");
          if (parts.length >= 4) {
            const rawName = parts[0];
            const type = parts[1];
            const code = parts[2];
            const fullSym = (parts[3] || "").toLowerCase();
            const alias = parts[4];

            if ((type === "11" || fullSym.startsWith("sh") || fullSym.startsWith("sz") || fullSym.startsWith("bj")) && /^\d{6}$/.test(code)) {
              if (!seenCodes.has(code)) {
                seenCodes.add(code);
                const prefix = fullSym.slice(0, 2) || getPrefix(code);
                const displayName = (!rawName.startsWith("sh") && !rawName.startsWith("sz") && !rawName.startsWith("bj")) ? rawName : (alias || rawName);
                matchedItems.push({
                  code,
                  name: displayName,
                  prefix,
                  symbol: `${code}.${prefix.toUpperCase()}`,
                  marketName: getMarketName(code),
                });
              }
            }
          }
        }
      }
    } catch (sErr) {
      console.warn("Sina suggest error:", sErr);
    }

    // 2. If query is a pure 6-digit or part-digit code, ensure direct code is in list
    const cleanDigits = query.replace(/[^\d]/g, "");
    if (cleanDigits.length === 6 && !seenCodes.has(cleanDigits)) {
      const prefix = getPrefix(cleanDigits);
      matchedItems.unshift({
        code: cleanDigits,
        name: `股票${cleanDigits}`,
        prefix,
        symbol: `${cleanDigits}.${prefix.toUpperCase()}`,
        marketName: getMarketName(cleanDigits),
      });
      seenCodes.add(cleanDigits);
    }

    if (matchedItems.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 3. Attach real-time quotes for the top matched stocks
    const topItems = matchedItems.slice(0, 10);
    const codesToQuote = topItems.map(it => it.code);
    let quotes: Record<string, any> = {};
    try {
      quotes = await fetchTencentQuotes(codesToQuote);
    } catch (qErr) {
      console.warn("Fetch quotes for search error:", qErr);
    }

    const finalResults = topItems.map(item => {
      const quote = quotes[item.code] || {};
      return {
        code: item.code,
        symbol: item.symbol,
        name: quote.name || item.name,
        prefix: item.prefix,
        marketName: item.marketName,
        price: quote.price || 0,
        changePct: quote.changePct || 0,
        mcapYi: quote.mcapYi || 0,
        turnoverPct: quote.turnoverPct || 0,
      };
    });

    res.json({ success: true, data: finalResults });
  } catch (err: any) {
    console.error("Search API error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API ROUTE: Batch Quotes
app.get("/api/stock/quote", async (req, res) => {
  try {
    const rawSymbols = (req.query.symbols as string) || "600519";
    const symbols = rawSymbols.split(",").filter(Boolean);
    const quotes = await fetchTencentQuotes(symbols);
    res.json({ success: true, data: quotes });
  } catch (err: any) {
    console.error("Quote error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API ROUTE: Real Historical Daily Kline
app.get("/api/stock/kline", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "600519";
    const count = parseInt(req.query.count as string) || 240;
    const bars = await fetchTencentKline(symbol, count);
    res.json({ success: true, symbol, count: bars.length, data: bars });
  } catch (err: any) {
    console.error("Kline error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API ROUTE: Stock Meta + Real-time Quote + Blocks + Fund Flow (Full Data Bundle)
app.get("/api/stock/full", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "600519";
    const clean = normTicker(symbol);
    const count = parseInt(req.query.count as string) || 240;

    const [quotes, bars, blocks, fundFlow] = await Promise.all([
      fetchTencentQuotes([clean]),
      fetchTencentKline(clean, count),
      fetchEastmoneyBlocks(clean),
      fetchEastmoneyFundFlow(clean),
    ]);

    const quote = quotes[clean] || {};
    const meta = {
      symbol: quote.symbol || `${clean}.${getPrefix(clean).toUpperCase()}`,
      name: quote.name || `股票${clean}`,
      industry: blocks.conceptTags[0] || "A股上市公司",
      listDate: "2010-01-01",
      isST: (quote.name || "").includes("ST"),
      totalCapital: quote.mcapYi && quote.price ? Math.round((quote.mcapYi * 100000000) / quote.price / 10000) : 100000,
      floatCapital: quote.floatMcapYi && quote.price ? Math.round((quote.floatMcapYi * 100000000) / quote.price / 10000) : 80000,
    };

    res.json({
      success: true,
      data: {
        meta,
        quote,
        bars,
        blocks,
        fundFlow,
      },
    });
  } catch (err: any) {
    console.error("Full bundle error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API ROUTE: Screener Universe Real Quotes & Profiles
app.get("/api/stock/screener-universe", async (req, res) => {
  try {
    const symbols = POPULAR_SYMBOLS;
    const quotes = await fetchTencentQuotes(symbols);

    // Fetch daily K-lines for each in parallel
    const stockResults = await Promise.all(
      symbols.map(async code => {
        try {
          const [bars, blocks] = await Promise.all([
            fetchTencentKline(code, 120),
            fetchEastmoneyBlocks(code),
          ]);
          const quote = quotes[code] || {};
          const meta = {
            symbol: quote.symbol || `${code}.${getPrefix(code).toUpperCase()}`,
            name: quote.name || code,
            industry: blocks.conceptTags[0] || "综合板块",
            listDate: "2015-01-01",
            isST: (quote.name || "").includes("ST"),
            totalCapital: quote.mcapYi && quote.price ? Math.round((quote.mcapYi * 100000000) / quote.price / 10000) : 100000,
            floatCapital: quote.floatMcapYi && quote.price ? Math.round((quote.floatMcapYi * 100000000) / quote.price / 10000) : 80000,
          };
          return {
            meta,
            quote,
            bars,
            blocks,
          };
        } catch (e) {
          return null;
        }
      })
    );

    const validStocks = stockResults.filter(Boolean);
    res.json({ success: true, count: validStocks.length, data: validStocks });
  } catch (err: any) {
    console.error("Screener universe error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API ROUTE: Market Sentiment
app.get("/api/stock/sentiment", async (req, res) => {
  try {
    const sentiment = await fetchMarketSentiment();
    res.json({ success: true, data: sentiment });
  } catch (err: any) {
    console.error("Sentiment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
