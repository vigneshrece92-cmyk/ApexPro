"use client";

import React, { useMemo } from "react";
import { AssetSymbol, MTFAssetRow, Quote, InstitutionalAlert, TradeSignalAction } from "@/lib/types";
import { DEFAULT_MTF_DATA, INITIAL_QUOTES } from "@/lib/defaultData";
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
  alerts?: InstitutionalAlert[];
}

export function computeDynamicMTFData(
  externalQuotes?: Record<AssetSymbol, Quote>,
  alerts?: InstitutionalAlert[]
): MTFAssetRow[] {
  const symbols: { symbol: AssetSymbol; name: string }[] = [
    { symbol: "NIFTY", name: "NIFTY 50 Index (F&O)" },
    { symbol: "BANKNIFTY", name: "BANK NIFTY Index (F&O)" },
    { symbol: "CRUDEOIL", name: "CRUDE OIL (MCX Futures)" },
    { symbol: "NATURALGAS", name: "NATURAL GAS (MCX Futures)" },
    { symbol: "SENSEX", name: "BSE SENSEX Index (F&O)" },
    { symbol: "FINNIFTY", name: "NIFTY FINANCIAL SERVICES" },
  ];

  return symbols.map((item) => {
    const sym = item.symbol;
    const quote = externalQuotes?.[sym] || INITIAL_QUOTES[sym];
    const livePrice = quote?.bid || 0;
    const change = typeof quote?.change24h === "number" ? quote.change24h : 0;
    const precision = quote?.pipPrecision || 2;

    const alert = alerts?.find((a) => a.symbol === sym);
    const val = alert?.valPrice ?? +(livePrice * 0.993).toFixed(precision);
    const poc = alert?.pocPrice ?? +livePrice.toFixed(precision);
    const vah = alert?.vahPrice ?? +(livePrice * 1.007).toFixed(precision);

    // 1. Daily (1D) Structure - Based on Macro 24h Price Action vs Day Baseline
    let d1Bias: "bullish" | "bearish" | "ranging" = "ranging";
    let d1Detail = "";
    let d1BOS = false;

    if (change <= -0.4) {
      d1Bias = "bearish";
      d1Detail = `Heavy Selling (${change > 0 ? "+" : ""}${change}%) / Daily Distribution`;
      d1BOS = true;
    } else if (change < -0.02) {
      d1Bias = "bearish";
      d1Detail = `Bearish Flow (${change > 0 ? "+" : ""}${change}%) Below Prev Day Close`;
      d1BOS = false;
    } else if (change >= 0.4) {
      d1Bias = "bullish";
      d1Detail = `Strong Expansion (+${change}%) / Daily Inflow`;
      d1BOS = true;
    } else if (change > 0.02) {
      d1Bias = "bullish";
      d1Detail = `Bullish Flow (+${change}%) Above Prev Day Close`;
      d1BOS = false;
    } else {
      d1Bias = "ranging";
      d1Detail = `Consolidating (${change}%) at Daily Equilibrium`;
      d1BOS = false;
    }

    // 2. 4H Structure - Volume Profile Value Area Placement
    let h4Bias: "bullish" | "bearish" | "ranging" = "ranging";
    let h4Detail = "";
    let h4BOS = false;

    if (livePrice < poc) {
      if (livePrice <= val) {
        h4Bias = "bearish";
        h4Detail = `Auction Below VAL (₹${val}) / Bearish Breakdown`;
        h4BOS = true;
      } else {
        h4Bias = "bearish";
        h4Detail = `Discount Node Below POC (₹${poc})`;
        h4BOS = false;
      }
    } else if (livePrice > poc) {
      if (livePrice >= vah) {
        h4Bias = "bullish";
        h4Detail = `Auction Above VAH (₹${vah}) / Bullish Expansion`;
        h4BOS = true;
      } else {
        h4Bias = "bullish";
        h4Detail = `Premium Node Above POC (₹${poc})`;
        h4BOS = false;
      }
    } else {
      h4Bias = "ranging";
      h4Detail = `Hovering at Highest Volume Node POC (₹${poc})`;
      h4BOS = false;
    }

    // 3. 1H Structure - High-Volume POC Re-test / Order Flow Dynamics
    let h1Bias: "bullish" | "bearish" | "ranging" = "ranging";
    let h1Detail = "";
    let h1BOS = false;

    if (alert?.patternType === "POC_RETEST_BOUNCE") {
      h1Bias = "bullish";
      h1Detail = `Rebound & Acceptance Above POC (₹${poc})`;
      h1BOS = false;
    } else if (alert?.patternType === "POC_RETEST_REJECTION") {
      h1Bias = "bearish";
      h1Detail = `Supply Resistance Rejection at POC (₹${poc})`;
      h1BOS = true;
    } else if (livePrice < poc) {
      h1Bias = "bearish";
      h1Detail = `Overhead POC Supply (₹${poc}) Defending`;
      h1BOS = livePrice < val;
    } else if (livePrice > poc) {
      h1Bias = "bullish";
      h1Detail = `Buyer Support Holding Above POC (₹${poc})`;
      h1BOS = livePrice > vah;
    } else {
      h1Bias = "ranging";
      h1Detail = `Two-Way Volume Churn at POC (₹${poc})`;
      h1BOS = false;
    }

    // 4. 15M Structure - Internal Flow & Value Area Extremes (VAL/VAH)
    let m15Bias: "bullish" | "bearish" | "ranging" = "ranging";
    let m15Detail = "";
    let m15BOS = false;

    if (alert?.patternType === "VAL_SWEEP_REVERSAL") {
      m15Bias = "bullish";
      m15Detail = `VAL (₹${val}) Liquidity Sweep / Responsive Buy Bounce`;
      m15BOS = true;
    } else if (alert?.patternType === "VAH_REJECTION_REVERSAL") {
      m15Bias = "bearish";
      m15Detail = `VAH (₹${vah}) Supply Defense / Responsive Sell Rejection`;
      m15BOS = true;
    } else if (alert?.patternType === "VA_EXPANSION_BREAKOUT") {
      m15Bias = livePrice >= poc ? "bullish" : "bearish";
      m15Detail = `VWCB Volume Spike / ${livePrice >= poc ? "VAH Expansion" : "VAL Breakdown"}`;
      m15BOS = true;
    } else if (livePrice < val) {
      m15Bias = "bearish";
      m15Detail = `Trading Beneath VAL (₹${val}) / Bearish Imbalance`;
      m15BOS = true;
    } else if (livePrice > vah) {
      m15Bias = "bullish";
      m15Detail = `Trading Above VAH (₹${vah}) / Bullish Imbalance`;
      m15BOS = true;
    } else if (livePrice < poc) {
      m15Bias = "bearish";
      m15Detail = `Internal Flow Drifting to VAL (₹${val})`;
      m15BOS = false;
    } else if (livePrice > poc) {
      m15Bias = "bullish";
      m15Detail = `Internal Flow Pushing to VAH (₹${vah})`;
      m15BOS = false;
    } else {
      m15Bias = "ranging";
      m15Detail = `Rotating Inside Value Area (₹${val} - ₹${vah})`;
      m15BOS = false;
    }

    // 5. Confluence & Overall Direction Calculation
    const biases = [m15Bias, h1Bias, h4Bias, d1Bias];
    const bullCount = biases.filter((b) => b === "bullish").length;
    const bearCount = biases.filter((b) => b === "bearish").length;

    let overallBias: TradeSignalAction = "NEUTRAL";
    let confluenceScore = 55;

    if (bullCount >= 3) {
      overallBias = bullCount === 4 ? "STRONG BUY" : "BUY";
      confluenceScore = Math.min(96, Math.max(75, 74 + bullCount * 5 + (change > 0 ? 5 : -4)));
    } else if (bearCount >= 3) {
      overallBias = bearCount === 4 ? "STRONG SELL" : "SELL";
      confluenceScore = Math.min(96, Math.max(75, 74 + bearCount * 5 + (change < 0 ? 5 : -4)));
    } else if (bullCount > bearCount) {
      overallBias = "BUY";
      confluenceScore = Math.min(74, Math.max(58, 55 + (bullCount - bearCount) * 7));
    } else if (bearCount > bullCount) {
      overallBias = "SELL";
      confluenceScore = Math.min(74, Math.max(58, 55 + (bearCount - bullCount) * 7));
    } else {
      overallBias = "NEUTRAL";
      confluenceScore = 50;
    }

    return {
      symbol: sym,
      name: item.name,
      price: livePrice,
      structures: {
        "15m": { bias: m15Bias, detail: m15Detail, isBOS: m15BOS },
        "1h": { bias: h1Bias, detail: h1Detail, isBOS: h1BOS },
        "4h": { bias: h4Bias, detail: h4Detail, isBOS: h4BOS },
        "1d": { bias: d1Bias, detail: d1Detail, isBOS: d1BOS },
      },
      overallBias,
      confluenceScore,
    };
  });
}

export const MTFHeatmap: React.FC<MTFHeatmapProps> = ({
  activeSymbol,
  onSelectSymbol,
  externalQuotes,
  alerts,
}) => {
  const mtfData: MTFAssetRow[] = useMemo(() => {
    return computeDynamicMTFData(externalQuotes, alerts);
  }, [externalQuotes, alerts]);

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
