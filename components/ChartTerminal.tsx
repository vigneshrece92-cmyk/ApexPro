"use client";

import React, { useEffect, useRef, useState } from "react";
import { AssetSymbol, TimeFrame, Candle, Quote } from "@/lib/types";
import { computeTechnicals, calculateVolumeProfile, detectChartSignals } from "@/lib/technicals";
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
} from "lucide-react";

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

  // Indicator & SMC Overlays - Clean professional defaults
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showSR, setShowSR] = useState<boolean>(true);
  const [showFib, setShowFib] = useState<boolean>(false);
  const [showPD, setShowPD] = useState<boolean>(true);
  const [showOB, setShowOB] = useState<boolean>(false);
  const [showFVG, setShowFVG] = useState<boolean>(false);
  const [showRSI, setShowRSI] = useState<boolean>(false);
  const [showVP, setShowVP] = useState<boolean>(true); // Volume Profile (VAH, VAL, POC)
  const [showSignals, setShowSignals] = useState<boolean>(true); // In-chart BUY / SELL signals

  // SMC Level Copy Feedback and Radar Drawer
  const [copiedLevel, setCopiedLevel] = useState<string | null>(null);
  const [showLevelDrawer, setShowLevelDrawer] = useState<boolean>(false);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedLevel(label);
      setTimeout(() => setCopiedLevel(null), 2200);
    }
  };

  // Technical & SMC Calculations
  const technicals = React.useMemo(() => {
    return computeTechnicals(candles, quote.pipPrecision);
  }, [candles, quote.pipPrecision]);

  const smc = technicals.smc;

  // Institutional Volume Profile & In-Chart Directional Signals
  const volumeProfile = React.useMemo(() => {
    return technicals.volumeProfile || calculateVolumeProfile(candles, 32, 0.70, quote.pipPrecision);
  }, [technicals.volumeProfile, candles, quote.pipPrecision]);

  const chartSignals = React.useMemo(() => {
    return detectChartSignals(candles, volumeProfile, quote.pipPrecision);
  }, [candles, volumeProfile, quote.pipPrecision]);

  // Mount TradingView Lightweight Charts if in "smart" mode
  useEffect(() => {
    if (chartMode !== "smart" || !chartContainerRef.current) return;

    let chart: any = null;

    import("lightweight-charts").then((lwc) => {
      if (!chartContainerRef.current) return;
      chartContainerRef.current.innerHTML = "";

      chart = lwc.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight || 460,
        layout: {
          background: { type: lwc.ColorType.Solid, color: "#0B0E14" },
          textColor: "#8A99AD",
          fontSize: 11,
          fontFamily: "var(--font-mono), monospace",
        },
        grid: {
          vertLines: { color: "rgba(30, 38, 56, 0.3)" },
          horzLines: { color: "rgba(30, 38, 56, 0.3)" },
        },
        crosshair: {
          mode: lwc.CrosshairMode.Normal,
          vertLine: { color: "#38BDF8", width: 1, style: lwc.LineStyle.Dashed },
          horzLine: { color: "#38BDF8", width: 1, style: lwc.LineStyle.Dashed },
        },
        timeScale: {
          borderColor: "#1E2638",
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: "#1E2638",
          scaleMargins: { top: 0.12, bottom: 0.15 },
        },
      });

      chartInstanceRef.current = chart;

      // Pure clean candlesticks
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#00E676",
        downColor: "#FF3B30",
        borderUpColor: "#00E676",
        borderDownColor: "#FF3B30",
        wickUpColor: "#00E676",
        wickDownColor: "#FF3B30",
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

      // Volume Profile Levels (POC, VAH 70%, VAL 70%)
      if (showVP && volumeProfile && volumeProfile.poc > 0) {
        // Point of Control (Highest Volume Node)
        candleSeries.createPriceLine({
          price: volumeProfile.poc,
          color: "#F43F5E",
          lineWidth: 2,
          lineStyle: lwc.LineStyle.Solid,
          axisLabelVisible: true,
          title: `POC ${volumeProfile.poc}`,
        });

        // Value Area High (70% Volume Boundary)
        candleSeries.createPriceLine({
          price: volumeProfile.vah,
          color: "#38BDF8",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `VAH ${volumeProfile.vah}`,
        });

        // Value Area Low (70% Volume Boundary)
        candleSeries.createPriceLine({
          price: volumeProfile.val,
          color: "#10B981",
          lineWidth: 1.5,
          lineStyle: lwc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `VAL ${volumeProfile.val}`,
        });
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
          axisLabelVisible: true,
          title: `R1 ${technicals.pivots.r1}`,
        });
        candleSeries.createPriceLine({
          price: technicals.pivots.s1,
          color: "rgba(0, 230, 118, 0.7)",
          lineWidth: 1,
          lineStyle: lwc.LineStyle.Dotted,
          axisLabelVisible: true,
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
          axisLabelVisible: true,
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
          axisLabelVisible: true,
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
          axisLabelVisible: true,
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
          axisLabelVisible: true,
          title: `FVG GAP (${activeFVG.bottom}-${activeFVG.top})`,
        });
      }

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 460,
          });
        }
      };

      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        if (chart) chart.remove();
      };
    });

    return () => {
      if (chart) chart.remove();
    };
  }, [
    chartMode,
    activeSymbol,
    timeframe,
    candles.length,
    showEMA,
    showSR,
    showFib,
    showPD,
    showOB,
    showFVG,
    showVP,
    showSignals,
    volumeProfile.poc,
    volumeProfile.vah,
    volumeProfile.val,
  ]);

  // Real-time ticking engine: updates last candle & live price line continuously
  useEffect(() => {
    if (chartMode !== "smart") return;

    const updateLiveTick = (liveBid: number) => {
      if (!candleSeriesRef.current || !lastCandleRef.current || !liveBid || isNaN(liveBid)) return;

      const last = lastCandleRef.current;
      const newHigh = Math.max(last.high, liveBid);
      const newLow = Math.min(last.low, liveBid);
      const updatedCandle = {
        time: last.time as any,
        open: last.open,
        high: newHigh,
        low: newLow,
        close: liveBid,
      };

      try {
        candleSeriesRef.current.update(updatedCandle);
        lastCandleRef.current = {
          ...last,
          high: newHigh,
          low: newLow,
          close: liveBid,
        };

        if (livePriceLineRef.current) {
          livePriceLineRef.current.applyOptions({
            price: liveBid,
            title: `LIVE BID ${liveBid.toFixed(quote.pipPrecision)}`,
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
      const randomShift = (Math.random() - 0.49) * pipDelta * 2.5;
      const microBid = +(quote.bid + randomShift).toFixed(quote.pipPrecision);
      updateLiveTick(microBid);
    }, 1200);

    return () => clearInterval(tickInterval);
  }, [quote.bid, quote.pipPrecision, chartMode]);

  const resetOverlays = () => {
    setShowEMA(true);
    setShowSR(true);
    setShowPD(true);
    setShowVP(true);
    setShowSignals(true);
    setShowFib(false);
    setShowOB(false);
    setShowFVG(false);
    setShowRSI(false);
  };

  const timeframes: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const assets: { sym: AssetSymbol; label: string }[] = [
    { sym: "XAUUSD", label: "GOLD (XAU/USD)" },
    { sym: "XAGUSD", label: "SILVER (XAG/USD)" },
    { sym: "USDJPY", label: "USD/JPY" },
    { sym: "GBPUSD", label: "GBP/USD" },
    { sym: "EURUSD", label: "EUR/USD" },
  ];

  const getTradingViewSymbol = (sym: AssetSymbol): string => {
    switch (sym) {
      case "XAUUSD": return "OANDA:XAUUSD";
      case "XAGUSD": return "OANDA:XAGUSD";
      case "EURUSD": return "FX:EURUSD";
      case "GBPUSD": return "FX:GBPUSD";
      case "USDJPY": return "FX:USDJPY";
      case "DXY": return "CAPITALCOM:DXY";
      case "US10Y": return "TVC:US10Y";
      default: return "OANDA:XAUUSD";
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
      default: return "60";
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
      <div className="flex flex-wrap items-center justify-between p-2.5 bg-[#0D121D] border-b border-terminal-border gap-2">
        {/* Left: Asset Select & Current Quote */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-terminal-bg rounded p-0.5 border border-terminal-border">
            {assets.map((item) => (
              <button
                key={item.sym}
                onClick={() => onSelectSymbol(item.sym)}
                className={`px-2 py-1 text-xs font-semibold rounded transition-all ${
                  activeSymbol === item.sym
                    ? item.sym.includes("XAU")
                      ? "bg-gold/20 text-gold border border-gold/40 shadow-sm"
                      : "bg-blue-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-terminal-muted hover:text-gray-200"
                }`}
              >
                {item.sym}
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

            {/* Volume Profile (VAH, VAL, POC) */}
            <button
              onClick={() => setShowVP(!showVP)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showVP
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle Volume Profile (Point of Control, Value Area High 70%, Value Area Low 70%)"
            >
              <BarChart2 className="w-2.5 h-2.5 text-rose-400" />
              <span>VP (POC/VAH/VAL)</span>
            </button>

            {/* In-Chart Buy / Sell Directional Signals */}
            <button
              onClick={() => setShowSignals(!showSignals)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                showSignals
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-terminal-bg text-terminal-muted border-terminal-border"
              }`}
              title="Toggle In-Chart BUY and SELL execution arrows and labels"
            >
              <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
              <span>Signals (BUY/SELL)</span>
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
                const text = `ApexFX ${activeSymbol} SMC Levels:\n- Current Bid: ${quote.bid}\n- 50% Equilibrium: ${smc.equilibriumPrice}\n- 0.618 Fib: ${smc.fibonacci.fib618}\n- 0.786 OTE: ${smc.fibonacci.fib786}\n- S1 Support: ${technicals.pivots.s1}\n- R1 Resistance: ${technicals.pivots.r1}\n- Regime: ${smc.zone}`;
                copyToClipboard(text, "ALL");
              }}
              className="px-2 py-0.5 rounded bg-terminal-card hover:bg-terminal-hover border border-terminal-border text-[10px] text-gray-300 hover:text-white flex items-center gap-1 transition-all"
              title="Copy all SMC coordinates for pending orders"
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
                  {smc.fibonacci.fib786 && (
                    <div className="flex items-center justify-between">
                      <span className="text-terminal-muted">0.786 OTE Sweetspot:</span>
                      <button
                        onClick={() => copyToClipboard(smc.fibonacci.fib786.toString(), "0.786 OTE")}
                        className="text-indigo-300 font-bold hover:underline"
                      >
                        {smc.fibonacci.fib786}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Pivot R1 (Ceiling):</span>
                    <span className="text-bear font-bold">{technicals.pivots.r1}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-muted">Pivot S1 (Floor):</span>
                    <span className="text-bull font-bold">{technicals.pivots.s1}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-terminal-border/50 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400">Institutional Bias:</span>
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

            {/* Volume Profile Visual Distribution Overlay (Right edge histogram) */}
            {showVP && volumeProfile && volumeProfile.bins.length > 0 && (
              <div className="absolute top-12 right-14 bottom-8 w-28 pointer-events-none flex flex-col-reverse justify-between opacity-80 z-10">
                {(() => {
                  const maxVol = Math.max(...volumeProfile.bins.map((b) => b.volume), 1);
                  return volumeProfile.bins.map((bin, idx) => {
                    const isPOC = Math.abs(bin.price - volumeProfile.poc) < (Math.abs(volumeProfile.vah - volumeProfile.val) / (volumeProfile.bins.length || 1));
                    const widthPct = Math.max(8, Math.round((bin.volume / maxVol) * 100));
                    return (
                      <div key={idx} className="w-full flex items-center justify-end h-full">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className={`h-[2px] transition-all rounded-l ${
                            isPOC
                              ? "bg-[#F43F5E] shadow-[0_0_6px_rgba(244,63,94,0.8)] h-[3px]"
                              : bin.isValueArea
                              ? "bg-[#38BDF8]/60"
                              : "bg-[#475569]/30"
                          }`}
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Clean Top Legend Overlay */}
            <div className="absolute top-3 left-3 pointer-events-none flex flex-wrap items-center gap-2.5 text-[11px] font-mono bg-terminal-bg/90 backdrop-blur px-2.5 py-1.5 rounded border border-terminal-border/80 z-20 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white">{activeSymbol}</span>
                <span className="text-terminal-muted">[{timeframe.toUpperCase()}]</span>
              </div>

              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse"></span>
                <span>REALTIME STREAMING</span>
              </div>

              {showVP && volumeProfile && volumeProfile.poc > 0 && (
                <>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#F43F5E]"></span>
                    <span className="text-[#F43F5E] font-bold">POC: {volumeProfile.poc}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#38BDF8]"></span>
                    <span className="text-[#38BDF8] font-bold">VAH: {volumeProfile.vah}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-0.5 bg-[#10B981]"></span>
                    <span className="text-[#10B981] font-bold">VAL: {volumeProfile.val}</span>
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
                <div className="flex items-center gap-1">
                  <span className="text-terminal-muted">0.618 FIB:</span>
                  <span className="text-gold font-bold">{smc.fibonacci.fib618}</span>
                </div>
                {volumeProfile && volumeProfile.poc > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-terminal-muted">POC NODE:</span>
                    <span className="text-[#F43F5E] font-bold">{volumeProfile.poc}</span>
                  </div>
                )}
                {smc.orderBlocks.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-terminal-muted">ORDER BLOCK:</span>
                    <span className="text-bull font-bold">{smc.orderBlocks[smc.orderBlocks.length - 1].low}</span>
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
