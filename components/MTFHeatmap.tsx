"use client";

import React from "react";
import { AssetSymbol, MTFAssetRow, Quote } from "@/lib/types";
import { DEFAULT_MTF_DATA } from "@/lib/defaultData";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface MTFHeatmapProps {
  activeSymbol: AssetSymbol;
  onSelectSymbol: (symbol: AssetSymbol) => void;
  externalQuotes?: Record<AssetSymbol, Quote>;
}

export const MTFHeatmap: React.FC<MTFHeatmapProps> = ({
  activeSymbol,
  onSelectSymbol,
  externalQuotes,
}) => {
  const mtfData: MTFAssetRow[] = DEFAULT_MTF_DATA.map((row) => {
    const livePrice = externalQuotes?.[row.symbol]?.bid || row.price;
    return {
      ...row,
      price: livePrice,
    };
  });

  const getBiasBadge = (bias: "bullish" | "bearish" | "ranging", detail: string, isBOS?: boolean) => {
    if (bias === "bullish") {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-bull px-1.5 py-0.5 rounded bg-bull/10 border border-bull/30">
            <ArrowUpRight className="w-2.5 h-2.5" />
            <span>BULLISH</span>
            {isBOS && <span className="text-[8px] bg-bull text-black px-1 rounded font-black">BOS</span>}
          </div>
          <span className="text-[9px] text-gray-400 font-mono leading-tight max-w-[130px] truncate" title={detail}>
            {detail}
          </span>
        </div>
      );
    }
    if (bias === "bearish") {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-bear px-1.5 py-0.5 rounded bg-bear/10 border border-bear/30">
            <ArrowDownRight className="w-2.5 h-2.5" />
            <span>BEARISH</span>
            {isBOS && <span className="text-[8px] bg-bear text-white px-1 rounded font-black">BOS</span>}
          </div>
          <span className="text-[9px] text-gray-400 font-mono leading-tight max-w-[130px] truncate" title={detail}>
            {detail}
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30">
          <Minus className="w-2.5 h-2.5" />
          <span>RANGE</span>
        </div>
        <span className="text-[9px] text-gray-400 font-mono leading-tight max-w-[130px] truncate" title={detail}>
          {detail}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-[#0D121D] border-b border-terminal-border gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-accent/10 border border-accent/30 text-accent">
            <Layers className="w-4 h-4" />
          </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Multi-Timeframe (MTF) Volume Profile (PAVP) Confluence Matrix
                </h2>
                <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
              </div>
              <p className="text-[10px] text-terminal-muted">
                Pivot-anchored Volume Profile (VAH, VAL, POC) alignment across 15M, 1H, 4H & Daily
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-terminal-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-bull/30 border border-bull/60"></span> Bullish Alignment
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-bear/30 border border-bear/60"></span> Bearish Alignment
            </span>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#080B11] border-b border-terminal-border/80 text-[10px] text-terminal-muted uppercase">
                <th className="py-2.5 px-3 font-semibold">Asset Instrument</th>
                <th className="py-2.5 px-2 font-semibold">Live Price</th>
                <th className="py-2.5 px-2 font-semibold">15M (Internal Flow & VAL/VAH)</th>
                <th className="py-2.5 px-2 font-semibold">1H (POC Value Node)</th>
                <th className="py-2.5 px-2 font-semibold">4H (Volume Profile Structure)</th>
                <th className="py-2.5 px-2 font-semibold">Daily (Macro Volume Flow)</th>
                <th className="py-2.5 px-2 font-semibold">Confluence</th>
                <th className="py-2.5 px-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-terminal-border/40">
            {mtfData.map((row) => {
              const isActive = activeSymbol === row.symbol;
              const isHighConfluence = row.confluenceScore >= 85;

              return (
                <tr
                  key={row.symbol}
                  onClick={() => onSelectSymbol(row.symbol)}
                  className={`cursor-pointer transition-all hover:bg-white/[0.03] ${
                    isActive ? "bg-accent/10 border-l-2 border-l-accent" : ""
                  }`}
                >
                  {/* Asset */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {row.symbol}
                      </span>
                      <span className="text-[10px] text-terminal-muted hidden sm:inline">
                        {row.name}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-2 font-bold text-white font-mono">
                    ₹{typeof row.price === "number" ? row.price.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : row.price}
                  </td>

                  {/* 15M */}
                  <td className="py-2.5 px-2">
                    {getBiasBadge(row.structures["15m"].bias, row.structures["15m"].detail, row.structures["15m"].isBOS)}
                  </td>

                  {/* 1H */}
                  <td className="py-2.5 px-2">
                    {getBiasBadge(row.structures["1h"].bias, row.structures["1h"].detail, row.structures["1h"].isBOS)}
                  </td>

                  {/* 4H */}
                  <td className="py-2.5 px-2">
                    {getBiasBadge(row.structures["4h"].bias, row.structures["4h"].detail, row.structures["4h"].isBOS)}
                  </td>

                  {/* Daily */}
                  <td className="py-2.5 px-2">
                    {getBiasBadge(row.structures["1d"].bias, row.structures["1d"].detail, row.structures["1d"].isBOS)}
                  </td>

                  {/* Confluence */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-black/40 rounded-full h-1.5 overflow-hidden border border-terminal-border/60">
                        <div
                          className={`h-full rounded-full ${
                            isHighConfluence ? "bg-bull" : "bg-yellow-400"
                          }`}
                          style={{ width: `${row.confluenceScore}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${isHighConfluence ? "text-bull" : "text-yellow-300"}`}>
                        {row.confluenceScore}%
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSymbol(row.symbol);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                        isActive
                          ? "bg-accent text-white border-accent shadow-sm"
                          : "bg-terminal-bg text-terminal-muted hover:text-white border-terminal-border"
                      }`}
                    >
                      {isActive ? "Active" : "Load Chart"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
