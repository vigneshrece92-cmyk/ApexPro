"use client";

import React, { useMemo } from "react";
import { InstitutionalAlert } from "@/lib/types";

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

    if (alert.vahPrice) allPrices.push(alert.vahPrice);
    if (alert.valPrice) allPrices.push(alert.valPrice);
    if (alert.pocPrice) allPrices.push(alert.pocPrice);
    if (alert.suggestedEntry) allPrices.push(alert.suggestedEntry);
    if (alert.stopLoss) allPrices.push(alert.stopLoss);
    if (alert.takeProfit1) allPrices.push(alert.takeProfit1);
    if (alert.takeProfit2) allPrices.push(alert.takeProfit2);

    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const padding = (rawMax - rawMin) * 0.12 || 1;
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
        <span>Generating PAVP Snapshot...</span>
      </div>
    );
  }

  const { minPrice, maxPrice, priceRange } = chartMetrics;

  const width = 500; // virtual SVG coordinate space
  const svgHeight = height;
  const paddingLeft = 14;
  const paddingRight = 75; // room for price labels on the right
  const paddingTop = 22;
  const paddingBottom = 22;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getY = (price: number) => {
    const norm = (price - minPrice) / priceRange;
    return paddingTop + (1 - norm) * plotHeight;
  };

  const candleSpacing = plotWidth / (candles.length || 1);
  const candleBodyWidth = Math.max(8, Math.min(22, candleSpacing * 0.65));

  const isCE = alert.direction.includes("CE") || alert.direction.includes("BUY");

  return (
    <div className={`relative w-full overflow-hidden rounded-lg bg-[#05080E] border border-terminal-border/80 ${className}`}>
      {/* Visual Header Overlay */}
      <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/70 backdrop-blur text-gray-200 border border-white/10">
          PAVP PROFILE MARKUP • {alert.symbol}
        </span>
        <span
          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
            isCE
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isCE ? "bg-emerald-400" : "bg-rose-400"}`}></span>
          {alert.retestStatus || alert.title}
        </span>
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

        {/* 1. 68% VALUE AREA SHADING (Between VAH and VAL) */}
        {alert.vahPrice && alert.valPrice && (
          <g>
            <rect
              x={paddingLeft}
              y={getY(alert.vahPrice)}
              width={plotWidth}
              height={Math.max(6, getY(alert.valPrice) - getY(alert.vahPrice))}
              fill="#2563EB"
              fillOpacity="0.08"
              stroke="#3B82F6"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
            <text
              x={paddingLeft + 6}
              y={getY(alert.vahPrice) + 11}
              fontSize="7"
              fontFamily="monospace"
              fill="#60A5FA"
              opacity="0.8"
              fontWeight="bold"
            >
              VALUE AREA (68%)
            </text>
          </g>
        )}

        {/* 2. VALUE AREA HIGH (VAH) LINE */}
        {alert.vahPrice && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(alert.vahPrice)}
              x2={width - paddingRight + 6}
              y2={getY(alert.vahPrice)}
              stroke="#3B82F6"
              strokeDasharray="4 3"
              strokeWidth="1.2"
            />
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.vahPrice) - 7}
              width="64"
              height="14"
              rx="2"
              fill="#1E3A8A"
              opacity="0.95"
            />
            <text
              x={width - paddingRight + 38}
              y={getY(alert.vahPrice) + 3}
              fontSize="7.5"
              fontFamily="monospace"
              fill="#93C5FD"
              textAnchor="middle"
              fontWeight="bold"
            >
              VAH ₹{alert.vahPrice}
            </text>
          </g>
        )}

        {/* 3. POINT OF CONTROL (POC) - HIGHEST VOLUME LINE */}
        {alert.pocPrice && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(alert.pocPrice)}
              x2={width - paddingRight + 6}
              y2={getY(alert.pocPrice)}
              stroke="#EF4444"
              strokeWidth="1.8"
            />
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.pocPrice) - 8}
              width="64"
              height="16"
              rx="3"
              fill="#991B1B"
            />
            <text
              x={width - paddingRight + 38}
              y={getY(alert.pocPrice) + 3.5}
              fontSize="8"
              fontFamily="monospace"
              fill="#FEE2E2"
              textAnchor="middle"
              fontWeight="extrabold"
            >
              POC ₹{alert.pocPrice}
            </text>
          </g>
        )}

        {/* 4. VALUE AREA LOW (VAL) LINE */}
        {alert.valPrice && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(alert.valPrice)}
              x2={width - paddingRight + 6}
              y2={getY(alert.valPrice)}
              stroke="#3B82F6"
              strokeDasharray="4 3"
              strokeWidth="1.2"
            />
            <rect
              x={width - paddingRight + 6}
              y={getY(alert.valPrice) - 7}
              width="64"
              height="14"
              rx="2"
              fill="#1E3A8A"
              opacity="0.95"
            />
            <text
              x={width - paddingRight + 38}
              y={getY(alert.valPrice) + 3}
              fontSize="7.5"
              fontFamily="monospace"
              fill="#93C5FD"
              textAnchor="middle"
              fontWeight="bold"
            >
              VAL ₹{alert.valPrice}
            </text>
          </g>
        )}

        {/* 5. CANDLESTICKS RENDERING */}
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

        {/* 6. SUGGESTED ENTRY LINE */}
        {alert.suggestedEntry && (
          <g>
            <line
              x1={paddingLeft + plotWidth * 0.4}
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
              width="64"
              height="14"
              rx="2"
              fill="#083344"
            />
            <text
              x={width - paddingRight + 38}
              y={getY(alert.suggestedEntry) + 3}
              fontSize="7"
              fontFamily="monospace"
              fill="#67E8F9"
              textAnchor="middle"
              fontWeight="bold"
            >
              ENTRY ₹{alert.suggestedEntry}
            </text>
          </g>
        )}

        {/* 7. STOP LOSS LINE */}
        {alert.stopLoss && (
          <g>
            <line
              x1={paddingLeft + plotWidth * 0.4}
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
              width="64"
              height="14"
              rx="2"
              fill="#450A0A"
            />
            <text
              x={width - paddingRight + 38}
              y={getY(alert.stopLoss) + 3}
              fontSize="7"
              fontFamily="monospace"
              fill="#FCA5A5"
              textAnchor="middle"
              fontWeight="bold"
            >
              SL ₹{alert.stopLoss}
            </text>
          </g>
        )}

        {/* 8. TAKE PROFIT 1 LINE */}
        {alert.takeProfit1 && (
          <g>
            <line
              x1={paddingLeft + plotWidth * 0.4}
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
              width="64"
              height="14"
              rx="2"
              fill="#064E3B"
            />
            <text
              x={width - paddingRight + 38}
              y={getY(alert.takeProfit1) + 3}
              fontSize="7"
              fontFamily="monospace"
              fill="#6EE7B7"
              textAnchor="middle"
              fontWeight="bold"
            >
              TP1 ₹{alert.takeProfit1}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
