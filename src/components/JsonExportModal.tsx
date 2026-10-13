/**
 * JsonExportModal.tsx - 结构化评估结果 JSON 导出与树形查看 Modal
 */

import React, { useState } from 'react';
import { QuantEvaluationResult } from '../types/quant';
import { X, Copy, Check, Code, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: QuantEvaluationResult;
}

export const JsonExportModal: React.FC<Props> = ({ isOpen, onClose, result }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 严格格式化为 prompt section 7 规范结构
  const formattedOutput = {
    symbol: result.symbol,
    name: result.name,
    industry: result.industry,
    date: result.asOfDate,

    trend: {
      score: result.factors.trend.score,
      state: result.factors.trend.state,
      strength: result.factors.trend.confidence,
    },

    momentum: {
      score: result.factors.momentum.score,
      state: result.factors.momentum.state,
    },

    volume_price: {
      score: result.factors.volume_price.score,
      state: result.factors.volume_price.state,
    },

    breakout: {
      score: result.factors.breakout.score,
      state: result.factors.breakout.state,
    },

    volatility: {
      score: result.factors.volatility.score,
      state: result.factors.volatility.state,
    },

    mean_reversion: {
      score: result.factors.mean_reversion.score,
      state: result.factors.mean_reversion.state,
    },

    liquidity: {
      score: result.factors.liquidity.score,
      state: result.factors.liquidity.state,
      eligible: result.overall.liquidityEligible,
    },

    risk: {
      score: result.factors.risk.score,
      level: result.profile.riskLevel,
    },

    relative_strength: {
      market_rank: result.relativeStrength.marketRank,
      industry_rank: result.relativeStrength.industryRank,
      market_percentile: result.relativeStrength.marketPercentile,
    },

    overall: {
      quant_score: result.overall.quantScore,
      classification: result.overall.classification,
      classification_name: result.overall.classificationName,
    },

    all_raw_indicators: result.allRawIndicators,
  };

  const jsonString = JSON.stringify(formattedOutput, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantEvaluation_${result.symbol}_${result.asOfDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-neutral-900 border border-white/5 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              结构化量化特征评估结果 JSON (Format Section 7)
            </h3>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/30"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制 JSON' : '复制 JSON'}
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
            >
              <Download className="w-4 h-4" />
              下载文件
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* JSON Content Box */}
        <div className="p-4 flex-1 overflow-y-auto bg-black font-mono text-xs text-emerald-400">
          <pre className="whitespace-pre-wrap break-all leading-relaxed">{jsonString}</pre>
        </div>

      </div>
    </div>
  );
};
