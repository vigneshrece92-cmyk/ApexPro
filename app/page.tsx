"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AssetSymbol,
  TimeFrame,
  Candle,
  Quote,
  AIAnalysisResult,
  InstitutionalAlert,
} from "@/lib/types";
import { INITIAL_QUOTES, generateRealisticCandles } from "@/lib/defaultData";
import { generateTradeSignalFromData } from "@/lib/technicals";
import { getInitialInstitutionalAlerts } from "@/lib/alertDetectors";
import { Header } from "@/components/Header";
import { ChartTerminal } from "@/components/ChartTerminal";
import { AIChartAnalyzer } from "@/components/AIChartAnalyzer";
import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { NewsWire } from "@/components/NewsWire";
import { LotCalculatorModal } from "@/components/LotCalculatorModal";
import { MarketSessionsModal } from "@/components/MarketSessionsModal";
import { SettingsModal } from "@/components/SettingsModal";
import { MTFHeatmap } from "@/components/MTFHeatmap";
import { CurrencyStrengthMeter } from "@/components/CurrencyStrengthMeter";
import { RetailSentimentRadar } from "@/components/RetailSentimentRadar";
import { PropFirmGuardianModal } from "@/components/PropFirmGuardianModal";
import { SignalDispatcherModal } from "@/components/SignalDispatcherModal";
import { InstitutionalAlertsHub } from "@/components/InstitutionalAlertsHub";
import { ActiveAlertsRibbon } from "@/components/ActiveAlertsRibbon";
import { MT5TradingPanel } from "@/components/MT5TradingPanel";
import { InternalDemoTradingPanel } from "@/components/InternalDemoTradingPanel";
import {
  DemoAccountState,
  INITIAL_ACCOUNT_STATE,
  loadDemoAccount,
  tickDemoPositions,
  evaluateAutoBot,
} from "@/lib/demoTradingEngine";
import { sendTelegramNotification } from "@/lib/telegramBroadcaster";

