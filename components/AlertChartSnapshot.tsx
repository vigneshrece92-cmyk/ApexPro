"use client";

import React, { useMemo } from "react";
import { InstitutionalAlert, Candle } from "@/lib/types";

interface AlertChartSnapshotProps {
  alert: InstitutionalAlert;
  height?: number;
  className?: string;
}

export const AlertChartSnapshot: React.FC<AlertChartSnapshotProps> = ({
  alert,
  height = 195,
  className = "",
}) => {
  const candles = alert.candles || [];

  // Calculate coordinates and scales
  const chartMetrics = useMemo(() => {
    if (!candles || candles.length === 0) {
      return null;
    }

    const allPrices: number[] = [];
    candles.forEach((c) => {
      allPrices.push(c.high, c.low, c.open, c.close);
    });

    if (alert.breakoutLevel) allPrices.push(alert.breakoutLevel);
    if (alert.suggestedEntry) allPrices.push(alert.suggestedEntry);
    if (alert.stopLoss) allPrices.push(alert.stopLoss);
    if (alert.takeProfit1) allPrices.push(alert.takeProfit1);
    if (alert.accumulationRange) {
      allPrices.push(alert.accumulationRange.high, alert.accumulationRange.low);
    }
    if (alert.manipulationExtreme) {
      allPrices.push(alert.manipulationExtreme);
    }

    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const padding = (rawMax - rawMin) * 0.14 || 1;
    const minPrice = rawMin - padding;
    const maxPrice = rawMax + padding;
    const priceRange = maxPrice - minPrice;

    return { minPrice, maxPrice, priceRange };
  }, [candles, alert]);

  if (!chartMetrics || candles.length === 0) {
    return (
      <div
        className={`w-full bg-[#06090F] rounded border border-terminal-border flex items-center justify-center text-xs text-terminal-muted ${className}`}
        style={{ height }}
      >
        <span>Generating 4H Snapshot...</span>
      </div>
    );
  }

  const { minPrice, maxPrice, priceRange } = chartMetrics;

  const width = 500; // virtual SVG coordinate space
  const svgHeight = height;
  const paddingLeft = 14;
  const paddingRight = 70; // room for price labels on the right
  const paddingTop = 22;
  const paddingBottom = 22;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getY = (price: number) => {
    const norm = (price - minPrice) / priceRange;
    return paddingTop + (1 - norm) * plotHeight;
  };

  const candleSpacing = plotWidth / (candles.length || 1);
  const candleBodyWidth = Math.max(8, Math.min(24, candleSpacing * 0.65));

  const isBuy = alert.direction.includes("BUY");
  const isAMD = alert.patternType === "AMD_ACCUMULATION_DISTRIBUTION";
  const isBreakout = alert.patternType === "4H_BREAKOUT_RETEST";

  // Dynamic index detection for PO3 & Breakout
  const breakCandleIdx =
    alert.breakoutCandleIndex !== undefined && alert.breakoutCandleIndex < candles.length
      ? alert.breakoutCandleIndex
      : Math.max(0, candles.length - 3);

  const retestCandleIdx =
    alert.retestCandleIndex !== undefined && alert.retestCandleIndex < candles.length
      ? alert.retestCandleIndex
      : candles.length - 1;

  const manipCandleIdx =
    alert.manipulationCandleIndex !== undefined && alert.manipulationCandleIndex < candles.length
      ? alert.manipulationCandleIndex
      : Math.max(0, candles.length - 3);

  return (
    <div className={`relative w-full overflow-hidden rounded-lg bg-[#05080E] border border-terminal-border/80 ${className}`}>
      {/* Visual Header Overlay */}
      <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/70 backdrop-blur text-gray-200 border border-white/10">
          4H CANDLE MARKUP • {alert.symbol}
        </span>
        {isAMD && (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            ICT POWER OF 3 (PO3 / AMD)
          </span>
        )}
        {isBreakout && (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            {alert.retestStatus || "4H BREAKOUT & RETEST"}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${svgHeight}`}
        className="w-full h-full select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bullGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="bearGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="retestZoneGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Subtle Horizontal Grid lines */}
        {[0.25, 0.5, 0.75].map((pct, i) => {
          const y = paddingTop + plotHeight * pct;
          return (
            <line
              key={i}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke="#151E2E"
              strokeDasharray="2 4"
              strokeWidth="1"
            />
          );
        })}

        {/* 1. S/R BREAKOUT LEVEL LINE */}
        {alert.breakoutLevel && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(alert.breakoutLevel)}
              x2={width - paddingRight + 6}
              y2={getY(alert.breakoutLevel)}
              stroke="#F59E0B"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
            {/* Level Tag */}
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.breakoutLevel) - 8}
              width="58"
              height="16"
              rx="3"
              fill="#78350F"
              opacity="0.95"
            />
            <text
              x={width - paddingRight + 35}
              y={getY(alert.breakoutLevel) + 3.5}
              fontSize="8"
              fontFamily="monospace"
              fill="#FDE68A"
              textAnchor="middle"
              fontWeight="bold"
            >
              LVL {alert.breakoutLevel}
            </text>
          </g>
        )}

        {/* 2. RETEST HIGHLIGHT & BOUNCE INDICATOR (for 4H Breakout) */}
        {isBreakout && alert.breakoutLevel && (
          <g>
            {/* Retest Band */}
            <rect
              x={paddingLeft + Math.max(0, retestCandleIdx - 1) * candleSpacing}
              y={getY(alert.breakoutLevel + (isBuy ? alert.breakoutLevel * 0.0015 : -alert.breakoutLevel * 0.0015))}
              width={candleSpacing * 2.2}
              height={Math.max(14, Math.abs(getY(alert.breakoutLevel) - getY(alert.breakoutLevel * 0.997)))}
              fill="url(#retestZoneGlow)"
              rx="4"
              stroke="#06B6D4"
              strokeWidth="0.9"
              strokeDasharray="3 3"
            />
            {/* Retest Tag Indicator */}
            <text
              x={paddingLeft + (retestCandleIdx + 0.5) * candleSpacing}
              y={getY(alert.breakoutLevel) + (isBuy ? 24 : -12)}
              fontSize="8"
              fontFamily="sans-serif"
              fill="#22D3EE"
              fontWeight="bold"
              textAnchor="middle"
            >
              ⮤ RETEST CONFIRMED
            </text>

            {/* Breakout Candle Tag */}
            {breakCandleIdx !== retestCandleIdx && (
              <text
                x={paddingLeft + (breakCandleIdx + 0.5) * candleSpacing}
                y={getY(candles[breakCandleIdx]?.high || alert.breakoutLevel) - 8}
                fontSize="7.5"
                fontFamily="sans-serif"
                fill="#FBBF24"
                fontWeight="bold"
                textAnchor="middle"
              >
                [1] BREAKOUT
              </text>
            )}
          </g>
        )}

        {/* 3. ICT PO3 (AMD: ACCUMULATION, MANIPULATION JUDAS, DISTRIBUTION) */}
        {isAMD && (
          <g>
            {/* Phase [A]: Accumulation Box */}
            {(() => {
              const accHigh = alert.accumulationRange?.high || Math.max(...candles.slice(0, 3).map((c) => c.high));
              const accLow = alert.accumulationRange?.low || Math.min(...candles.slice(0, 3).map((c) => c.low));
              const boxWidth = Math.max(candleSpacing * 3.2, manipCandleIdx * candleSpacing);
              const boxHeight = Math.max(16, getY(accLow) - getY(accHigh));

              return (
                <g>
                  <rect
                    x={paddingLeft + candleSpacing * 0.2}
                    y={getY(accHigh)}
                    width={boxWidth}
                    height={boxHeight}
                    fill="#8B5CF6"
                    fillOpacity="0.12"
                    stroke="#8B5CF6"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    rx="3"
                  />
                  <text
                    x={paddingLeft + boxWidth / 2}
                    y={getY(accHigh) - 5}
                    fontSize="7.5"
                    fontFamily="monospace"
                    fill="#C4B5FD"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    [A] ACCUMULATION RANGE
                  </text>
                </g>
              );
            })()}

            {/* Phase [M]: Judas Swing Liquidity Purge Tag */}
            {(() => {
              const manipCandle = candles[manipCandleIdx] || candles[candles.length - 2];
              const xManip = paddingLeft + (manipCandleIdx + 0.5) * candleSpacing;
              const yManip = getY(isBuy ? manipCandle.low : manipCandle.high);

              return (
                <g>
                  <line
                    x1={xManip}
                    y1={yManip}
                    x2={xManip}
                    y2={isBuy ? yManip + 20 : yManip - 20}
                    stroke="#EC4899"
                    strokeWidth="1.5"
                  />
                  <circle cx={xManip} cy={yManip} r="3.5" fill="#EC4899" />
                  <rect
                    x={xManip - 38}
                    y={isBuy ? yManip + 20 : yManip - 32}
                    width="76"
                    height="14"
                    rx="2"
                    fill="#831843"
                  />
                  <text
                    x={xManip}
                    y={isBuy ? yManip + 30 : yManip - 22}
                    fontSize="7"
                    fontFamily="sans-serif"
                    fill="#FBCFE8"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    [M] JUDAS PURGE
                  </text>
                </g>
              );
            })()}

            {/* Phase [D]: Distribution Expansion Direction */}
            <text
              x={paddingLeft + (candles.length - 0.5) * candleSpacing}
              y={getY(candles[candles.length - 1].close) + (isBuy ? -14 : 18)}
              fontSize="7.5"
              fontFamily="sans-serif"
              fill={isBuy ? "#34D399" : "#F87171"}
              fontWeight="bold"
              textAnchor="middle"
            >
              [D] DISTRIBUTION ➔
            </text>
          </g>
        )}

        {/* 4. CANDLESTICKS RENDERING */}
        {candles.map((c, idx) => {
          const xCenter = paddingLeft + (idx + 0.5) * candleSpacing;
          const isGreen = c.close >= c.open;
          const yOpen = getY(c.open);
          const yClose = getY(c.close);
          const yHigh = getY(c.high);
          const yLow = getY(c.low);
          const bodyY = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(2.5, Math.abs(yClose - yOpen));
          const wickColor = isGreen ? "#34D399" : "#F87171";

          return (
            <g key={idx}>
              {/* Wick */}
              <line
                x1={xCenter}
                y1={yHigh}
                x2={xCenter}
                y2={yLow}
                stroke={wickColor}
                strokeWidth="1.2"
                opacity="0.9"
              />
              {/* Candle Body */}
              <rect
                x={xCenter - candleBodyWidth / 2}
                y={bodyY}
                width={candleBodyWidth}
                height={bodyHeight}
                rx="1.5"
                fill={isGreen ? "url(#bullGradient)" : "url(#bearGradient)"}
                stroke={isGreen ? "#059669" : "#B91C1C"}
                strokeWidth="0.8"
              />
            </g>
          );
        })}

        {/* 5. SUGGESTED ENTRY LINE */}
        {alert.suggestedEntry && (
          <g>
            <line
              x1={paddingLeft + plotWidth * 0.35}
              y1={getY(alert.suggestedEntry)}
              x2={width - paddingRight + 6}
              y2={getY(alert.suggestedEntry)}
              stroke="#06B6D4"
              strokeDasharray="3 2"
              strokeWidth="1.2"
            />
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.suggestedEntry) - 7}
              width="58"
              height="14"
              rx="2"
              fill="#083344"
            />
            <text
              x={width - paddingRight + 35}
              y={getY(alert.suggestedEntry) + 3}
              fontSize="7.5"
              fontFamily="monospace"
              fill="#67E8F9"
              textAnchor="middle"
              fontWeight="bold"
            >
              ENTRY {alert.suggestedEntry}
            </text>
          </g>
        )}

        {/* 6. STOP LOSS LINE */}
        {alert.stopLoss && (
          <g>
            <line
              x1={paddingLeft + plotWidth * 0.35}
              y1={getY(alert.stopLoss)}
              x2={width - paddingRight + 6}
              y2={getY(alert.stopLoss)}
              stroke="#EF4444"
              strokeDasharray="2 2"
              strokeWidth="1.2"
            />
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.stopLoss) - 7}
              width="58"
              height="14"
              rx="2"
              fill="#450A0A"
            />
            <text
              x={width - paddingRight + 35}
              y={getY(alert.stopLoss) + 3}
              fontSize="7.5"
              fontFamily="monospace"
              fill="#FCA5A5"
              textAnchor="middle"
              fontWeight="bold"
            >
              SL {alert.stopLoss}
            </text>
          </g>
        )}

        {/* 7. TAKE PROFIT 1 LINE */}
        {alert.takeProfit1 && (
          <g>
            <line
              x1={paddingLeft + plotWidth * 0.35}
              y1={getY(alert.takeProfit1)}
              x2={width - paddingRight + 6}
              y2={getY(alert.takeProfit1)}
              stroke="#10B981"
              strokeDasharray="3 2"
              strokeWidth="1.2"
            />
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.takeProfit1) - 7}
              width="58"
              height="14"
              rx="2"
              fill="#064E3B"
            />
            <text
              x={width - paddingRight + 35}
              y={getY(alert.takeProfit1) + 3}
              fontSize="7.5"
              fontFamily="monospace"
              fill="#6EE7B7"
              textAnchor="middle"
              fontWeight="bold"
            >
              TP1 {alert.takeProfit1}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
