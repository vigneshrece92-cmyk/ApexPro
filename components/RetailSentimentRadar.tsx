"use client";

import React from "react";
import { AssetSymbol, RetailSentimentItem, Quote } from "@/lib/types";
import { DEFAULT_RETAIL_SENTIMENT } from "@/lib/defaultData";
import { Users, AlertTriangle, ShieldAlert, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface RetailSentimentRadarProps {
  onSelectSymbol: (symbol: AssetSymbol) => void;
}

export const RetailSentimentRadar: React.FC<RetailSentimentRadarProps> = ({
  onSelectSymbol,
}) => {
  const sentimentItems = DEFAULT_RETAIL_SENTIMENT;

  return (
    <div className="flex flex-col bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#0D121D] border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Retail Sentiment & Contrarian Radar
            </h2>
            <p className="text-[10px] text-terminal-muted">
              Crowd positioning vs institutional smart money liquidity hunt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
          <ShieldAlert className="w-3 h-3 text-purple-400" />
          <span>SQUEEZE RADAR</span>
        </div>
      </div>

      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
        {sentimentItems.map((item) => {
          const isCrowdExtreme = item.shortPercent >= 70 || item.longPercent >= 70;

          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className="p-2.5 rounded-lg bg-[#080B11] border border-terminal-border/70 hover:border-terminal-border cursor-pointer transition-all space-y-2"
            >
              {/* Top Row: Symbol, Percentages & Contrarian Alert */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${item.symbol.includes("XAU") ? "text-gold" : "text-white"}`}>
                    {item.symbol}
                  </span>
                  <span className="text-[10px] text-terminal-muted hidden sm:inline">
                    {item.name}
                  </span>
                </div>

                {/* Squeeze Badge */}
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${
                    item.contrarianSignal.includes("Bullish")
                      ? "bg-bull-glow text-bull border-bull/40 shadow-[0_0_8px_rgba(0,230,118,0.2)]"
                      : item.contrarianSignal.includes("Bearish")
                      ? "bg-bear-glow text-bear border border-bear/40 shadow-[0_0_8px_rgba(255,59,48,0.2)]"
                      : "bg-terminal-bg text-terminal-muted border-terminal-border"
                  }`}
                >
                  {isCrowdExtreme && <AlertTriangle className="w-2.5 h-2.5 text-yellow-400 animate-bounce" />}
                  {item.contrarianSignal}
                </span>
              </div>

              {/* Ratio Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-terminal-muted">
                  <span className="text-bull font-bold">{item.longPercent}% Long</span>
                  <span className="text-[9px] text-gray-500">Retail Crowd Sentiment</span>
                  <span className="text-bear font-bold">{item.shortPercent}% Short</span>
                </div>

                <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden flex border border-terminal-border/60">
                  <div
                    className="bg-bull h-full transition-all duration-500"
                    style={{ width: `${item.longPercent}%` }}
                    title={`Retail Long: ${item.longPercent}%`}
                  />
                  <div
                    className="bg-bear h-full transition-all duration-500"
                    style={{ width: `${item.shortPercent}%` }}
                    title={`Retail Short: ${item.shortPercent}%`}
                  />
                </div>
              </div>

              {/* Bottom: Institutional COT Note */}
              <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-terminal-border/40">
                <span className="text-terminal-muted">CFTC Institutional COT:</span>
                <span className="text-cyan-300 font-bold">{item.cotInstitutionalBias}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
