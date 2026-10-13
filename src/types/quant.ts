/**
 * A股量化特征评估引擎 - 核心数据结构与类型定义
 */

// K线单日行情数据
export interface DailyBar {
  date: string;         // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;       // 成交量 (手)
  amount: number;       // 成交额 (元)
  turnoverRate?: number;// 换手率 (%)
  pctChange?: number;   // 涨跌幅 (%)
  isSuspended?: boolean;// 是否停牌
}

// 股票基本元数据
export interface StockMeta {
  symbol: string;       // 代码，如 "600519.SH", "300750.SZ"
  name: string;         // 简称，如 "贵州茅台"
  industry: string;     // 所属行业，如 "白酒", "电力设备"
  listDate: string;     // 上市日期 YYYY-MM-DD
  isST: boolean;        // 是否ST股票
  totalCapital: number; // 总股本 (万股)
  floatCapital: number; // 流通股本 (万股)
}

// 指数行情数据 (沪深300 / 中证1000 / 行业指数)
export interface IndexBar {
  date: string;
  close: number;
  pctChange: number;
}

// 因子类别
export type FactorCategory =
  | 'trend'
  | 'momentum'
  | 'volume_price'
  | 'breakout'
  | 'volatility'
  | 'mean_reversion'
  | 'liquidity'
  | 'risk'
  | 'relative_strength';

// 单项因子计算结果
export interface FactorItemResult {
  category: FactorCategory;
  categoryName: string;
  score: number;             // 0 ~ 100 分
  normalizedValue: number;   // -1 ~ +1 或 0 ~ 1
  signal: -1 | 0 | 1;        // -1: 看空/劣势, 0: 中性, 1: 看多/优势
  state: string;             // 状态枚举值 (如 "StrongUptrend", "VolatilityExpansion")
  stateName: string;         // 状态中文描述 (如 "强劲多头趋势", "波动率扩展突破")
  confidence: number;        // 信号置信度 (0 ~ 1)
  explanation: string;       // 详细量化逻辑解释
  rawIndicators: Record<string, number | string | boolean>; // 保留的原始指标值 (如 MA20, ADX, RSI, ATR, ZScore)
}

// 多周期趋势分析
export interface MultiPeriodTrend {
  shortTerm: { period: '1D-10D'; state: string; score: number };
  mediumTerm: { period: '20D-60D'; state: string; score: number };
  longTerm: { period: '120D-250D'; state: string; score: number };
}

// 综合量化画像
export interface QuantProfile {
  trendState: string;
  momentumState: string;
  volumePriceConfirmation: string;
  breakoutState: string;
  meanReversionState: string;
  liquidityGrade: 'Excellent' | 'Good' | 'Normal' | 'Poor' | 'Avoid';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  quantQuality: 'High' | 'Medium' | 'Low';
  tags: string[]; // 特征标签，如 ["强趋势", "放量突破", "高流动性", "低波动压缩"]
}

// 横截面排名信息
export interface RelativeRankInfo {
  relativeStrength20: number;  // 20日相对收益 (%)
  relativeStrength60: number;  // 60日相对收益 (%)
  relativeStrength120: number; // 120日相对收益 (%)
  industryRank: number;        // 行业排名
  industryTotal: number;       // 行业股票总数
  marketRank: number;          // 全市场排名
  marketTotal: number;         // 市场股票总数
  industryPercentile: number;  // 行业百分位 (0~100)
  marketPercentile: number;    // 市场百分位 (0~100)
}

// 最终结构化评估结果 (符合要求7规范)
export interface QuantEvaluationResult {
  symbol: string;
  name: string;
  industry: string;
  asOfDate: string;
  dataLength: number; // 完整交易日数

  // 各因子分项结果
  factors: {
    trend: FactorItemResult;
    momentum: FactorItemResult;
    volume_price: FactorItemResult;
    breakout: FactorItemResult;
    volatility: FactorItemResult;
    mean_reversion: FactorItemResult;
    liquidity: FactorItemResult;
    risk: FactorItemResult;
    relative_strength: FactorItemResult;
  };

  // 原始指标汇总表 (便于回测与特征导出)
  allRawIndicators: Record<string, number | string | boolean>;

  // 多周期趋势
  multiPeriodTrend: MultiPeriodTrend;

  // 横截面与相对强弱
  relativeStrength: RelativeRankInfo;

  // 量化画像
  profile: QuantProfile;

  // 综合评分与风险限制
  overall: {
    quantScore: number;         // 0 ~ 100 综合得分
    riskScore: number;          // 0 ~ 100 风险指标分
    liquidityEligible: boolean; // 流动性门槛达标与否
    classification: string;     // 分类名称，如 "StrongQuantCharacteristics"
    classificationName: string; // 中文分类，如 "具有强量化多头特征"
    weightsUsed: Record<string, number>; // 使用的因子权重配置
  };

  // 数据质量与异常警告 (ST, 停牌, 上市天数过短等)
  dataWarnings: string[];

  // 真实市场行情与资金流扩展字段 (A-Stock 实时直连)
  realQuote?: {
    price: number;
    lastClose: number;
    open: number;
    high: number;
    low: number;
    changeAmt: number;
    changePct: number;
    turnoverPct: number;
    peTtm: number;
    peStatic: number;
    pb: number;
    floatMcapYi: number;
    mcapYi: number;
    volume: number;
    amount: number;
    limitUp: number;
    limitDown: number;
  };
  conceptTags?: string[];
  recent20MainNet?: number;
}

// 选股/筛选器参数
export interface ScreenerFilter {
  minQuantScore: number;
  maxRiskScore: number;
  trendFilter: string; // 'All' | 'Uptrend' | 'Breakout'
  liquidityGrade: string; // 'All' | 'Good+' | 'Excellent'
  searchQuery: string;
}

// 因子有效性/回测评估结果
export interface FactorICResult {
  factorKey: FactorCategory;
  factorName: string;
  icMean: number;        // 信息系数均值 (Mean IC)
  rankIcMean: number;    // Rank IC 均值
  icStd: number;         // IC 标准差
  icir: number;          // ICIR = IC Mean / IC Std
  winRate: number;       // 因子方向预测胜率 (%)
  longShortReturn: number;// 顶底分位数多空收益 (%)
  decayDays: number;     // 因子半衰期天数
}
