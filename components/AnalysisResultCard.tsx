"use client";

import React, { useState } from "react";
import { AIAnalysisResult } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Info,
  Share2,
  Code2,
} from "lucide-react";

interface AnalysisResultCardProps {
  result: AIAnalysisResult | null;
  isLoading?: boolean;
  onOpenDispatcher?: () => void;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({ result, isLoading, onOpenDispatcher }) => {
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-lg p-6 flex flex-col items-center justify-center text-center animate-pulse min-h-[360px]">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
          <Zap className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-white">Synthesizing Institutional Analysis...</p>
        <p className="text-xs text-terminal-muted mt-1 max-w-xs">
          Computing liquidity sweeps, order blocks, multi-target take profits, and confluence scoring.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[360px]">
        <div className="w-12 h-12 rounded-full bg-[#151D2C] text-terminal-muted flex items-center justify-center mb-3">
          <Target className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">Awaiting Chart Analysis</h3>
        <p className="text-xs text-terminal-muted max-w-sm">
          Upload a chart screenshot above or click <span className="text-cyan-400 font-semibold">"Analyze Live Chart"</span> on the terminal to generate automated Support/Resistance levels and institutional trade recommendations.
        </p>
      </div>
    );
  }

  const isBuy = result.action.includes("BUY");
  const isSell = result.action.includes("SELL");
  const actionColor = isBuy ? "text-bull" : isSell ? "text-bear" : "text-yellow-400";
  const actionBg = isBuy
    ? "bg-bull-glow border-bull/40 text-bull"
    : isSell
    ? "bg-bear-glow border-bear/40 text-bear"
    : "bg-yellow-500/10 border-yellow-500/40 text-yellow-400";

  const copyTradePlan = () => {
    const text = `🎯 APEXFX AI TRADE PLAN
Asset: ${result.assetDetected} (${result.timeframeDetected})
Action: ${result.action}
Entry: ${result.suggestedEntry}
Stop Loss: ${result.stopLoss}
TP1: ${result.takeProfit1}
TP2: ${result.takeProfit2}
TP3: ${result.takeProfit3}
Risk/Reward: ${result.riskRewardRatio}
Pattern: ${result.patternDetected}
Confidence: ${result.confidenceScore}%`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl flex flex-col">
      {/* Card Header & Main Signal */}
      <div className="p-4 bg-[#0D121D] border-b border-terminal-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border font-extrabold text-sm tracking-wider flex items-center gap-1.5 ${actionBg}`}>
            {isBuy ? <TrendingUp className="w-4 h-4" /> : isSell ? <TrendingDown className="w-4 h-4" /> : null}
            {result.action}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{result.assetDetected}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-terminal-bg text-terminal-muted border border-terminal-border">
                {result.timeframeDetected}
              </span>
            </div>
            <p className="text-[10px] text-terminal-muted">{result.marketStructure}</p>
          </div>
        </div>

        {/* Confidence & Copy Plan */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-terminal-muted uppercase">Confidence</span>
            <div className="text-xs font-mono font-bold text-cyan-400">{result.confidenceScore}%</div>
          </div>
          <button
            onClick={copyTradePlan}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-terminal-bg hover:bg-terminal-hover text-gray-300 hover:text-white border border-terminal-border transition-all"
            title="Copy Trade Setup for MT4/MT5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Setup"}</span>
          </button>
          {onOpenDispatcher && (
            <button
              onClick={onOpenDispatcher}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 transition-all font-medium"
              title="Export MT4/MT5 Scripts & Webhook Dispatcher"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export / Dispatch</span>
            </button>
          )}
        </div>
      </div>

      {/* Trade Execution Plan Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#090C12] border-b border-terminal-border text-xs font-mono">
        {/* Entry */}
        <div className="p-2 rounded bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted uppercase block">Suggested Entry</span>
          <span className="text-sm font-bold text-cyan-300">{result.suggestedEntry}</span>
        </div>

        {/* Stop Loss */}
        <div className="p-2 rounded bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted uppercase block flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-bear" /> Stop Loss (SL)
          </span>
          <span className="text-sm font-bold text-bear">{result.stopLoss}</span>
        </div>

        {/* Take Profit 1 */}
        <div className="p-2 rounded bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted uppercase block flex items-center gap-1">
            <Target className="w-3 h-3 text-bull" /> TP1 (Safe)
          </span>
          <span className="text-sm font-bold text-bull">{result.takeProfit1}</span>
        </div>

        {/* Risk / Reward */}
        <div className="p-2 rounded bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted uppercase block">Risk : Reward</span>
          <span className="text-sm font-bold text-gold">{result.riskRewardRatio}</span>
        </div>
      </div>

      {/* Multi-Target TP Expansion */}
      <div className="px-3 py-2 bg-[#0C1018] border-b border-terminal-border flex items-center justify-between text-xs font-mono text-terminal-muted">
        <div className="flex items-center gap-3">
          <span>
            TP2 (Runner): <strong className="text-bull">{result.takeProfit2}</strong>
          </span>
          <span>
            TP3 (Moonshot): <strong className="text-bull">{result.takeProfit3}</strong>
          </span>
        </div>
        <span className="text-[10px] text-gray-400">Trailing Stop recommended at TP1</span>
      </div>

      {/* Support & Resistance Key Levels */}
      <div className="p-3 border-b border-terminal-border">
        <span className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold block mb-2">
          Automated Support & Resistance Zones
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border">
            <span className="text-[10px] text-bear block mb-1 font-bold">RESISTANCE (SUPPLY)</span>
            <div className="flex flex-wrap gap-1.5">
              {result.resistanceLevels.map((lvl, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-bear/10 border border-bear/30 text-bear text-[11px]">
                  R{idx + 1}: {lvl}
                </span>
              ))}
            </div>
          </div>
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border">
            <span className="text-[10px] text-bull block mb-1 font-bold">SUPPORT (DEMAND)</span>
            <div className="flex flex-wrap gap-1.5">
              {result.supportLevels.map((lvl, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-bull/10 border border-bull/30 text-bull text-[11px]">
                  S{idx + 1}: {lvl}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Money Concepts (ICT / SMC) Radar */}
      {result.smc && (
        <div className="p-3 border-b border-terminal-border bg-[#0B0F19] text-xs font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Smart Money Concepts (SMC / ICT)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                result.smc.zone === "Discount"
                  ? "bg-bull-glow text-bull border border-bull/40"
                  : result.smc.zone === "Premium"
                  ? "bg-bear-glow text-bear border border-bear/40"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              }`}
            >
              {result.smc.zone === "Discount"
                ? "🟢 DISCOUNT ZONE"
                : result.smc.zone === "Premium"
                ? "🔴 PREMIUM ZONE"
                : "⚪ EQUILIBRIUM"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {/* 0.618 Golden Pocket */}
            <div className="p-1.5 rounded bg-terminal-bg border border-terminal-border">
              <span className="text-[9px] text-gold block uppercase">0.618 Golden Pocket</span>
              <span className="font-bold text-gold">{result.smc.fibonacci.fib618}</span>
            </div>

            {/* 50% Equilibrium */}
            <div className="p-1.5 rounded bg-terminal-bg border border-terminal-border">
              <span className="text-[9px] text-cyan-400 block uppercase">50% Equilibrium</span>
              <span className="font-bold text-white">{result.smc.equilibriumPrice}</span>
            </div>

            {/* Nearest Order Block */}
            <div className="p-1.5 rounded bg-terminal-bg border border-terminal-border col-span-2 sm:col-span-1">
              <span className="text-[9px] text-gray-400 block uppercase">Active Order Block</span>
              <span className="font-bold truncate block">
                {result.smc.orderBlocks.length > 0
                  ? `${result.smc.orderBlocks[result.smc.orderBlocks.length - 1].type.toUpperCase()} (${
                      result.smc.orderBlocks[result.smc.orderBlocks.length - 1].low
                    })`
                  : "Scanning..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pattern & Confluence Factors */}
      <div className="p-3 border-b border-terminal-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold">
            Pattern & Confluence Signals
          </span>
          <span className="text-[10px] font-mono text-cyan-400">{result.patternDetected}</span>
        </div>
        <div className="space-y-1.5">
          {result.confluences.map((c, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-gray-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {c.factor}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                  c.status === "bullish"
                    ? "bg-bull/10 text-bull"
                    : c.status === "bearish"
                    ? "bg-bear/10 text-bear"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Institutional Commentary & Invalidation */}
      <div className="p-3 bg-[#080B10] space-y-2 text-xs">
        <div>
          <span className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold block mb-0.5">
            Institutional Rationale
          </span>
          <p className="text-gray-300 leading-relaxed text-[11px]">{result.reasoning}</p>
        </div>
        <div className="p-2 rounded bg-bear-glow/40 border border-bear/30 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-bear shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold text-bear uppercase">Invalidation Rule</span>
            <p className="text-[10px] text-gray-300">{result.invalidationCriteria}</p>
          </div>
        </div>
      </div>

      {/* 1-Click Order Exporter & Webhook Dispatch Action Bar */}
      {onOpenDispatcher && (
        <div className="p-3 bg-[#0B0F19] border-t border-terminal-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-terminal-muted">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Suite:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDispatcher}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>MT4 / MT5 Script</span>
            </button>
            <button
              onClick={onOpenDispatcher}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Broadcast Signal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
