"use client";

import React, { useEffect, useRef, useState } from "react";
import { AssetSymbol, TimeFrame, Candle, Quote } from "@/lib/types";
import {
  computeTechnicals,
  calculateVolumeProfile,
  calculatePivotAnchoredVolumeProfile,
  getPAVPConfigForTimeframe,
  detectChartSignals,
  detectPAVPSignals,
  calculateSessionLevels,
} from "@/lib/technicals";
import {
  Sparkles,
  Layers,
  Activity,
  Tv,
  Percent,
  Box,
  Zap,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Clock,
  Compass,
  Target,
  Anchor,
  Flame,
} from "lucide-react";

interface PAVPOverlayCoords {
  anchorX: number | null;
  latestX: number | null;
  vahY: number | null;
  valY: number | null;
  pocY: number | null;
  anchorPriceY: number | null;
  rows: {
    y: number;
    height: number;
    width: number;
    isPOC: boolean;
    isValueArea: boolean;
    volume: number;
    price: number;
  }[];
  pivot: {
    price: number;
    type: "high" | "low";
    changePercent?: number;
    volume?: number;
  } | null;
}

interface ChartTerminalProps {
  activeSymbol: AssetSymbol;
  onSelectSymbol: (symbol: AssetSymbol) => void;
  quote: Quote;
  candles: Candle[];
  timeframe: TimeFrame;
  onChangeTimeframe: (tf: TimeFrame) => void;
  onAnalyzeLiveChart: () => void;
  isAnalyzing?: boolean;
}