export default function TerminalDashboard() {
  // Client mount hydration guard
  const [isMounted, setIsMounted] = useState(false);

  // Active State - Default to NIFTY 5m Indian Options & Commodities Terminal
  const [activeSymbol, setActiveSymbol] = useState<AssetSymbol>("NIFTY");
  const [timeframe, setTimeframe] = useState<TimeFrame>("5m");
  const [candles, setCandles] = useState<Candle[]>(() => generateRealisticCandles("NIFTY", "5m", 120));
  const [quote, setQuote] = useState<Quote>(INITIAL_QUOTES.NIFTY);
  const [allQuotes, setAllQuotes] = useState<Record<AssetSymbol, Quote>>(INITIAL_QUOTES);

  // Institutional Alerts State (4H Breakout & Retest + AMD Radar)
  const [alerts, setAlerts] = useState<InstitutionalAlert[]>(() => getInitialInstitutionalAlerts());
  const [isAlertsHubOpen, setIsAlertsHubOpen] = useState(false);

  // Internal Institutional Demo Broker State (₹1,00,000 Balance - 100% Vercel Ready)
  const [demoAccount, setDemoAccount] = useState<DemoAccountState>(INITIAL_ACCOUNT_STATE);
  const notifiedTicketsRef = useRef<Set<number>>(new Set());
  const prevHistoryCountRef = useRef<number>(0);
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState(false);
  const [demoPrefillSetup, setDemoPrefillSetup] = useState<{
    action: "BUY" | "SELL";
    suggestedEntry: number;
    stopLoss: number;
    takeProfit1: number;
  } | null>(null);

  // Optional MT5 Bridge State
  const [isMT5PanelOpen, setIsMT5PanelOpen] = useState(false);
  const [mt5AccountData, setMT5AccountData] = useState<{ balance: number; connected: boolean }>({
    balance: 3000.0,
    connected: false,
  });
  const [mt5PrefillSetup, setMT5PrefillSetup] = useState<{
    action: "BUY" | "SELL";
    suggestedEntry: number;
    stopLoss: number;
    takeProfit1: number;
  } | null>(null);

  // AI Analysis State
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(() => {
    const c = generateRealisticCandles("NIFTY", "5m", 120);
    return generateTradeSignalFromData("NIFTY", c, INITIAL_QUOTES.NIFTY.pipPrecision);
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Modals
  const [isLotCalcOpen, setIsLotCalcOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPropGuardianOpen, setIsPropGuardianOpen] = useState(false);
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");

  // Safely hydrate client-only state from localStorage on mount (eliminates SSR hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    const loaded = loadDemoAccount();
    setDemoAccount(loaded);
    prevHistoryCountRef.current = Array.isArray(loaded.history) ? loaded.history.length : 0;
    if (Array.isArray(loaded.open_positions)) {
      loaded.open_positions.forEach((p) => {
        if (p?.ticket) notifiedTicketsRef.current.add(p.ticket);
      });
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("apex_gemini_api_key");
      if (saved) setGeminiApiKey(saved);
    }
  }, []);

  // Poll live alerts
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/alerts");
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            setAlerts(data.alerts);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch alerts:", e);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll live MT5 status
  useEffect(() => {
    async function checkMT5() {
      try {
        const res = await fetch("/api/mt5");
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setMT5AccountData({
              balance: data.balance || 100000.0,
              connected: true,
            });
          }
        }
      } catch (e) {
        // preserve fallback
      }
    }

    checkMT5();
    const interval = setInterval(checkMT5, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. Dispatch Telegram notifications cleanly and purely on position changes (NEVER inside state updater)
  useEffect(() => {
    if (!isMounted) return;

    // Check for newly opened positions
    if (Array.isArray(demoAccount.open_positions)) {
      for (const pos of demoAccount.open_positions) {
        if (pos?.ticket && !notifiedTicketsRef.current.has(pos.ticket)) {
          notifiedTicketsRef.current.add(pos.ticket);
          const isIndian = ["NIFTY", "BANKNIFTY", "CRUDEOIL", "NATURALGAS", "FINNIFTY", "SENSEX"].includes(pos.symbol);
          const curSym = pos.currency || (isIndian ? "₹" : "$");
          const openPrice = typeof pos.price_open === "number" ? pos.price_open.toFixed(2) : "0.00";
          const sl = typeof pos.sl === "number" ? pos.sl.toFixed(2) : "0.00";
          const tp = typeof pos.tp === "number" ? pos.tp.toFixed(2) : "0.00";
          const contractDesc = pos.optionContractName
            ? `${pos.optionContractName} (${pos.volume} Lot / ${pos.lotSizeMultiplier} Qty)`
            : `${pos.type} ${pos.volume} ${pos.symbol}`;
          sendTelegramNotification(
            `🤖 <b>Apex Terminal PAVP Auto-Bot Executed</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Instrument:</b> ${contractDesc}\n<b>Entry:</b> ${curSym}${openPrice}\n<b>Stop Loss:</b> ${curSym}${sl}\n<b>Take Profit:</b> ${curSym}${tp}\n<b>Rationale:</b> ${pos.comment || "Pivot-Anchored Volume Profile (PAVP)"}\n<b>Ticket:</b> #${pos.ticket}\n<i>Apex Terminal Autonomous Options Engine</i>`
          ).catch((err) => console.warn("Telegram broadcast error:", err));
        }
      }
    }

    // Check for newly closed positions
    const historyList = Array.isArray(demoAccount.history) ? demoAccount.history : [];
    if (historyList.length > prevHistoryCountRef.current) {
      const newClosed = historyList.slice(0, historyList.length - prevHistoryCountRef.current);
      for (const closed of newClosed) {
        if (closed?.ticket) {
          const isIndian = ["NIFTY", "BANKNIFTY", "CRUDEOIL", "NATURALGAS", "FINNIFTY", "SENSEX"].includes(closed.symbol);
          const curSym = closed.currency || (isIndian ? "₹" : "$");
          const profit = typeof closed.profit === "number" ? closed.profit : 0;
          const closePrice = typeof closed.price_close === "number" ? closed.price_close.toFixed(2) : "0.00";
          sendTelegramNotification(
            `🎯 <b>Apex Terminal Position Exit</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Ticket:</b> #${closed.ticket} ${closed.optionContractName || closed.symbol}\n<b>Result:</b> ${profit >= 0 ? "🟢 Profit: +" : "🔴 Loss: "}${curSym}${Math.abs(profit).toFixed(2)}\n<b>Exit Reason:</b> ${closed.close_reason || "Market Exit"}\n<b>Close Price:</b> ${curSym}${closePrice}\n<i>Apex Terminal Virtual Broker</i>`
          ).catch((err) => console.warn("Telegram broadcast error:", err));
        }
      }
    }
    prevHistoryCountRef.current = historyList.length;
  }, [demoAccount.open_positions, demoAccount.history, isMounted]);

  // 2. Pure state tick & auto-bot evaluation on live quotes and 5s heartbeat
  useEffect(() => {
    if (!isMounted || !quote) return;

    const runEngineTick = () => {
      setDemoAccount((prev) => {
        const ticked = tickDemoPositions(prev, quote);
        if (ticked?.auto_bot?.enabled) {
          return evaluateAutoBot(ticked, quote, alerts, allQuotes, candles);
        }
        return ticked;
      });
    };

    runEngineTick();
    const heartbeat = setInterval(runEngineTick, 5000);
    return () => clearInterval(heartbeat);
  }, [quote, alerts, allQuotes, candles, isMounted]);

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("apex_gemini_api_key", key);
    }
  };

  // Fetch real market data from server API
  const fetchMarketData = useCallback(async (sym: AssetSymbol, tf: TimeFrame) => {
    try {
      const res = await fetch(`/api/market-data?symbol=${sym}&timeframe=${tf}`);
      if (res.ok) {
        const data = await res.json();
        if (data.quote) {
          setQuote(data.quote);
        }
        if (data.allQuotes) {
          setAllQuotes(data.allQuotes);
        }
        if (data.candles && data.candles.length > 0) {
          setCandles(data.candles);
          // Recalculate AI analysis with real candles
          const realAnalysis = generateTradeSignalFromData(
            sym,
            data.candles,
            data.quote?.pipPrecision || 2
          );
          setAnalysisResult(realAnalysis);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch real market data, using local state:", e);
    }
  }, []);

  // Trigger fetch on symbol or timeframe change
  useEffect(() => {
    const immediateQuote = allQuotes[activeSymbol] || INITIAL_QUOTES[activeSymbol] || quote;
    setQuote(immediateQuote);
    setCandles(generateRealisticCandles(activeSymbol, timeframe, 100, immediateQuote.bid));
    fetchMarketData(activeSymbol, timeframe);

    // Refresh quotes every 10s
    const timer = setInterval(() => {
      fetchMarketData(activeSymbol, timeframe);
    }, 10000);

    return () => clearInterval(timer);
  }, [activeSymbol, timeframe, fetchMarketData]);

  // Handle 1-click "Analyze Live Chart" from Chart Terminal
  const handleAnalyzeLiveChart = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: activeSymbol,
          timeframe,
          apiKey: geminiApiKey,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setAnalysisResult(data.result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scrollToScanner = () => {
    const el = document.getElementById("ai-scanner-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToMatrix = () => {
    const el = document.getElementById("market-intelligence-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenDispatcherWithAlert = (alt: InstitutionalAlert) => {
    const isBuy = alt.direction.includes("BUY");
    const converted: AIAnalysisResult = {
      assetDetected: alt.symbol,
      timeframeDetected: alt.timeframe.toUpperCase(),
      trendBias: isBuy ? "BUY" : "SELL",
      confidenceScore: alt.confidenceScore,
      marketStructure: isBuy ? "Bullish Trend" : "Bearish Trend",
      patternDetected: alt.title,
      currentPrice: alt.priceAtAlert,
      action: alt.direction as any,
      suggestedEntry: alt.suggestedEntry,
      stopLoss: alt.stopLoss,
      takeProfit1: alt.takeProfit1,
      takeProfit2: alt.takeProfit2,
      takeProfit3: alt.takeProfit3 || alt.takeProfit2,
      riskRewardRatio: alt.riskRewardRatio,
      supportLevels: [alt.stopLoss],
      resistanceLevels: [alt.takeProfit1, alt.takeProfit2],
      confluences: [
        { factor: alt.title, status: isBuy ? "bullish" : "bearish" },
        { factor: "4H Structural Retest Confirmed", status: "bullish" },
      ],
      reasoning: alt.reasoning,
      invalidationCriteria: alt.invalidationCriteria,
      timestamp: new Date().toLocaleTimeString(),
    };
    setAnalysisResult(converted);
    setIsAlertsHubOpen(false);
    setIsDispatcherOpen(true);
  };

  const handleOpenDemoWithAlert = (alt: InstitutionalAlert) => {
    setDemoPrefillSetup({
      action: alt.direction.includes("BUY") ? "BUY" : "SELL",
      suggestedEntry: alt.suggestedEntry,
      stopLoss: alt.stopLoss,
      takeProfit1: alt.takeProfit1,
    });
    setIsAlertsHubOpen(false);
    setIsDemoPanelOpen(true);
  };

  const handleOpenMT5WithAlert = (alt: InstitutionalAlert) => {
    setMT5PrefillSetup({
      action: alt.direction.includes("BUY") ? "BUY" : "SELL",
      suggestedEntry: alt.suggestedEntry,
      stopLoss: alt.stopLoss,
      takeProfit1: alt.takeProfit1,
    });
    setIsAlertsHubOpen(false);
    setIsMT5PanelOpen(true);
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col">
      {/* Top Barometer & Header */}
      <Header
        activeSymbol={activeSymbol}
        onSelectSymbol={setActiveSymbol}
        onOpenLotCalc={() => setIsLotCalcOpen(true)}
        onOpenSessions={() => setIsSessionsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenScanner={scrollToScanner}
        onOpenPropGuardian={() => setIsPropGuardianOpen(true)}
        onScrollToMatrix={scrollToMatrix}
        onOpenAlertsHub={() => setIsAlertsHubOpen(true)}
        activeAlertCount={alerts.length}
        onOpenDemoPanel={() => setIsDemoPanelOpen(true)}
        demoBalance={demoAccount.balance}
        autoBotEnabled={demoAccount?.auto_bot?.enabled ?? true}
        onOpenMT5Panel={() => setIsMT5PanelOpen(true)}
        mt5Balance={mt5AccountData.balance}
        mt5Connected={mt5AccountData.connected}
        externalQuotes={allQuotes}
      />

      {/* Main Terminal Workspace */}
      <main className="flex-1 p-3 lg:p-4 max-w-[1780px] w-full mx-auto space-y-4">
        {/* Active 4H Alerts & AMD Radar Marquee Ribbon */}
        <ActiveAlertsRibbon
          alerts={alerts}
          onOpenAlertsHub={() => setIsAlertsHubOpen(true)}
          onSelectSymbol={(sym) => {
            setActiveSymbol(sym);
            setTimeframe("4h");
          }}
        />

        {/* Top Grid: Interactive Chart (Left) + AI Trade Signal Card (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Main Chart Terminal (7 Cols on LG, 8 on XL) */}
          <div className="lg:col-span-7 xl:col-span-8 h-full">
            <ChartTerminal
              activeSymbol={activeSymbol}
              onSelectSymbol={setActiveSymbol}
              quote={quote}
              candles={candles}
              timeframe={timeframe}
              onChangeTimeframe={setTimeframe}
              onAnalyzeLiveChart={handleAnalyzeLiveChart}
              isAnalyzing={isAnalyzing}
            />
          </div>

          {/* AI Trade Analysis Breakdown Card (5 Cols on LG, 4 on XL) */}
          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <AnalysisResultCard
              result={analysisResult}
              isLoading={isAnalyzing}
              onOpenDispatcher={() => setIsDispatcherOpen(true)}
            />
          </div>
        </div>

        {/* Market Intelligence Suite (Multi-Timeframe SMC Matrix, Currency Strength Meter, Retail Sentiment Radar) */}
        <section id="market-intelligence-section" className="scroll-mt-16 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Multi-Timeframe SMC Confluence Matrix (8 Cols on LG) */}
            <div className="lg:col-span-8 h-full">
              <MTFHeatmap
                activeSymbol={activeSymbol}
                onSelectSymbol={setActiveSymbol}
                externalQuotes={allQuotes}
              />
            </div>

            {/* Currency Strength Meter (4 Cols on LG) */}
            <div className="lg:col-span-4 h-full">
              <CurrencyStrengthMeter
                onSelectSymbol={setActiveSymbol}
                externalQuotes={allQuotes}
              />
            </div>
          </div>

          {/* Retail Crowd Sentiment & Contrarian Liquidity Radar */}
          <div>
            <RetailSentimentRadar onSelectSymbol={setActiveSymbol} />
          </div>
        </section>

        {/* Middle Section: Dedicated AI Chart Screenshot Vision Analyzer */}
        <div id="ai-scanner-section" className="scroll-mt-16">
          <AIChartAnalyzer
            onAnalysisComplete={(res) => setAnalysisResult(res)}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
            externalResult={analysisResult}
            geminiApiKey={geminiApiKey}
          />
        </div>

        {/* Bottom Grid: Economic Calendar (Left) + Breaking News Wire (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Economic Calendar (7 cols) */}
          <div className="lg:col-span-7">
            <EconomicCalendar />
          </div>

          {/* Breaking News Wire (5 cols) */}
          <div className="lg:col-span-5">
            <NewsWire activeSymbol={activeSymbol} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-terminal-border/60 py-3 px-4 bg-[#070A0F] text-center text-[11px] text-terminal-muted flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-300">Apex Pro Terminal</span>
          <span>•</span>
          <span>Real Live Feeds: NSE / BSE India, MCX Commodities</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">Virtual Options Broker (₹1,00,000 Balance • PAVP Engine)</span>
        </div>
        <div className="text-gray-500 font-mono text-[10px]">
          100% Dedicated to Indian F&O & MCX Commodities • Volume Profile Key Levels (VAH / VAL / POC)
        </div>
      </footer>

      {/* Modals */}
      <LotCalculatorModal
        isOpen={isLotCalcOpen}
        onClose={() => setIsLotCalcOpen(false)}
        defaultSymbol={activeSymbol}
      />
      <MarketSessionsModal
        isOpen={isSessionsOpen}
        onClose={() => setIsSessionsOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={geminiApiKey}
        onSaveApiKey={handleSaveApiKey}
      />
      <PropFirmGuardianModal
        isOpen={isPropGuardianOpen}
        onClose={() => setIsPropGuardianOpen(false)}
      />
      <SignalDispatcherModal
        isOpen={isDispatcherOpen}
        onClose={() => setIsDispatcherOpen(false)}
        result={analysisResult}
      />
      <InstitutionalAlertsHub
        isOpen={isAlertsHubOpen}
        onClose={() => setIsAlertsHubOpen(false)}
        alerts={alerts}
        onSelectSymbol={(sym) => {
          setActiveSymbol(sym);
          setTimeframe("4h");
        }}
        onOpenDispatcherWithAlert={handleOpenDispatcherWithAlert}
        onOpenMT5PanelWithAlert={handleOpenMT5WithAlert}
        onOpenDemoPanelWithAlert={handleOpenDemoWithAlert}
      />
      <InternalDemoTradingPanel
        isOpen={isDemoPanelOpen}
        onClose={() => setIsDemoPanelOpen(false)}
        account={demoAccount}
        onUpdateAccount={setDemoAccount}
        liveQuote={allQuotes[activeSymbol] || quote}
        prefillSetup={demoPrefillSetup}
      />
      <MT5TradingPanel
        isOpen={isMT5PanelOpen}
        onClose={() => setIsMT5PanelOpen(false)}
        prefillSetup={mt5PrefillSetup}
      />
    </div>
  );
}
