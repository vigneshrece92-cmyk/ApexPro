"use client";

import React from "react";
import { InstitutionalAlert, AssetSymbol } from "@/lib/types";
import { Bell, Flame, ChevronRight, Sparkles, TrendingUp, TrendingDown } from "lucide-react";

interface ActiveAlertsRibbonProps {
  alerts: InstitutionalAlert[];
  onOpenAlertsHub: () => void;
  onSelectSymbol: (sym: AssetSymbol) => void;
}

export const ActiveAlertsRibbon: React.FC<ActiveAlertsRibbonProps> = ({
  alerts,
  onOpenAlertsHub,
  onSelectSymbol,
}) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="w-full bg-[#080C14] border border-terminal-border rounded-lg p-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
      {/* Radar Label */}
      <button
        onClick={onOpenAlertsHub}
        className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white transition-all text-xs font-bold"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <Bell className="w-3.5 h-3.5 text-amber-400" />
        <span>4H BREAKOUT & AMD RADAR</span>
        <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-400 text-black font-black">
          {alerts.length}
        </span>
      </button>

      {/* Horizontal alert chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-xs font-mono">
        {alerts.map((a) => {
          const isBuy = a.direction.includes("BUY");
          const isAMD = a.patternType === "AMD_ACCUMULATION_DISTRIBUTION";

          return (
            <button
              key={a.id}
              onClick={() => {
                onSelectSymbol(a.symbol);
                onOpenAlertsHub();
              }}
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-terminal-bg hover:bg-terminal-card border border-terminal-border/80 text-gray-200 hover:text-white transition-all shrink-0 group"
            >
              <div className="flex items-center gap-1 font-bold">
                <span className="text-white">
                  {a.symbol}
                </span>
                <span
                  className={`px-1 rounded text-[10px] ${
                    isBuy ? "text-bull bg-bull/10" : "text-bear bg-bear/10"
                  }`}
                >
                  {isBuy ? "BUY" : "SELL"}
                </span>
              </div>

              <span className="text-[11px] text-terminal-muted hidden sm:inline">
                {isAMD ? "AMD Judas Sweep" : "4H Break & Retest"}
              </span>

              <span className="text-[10px] text-cyan-400 font-semibold font-mono">
                @{a.suggestedEntry}
              </span>

              <ChevronRight className="w-3 h-3 text-terminal-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>

      {/* View All button */}
      <button
        onClick={onOpenAlertsHub}
        className="hidden md:flex items-center gap-1 shrink-0 text-xs font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 transition-colors"
      >
        <span>View Snapshots</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