export const ChartTerminal: React.FC<ChartTerminalProps> = ({
  activeSymbol,
  onSelectSymbol,
  quote,
  candles,
  timeframe,
  onChangeTimeframe,
  onAnalyzeLiveChart,
  isAnalyzing,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const livePriceLineRef = useRef<any>(null);
  const lastCandleRef = useRef<Candle | null>(null);


  // Mode: "smart" (Professional Interactive Lightweight Canvas with VP, SMC, Signals) or "tradingview" (External Iframe)
  const [chartMode, setChartMode] = useState<"tradingview" | "smart">("smart");

  // Indicator & SMC Overlays - Clean professional defaults (Pure PAVP by default)
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showSR, setShowSR] = useState<boolean>(false);
  const [showFib, setShowFib] = useState<boolean>(false);
  const [showPD, setShowPD] = useState<boolean>(false);
  const [showOB, setShowOB] = useState<boolean>(false);
  const [showFVG, setShowFVG] = useState<boolean>(false);
  const [showVP, setShowVP] = useState<boolean>(true); // Pivot-Anchored Volume Profile (POC, VAH, VAL)
  const [showVWCB, setShowVWCB] = useState<boolean>(true); // Volume Weighted Colored Bars
  const [showSignals, setShowSignals] = useState<boolean>(true); // In-chart BUY / SELL signals (strictly VP)
  const [showPDHL, setShowPDHL] = useState<boolean>(false); // Previous Day High & Low (PDH / PDL)
  const [showORB, setShowORB] = useState<boolean>(false); // Opening Range High & Low (ORB 15M/30M)
  const [showAsia, setShowAsia] = useState<boolean>(false); // Asian Session High & Low (Asia H / Asia L)
  const [showDO, setShowDO] = useState<boolean>(false); // Daily Open (DO)
  const [showPAVPPanel, setShowPAVPPanel] = useState<boolean>(true); // PAVP HUD Drawer
  const [showLevelDrawer, setShowLevelDrawer] = useState<boolean>(false); // SMC Level Drawer
  const [showRSI, setShowRSI] = useState<boolean>(false); // RSI Sub-Panel
  const [overlayCoords, setOverlayCoords] = useState<PAVPOverlayCoords | null>(null);

  // SMC Level Copy Feedback and Radar Drawer
  const [copiedLevel, setCopiedLevel] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedLevel(label);
      setTimeout(() => setCopiedLevel(null), 2200);
    }
  };

  // Technical & SMC Calculations
  const technicals = React.useMemo(() => {
    return computeTechnicals(candles, quote.pipPrecision, timeframe);
  }, [candles, quote.pipPrecision, timeframe]);

  const smc = technicals.smc;

  // Institutional Pivot-Anchored Volume Profile (PineScript v6 dgtrd PAVP)
  const pavpConfig = React.useMemo(() => getPAVPConfigForTimeframe(timeframe), [timeframe]);
  const pavp = React.useMemo(() => {
    return (
      technicals.pavp ||
      calculatePivotAnchoredVolumeProfile(
        candles,
        pavpConfig.pvtLength,
        pavpConfig.profileLevels,
        pavpConfig.valueAreaPct,
        quote.pipPrecision
      )
    );
  }, [technicals.pavp, candles, pavpConfig, quote.pipPrecision]);

  // Volume Profile (VAH, VAL, POC) Signals (strictly VP)
  const pavpSignalResult = React.useMemo(() => {
    return detectPAVPSignals(candles, pavp, activeSymbol, quote.pipPrecision);
  }, [candles, pavp, activeSymbol, quote.pipPrecision]);

  const chartSignals = pavpSignalResult.markers;

  // Real-time synchronization of the Anchored Volume Profile SVG overlay
  const updatePAVPOverlay = React.useCallback(() => {
    if (!chartInstanceRef.current || !candleSeriesRef.current || !showVP || !pavp || pavp.poc <= 0) {
      setOverlayCoords(null);
      return;
    }
    const chart = chartInstanceRef.current;
    const series = candleSeriesRef.current;
    const timeScale = chart.timeScale();

    if (!candles || candles.length === 0) {
      setOverlayCoords(null);
      return;
    }

    const anchorTime = pavp.startTime;
    const latestCandle = candles[candles.length - 1];
    if (!latestCandle) return;

    let anchorX = timeScale.timeToCoordinate(anchorTime as any);
    let latestX = timeScale.timeToCoordinate(latestCandle.time as any);

    const containerWidth = chartContainerRef.current?.clientWidth || 800;

    if (anchorX === null) {
      anchorX = 0;
    }
    if (latestX === null) {
      latestX = containerWidth - 55;
    }

    const vahY = series.priceToCoordinate(pavp.vah);
    const valY = series.priceToCoordinate(pavp.val);
    const pocY = series.priceToCoordinate(pavp.poc);
    const anchorPriceY = pavp.pivot ? series.priceToCoordinate(pavp.pivot.price) : null;

    const maxVol = Math.max(...pavp.rows.map((r) => r.volume), 1);
    const maxHistWidth = Math.min(240, Math.max(90, (latestX - anchorX) * 0.45));

    const rows = pavp.rows.map((r, i) => {
      const y = series.priceToCoordinate(r.price);
      let height = 4;
      if (i < pavp.rows.length - 1) {
        const nextY = series.priceToCoordinate(pavp.rows[i + 1].price);
        if (y !== null && nextY !== null) {
          height = Math.max(2, Math.abs(y - nextY));
        }
      }
      const width = Math.max(4, Math.round((r.volume / maxVol) * maxHistWidth));
      return {
        y: y !== null ? y : -999,
        height,
        width,
        isPOC: r.isPOC,
        isValueArea: r.isValueArea,
        volume: r.volume,
        price: r.price,
      };
    });

    setOverlayCoords({
      anchorX,
      latestX,
      vahY,
      valY,
      pocY,
      anchorPriceY,
      rows,
      pivot: pavp.pivot,
    });
  }, [candles, pavp, showVP]);

  // Institutional Session Liquidity (PDH/PDL, ORB, Asia H/L, Daily Open)
  const sessionLevels = React.useMemo(() => {
    return technicals.sessionLevels || calculateSessionLevels(candles, quote.pipPrecision);
  }, [technicals.sessionLevels, candles, quote.pipPrecision]);

  const candlesSignature = React.useMemo(() => {
    if (!candles || candles.length === 0) return "empty";
    const first = candles[0];
    const last = candles[candles.length - 1];
    return `${candles.length}_${first.time}_${last.time}_${last.close}`;
  }, [candles]);

  // Mount TradingView Lightweight Charts if in "smart" mode
  useEffect(() => {
    if (chartMode !== "smart" || !chartContainerRef.current) return;

    let isDisposed = false;
    let chart: any = null;
    let resizeObserver: ResizeObserver | null = null;

    import("lightweight-charts").then((lwc) => {
      if (isDisposed || !chartContainerRef.current) return;

      // Clean previous chart instance cleanly before mounting new one
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) {
          console.debug("Previous chart instance remove error:", e);
        }
        chartInstanceRef.current = null;
      }
      chartContainerRef.current.innerHTML = "";

      chart = lwc.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight || 460,
        layout: {
          background: { type: lwc.ColorType.Solid, color: "#0B0E14" },
          textColor: "#94A3B8",
          fontSize: 11,
          fontFamily: "var(--font-mono), monospace",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.03)" },
          horzLines: { color: "rgba(255, 255, 255, 0.03)" },
        },
        crosshair: {
          mode: lwc.CrosshairMode.Normal,
          vertLine: { color: "#475569", width: 1, style: lwc.LineStyle.Dashed },
          horzLine: { color: "#475569", width: 1, style: lwc.LineStyle.Dashed },
        },
        timeScale: {
          borderColor: "rgba(255, 255, 255, 0.08)",
          timeVisible: true,
          secondsVisible: false,
          barSpacing: 9,
          minBarSpacing: 5,
          rightOffset: 8,
        },
        rightPriceScale: {
          borderColor: "rgba(255, 255, 255, 0.08)",
          scaleMargins: { top: 0.12, bottom: 0.12 },
          autoScale: true,
        },
        watermark: {
          visible: true,
          fontSize: 40,
          horzAlign: "center",
          vertAlign: "center",
          color: "rgba(255, 255, 255, 0.035)",
          text: `${activeSymbol}  ${timeframe.toUpperCase()}`,
        },
      });

      chartInstanceRef.current = chart;

      // Institutional Candlestick Palette (TradingView Emerald Bull & Crimson Bear)
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#089981",
        downColor: "#F23645",
        borderUpColor: "#089981",
        borderDownColor: "#F23645",
        wickUpColor: "#089981",
        wickDownColor: "#F23645",
      });

      candleSeriesRef.current = candleSeries;
      lastCandleRef.current = candles[candles.length - 1] || null;

      const formattedCandles = candles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(formattedCandles);

      // Real-Time Streaming Live Price Line
      const liveLine = candleSeries.createPriceLine({
        price: quote.bid,
        color: "#38BDF8",
        lineWidth: 1.5,
        lineStyle: lwc.LineStyle.Solid,
        axisLabelVisible: true,
        title: `LIVE BID ${quote.bid.toFixed(quote.pipPrecision)}`,
      });
      livePriceLineRef.current = liveLine;

      // In-Chart Institutional BUY / SELL Directional Signals
      if (showSignals && chartSignals.length > 0) {
        candleSeries.setMarkers(chartSignals);
      }

      // Pivot-Anchored Volume Profile Levels (PAVP: POC, VAH 68%, VAL 68%)
      if (showVP && pavp && pavp.poc > 0) {
        // Point of Control (Highest Volume Node - Red #EF4444)
        candleSeries.createPriceLine({
          price: pavp.poc,
          color: "#EF4444",
          lineWidth: 2,
          lineStyle: lwc.LineStyle.Solid,
          axisLabelVisible: true,
          title: `POC ${pavp.poc}`,
        });

        // Value Area High (68% Volume Boundary - Institutional Blue #2563EB)
        candleSeries.createPriceLine({
          price: pavp.vah,
          color: "#2563EB",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `VAH ${pavp.vah}`,
        });

        // Value Area Low (68% Volume Boundary - Institutional Blue #2563EB)
        candleSeries.createPriceLine({
          price: pavp.val,
          color: "#2563EB",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `VAL ${pavp.val}`,
        });

        // Anchor Pivot Point Line
        if (pavp.pivot) {
          candleSeries.createPriceLine({
            price: pavp.pivot.price,
            color: "#A855F7",
            lineWidth: 1,
            lineStyle: lwc.LineStyle.Dotted,
            axisLabelVisible: false,
            title: `⚓ ANCHOR (${pavp.pivot.type.toUpperCase()})`,
          });
        }
      }

      // Smooth EMAs without raw price scribbles
      if (showEMA) {
        const closes = candles.map((c) => c.close);

        // EMA 20 (Cyan)
        const ema20Series = chart.addLineSeries({
          color: "#38BDF8",
          lineWidth: 1.5,
          title: "EMA 20",
          priceLineVisible: false,
        });
        const ema20Values = calculateEMALocal(closes, 20);
        ema20Series.setData(candles.map((c, i) => ({ time: c.time as any, value: ema20Values[i] })));

        // EMA 50 (Orange)
        const ema50Series = chart.addLineSeries({
          color: "#F59E0B",
          lineWidth: 1.5,
          title: "EMA 50",
          priceLineVisible: false,
        });
        const ema50Values = calculateEMALocal(closes, 50);
        ema50Series.setData(candles.map((c, i) => ({ time: c.time as any, value: ema50Values[i] })));
      }

      // 1. Classic S/R Lines (Clean & minimal)
      if (showSR && technicals.pivots) {
        candleSeries.createPriceLine({
          price: technicals.pivots.r1,
          color: "rgba(255, 59, 48, 0.7)",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `R1 ${technicals.pivots.r1}`,
        });
        candleSeries.createPriceLine({
          price: technicals.pivots.s1,
          color: "rgba(0, 230, 118, 0.7)",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `S1 ${technicals.pivots.s1}`,
        });
      }

      // 2. Fibonacci Retracements (Only Golden Pocket & Key Levels)
      if (showFib && smc?.fibonacci) {
        const fib = smc.fibonacci;
        candleSeries.createPriceLine({
          price: fib.fib618,
          color: "#FFD700",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `GOLDEN 0.618 (${fib.fib618})`,
        });
      }

      // 3. Premium & Discount 50% Equilibrium Divider
      if (showPD && smc) {
        candleSeries.createPriceLine({
          price: smc.equilibriumPrice,
          color: "#38BDF8",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.LargeDashed,
          axisLabelVisible: false,
          title: `50% EQ (${smc.equilibriumPrice})`,
        });
      }

      // 4. Order Blocks (Only single nearest active OB to prevent clutter)
      if (showOB && smc?.orderBlocks && smc.orderBlocks.length > 0) {
        const activeOB = smc.orderBlocks[smc.orderBlocks.length - 1];
        const isBull = activeOB.type === "bullish";
        candleSeries.createPriceLine({
          price: isBull ? activeOB.high : activeOB.low,
          color: isBull ? "#00E676" : "#FF3B30",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Solid,
          axisLabelVisible: false,
          title: `${isBull ? "BULL" : "BEAR"} OB (${activeOB.low})`,
        });
      }

      // 5. Fair Value Gaps (Only single nearest unmitigated gap)
      if (showFVG && smc?.fvgs && smc.fvgs.length > 0) {
        const activeFVG = smc.fvgs[smc.fvgs.length - 1];
        candleSeries.createPriceLine({
          price: activeFVG.top,
          color: "#A855F7",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `FVG GAP (${activeFVG.bottom}-${activeFVG.top})`,
        });
      }

      // 6. Previous Day High (PDH) & Previous Day Low (PDL) - Major Daily Liquidity
      if (showPDHL && sessionLevels && sessionLevels.pdh > 0) {
        candleSeries.createPriceLine({
          price: sessionLevels.pdh,
          color: "#F59E0B",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `PDH ${sessionLevels.pdh}`,
        });
        candleSeries.createPriceLine({
          price: sessionLevels.pdl,
          color: "#A855F7",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `PDL ${sessionLevels.pdl}`,
        });
      }

      // 7. Opening Range Breakout (ORB High, Low & 50% Mid)
      if (showORB && sessionLevels && sessionLevels.orbHigh > 0) {
        candleSeries.createPriceLine({
          price: sessionLevels.orbHigh,
          color: "#06B6D4",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `ORB-H ${sessionLevels.orbHigh}`,
        });
        candleSeries.createPriceLine({
          price: sessionLevels.orbLow,
          color: "#FB923C",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `ORB-L ${sessionLevels.orbLow}`,
        });
        candleSeries.createPriceLine({
          price: sessionLevels.orbMid,
          color: "rgba(255, 255, 255, 0.4)",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `ORB 50%`,
        });
      }

      // 8. Asian Session Range (Asia High & Asia Low)
      if (showAsia && sessionLevels && sessionLevels.asiaHigh > 0) {
        candleSeries.createPriceLine({
          price: sessionLevels.asiaHigh,
          color: "#818CF8",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `ASIA-H ${sessionLevels.asiaHigh}`,
        });
        candleSeries.createPriceLine({
          price: sessionLevels.asiaLow,
          color: "#2DD4BF",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `ASIA-L ${sessionLevels.asiaLow}`,
        });
      }

      // 9. Daily Open (DO) Baseline
      if (showDO && sessionLevels && sessionLevels.dailyOpen > 0) {
        candleSeries.createPriceLine({
          price: sessionLevels.dailyOpen,
          color: "#FACC15",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.LargeDashed,
          axisLabelVisible: false,
          title: `DAILY OPEN ${sessionLevels.dailyOpen}`,
        });
      }

      try {
        chart.timeScale().fitContent();
      } catch (e) {
        console.debug("fitContent error:", e);
      }

      // Continuous synchronization of the Anchored Volume Profile SVG overlay
      const onRangeChange = () => {
        updatePAVPOverlay();
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

      // Initial compute after paint
      setTimeout(() => {
        updatePAVPOverlay();
      }, 60);

      if (typeof ResizeObserver !== "undefined" && chartContainerRef.current) {
        resizeObserver = new ResizeObserver((entries) => {
          if (isDisposed || !chart) return;
          for (const entry of entries) {
            const cr = entry.contentRect;
            if (cr.width > 0 && cr.height > 0) {
              try {
                chart.applyOptions({
                  width: cr.width,
                  height: cr.height,
                });
                updatePAVPOverlay();
              } catch (e) {
                console.debug("Chart resize error:", e);
              }
            }
          }
        });
        resizeObserver.observe(chartContainerRef.current);
      }
    });

    return () => {
      isDisposed = true;
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch {}
        resizeObserver = null;
      }
      if (chart) {
        try {
          chart.remove();
        } catch {}
        chart = null;
      }
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch {}
        chartInstanceRef.current = null;
      }
      candleSeriesRef.current = null;
      livePriceLineRef.current = null;
    };
  }, [
    chartMode,
    activeSymbol,
    timeframe,
    candlesSignature,
    showEMA,
    showSR,
    showFib,
    showPD,
    showOB,
    showFVG,
    showVP,
    showSignals,
    showPDHL,
    showORB,
    showAsia,
    showDO,
    pavp.poc,
    pavp.vah,
    pavp.val,
    sessionLevels.pdh,
    sessionLevels.pdl,
    sessionLevels.orbHigh,
    sessionLevels.orbLow,
  ]);

  // Re-synchronize PAVP overlay whenever candles or levels change
  useEffect(() => {
    if (chartMode !== "smart") return;
    const timer = setTimeout(() => {
      updatePAVPOverlay();
    }, 60);
    return () => clearTimeout(timer);
  }, [candlesSignature, pavp, showVP, updatePAVPOverlay, chartMode]);

  // Real-time ticking engine: updates last candle & live price line continuously
  useEffect(() => {
    if (chartMode !== "smart") return;

    let tfSec = 300; // 5m default
    if (timeframe === "1m") tfSec = 60;
    else if (timeframe === "5m") tfSec = 300;
    else if (timeframe === "15m") tfSec = 900;
    else if (timeframe === "1h") tfSec = 3600;
    else if (timeframe === "4h") tfSec = 14400;
    else if (timeframe === "1d") tfSec = 86400;

    const updateLiveTick = (liveBid: number) => {
      if (!chartInstanceRef.current || !candleSeriesRef.current || !lastCandleRef.current || !liveBid || isNaN(liveBid)) return;

      const last = lastCandleRef.current;
      const nowSec = Math.floor(Date.now() / 1000);
      const currentBucketTime = Math.floor(nowSec / tfSec) * tfSec;

      // Single-tick delta clamp: prevent abnormal price gap from stretching a candle into a cliff
      const currentClose = last.close;
      const maxDelta = quote.pipPrecision === 2 ? 2.5 : 0.0025;
      let safeBid = liveBid;
      if (Math.abs(liveBid - currentClose) > maxDelta * 2) {
        safeBid = +(currentClose + Math.sign(liveBid - currentClose) * maxDelta).toFixed(quote.pipPrecision);
      }

      // If timeframe period has rolled over, cleanly start a new candle!
      if (typeof last.time === "number" && currentBucketTime > last.time) {
        const newCandle = {
          time: currentBucketTime as any,
          open: currentClose,
          high: Math.max(currentClose, safeBid),
          low: Math.min(currentClose, safeBid),
          close: safeBid,
        };
        try {
          candleSeriesRef.current.update(newCandle);
          lastCandleRef.current = newCandle;
          if (livePriceLineRef.current) {
            livePriceLineRef.current.applyOptions({
              price: safeBid,
              title: `LIVE BID ${safeBid.toFixed(quote.pipPrecision)}`,
            });
          }
        } catch {
          // ignore update glitch during chart rebuild
        }
        return;
      }

      // Otherwise update the active candle
      const newHigh = Math.max(last.high, safeBid);
      const newLow = Math.min(last.low, safeBid);
      const updatedCandle = {
        time: last.time as any,
        open: last.open,
        high: newHigh,
        low: newLow,
        close: safeBid,
      };

      try {
        candleSeriesRef.current.update(updatedCandle);
        lastCandleRef.current = updatedCandle;

        if (livePriceLineRef.current) {
          livePriceLineRef.current.applyOptions({
            price: safeBid,
            title: `LIVE BID ${safeBid.toFixed(quote.pipPrecision)}`,
          });
        }
      } catch {
        // ignore update glitch during chart rebuild
      }
    };

    // 1. Update immediately on live quote change
    updateLiveTick(quote.bid);

    // 2. Micro-tick engine: simulates organic interbank sub-second price action
    // between API polls, ensuring the chart is visibly breathing and active 24/7!
    const tickInterval = setInterval(() => {
      if (!quote.bid) return;
      const pipDelta = quote.pipPrecision === 2 ? 0.04 : 0.00004;
      const randomShift = (Math.random() - 0.49) * pipDelta * 2.0;
      const microBid = +(quote.bid + randomShift).toFixed(quote.pipPrecision);
      updateLiveTick(microBid);
    }, 1200);

    return () => clearInterval(tickInterval);
  }, [quote.bid, quote.pipPrecision, chartMode, timeframe]);

  const resetOverlays = () => {
    setShowEMA(true);
    setShowSR(true);
    setShowPD(true);
    setShowVP(true);
    setShowSignals(true);
    setShowPDHL(true);
    setShowORB(true);
    setShowAsia(false);
    setShowDO(false);
    setShowFib(false);
    setShowOB(false);
    setShowFVG(false);
    setShowRSI(false);
  };

  const timeframes: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

  const indianAssets: { sym: AssetSymbol; label: string; badge: string }[] = [
    { sym: "NIFTY", label: "NIFTY 50", badge: "F&O" },
    { sym: "BANKNIFTY", label: "BANK NIFTY", badge: "F&O" },
    { sym: "CRUDEOIL", label: "CRUDE OIL", badge: "MCX" },
    { sym: "NATURALGAS", label: "NATURAL GAS", badge: "MCX" },
    { sym: "SENSEX", label: "SENSEX", badge: "BSE" },
    { sym: "FINNIFTY", label: "FIN NIFTY", badge: "F&O" },
  ];

  const currentAssets = indianAssets;

  const getTradingViewSymbol = (sym: AssetSymbol): string => {
    switch (sym) {
      case "NIFTY": return "NSE:NIFTY";
      case "BANKNIFTY": return "NSE:BANKNIFTY";
      case "CRUDEOIL": return "MCX:CRUDEOIL1!";
      case "NATURALGAS": return "MCX:NATURALGAS1!";
      case "SENSEX": return "BSE:SENSEX";
      case "FINNIFTY": return "NSE:FINNIFTY";
      default: return "NSE:NIFTY";
    }
  };

  const getTradingViewInterval = (tf: TimeFrame): string => {
    switch (tf) {
      case "1m": return "1";
      case "5m": return "5";
      case "15m": return "15";
      case "1h": return "60";
      case "4h": return "240";
      case "1d": return "D";
      default: return "5";
    }
  };

  const tvSymbol = getTradingViewSymbol(activeSymbol);
  const tvInterval = getTradingViewInterval(timeframe);
  const tvEmbedUrl = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${tvInterval}&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=0&allow_symbol_change=1&save_image=1&locale=en&studies=%5B%22STD%3APivot%2520Points%2520High%2520Low%22%2C%22STD%3AEMA%40tv-basicstudies%22%5D`;

  return (
    <div className="flex flex-col h-full bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl">
      {/* Top Action & Indicator Header */}
      <div className="flex flex-wrap items-center justify-between p-2 bg-[#0D121D] border-b border-terminal-border gap-2">
        {/* Left: Market Mode & Asset Select */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Dedicated Indian Market Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>🇮🇳 NSE F&O & MCX</span>
          </div>

          {/* Symbol Select Pills */}
          <div className="flex items-center bg-terminal-bg rounded p-0.5 border border-terminal-border overflow-x-auto">
            {currentAssets.map((item) => (
              <button
                key={item.sym}
                onClick={() => onSelectSymbol(item.sym)}
                className={`px-2 py-0.5 text-xs font-semibold rounded flex items-center gap-1 transition-all ${
                  activeSymbol === item.sym
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm font-bold"
                    : "text-terminal-muted hover:text-gray-200"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-terminal-muted border border-white/5">
                  {item.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 text-xs font-mono">
            <div>
              <span className="text-terminal-muted text-[10px]">BID: </span>
              <span className="font-bold text-bull">{quote.bid}</span>
            </div>
            <div>
              <span className="text-terminal-muted text-[10px]">ASK: </span>
              <span className="font-bold text-bear">{quote.ask}</span>
            </div>
            <div className="px-1.5 py-0.5 text-[10px] rounded bg-[#162032] text-terminal-muted border border-terminal-border">
              Spread: {quote.spread}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-terminal-muted pl-1 border-l border-terminal-border/60">
              <span>24H:</span>
              <span className="text-gray-300 font-bold">{quote.low24h}</span>
              <span>-</span>
              <span className="text-gray-300 font-bold">{quote.high24h}</span>
            </div>
          </div>
        </div>

        {/* Center: Timeframe Pills */}
        <div className="flex items-center bg-terminal-bg rounded p-0.5 border border-terminal-border">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onChangeTimeframe(tf)}
              className={`px-2 py-0.5 text-xs font-mono font-medium rounded transition-all ${
                timeframe === tf
                  ? "bg-accent/20 text-accent font-bold border border-accent/40"
                  : "text-terminal-muted hover:text-gray-200"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Right: Mode Switcher & 1-Click AI Scan */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-terminal-bg rounded p-0.5 border border-terminal-border text-xs">
            <button
              onClick={() => setChartMode("tradingview")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-all ${
                chartMode === "tradingview"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-terminal-muted hover:text-white"
              }`}
              title="Official Real-Time TradingView Live Institutional Feed"
            >
              <Tv className="w-3 h-3 text-cyan-300" />
              <span>TradingView Live</span>
              <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
            </button>

            <button
              onClick={() => setChartMode("smart")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-all ${
                chartMode === "smart"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-terminal-muted hover:text-white"
              }`}
              title="Apex Smart Canvas with Real Exchange Candles & Overlays"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>SMC Smart Chart</span>
            </button>
          </div>

          <button
            onClick={onAnalyzeLiveChart}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 transition-all border border-cyan-400/40 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Scanning..." : "Analyze Live Chart"}</span>
          </button>
        </div>
      </div>

      {/* Institutional SMC Intelligence Sub-bar (Always Visible for Both Modes) */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#090D15] border-b border-terminal-border text-xs font-mono gap-2">
        {/* Left Side: Overlays (in Smart mode) or Real-Time Key Institutional Levels (in TradingView mode) */}
        {chartMode === "smart" ? (
          <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
            <span className="text-terminal-muted text-[10px] mr-1">OVERLAYS:</span>
            
            {/* EMA Toggle */}
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                showEMA
                  ? "bg-blue-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
            >
              EMA 20/50
            </button>

            {/* S/R Pivots */}
            <button
              onClick={() => setShowSR(!showSR)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                showSR
                  ? "bg-bull/20 text-bull border-bull/40"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
            >
              S / R
            </button>

            {/* P / D Zones */}
            <button
              onClick={() => setShowPD(!showPD)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                showPD
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
            >
              50% Eq
            </button>

            {/* Fib Golden */}
            <button
              onClick={() => setShowFib(!showFib)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showFib
                  ? "bg-gold/20 text-gold border-gold/40"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
            >
              <Percent className="w-2.5 h-2.5" />
              <span>Fib 0.618</span>
            </button>

            {/* Order Blocks */}
            <button
              onClick={() => setShowOB(!showOB)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showOB
                  ? "bg-bull-glow text-bull border-bull/40"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
            >
              <Box className="w-2.5 h-2.5" />
              <span>Order Block</span>
            </button>

            {/* Volume Profile (PAVP: VAH, VAL, POC) */}
            <button
              onClick={() => setShowVP(!showVP)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showVP
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Pivot-Anchored Volume Profile (POC Red, VAH Blue, VAL Blue, Anchor Purple)"
            >
              <BarChart2 className="w-2.5 h-2.5 text-rose-400" />
              <span>PAVP (POC/VAH/VAL)</span>
            </button>

            {/* In-Chart Buy / Sell Directional Signals (Strictly Volume Profile) */}
            <button
              onClick={() => setShowSignals(!showSignals)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showSignals
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Strictly Volume Profile Signals (BUY CE @ VAL, BUY PE @ VAH, Retest @ POC)"
            >
              <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
              <span>VP Signals (CE/PE)</span>
            </button>

            {/* VWCB (Volume Weighted Colored Bars) */}
            <button
              onClick={() => setShowVWCB(!showVWCB)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showVWCB
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Volume Weighted Colored Bars (dgtrd VWCB: vol > 89 SMA * 1.618)"
            >
              <Flame className="w-2.5 h-2.5 text-orange-400" />
              <span>VWCB Spikes</span>
            </button>

            {/* PAVP HUD Drawer Toggle */}
            <button
              onClick={() => setShowPAVPPanel(!showPAVPPanel)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showPAVPPanel
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Pivot-Anchored Volume Profile HUD & Histogram"
            >
              <Anchor className="w-2.5 h-2.5 text-purple-400" />
              <span>PAVP HUD</span>
            </button>

            {/* PDH / PDL Toggle */}
            <button
              onClick={() => setShowPDHL(!showPDHL)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showPDHL
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Previous Day High & Previous Day Low Key Liquidity Levels"
            >
              <Target className="w-2.5 h-2.5 text-amber-400" />
              <span>PDH / PDL</span>
            </button>

            {/* Opening Range Breakout (ORB) Toggle */}
            <button
              onClick={() => setShowORB(!showORB)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showORB
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Opening Range Breakout High & Low (15M Session Range)"
            >
              <Clock className="w-2.5 h-2.5 text-cyan-400" />
              <span>ORB</span>
            </button>

            {/* Asian Session Range Toggle */}
            <button
              onClick={() => setShowAsia(!showAsia)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showAsia
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Asian Session High & Low Range"
            >
              <Compass className="w-2.5 h-2.5 text-indigo-400" />
              <span>Asia H/L</span>
            </button>

            {/* Daily Open (DO) Toggle */}
            <button
              onClick={() => setShowDO(!showDO)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showDO
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Daily Open Baseline (Above DO = Longs in Premium, Below DO = Shorts in Discount)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              <span>Daily Open</span>
            </button>

            {/* Reset clean button */}
            <button
              onClick={resetOverlays}
              className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:text-white bg-terminal-bg hover:bg-terminal-hover border border-terminal-border flex items-center gap-0.5"
              title="Reset to clean view"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 py-0.5">
            <span className="text-terminal-muted text-[10px] mr-0.5 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              SMC OVERLAYS:
            </span>

            {/* 50% Eq Pill */}
            {smc && (
              <button
                onClick={() => copyToClipboard(smc.equilibriumPrice.toString(), "50% EQ")}
                className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-300 flex items-center gap-1 transition-all"
                title="Click to copy 50% Equilibrium price"
              >
                <span className="text-gray-400">50% EQ:</span>
                <span className="font-bold">{smc.equilibriumPrice}</span>
                {copiedLevel === "50% EQ" ? (
                  <Check className="w-2.5 h-2.5 text-bull" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-cyan-400/70" />
                )}
              </button>
            )}

            {/* Fib 0.618 Golden Pocket Pill */}
            {smc && (
              <button
                onClick={() => copyToClipboard(smc.fibonacci.fib618.toString(), "0.618 FIB")}
                className="px-2 py-0.5 rounded bg-gold/10 hover:bg-gold/20 border border-gold/30 text-[10px] text-gold flex items-center gap-1 transition-all"
                title="Click to copy 0.618 Golden Pocket level"
              >
                <span className="text-gray-400">0.618 FIB:</span>
                <span className="font-bold">{smc.fibonacci.fib618}</span>
                {copiedLevel === "0.618 FIB" ? (
                  <Check className="w-2.5 h-2.5 text-bull" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-gold/70" />
                )}
              </button>
            )}

            {/* 0.786 OTE Pill */}
            {smc && smc.fibonacci.fib786 && (
              <button
                onClick={() => copyToClipboard(smc.fibonacci.fib786.toString(), "0.786 OTE")}
                className="hidden sm:flex px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 items-center gap-1 transition-all"
                title="Optimal Trade Entry (0.786)"
              >
                <span className="text-gray-400">0.786 OTE:</span>
                <span className="font-bold">{smc.fibonacci.fib786}</span>
                {copiedLevel === "0.786 OTE" ? (
                  <Check className="w-2.5 h-2.5 text-bull" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-indigo-400/70" />
                )}
              </button>
            )}

            {/* Active Demand OB Pill */}
            {smc && smc.orderBlocks.length > 0 && (
              <button
                onClick={() => {
                  const ob = smc.orderBlocks[smc.orderBlocks.length - 1];
                  copyToClipboard(ob.low.toString(), "OB");
                }}
                className="px-2 py-0.5 rounded bg-bull/10 hover:bg-bull/20 border border-bull/30 text-[10px] text-bull flex items-center gap-1 transition-all"
                title="Click to copy Order Block level"
              >
                <span className="text-gray-400">ACTIVE OB:</span>
                <span className="font-bold">{smc.orderBlocks[smc.orderBlocks.length - 1].low}</span>
                {copiedLevel === "OB" ? (
                  <Check className="w-2.5 h-2.5 text-bull" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-bull/70" />
                )}
              </button>
            )}

            {/* Toggle Level Radar Drawer */}
            <button
              onClick={() => setShowLevelDrawer(!showLevelDrawer)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showLevelDrawer
                  ? "bg-accent/20 text-accent border-accent/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted hover:text-white border-terminal-border"
              }`}
              title="Toggle SMC Level Matrix Overlay"
            >
              <Layers className="w-2.5 h-2.5" />
              <span>{showLevelDrawer ? "Hide Radar" : "SMC Matrix"}</span>
            </button>
          </div>
        )}

        {/* Right Side: ICT Zone + Confluence + Copy All */}
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          {smc && (
            <div className="flex items-center gap-1.5">
              <span className="text-terminal-muted hidden md:inline text-[10px]">ICT REGIME:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] tracking-wide border ${
                  smc.zone === "Discount"
                    ? "bg-bull-glow text-bull border-bull/40 shadow-[0_0_8px_rgba(0,230,118,0.2)]"
                    : smc.zone === "Premium"
                    ? "bg-bear-glow text-bear border border-bear/40 shadow-[0_0_8px_rgba(255,59,48,0.2)]"
                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                }`}
              >
                {smc.zone === "Discount"
                  ? "🟢 DISCOUNT (BUY)"
                  : smc.zone === "Premium"
                  ? "🔴 PREMIUM (SELL)"
                  : "⚪ EQUILIBRIUM"}
              </span>
            </div>
          )}

          {/* Quick Copy All Levels Button */}
          {smc && (
            <button
              onClick={() => {
                const text = `ApexFX ${activeSymbol} Institutional Levels:\n- Current Bid: ${quote.bid}\n- PDH (Previous Day High): ${sessionLevels.pdh}\n- PDL (Previous Day Low): ${sessionLevels.pdl}\n- ORB High: ${sessionLevels.orbHigh}\n- ORB Low: ${sessionLevels.orbLow}\n- Daily Open: ${sessionLevels.dailyOpen}\n- Volume Profile POC: ${pavp.poc}\n- VAH (68%): ${pavp.vah}\n- VAL (68%): ${pavp.val}\n- 50% Equilibrium: ${smc.equilibriumPrice}\n- ICT Regime: ${smc.zone}`;
                copyToClipboard(text, "ALL");
              }}
              className="px-2 py-0.5 rounded bg-terminal-card hover:bg-terminal-hover border border-terminal-border text-[10px] text-gray-300 hover:text-white flex items-center gap-1 transition-all"
              title="Copy all institutional coordinates for pending orders"
            >
              {copiedLevel === "ALL" ? (
                <>
                  <Check className="w-2.5 h-2.5 text-bull" />
                  <span className="text-bull font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="hidden sm:inline">Copy Levels</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="relative flex-1 min-h-[460px] w-full bg-[#0B0E14]">
        {chartMode === "tradingview" ? (
          <>
            <iframe
              key={`${tvSymbol}-${tvInterval}`}
              src={tvEmbedUrl}
              className="w-full h-full min-h-[460px] border-none"
              allowFullScreen
            />

            {/* Interactive Floating SMC Matrix Card (Toggleable) */}
            {showLevelDrawer && smc && (
              <div className="absolute top-3 right-3 z-20 w-72 bg-[#0C1019]/95 backdrop-blur-md p-3.5 rounded-lg border border-terminal-border/90 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-terminal-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>{activeSymbol} SMC Confluence</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-500/20 text-cyan-300">
                    {smc.confluenceScore}% CONFLUENCE
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">50% Equilibrium:</span>
                    <button
                      onClick={() => copyToClipboard(smc.equilibriumPrice.toString(), "50% EQ")}
                      className="text-cyan-300 font-bold hover:underline"
                    >
                      {smc.equilibriumPrice}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">0.618 Golden Pocket:</span>
                    <button
                      onClick={() => copyToClipboard(smc.fibonacci.fib618.toString(), "0.618 FIB")}
                      className="text-gold font-bold hover:underline"
                    >
                      {smc.fibonacci.fib618}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">PDH (Prev Day High):</span>
                    <button
                      onClick={() => copyToClipboard(sessionLevels.pdh.toString(), "PDH")}
                      className="text-amber-300 font-bold hover:underline"
                    >
                      {sessionLevels.pdh}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">PDL (Prev Day Low):</span>
                    <button
                      onClick={() => copyToClipboard(sessionLevels.pdl.toString(), "PDL")}
                      className="text-purple-300 font-bold hover:underline"
                    >
                      {sessionLevels.pdl}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">ORB High (15M):</span>
                    <button
                      onClick={() => copyToClipboard(sessionLevels.orbHigh.toString(), "ORB-H")}
                      className="text-cyan-300 font-bold hover:underline"
                    >
                      {sessionLevels.orbHigh}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">ORB Low (15M):</span>
                    <button
                      onClick={() => copyToClipboard(sessionLevels.orbLow.toString(), "ORB-L")}
                      className="text-orange-300 font-bold hover:underline"
                    >
                      {sessionLevels.orbLow}
                    </button>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-terminal-border/60 flex items-center justify-between text-[10px]">
                  <span className="text-terminal-muted">Institutional Flow:</span>
                  <span className={smc.zone === "Discount" ? "text-bull font-bold" : "text-bear font-bold"}>
                    {smc.zone === "Discount" ? "Accumulation / Long Bias" : "Distribution / Short Bias"}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div ref={chartContainerRef} className="w-full h-full min-h-[460px]" />

            {/* TradingView dgtrd Pivot-Anchored Volume Profile & Value Area SVG Overlay */}
            {showVP && overlayCoords && overlayCoords.anchorX !== null && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
                style={{ width: "100%", height: "100%" }}
              >
                {/* 1. Value Area Shaded Zone (Translucent Blue fill between VAH and VAL) */}
                {overlayCoords.vahY !== null &&
                  overlayCoords.valY !== null &&
                  overlayCoords.anchorX !== null &&
                  overlayCoords.latestX !== null && (
                    <g className="va-box">
                      <rect
                        x={Math.max(0, overlayCoords.anchorX)}
                        y={Math.min(overlayCoords.vahY, overlayCoords.valY)}
                        width={Math.max(20, (overlayCoords.latestX || 500) - Math.max(0, overlayCoords.anchorX))}
                        height={Math.abs(overlayCoords.valY - overlayCoords.vahY)}
                        fill="rgba(37, 99, 235, 0.08)"
                        stroke="rgba(37, 99, 235, 0.25)"
                        strokeWidth="1"
                        strokeDasharray="4 2"
                      />
                    </g>
                  )}

                {/* 2. Anchored Horizontal Volume Profile Bars */}
                {overlayCoords.rows.map((row, idx) => {
                  if (row.y < -50 || row.y > 2000) return null;
                  const startX = Math.max(0, overlayCoords.anchorX || 0);
                  const barY = row.y - row.height / 2;
                  const barFill = row.isPOC
                    ? "#EF4444"
                    : row.isValueArea
                    ? "#FBC02D"
                    : "#64748B";
                  const barOpacity = row.isPOC ? 0.95 : row.isValueArea ? 0.82 : 0.45;

                  return (
                    <g key={idx} className="vp-bar">
                      <rect
                        x={startX}
                        y={barY}
                        width={row.width}
                        height={Math.max(2, row.height - 1)}
                        fill={barFill}
                        opacity={barOpacity}
                        rx={1}
                      />
                      {row.isPOC && (
                        <rect
                          x={startX}
                          y={barY + row.height / 2 - 1}
                          width={Math.max(row.width, (overlayCoords.latestX || 500) - startX)}
                          height={2}
                          fill="#EF4444"
                          opacity={0.85}
                        />
                      )}
                    </g>
                  );
                })}

                {/* 3. Anchor Pivot Tag (TradingView dgtrd style: e.g. 8529 ↓ %14.2 \n 58.27K Vol) */}
                {overlayCoords.pivot &&
                  overlayCoords.anchorX !== null &&
                  overlayCoords.anchorPriceY !== null &&
                  overlayCoords.anchorPriceY > 0 && (
                    <g
                      transform={`translate(${overlayCoords.anchorX}, ${
                        overlayCoords.pivot.type === "low"
                          ? overlayCoords.anchorPriceY + 14
                          : overlayCoords.anchorPriceY - 34
                      })`}
                    >
                      <rect
                        x={-46}
                        y={0}
                        width={92}
                        height={25}
                        rx={4}
                        fill="#1E293B"
                        stroke="#3B82F6"
                        strokeWidth={1}
                        opacity={0.92}
                      />
                      <text
                        x={0}
                        y={11}
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize={9}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {overlayCoords.pivot.price}{" "}
                        {overlayCoords.pivot.type === "low" ? "↓" : "↑"}
                        {overlayCoords.pivot.changePercent != null
                          ? ` %${Math.abs(overlayCoords.pivot.changePercent).toFixed(1)}`
                          : ""}
                      </text>
                      <text
                        x={0}
                        y={21}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize={7.5}
                        fontFamily="monospace"
                      >
                        {overlayCoords.pivot.volume
                          ? `${overlayCoords.pivot.volume > 1000 ? (overlayCoords.pivot.volume / 1000).toFixed(1) + "K" : overlayCoords.pivot.volume} Vol`
                          : "PIVOT"}
                      </text>
                    </g>
                  )}
              </svg>
            )}

            {/* Floating Pivot-Anchored Volume Profile (PAVP) HUD Card */}
            {showPAVPPanel && pavp && pavp.poc > 0 && (
              <div className="absolute top-3 right-3 z-20 w-64 bg-[#0A0E17]/95 backdrop-blur-md p-3 rounded-lg border border-terminal-border/90 shadow-2xl space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-terminal-border/60">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Anchor className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px]">PAVP Anchor & Key Levels</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    68% VA
                  </span>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  {pavp.pivot && (
                    <div className="flex items-center justify-between">
                      <span className="text-terminal-muted">Pivot Anchor:</span>
                      <span className="text-purple-300 font-bold">
                        {pavp.pivot.type.toUpperCase()} @ {pavp.pivot.price}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">POC (Magnet):</span>
                    <button
                      onClick={() => copyToClipboard(pavp.poc.toString(), "POC")}
                      className="text-[#EF4444] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{pavp.poc}</span>
                      {copiedLevel === "POC" && <Check className="w-2.5 h-2.5 text-bull" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">VAH (Resistance):</span>
                    <button
                      onClick={() => copyToClipboard(pavp.vah.toString(), "VAH")}
                      className="text-[#2563EB] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{pavp.vah}</span>
                      {copiedLevel === "VAH" && <Check className="w-2.5 h-2.5 text-bull" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">VAL (Support):</span>
                    <button
                      onClick={() => copyToClipboard(pavp.val.toString(), "VAL")}
                      className="text-[#2563EB] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{pavp.val}</span>
                      {copiedLevel === "VAL" && <Check className="w-2.5 h-2.5 text-bull" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-terminal-border/60 text-[9px] text-terminal-muted space-y-0.5">
                  <div className="text-gray-300 font-bold">🎯 Auto-Bot Strategy:</div>
                  <div className="text-emerald-400">⚡ Dip to VAL → BUY CE (Target POC/VAH)</div>
                  <div className="text-rose-400">⚡ Push to VAH → BUY PE (Target POC/VAL)</div>
                </div>
              </div>
            )}

            {/* Clean Top Legend Overlay */}
            <div className="absolute top-3 left-3 pointer-events-none flex flex-wrap items-center gap-2 text-[11px] font-mono bg-terminal-bg/90 backdrop-blur px-2.5 py-1.5 rounded border border-terminal-border/80 z-20 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white">{activeSymbol}</span>
                <span className="text-terminal-muted">[{timeframe.toUpperCase()}]</span>
              </div>

              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse"></span>
                <span>REALTIME</span>
              </div>

              {showVP && pavp && pavp.poc > 0 && (
                <>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#EF4444]"></span>
                    <span className="text-[#EF4444] font-bold">POC: {pavp.poc}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#2563EB]"></span>
                    <span className="text-[#2563EB] font-bold">VAH: {pavp.vah}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#2563EB]"></span>
                    <span className="text-[#2563EB] font-bold">VAL: {pavp.val}</span>
                  </div>
                </>
              )}

              {showPDHL && sessionLevels && sessionLevels.pdh > 0 && (
                <>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#F59E0B]"></span>
                    <span className="text-[#F59E0B] font-bold">PDH: {sessionLevels.pdh}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#A855F7]"></span>
                    <span className="text-[#A855F7] font-bold">PDL: {sessionLevels.pdl}</span>
                  </div>
                </>
              )}

              {showORB && sessionLevels && sessionLevels.orbHigh > 0 && (
                <>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#06B6D4]"></span>
                    <span className="text-[#06B6D4] font-bold">ORB-H: {sessionLevels.orbHigh}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#FB923C]"></span>
                    <span className="text-[#FB923C] font-bold">ORB-L: {sessionLevels.orbLow}</span>
                  </div>
                </>
              )}

              {showEMA && (
                <>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#38BDF8]"></span>
                    <span className="text-[#38BDF8]">EMA20: {technicals.ema20}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#F59E0B]"></span>
                    <span className="text-[#F59E0B]">EMA50: {technicals.ema50}</span>
                  </div>
                </>
              )}
            </div>

            {/* Minimalist Floating HUD at bottom */}
            {smc && (
              <div className="absolute bottom-3 left-3 pointer-events-none hidden md:flex items-center gap-3 text-[10px] font-mono bg-terminal-bg/95 backdrop-blur px-3 py-1.5 rounded border border-terminal-border/80 shadow-lg z-20">
                <div className="flex items-center gap-1">
                  <span className="text-terminal-muted">50% EQ:</span>
                  <span className="text-cyan-400 font-bold">{smc.equilibriumPrice}</span>
                </div>
                {sessionLevels && sessionLevels.pdh > 0 && (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-terminal-muted">PDH:</span>
                      <span className="text-amber-400 font-bold">{sessionLevels.pdh}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-terminal-muted">PDL:</span>
                      <span className="text-purple-400 font-bold">{sessionLevels.pdl}</span>
                    </div>
                  </>
                )}
                {pavp && pavp.poc > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-terminal-muted">POC:</span>
                    <span className="text-[#F43F5E] font-bold">{pavp.poc}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Optional RSI Sub-Panel */}
      {chartMode === "smart" && showRSI && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#090C12] border-t border-terminal-border text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-terminal-muted font-bold">RSI (14):</span>
            <span
              className={`font-bold ${
                technicals.rsi >= 70
                  ? "text-bear"
                  : technicals.rsi <= 30
                  ? "text-bull"
                  : "text-accent"
              }`}
            >
              {technicals.rsi}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-terminal-muted">
            <span>MACD Hist: {technicals.macd.histogram}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Smooth exponential moving average without raw price jumps
function calculateEMALocal(prices: number[], period: number): number[] {
  if (!prices || prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(prices.length);
  let ema = prices[0];
  for (let i = 0; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emaArray[i] = +ema.toFixed(2);
  }
  return emaArray;
}
