"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  AssetSymbol,
  TimeFrame,
  Candle,
  Quote,
  OptionContract,
  OptionChainItem,
  OptionsIntelligenceData,
} from "@/lib/types";
import {
  computeTechnicals,
  calculatePivotAnchoredVolumeProfile,
  getPAVPConfigForTimeframe,
  detectPAVPSignals,
  calculateSessionLevels,
} from "@/lib/technicals";
import {
  generateOptionChain,
  calculateOptionIntelligence,
  getUpcomingOptionExpiry,
  getOptionSpec,
  calculateATMStrike,
  estimateOptionPremium,
} from "@/lib/optionsEngine";
import {
  Sparkles,
  Layers,
  Activity,
  Tv,
  Percent,
  Box,
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
  ExternalLink,
  Zap,
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
  onExecuteOptionTrade?: (contract: OptionContract, action: "BUY" | "SELL") => void;
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
  onExecuteOptionTrade,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const livePriceLineRef = useRef<any>(null);
  const lastCandleRef = useRef<Candle | null>(null);

  // Tri-Engine Mode: "tradingview" | "apex" | "nse"
  const [chartEngine, setChartEngine] = useState<"tradingview" | "apex" | "nse">("apex");

  // OptionAlgo Subtab Navigation: "chain" | "oigex" | "greeks" | "smc"
  const [activeSubtab, setActiveSubtab] = useState<"chain" | "oigex" | "greeks" | "smc">("chain");

  // OptionAlgo Strike Picker Toolbar State
  const spec = useMemo(() => getOptionSpec(activeSymbol), [activeSymbol]);
  const defaultExpiry = useMemo(() => getUpcomingOptionExpiry(activeSymbol), [activeSymbol]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>(defaultExpiry);
  const atmStrike = useMemo(() => calculateATMStrike(quote.bid, spec.strikeStep), [quote.bid, spec.strikeStep]);
  const [selectedStrike, setSelectedStrike] = useState<number>(atmStrike);
  const [selectedSide, setSelectedSide] = useState<"CE" | "PE">("CE");
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);

  // Sync selected strike & expiry when symbol changes
  useEffect(() => {
    setSelectedExpiry(getUpcomingOptionExpiry(activeSymbol));
    setSelectedStrike(calculateATMStrike(quote.bid, spec.strikeStep));
  }, [activeSymbol]);

  // Indicator & SMC Overlays - Clean professional defaults (Pure PAVP by default)
  const [showEMA, setShowEMA] = useState<boolean>(false);
  const [showSR, setShowSR] = useState<boolean>(false);
  const [showFib, setShowFib] = useState<boolean>(false);
  const [showPD, setShowPD] = useState<boolean>(false);
  const [showOB, setShowOB] = useState<boolean>(false);
  const [showFVG, setShowFVG] = useState<boolean>(false);
  const [showVP, setShowVP] = useState<boolean>(true); // Pivot-Anchored Volume Profile (POC, VAH, VAL)
  const [showVWCB, setShowVWCB] = useState<boolean>(true); // Volume Weighted Colored Bars
  const [showSignals, setShowSignals] = useState<boolean>(true); // In-chart BUY / SELL signals (strictly VP)
  const [showPDHL, setShowPDHL] = useState<boolean>(true); // Previous Day High & Low (PDH / PDL)
  const [showORB, setShowORB] = useState<boolean>(false); // Opening Range High & Low (ORB 15M/30M)
  const [showAsia, setShowAsia] = useState<boolean>(false); // Asian Session High & Low
  const [showDO, setShowDO] = useState<boolean>(false); // Daily Open (DO)
  const [showWalls, setShowWalls] = useState<boolean>(true); // Gamma Walls (Call Wall / Put Wall / Max Pain)
  const [showEMCone, setShowEMCone] = useState<boolean>(true); // Expected Move Cone
  const [overlayCoords, setOverlayCoords] = useState<PAVPOverlayCoords | null>(null);

  // SMC Level Copy Feedback
  const [copiedLevel, setCopiedLevel] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedLevel(label);
      setTimeout(() => setCopiedLevel(null), 2200);
    }
  };

  // Technical & SMC Calculations
  const technicals = useMemo(() => {
    return computeTechnicals(candles, quote.pipPrecision, timeframe);
  }, [candles, quote.pipPrecision, timeframe]);

  const smc = technicals.smc;

  // Institutional Pivot-Anchored Volume Profile (PineScript v6 dgtrd PAVP)
  const pavpConfig = useMemo(() => getPAVPConfigForTimeframe(timeframe), [timeframe]);
  const pavp = useMemo(() => {
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
  const pavpSignalResult = useMemo(() => {
    return detectPAVPSignals(candles, pavp, activeSymbol, quote.pipPrecision);
  }, [candles, pavp, activeSymbol, quote.pipPrecision]);

  const chartSignals = pavpSignalResult.markers;

  // Generate dynamic Option Chain & Option Intelligence
  const optionChain: OptionChainItem[] = useMemo(() => {
    return generateOptionChain(activeSymbol, quote.bid);
  }, [activeSymbol, quote.bid]);

  const optionIntel: OptionsIntelligenceData = useMemo(() => {
    return calculateOptionIntelligence(
      activeSymbol,
      quote.bid,
      optionChain,
      quote.high24h,
      quote.low24h,
      quote.bid
    );
  }, [activeSymbol, quote.bid, optionChain, quote.high24h, quote.low24h]);

  // Current contract under strike toolbar
  const currentContract: OptionContract = useMemo(() => {
    const est = estimateOptionPremium(quote.bid, selectedStrike, selectedSide, activeSymbol);
    return {
      symbol: activeSymbol,
      strike: selectedStrike,
      type: selectedSide,
      expiry: selectedExpiry,
      spotPrice: quote.bid,
      premiumBid: Math.max(0.5, est.premium - 0.5),
      premiumAsk: est.premium + 0.5,
      lotSize: spec.lotSize,
      delta: est.delta,
      gamma: est.gamma,
      theta: est.theta,
      vega: est.vega,
      iv: est.iv,
    };
  }, [activeSymbol, selectedStrike, selectedSide, selectedExpiry, quote.bid, spec.lotSize]);

  // Quick 1-click trade execution handler
  const handleQuickTrade = (contract: OptionContract, action: "BUY" | "SELL" = "BUY") => {
    if (onExecuteOptionTrade) {
      onExecuteOptionTrade(contract, action);
      setTradeSuccessMsg(
        `✓ Executed ${action} 1 Lot ${contract.symbol} ${contract.strike} ${contract.type} (${contract.lotSize} Qty) @ ₹${(
          contract.premiumAsk || contract.premiumBid
        ).toFixed(2)}`
      );
      setTimeout(() => setTradeSuccessMsg(null), 3500);
    }
  };

  // Real-time synchronization of the Anchored Volume Profile SVG overlay
  const updatePAVPOverlay = useCallback(() => {
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

    if (anchorX === null) anchorX = 0;
    if (latestX === null) latestX = containerWidth - 55;

    const vahY = series.priceToCoordinate(pavp.vah);
    const valY = series.priceToCoordinate(pavp.val);
    const pocY = series.priceToCoordinate(pavp.poc);
    const anchorPriceY = pavp.pivot ? series.priceToCoordinate(pavp.pivot.price) : null;

    const maxVol = Math.max(...pavp.rows.map((r) => r.volume), 1);
    const maxHistWidth = Math.min(120, Math.max(45, (latestX - anchorX) * 0.22));

    const rows = pavp.rows.map((r, i) => {
      const y = series.priceToCoordinate(r.price);
      let height = 5;
      if (i < pavp.rows.length - 1) {
        const nextY = series.priceToCoordinate(pavp.rows[i + 1].price);
        if (y !== null && nextY !== null) {
          height = Math.max(3, Math.abs(y - nextY));
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
  const sessionLevels = useMemo(() => {
    return technicals.sessionLevels || calculateSessionLevels(candles, quote.pipPrecision);
  }, [technicals.sessionLevels, candles, quote.pipPrecision]);

  const candlesSignature = useMemo(() => {
    if (!candles || candles.length === 0) return "empty";
    const first = candles[0];
    const last = candles[candles.length - 1];
    return `${candles.length}_${first.time}_${last.time}_${last.close}`;
  }, [candles]);

  // Mount TradingView Lightweight Charts if in "apex" mode
  useEffect(() => {
    if (chartEngine !== "apex" || !chartContainerRef.current) return;

    let isDisposed = false;
    let chart: any = null;
    let resizeObserver: ResizeObserver | null = null;

    import("lightweight-charts").then((lwc) => {
      if (isDisposed || !chartContainerRef.current) return;

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
        height: chartContainerRef.current.clientHeight || 480,
        layout: {
          background: { type: lwc.ColorType.Solid, color: "#06060f" },
          textColor: "#94A3B8",
          fontSize: 11,
          fontFamily: "var(--font-mono), monospace",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.025)" },
          horzLines: { color: "rgba(255, 255, 255, 0.025)" },
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
          fontSize: 36,
          horzAlign: "center",
          vertAlign: "center",
          color: "rgba(255, 255, 255, 0.03)",
          text: `${activeSymbol}  ${timeframe.toUpperCase()}`,
        },
      });

      chartInstanceRef.current = chart;

      // Institutional Candlestick Palette (Emerald Bull & Crimson Bear)
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

      // Real Exchange Volume Histogram at Bottom (18% height, matching TradingView)
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
      const volData = candles.map((c) => ({
        time: c.time as any,
        value: c.volume || 1000,
        color: c.close >= c.open ? "rgba(8, 153, 129, 0.45)" : "rgba(242, 54, 69, 0.45)",
      }));
      volumeSeries.setData(volData);

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
        candleSeries.createPriceLine({
          price: pavp.poc,
          color: "#F23645",
          lineWidth: 2,
          lineStyle: lwc.LineStyle.Solid,
          axisLabelVisible: true,
          title: `POC ${pavp.poc}`,
        });

        candleSeries.createPriceLine({
          price: pavp.vah,
          color: "#2962FF",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `VAH ${pavp.vah}`,
        });

        candleSeries.createPriceLine({
          price: pavp.val,
          color: "#2962FF",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: false,
          title: `VAL ${pavp.val}`,
        });
      }

      // Gamma Walls (Call Wall / Put Wall / Max Pain)
      if (showWalls && optionIntel) {
        if (optionIntel.callWall > 0) {
          candleSeries.createPriceLine({
            price: optionIntel.callWall,
            color: "#F59E0B",
            lineWidth: 1.5,
            lineStyle: lwc.LineStyle.Dotted,
            axisLabelVisible: true,
            title: `CALL WALL ${optionIntel.callWall}`,
          });
        }
        if (optionIntel.putWall > 0) {
          candleSeries.createPriceLine({
            price: optionIntel.putWall,
            color: "#10B981",
            lineWidth: 1.5,
            lineStyle: lwc.LineStyle.Dotted,
            axisLabelVisible: true,
            title: `PUT WALL ${optionIntel.putWall}`,
          });
        }
        if (optionIntel.maxPain > 0) {
          candleSeries.createPriceLine({
            price: optionIntel.maxPain,
            color: "#A855F7",
            lineWidth: 1.5,
            lineStyle: lwc.LineStyle.LargeDashed,
            axisLabelVisible: true,
            title: `MAX PAIN ${optionIntel.maxPain}`,
          });
        }
      }

      // Expected Move Cone Lines
      if (showEMCone && optionIntel && optionIntel.expectedMoveUpper > 0) {
        candleSeries.createPriceLine({
          price: optionIntel.expectedMoveUpper,
          color: "rgba(255, 255, 255, 0.5)",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `EM UPPER (+${optionIntel.expectedMove})`,
        });
        candleSeries.createPriceLine({
          price: optionIntel.expectedMoveLower,
          color: "rgba(255, 255, 255, 0.5)",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: false,
          title: `EM LOWER (-${optionIntel.expectedMove})`,
        });
      }

      // Smooth EMAs
      if (showEMA) {
        const closes = candles.map((c) => c.close);
        const ema20Series = chart.addLineSeries({
          color: "#38BDF8",
          lineWidth: 1.5,
          title: "EMA 20",
          priceLineVisible: false,
        });
        const ema20Values = calculateEMALocal(closes, 20);
        ema20Series.setData(candles.map((c, i) => ({ time: c.time as any, value: ema20Values[i] })));

        const ema50Series = chart.addLineSeries({
          color: "#F59E0B",
          lineWidth: 1.5,
          title: "EMA 50",
          priceLineVisible: false,
        });
        const ema50Values = calculateEMALocal(closes, 50);
        ema50Series.setData(candles.map((c, i) => ({ time: c.time as any, value: ema50Values[i] })));
      }

      // Previous Day High & Low
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

      // Opening Range Breakout (ORB)
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
      }

      try {
        chart.timeScale().fitContent();
      } catch (e) {
        console.debug("fitContent error:", e);
      }

      const onRangeChange = () => {
        updatePAVPOverlay();
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

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
    chartEngine,
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
    showWalls,
    showEMCone,
    pavp.poc,
    pavp.vah,
    pavp.val,
    optionIntel.callWall,
    optionIntel.putWall,
    optionIntel.maxPain,
    optionIntel.expectedMoveUpper,
    optionIntel.expectedMoveLower,
  ]);

  // Re-synchronize PAVP overlay whenever candles or levels change
  useEffect(() => {
    if (chartEngine !== "apex") return;
    const timer = setTimeout(() => {
      updatePAVPOverlay();
    }, 60);
    return () => clearTimeout(timer);
  }, [candlesSignature, pavp, showVP, updatePAVPOverlay, chartEngine]);

  // Real-time ticking engine for apex mode
  useEffect(() => {
    if (chartEngine !== "apex") return;

    let tfSec = 300;
    if (timeframe === "1m") tfSec = 60;
    else if (timeframe === "5m") tfSec = 300;
    else if (timeframe === "15m") tfSec = 900;
    else if (timeframe === "1h") tfSec = 3600;
    else if (timeframe === "4h") tfSec = 14400;
    else if (timeframe === "1d") tfSec = 86400;

    const updateLiveTick = (liveBid: number) => {
      if (
        !chartInstanceRef.current ||
        !candleSeriesRef.current ||
        !lastCandleRef.current ||
        !liveBid ||
        isNaN(liveBid)
      )
        return;

      const last = lastCandleRef.current;
      const nowSec = Math.floor(Date.now() / 1000);
      const currentBucketTime = Math.floor(nowSec / tfSec) * tfSec;

      const currentClose = last.close;
      const maxDelta = quote.pipPrecision === 2 ? 2.5 : 0.0025;
      let safeBid = liveBid;
      if (Math.abs(liveBid - currentClose) > maxDelta * 2) {
        safeBid = +(currentClose + Math.sign(liveBid - currentClose) * maxDelta).toFixed(quote.pipPrecision);
      }

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
        } catch {}
        return;
      }

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
      } catch {}
    };

    updateLiveTick(quote.bid);

    const tickInterval = setInterval(() => {
      if (!quote.bid) return;
      const pipDelta = quote.pipPrecision === 2 ? 0.04 : 0.00004;
      const randomShift = (Math.random() - 0.49) * pipDelta * 2.0;
      const microBid = +(quote.bid + randomShift).toFixed(quote.pipPrecision);
      updateLiveTick(microBid);
    }, 1200);

    return () => clearInterval(tickInterval);
  }, [quote.bid, quote.pipPrecision, chartEngine, timeframe]);

  const resetOverlays = () => {
    setShowEMA(false);
    setShowSR(false);
    setShowPD(false);
    setShowVP(true);
    setShowSignals(true);
    setShowPDHL(true);
    setShowORB(false);
    setShowWalls(true);
    setShowEMCone(true);
    setShowFib(false);
    setShowOB(false);
    setShowFVG(false);
  };

  const timeframes: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

  const indianAssets: { sym: AssetSymbol; label: string; badge: string }[] = [
    { sym: "NIFTY", label: "NIFTY 50", badge: "F&O" },
    { sym: "BANKNIFTY", label: "BANK NIFTY", badge: "F&O" },
    { sym: "FINNIFTY", label: "FIN NIFTY", badge: "F&O" },
    { sym: "SENSEX", label: "SENSEX", badge: "BSE" },
    { sym: "CRUDEOIL", label: "CRUDE OIL", badge: "MCX" },
    { sym: "NATURALGAS", label: "NATURAL GAS", badge: "MCX" },
  ];

  // TradingView Symbol Mapping
  const getTradingViewSymbol = (sym: AssetSymbol): string => {
    switch (sym) {
      case "NIFTY":
        return "NSE:NIFTY";
      case "BANKNIFTY":
        return "NSE:BANKNIFTY";
      case "FINNIFTY":
        return "NSE:FINNIFTY";
      case "SENSEX":
        return "BSE:SENSEX";
      case "CRUDEOIL":
        return "MCX:CRUDEOIL1!";
      case "NATURALGAS":
        return "MCX:NATURALGAS1!";
      default:
        return "NSE:NIFTY";
    }
  };

  const getTradingViewInterval = (tf: TimeFrame): string => {
    switch (tf) {
      case "1m":
        return "1";
      case "5m":
        return "5";
      case "15m":
        return "15";
      case "1h":
        return "60";
      case "4h":
        return "240";
      case "1d":
        return "D";
      default:
        return "15";
    }
  };

  const tvSymbol = getTradingViewSymbol(activeSymbol);
  const tvInterval = getTradingViewInterval(timeframe);
  const tvEmbedUrl = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${tvInterval}&theme=dark&style=1&timezone=Asia%2FKolkata&hide_side_toolbar=0&allow_symbol_change=1&save_image=1&locale=en`;

  return (
    <div className="flex flex-col h-full bg-[#06060f] border border-[#1b1c2e] rounded-xl overflow-hidden shadow-2xl text-slate-200">
      {/* 1. OPTIONALGO HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#090814] border-b border-[#1b1c2e] gap-2.5">
        {/* Left: Active Asset Selector & Live Spot */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>INDIA DERIVATIVES</span>
          </div>

          <div className="flex items-center bg-[#0d0c1d] rounded-lg p-0.5 border border-[#202138] overflow-x-auto">
            {indianAssets.map((item) => (
              <button
                key={item.sym}
                onClick={() => onSelectSymbol(item.sym)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  activeSymbol === item.sym
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/50 text-slate-400 border border-white/5 font-mono">
                  {item.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px]">SPOT: </span>
              <span className="font-bold text-emerald-400">₹{quote.bid}</span>
            </div>
            <div className="px-1.5 py-0.5 text-[10px] rounded bg-[#131326] text-slate-400 border border-[#202138]">
              Spread: {quote.spread}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-1 border-l border-[#202138]">
              <span>24H:</span>
              <span className="text-slate-200 font-bold">{quote.low24h}</span>
              <span>-</span>
              <span className="text-slate-200 font-bold">{quote.high24h}</span>
            </div>
          </div>
        </div>

        {/* Center: Timeframe Pills */}
        <div className="flex items-center bg-[#0d0c1d] rounded-lg p-0.5 border border-[#202138]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onChangeTimeframe(tf)}
              className={`px-2.5 py-0.5 text-xs font-mono font-medium rounded-md transition-all ${
                timeframe === tf
                  ? "bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Right: Tri-Engine Toggle & AI Scan */}
        <div className="flex items-center gap-2">
          {/* Tri-Engine Switcher */}
          <div className="flex items-center bg-[#0d0c1d] rounded-lg p-0.5 border border-[#202138] text-xs">
            <button
              onClick={() => setChartEngine("tradingview")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                chartEngine === "tradingview"
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Official TradingView Advanced Charting with Full Toolbars"
            >
              <Tv className="w-3.5 h-3.5 text-blue-400" />
              <span>TradingView Pro</span>
            </button>

            <button
              onClick={() => setChartEngine("apex")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                chartEngine === "apex"
                  ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Apex Smart PAVP Canvas (Real Exchange Candles, Volume Profile & Auto-Signals)"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apex PAVP</span>
            </button>

            <button
              onClick={() => setChartEngine("nse")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold transition-all ${
                chartEngine === "nse"
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Official National Stock Exchange of India Technical Charting"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>NSE Live</span>
            </button>
          </div>

          <button
            onClick={onAnalyzeLiveChart}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 transition-all border border-cyan-400/40 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Scanning..." : "AI Live Scan"}</span>
          </button>
        </div>
      </div>

      {/* 2. OPTIONALGO OPTION STRIKE PICKER TOOLBAR (#oa-adv-toolbar) */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#080714] border-b border-[#1b1c2e] text-xs font-mono gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Underlying & Expiry */}
          <div className="flex items-center gap-1.5 bg-[#121124] px-2 py-1 rounded-md border border-[#23233d]">
            <span className="text-slate-400 text-[10px] font-bold">UNDERLYING:</span>
            <span className="font-bold text-cyan-400">{activeSymbol}</span>
            <span className="text-slate-300 font-bold">₹{quote.bid}</span>
          </div>

          {/* Expiry Selector */}
          <div className="flex items-center gap-1 bg-[#121124] px-2 py-1 rounded-md border border-[#23233d]">
            <span className="text-slate-400 text-[10px] font-bold">EXPIRY:</span>
            <span className="font-bold text-amber-300">{selectedExpiry}</span>
          </div>

          {/* Strike Selector */}
          <div className="flex items-center gap-1 bg-[#121124] px-2 py-1 rounded-md border border-[#23233d]">
            <span className="text-slate-400 text-[10px] font-bold">STRIKE:</span>
            <select
              value={selectedStrike}
              onChange={(e) => setSelectedStrike(Number(e.target.value))}
              className="bg-transparent font-bold text-white text-xs outline-none cursor-pointer"
            >
              {optionChain.map((item) => (
                <option key={item.strike} value={item.strike} className="bg-[#0b0b18] text-white">
                  {item.strike} {item.isATM ? "(ATM)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Call / Put Toggle */}
          <div className="flex items-center bg-[#121124] rounded-md p-0.5 border border-[#23233d]">
            <button
              onClick={() => setSelectedSide("CE")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                selectedSide === "CE"
                  ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CALL (CE)
            </button>
            <button
              onClick={() => setSelectedSide("PE")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                selectedSide === "PE"
                  ? "bg-rose-500/25 text-rose-400 border border-rose-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              PUT (PE)
            </button>
          </div>

          {/* Estimated Premium & Greeks */}
          <div className="hidden sm:flex items-center gap-2 bg-[#121124] px-2.5 py-1 rounded-md border border-[#23233d]">
            <div>
              <span className="text-slate-400 text-[10px]">PREMIUM: </span>
              <span className="font-bold text-white">₹{currentContract.premiumAsk.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-400 pl-1 border-l border-[#2b2b48]">
              <span>Δ {currentContract.delta}</span>
              <span className="mx-1 text-slate-600">•</span>
              <span>θ {currentContract.theta}</span>
              <span className="mx-1 text-slate-600">•</span>
              <span>IV {currentContract.iv}%</span>
            </div>
          </div>
        </div>

        {/* 1-Click Buy 1 Lot Button */}
        <div className="flex items-center gap-2">
          {tradeSuccessMsg && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
              {tradeSuccessMsg}
            </span>
          )}

          <button
            onClick={() => handleQuickTrade(currentContract, "BUY")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 border border-emerald-400/40 transition-all cursor-pointer"
            title={`Instantly execute 1 Lot (${currentContract.lotSize} Qty) in Demo Account with live Telegram alert`}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span>
              Buy 1 Lot ({spec.lotSize} Qty) @ ₹{currentContract.premiumAsk.toFixed(2)}
            </span>
          </button>
        </div>
      </div>

      {/* 3. OPTIONALGO INSTITUTIONAL OVERLAYS STRIP */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1 bg-[#090814] border-b border-[#1b1c2e] text-[11px] font-mono gap-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 py-0.5">
          <span className="text-slate-500 text-[10px] mr-1 font-bold">OVERLAYS:</span>

          {/* Gamma Walls Toggle */}
          <button
            onClick={() => setShowWalls(!showWalls)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showWalls
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle Gamma Walls (Call Wall, Put Wall, Max Pain Strike)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Walls / Pain</span>
          </button>

          {/* CPR (Central Pivot Range) */}
          <button
            onClick={() => setShowSR(!showSR)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showSR
                ? "bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle Central Pivot Range (TC, Pivot, BC)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>CPR & Pivots</span>
          </button>

          {/* Previous Day High & Low */}
          <button
            onClick={() => setShowPDHL(!showPDHL)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showPDHL
                ? "bg-orange-500/15 text-orange-300 border-orange-500/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle Previous Day High (PDH) & Low (PDL)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span>Prev Day</span>
          </button>

          {/* OBR (Opening Bar Range) */}
          <button
            onClick={() => setShowORB(!showORB)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showORB
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle Opening Bar Range (ORB 15M High & Low)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>OBR (15m)</span>
          </button>

          {/* Pivot-Anchored Volume Profile */}
          <button
            onClick={() => setShowVP(!showVP)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showVP
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle Pivot-Anchored Volume Profile (POC Red, VAH Blue, VAL Blue)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>PAVP (POC/VAH/VAL)</span>
          </button>

          {/* VWAP & EMAs */}
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showEMA
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle Exponential Moving Averages (EMA 20 & 50)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>EMAs</span>
          </button>

          {/* Expected Move Cone */}
          <button
            onClick={() => setShowEMCone(!showEMCone)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              showEMCone
                ? "bg-slate-300/15 text-slate-200 border-slate-400/40 shadow-sm"
                : "bg-[#111022] text-slate-400 border-[#202138]"
            }`}
            title="Toggle IV-Derived Expected Move Range Cone"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span>EM Cone (±{optionIntel.expectedMove})</span>
          </button>

          {/* Reset View */}
          <button
            onClick={resetOverlays}
            className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white bg-[#111022] hover:bg-[#1a1930] border border-[#202138] flex items-center gap-1"
            title="Reset to clean OptionAlgo view"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Right Info: Max Pain & PCR */}
        <div className="flex items-center gap-3 text-[10px] shrink-0 text-slate-400">
          <div>
            <span>MAX PAIN: </span>
            <span className="font-bold text-purple-300">{optionIntel.maxPain}</span>
          </div>
          <div>
            <span>PCR: </span>
            <span
              className={`font-bold ${
                optionIntel.pcr >= 1.0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {optionIntel.pcr} ({optionIntel.pcr >= 1.0 ? "Bullish" : "Bearish"})
            </span>
          </div>
        </div>
      </div>

      {/* 4. MAIN CHART CANVAS CONTAINER */}
      <div className="relative flex-1 min-h-[480px] w-full bg-[#06060f]">
        {chartEngine === "tradingview" ? (
          <div className="relative w-full h-full min-h-[480px] bg-[#06060f]">
            <iframe
              src={tvEmbedUrl}
              title={`TradingView Advanced Chart - ${activeSymbol}`}
              className="w-full h-full min-h-[480px] border-0 bg-[#06060f]"
              allow="fullscreen"
            />
          </div>
        ) : chartEngine === "nse" ? (
          <div className="relative w-full h-full min-h-[480px] flex flex-col bg-[#0A0E17]">
            {/* Top NSE Gateway Header */}
            <div className="flex flex-wrap items-center justify-between p-2.5 bg-[#0F1420] border-b border-[#202138] gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">
                  National Stock Exchange of India (NSE) — Official Technical Charting
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  charting.nseindia.com
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChartEngine("apex")}
                  className="px-3 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-all flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Switch to Apex PAVP</span>
                </button>

                <button
                  onClick={() => window.open("https://charting.nseindia.com/", "_blank", "noopener,noreferrer")}
                  className="px-3 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-400/40"
                  title="Open charting.nse.com in external tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pop Out Window</span>
                </button>
              </div>
            </div>

            {/* Direct Embedded NSE Live Chart */}
            <div className="relative flex-1 w-full min-h-[480px] bg-[#0A0E17]">
              <iframe
                src="/api/nse-chart"
                className="w-full h-full min-h-[480px] border-none bg-[#0A0E17]"
                title="NSE Official Technical Charting"
                allow="fullscreen"
              />
            </div>
          </div>
        ) : (
          /* Apex Smart PAVP Canvas */
          <>
            <div ref={chartContainerRef} className="w-full h-full min-h-[480px]" />

            {/* TradingView dgtrd Pivot-Anchored Volume Profile & Value Area SVG Overlay */}
            {showVP && overlayCoords && overlayCoords.anchorX !== null && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
                style={{ width: "100%", height: "100%" }}
              >
                {/* 1. Value Area Shaded Zone (Translucent Blue fill between VAH and VAL) & Key Level Rays */}
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
                      />
                      <line
                        x1={Math.max(0, overlayCoords.anchorX)}
                        y1={overlayCoords.vahY}
                        x2={overlayCoords.latestX || 500}
                        y2={overlayCoords.vahY}
                        stroke="#2962FF"
                        strokeWidth={2}
                      />
                      <line
                        x1={Math.max(0, overlayCoords.anchorX)}
                        y1={overlayCoords.valY}
                        x2={overlayCoords.latestX || 500}
                        y2={overlayCoords.valY}
                        stroke="#2962FF"
                        strokeWidth={2}
                      />
                    </g>
                  )}

                {/* POC Solid Red Line (Highest Traded Node Ray) */}
                {overlayCoords.pocY !== null &&
                  overlayCoords.anchorX !== null &&
                  overlayCoords.latestX !== null && (
                    <line
                      x1={Math.max(0, overlayCoords.anchorX)}
                      y1={overlayCoords.pocY}
                      x2={overlayCoords.latestX || 500}
                      y2={overlayCoords.pocY}
                      stroke="#F23645"
                      strokeWidth={2.5}
                    />
                  )}

                {/* 2. Anchored Horizontal Volume Profile Bars */}
                {overlayCoords.rows.map((row, idx) => {
                  if (row.y < -50 || row.y > 2000) return null;
                  const startX = Math.max(0, overlayCoords.anchorX || 0);
                  const barY = row.y - row.height / 2;
                  const barFill = row.isPOC ? "#F23645" : row.isValueArea ? "#F59E0B" : "#64748B";
                  const barOpacity = row.isPOC ? 0.95 : row.isValueArea ? 0.85 : 0.40;

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

                    </g>
                  );
                })}

                {/* 3. Authentic TradingView Anchor Pivot Tag (dgtrd PAVP Style) */}
                {overlayCoords.pivot &&
                  overlayCoords.anchorX !== null &&
                  overlayCoords.anchorPriceY !== null &&
                  overlayCoords.anchorPriceY > 0 && (
                    <g
                      transform={`translate(${overlayCoords.anchorX}, ${
                        overlayCoords.pivot.type === "low"
                          ? Math.min(
                              (chartContainerRef.current?.clientHeight || 450) - 38,
                              overlayCoords.anchorPriceY + 12
                            )
                          : Math.max(12, overlayCoords.anchorPriceY - 38)
                      })`}
                    >
                      {/* Anchor Triangle Pointer connecting to candle wick */}
                      {overlayCoords.pivot.type === "low" ? (
                        <polygon points="-4,0 4,0 0,-6" fill="#2962FF" />
                      ) : (
                        <polygon points="-4,27 4,27 0,33" fill="#2962FF" />
                      )}
                      <rect
                        x={-50}
                        y={0}
                        width={100}
                        height={27}
                        rx={5}
                        fill="#0F172A"
                        stroke="#2962FF"
                        strokeWidth={1.5}
                        opacity={0.96}
                      />
                      <text
                        x={0}
                        y={11.5}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize={9.5}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {overlayCoords.pivot.price} {overlayCoords.pivot.type === "low" ? "↓" : "↑"}
                        {overlayCoords.pivot.changePercent != null
                          ? ` %${Math.abs(overlayCoords.pivot.changePercent).toFixed(1)}`
                          : ""}
                      </text>
                      <text
                        x={0}
                        y={22}
                        textAnchor="middle"
                        fill="#93C5FD"
                        fontSize={8}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {overlayCoords.pivot.volume
                          ? `${
                              overlayCoords.pivot.volume > 1000
                                ? (overlayCoords.pivot.volume / 1000).toFixed(2) + "K"
                                : overlayCoords.pivot.volume
                            } Vol`
                          : "PIVOT"}
                      </text>
                    </g>
                  )}
              </svg>
            )}

            {/* Clean Top Legend Overlay */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none flex flex-wrap items-center gap-2 text-[10px] font-mono bg-[#0b0a1a]/85 backdrop-blur px-2.5 py-1.5 rounded-md border border-[#202138] z-20 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white">{activeSymbol}</span>
                <span className="text-slate-400">[{timeframe.toUpperCase()}]</span>
              </div>

              {showVP && pavp && pavp.poc > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#EF4444]"></span>
                    <span className="text-[#EF4444] font-bold">POC: {pavp.poc}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#2563EB]"></span>
                    <span className="text-[#2563EB] font-bold">VAH: {pavp.vah}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-[#2563EB]"></span>
                    <span className="text-[#2563EB] font-bold">VAL: {pavp.val}</span>
                  </div>
                </>
              )}

              {showWalls && optionIntel && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-amber-400"></span>
                  <span className="text-amber-300 font-bold">Wall: {optionIntel.callWall}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 5. OPTIONALGO DATA INTELLIGENCE SUBTABS SECTION */}
      <div className="bg-[#080714] border-t border-[#1b1c2e] flex flex-col">
        {/* Subtabs Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0918] border-b border-[#1b1c2e] overflow-x-auto text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSubtab("chain")}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeSubtab === "chain"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Option Chain</span>
            </button>

            <button
              onClick={() => setActiveSubtab("oigex")}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeSubtab === "oigex"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>OI & GEX Profile</span>
            </button>

            <button
              onClick={() => setActiveSubtab("greeks")}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeSubtab === "greeks"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              <span>Greeks Lab</span>
            </button>

            <button
              onClick={() => setActiveSubtab("smc")}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeSubtab === "smc"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SMC Order Flow</span>
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-500 hidden md:block">
            <span>Lot Size: {spec.lotSize} Qty</span>
            <span className="mx-2">•</span>
            <span>Strike Step: {spec.strikeStep}</span>
          </div>
        </div>

        {/* Subtab Contents */}
        <div className="p-3 max-h-[320px] overflow-y-auto">
          {/* TAB 1: OPTION CHAIN */}
          {activeSubtab === "chain" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#100f24] text-[10px] text-slate-400 border-b border-[#202138]">
                    <th className="py-1 px-2 text-left text-emerald-400">CALL OI</th>
                    <th className="py-1 px-2 text-right">VOL</th>
                    <th className="py-1 px-2 text-right">IV</th>
                    <th className="py-1 px-2 text-right">DELTA</th>
                    <th className="py-1 px-2 text-right font-bold text-white">CALL LTP</th>
                    <th className="py-1 px-2 text-center text-cyan-300 font-bold bg-[#14132e] border-x border-[#252545]">
                      STRIKE
                    </th>
                    <th className="py-1 px-2 text-left font-bold text-white">PUT LTP</th>
                    <th className="py-1 px-2 text-left">DELTA</th>
                    <th className="py-1 px-2 text-left">IV</th>
                    <th className="py-1 px-2 text-left">VOL</th>
                    <th className="py-1 px-2 text-right text-rose-400">PUT OI</th>
                    <th className="py-1 px-2 text-center">TRADE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1c2e]">
                  {optionChain.map((row) => (
                    <tr
                      key={row.strike}
                      className={`hover:bg-[#121128] transition-colors ${
                        row.isATM ? "bg-[#181735]/60 font-bold text-yellow-300" : ""
                      }`}
                    >
                      {/* Call Side */}
                      <td className="py-1.5 px-2 text-left text-emerald-400 font-bold">
                        {row.call.oi?.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-400">
                        {row.call.volume ? Math.round(row.call.volume / 1000) + "k" : "-"}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-400">{row.call.iv}%</td>
                      <td className="py-1.5 px-2 text-right text-cyan-300">{row.call.delta}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-white">
                        ₹{row.call.premiumAsk.toFixed(2)}
                      </td>

                      {/* Strike */}
                      <td
                        className={`py-1.5 px-3 text-center font-bold bg-[#14132e] border-x border-[#252545] ${
                          row.isATM ? "text-yellow-300 bg-yellow-500/10" : "text-white"
                        }`}
                      >
                        {row.strike} {row.isATM && <span className="text-[9px] text-yellow-400 font-normal">ATM</span>}
                      </td>

                      {/* Put Side */}
                      <td className="py-1.5 px-2 text-left font-bold text-white">
                        ₹{row.put.premiumAsk.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2 text-left text-rose-300">{row.put.delta}</td>
                      <td className="py-1.5 px-2 text-left text-slate-400">{row.put.iv}%</td>
                      <td className="py-1.5 px-2 text-left text-slate-400">
                        {row.put.volume ? Math.round(row.put.volume / 1000) + "k" : "-"}
                      </td>
                      <td className="py-1.5 px-2 text-right text-rose-400 font-bold">
                        {row.put.oi?.toLocaleString()}
                      </td>

                      {/* Trade Buttons */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleQuickTrade(row.call, "BUY")}
                            className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold border border-emerald-500/40 transition-all"
                            title={`Buy 1 Lot Call ${row.strike}`}
                          >
                            CE
                          </button>
                          <button
                            onClick={() => handleQuickTrade(row.put, "BUY")}
                            className="px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-bold border border-rose-500/40 transition-all"
                            title={`Buy 1 Lot Put ${row.strike}`}
                          >
                            PE
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: OI & GEX PROFILE */}
          {activeSubtab === "oigex" && (
            <div className="space-y-3 font-mono">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">CALL RESISTANCE WALL</span>
                  <span className="text-base font-bold text-amber-400">{optionIntel.callWall}</span>
                  <span className="text-[10px] text-slate-500 block">Highest Call Open Interest</span>
                </div>
                <div className="p-2 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">PUT SUPPORT WALL</span>
                  <span className="text-base font-bold text-emerald-400">{optionIntel.putWall}</span>
                  <span className="text-[10px] text-slate-500 block">Highest Put Open Interest</span>
                </div>
                <div className="p-2 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">MAX PAIN STRIKE</span>
                  <span className="text-base font-bold text-purple-300">{optionIntel.maxPain}</span>
                  <span className="text-[10px] text-slate-500 block">Lowest Option Payout Point</span>
                </div>
                <div className="p-2 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">PUT-CALL RATIO (PCR)</span>
                  <span
                    className={`text-base font-bold ${
                      optionIntel.pcr >= 1.0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {optionIntel.pcr}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {optionIntel.pcr >= 1.0 ? "Bullish Accumulation" : "Bearish Underwriting"}
                  </span>
                </div>
              </div>

              {/* Horizontal OI Distribution Bars */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-bold">
                  <span>← CALL OI (Resistance)</span>
                  <span>STRIKE</span>
                  <span>PUT OI (Support) →</span>
                </div>
                {optionChain.map((row) => {
                  const maxOI = Math.max(
                    ...optionChain.map((r) => Math.max(r.call.oi || 0, r.put.oi || 0)),
                    1
                  );
                  const callPct = Math.round(((row.call.oi || 0) / maxOI) * 100);
                  const putPct = Math.round(((row.put.oi || 0) / maxOI) * 100);

                  return (
                    <div
                      key={row.strike}
                      className={`flex items-center gap-2 text-xs py-0.5 px-2 rounded ${
                        row.isATM ? "bg-[#181735] border border-yellow-500/30 font-bold" : ""
                      }`}
                    >
                      {/* Call Bar (Right to Left) */}
                      <div className="flex-1 flex justify-end items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">
                          {row.call.oi ? (row.call.oi / 1000).toFixed(0) + "k" : "0"}
                        </span>
                        <div className="w-32 bg-[#121124] rounded-full h-2 overflow-hidden flex justify-end">
                          <div
                            className={`h-full rounded-full ${
                              row.strike === optionIntel.callWall ? "bg-amber-400" : "bg-rose-500/80"
                            }`}
                            style={{ width: `${callPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Strike */}
                      <div className="w-16 text-center font-bold text-white text-xs">
                        {row.strike}
                      </div>

                      {/* Put Bar (Left to Right) */}
                      <div className="flex-1 flex items-center gap-1.5">
                        <div className="w-32 bg-[#121124] rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.strike === optionIntel.putWall ? "bg-emerald-400" : "bg-cyan-500/80"
                            }`}
                            style={{ width: `${putPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {row.put.oi ? (row.put.oi / 1000).toFixed(0) + "k" : "0"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: GREEKS LAB */}
          {activeSubtab === "greeks" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#111024] border border-[#202138] space-y-1">
                <span className="text-cyan-400 font-bold block text-sm">DELTA (Δ)</span>
                <div className="text-white text-base font-bold">
                  Call: +{currentContract.delta} | Put: -{(1 - currentContract.delta).toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Measures the rate of change of option price per ₹1 move in spot price.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#111024] border border-[#202138] space-y-1">
                <span className="text-purple-400 font-bold block text-sm">GAMMA (Γ)</span>
                <div className="text-white text-base font-bold">+{currentContract.gamma || 0.0018}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Rate of change in Delta per ₹1 move. Highest at ATM strikes near expiry.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#111024] border border-[#202138] space-y-1">
                <span className="text-rose-400 font-bold block text-sm">THETA (θ)</span>
                <div className="text-rose-400 text-base font-bold">{currentContract.theta} / day</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Time decay loss per calendar day for buyers. Accelerates closer to expiry.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#111024] border border-[#202138] space-y-1">
                <span className="text-amber-400 font-bold block text-sm">EXPECTED MOVE CONE</span>
                <div className="text-white text-base font-bold">
                  ±{optionIntel.expectedMove} pts ({optionIntel.expectedMoveLower} ~ {optionIntel.expectedMoveUpper})
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  IV-implied 1 standard deviation (68% confidence) price band for current expiry.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SMC ORDER FLOW */}
          {activeSubtab === "smc" && (
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">PAVP POC MAGNET</span>
                  <span className="text-base font-bold text-rose-400">₹{pavp.poc}</span>
                  <span className="text-[10px] text-slate-500 block">Highest volume node</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">VALUE AREA BOUNDARIES</span>
                  <span className="text-base font-bold text-blue-400">
                    {pavp.val} ~ {pavp.vah}
                  </span>
                  <span className="text-[10px] text-slate-500 block">68% Institutional volume</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">50% EQUILIBRIUM</span>
                  <span className="text-base font-bold text-cyan-300">
                    ₹{smc?.equilibriumPrice || quote.bid}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Premium / Discount mid</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111024] border border-[#202138]">
                  <span className="text-slate-400 text-[10px] block">15M AUTO STRATEGY</span>
                  <span className="text-base font-bold text-emerald-400">ACTIVE (1 LOT)</span>
                  <span className="text-[10px] text-slate-500 block">Auto Telegram broadcast</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#111024] border border-[#202138]">
                <span className="text-slate-400 text-xs">
                  Copy institutional coordinates for your pending orders:
                </span>
                <button
                  onClick={() => {
                    const text = `ApexFX ${activeSymbol} Coordinates:\n- Spot: ₹${quote.bid}\n- POC: ₹${pavp.poc}\n- VAH: ₹${pavp.vah}\n- VAL: ₹${pavp.val}\n- Call Wall: ₹${optionIntel.callWall}\n- Put Wall: ₹${optionIntel.putWall}\n- Max Pain: ₹${optionIntel.maxPain}`;
                    copyToClipboard(text, "SMC");
                  }}
                  className="px-3 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedLevel === "SMC" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy Coordinates</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
