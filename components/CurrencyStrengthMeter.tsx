"use client";

import React from "react";
import { AssetSymbol, CurrencyStrength, Quote } from "@/lib/types";
import { DEFAULT_CURRENCY_STRENGTH } from "@/lib/defaultData";
import { Activity, Flame, TrendingUp, TrendingDown, ArrowRight, Zap } from "lucide-react";

interface CurrencyStrengthMeterProps {
  onSelectSymbol: (symbol: AssetSymbol) => void;
  externalQuotes?: Record<AssetSymbol, Quote>;
}

export const CurrencyStrengthMeter: React.FC<CurrencyStrengthMeterProps> = ({
  onSelectSymbol,
  externalQuotes,
}) => {
  // Dynamically calibrate strength using live quote percentage changes
  const strengths: CurrencyStrength[] = React.useMemo(() => {
    return DEFAULT_CURRENCY_STRENGTH.map((item) => {
      let liveChange = item.change;
      if (item.currency === "XAU" && externalQuotes?.XAUUSD) {
        liveChange = externalQuotes.XAUUSD.change24h;
      } else if (item.currency === "EUR" && externalQuotes?.EURUSD) {
        liveChange = externalQuotes.EURUSD.change24h;
      } else if (item.currency === "GBP" && externalQuotes?.GBPUSD) {
        liveChange = externalQuotes.GBPUSD.change24h;
      } else if (item.currency === "USD" && externalQuotes?.DXY) {
        liveChange = externalQuotes.DXY.change24h;
      }

      // Convert change to relative strength score (0-100)
      const calculatedScore = Math.min(98, Math.max(12, Math.round(50 + liveChange * 25)));

      const status: "Bullish" | "Neutral" | "Bearish" =
        calculatedScore >= 60 ? "Bullish" : calculatedScore <= 40 ? "Bearish" : "Neutral";

      return {
        ...item,
        score: calculatedScore,
        change: liveChange,
        status,
      };
    }).sort((a, b) => b.score - a.score);
  }, [externalQuotes]);

  const strongest = strengths[0];
  const weakest = strengths[strengths.length - 1];

  return (
    <div className="flex flex-col bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#0D121D] border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-gold">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Currency & Metals Strength Meter
            </h2>
            <p className="text-[10px] text-terminal-muted">
              Live relative momentum index across major FX & Gold
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-terminal-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
          <span>REAL-TIME</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col justify-between flex-1 gap-4">
        {/* Strength Progress Bars */}
        <div className="space-y-2.5">
          {strengths.map((item, idx) => {
            const isBull = item.status === "Bullish";
            const isBear = item.status === "Bearish";

            return (
              <div key={item.currency} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[10px] w-3">#{idx + 1}</span>
                    <span className="font-bold text-white">{item.currency}</span>
                    <span className="text-[10px] text-terminal-muted hidden sm:inline">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold ${
                        item.change >= 0 ? "text-bull" : "text-bear"
                      }`}
                    >
                      {item.change >= 0 ? "+" : ""}
                      {item.change}%
                    </span>
                    <span className="text-gray-300 font-bold w-7 text-right">
                      {item.score}
                    </span>
                  </div>
                </div>

                {/* Progress Meter Bar */}
                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-terminal-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isBull
                        ? "bg-gradient-to-r from-bull/60 to-bull shadow-[0_0_8px_rgba(0,230,118,0.4)]"
                        : isBear
                        ? "bg-gradient-to-r from-bear/60 to-bear shadow-[0_0_8px_rgba(255,59,48,0.4)]"
                        : "bg-gradient-to-r from-yellow-500/60 to-yellow-400"
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Momentum Setup Box */}
        <div className="p-2.5 rounded-lg bg-[#080B11] border border-terminal-border/80 text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-terminal-muted flex items-center gap-1 font-bold">
              <Zap className="w-3 h-3 text-gold" /> TOP MOMENTUM PAIRING:
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/20 text-gold font-bold">
              HIGH VELOCITY
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-bull">{strongest.currency} (Strongest)</span>
              <ArrowRight className="w-3 h-3 text-gray-500" />
              <span className="font-bold text-bear">{weakest.currency} (Weakest)</span>
            </div>

            <button
              onClick={() => {
                if (strongest.currency === "XAU" || weakest.currency === "USD") {
                  onSelectSymbol("XAUUSD");
                } else if (strongest.currency === "GBP") {
                  onSelectSymbol("GBPUSD");
                } else if (strongest.currency === "EUR") {
                  onSelectSymbol("EURUSD");
                } else {
                  onSelectSymbol("XAUUSD");
                }
              }}
              className="px-2 py-1 text-[10px] font-bold rounded bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 transition-all"
            >
              Trade Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
