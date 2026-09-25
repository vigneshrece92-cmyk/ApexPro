"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AssetSymbol,
  TimeFrame,
  Candle,
  Quote,
  AIAnalysisResult,
  InstitutionalAlert,
  OptionContract,
} from "@/lib/types";
import { INITIAL_QUOTES, generateRealisticCandles } from "@/lib/defaultData";
import {
  generateTradeSignalFromData,
  calculatePivotAnchoredVolumeProfile,
  detectPAVPSignals,
  getPAVPConfigForTimeframe,
} from "@/lib/technicals";
import { getRecommendedOptionContract, getOptionSpec } from "@/lib/optionsEngine";
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
  saveDemoAccount,
  executeDemoTrade,
  tickDemoPositions,
  evaluateAutoBot,
  isIndianMarketOpen,
} from "@/lib/demoTradingEngine";
import {
  sendTelegramNotification,
  formatShortEntryMessage,
  formatShortExitMessage,
  formatShort1ClickExecutedMessage,
} from "@/lib/telegramBroadcaster";

export default function TerminalDashboard() {
  // Client mount hydration guard
  const [isMounted, setIsMounted] = useState(false);

  // Active State - Default to 15m Indian Options & Commodities Terminal
  const [activeSymbol, setActiveSymbol] = useState<AssetSymbol>("CRUDEOIL");
  const [timeframe, setTimeframe] = useState<TimeFrame>("15m");
  const [candles, setCandles] = useState<Candle[]>(() => generateRealisticCandles("CRUDEOIL", "15m", 120, 9181.00));
  const [quote, setQuote] = useState<Quote>(INITIAL_QUOTES.CRUDEOIL);
  const [allQuotes, setAllQuotes] = useState<Record<AssetSymbol, Quote>>(INITIAL_QUOTES);

  // Institutional Alerts State (4H Breakout & Retest + AMD Radar)
  const [alerts, setAlerts] = useState<InstitutionalAlert[]>(() => getInitialInstitutionalAlerts());
  const [isAlertsHubOpen, setIsAlertsHubOpen] = useState(false);

  // Internal Institutional Demo Broker State (₹10,00,000 Balance - 100% Vercel Ready)
  const [demoAccount, setDemoAccount] = useState<DemoAccountState>(INITIAL_ACCOUNT_STATE);
  const notifiedTicketsRef = useRef<Set<number>>(new Set());
  const notifiedClosedTicketsRef = useRef<Set<number>>(new Set());
  const notifiedSignalKeysRef = useRef<Set<string>>(new Set());
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
    if (Array.isArray(loaded.open_positions)) {
      loaded.open_positions.forEach((p) => {
        if (p?.ticket) notifiedTicketsRef.current.add(p.ticket);
      });
    }
    if (Array.isArray(loaded.history)) {
      loaded.history.forEach((h) => {
        if (h?.ticket) notifiedClosedTicketsRef.current.add(h.ticket);
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
          const curSym = pos.currency || "₹";
          const openPrice = typeof pos.price_open === "number" ? pos.price_open.toFixed(2) : "0.00";
          const sl = typeof pos.sl === "number" ? pos.sl.toFixed(2) : "0.00";
          const tp = typeof pos.tp === "number" ? pos.tp.toFixed(2) : "0.00";
          const desc = pos.optionContractName || `${pos.symbol} ${pos.type}`;
          const lots = pos.volume || 1;
          const totalQty = pos.lotSizeMultiplier ? lots * pos.lotSizeMultiplier : lots;
          const msg = [
            `🤖 <b>AUTO-BOT: ${desc}</b>`,
            "━━━━━━━━━━━━━━━",
            `• <b>Entry:</b> ${curSym}${openPrice}`,
            `• <b>SL:</b> ${curSym}${sl}`,
            `• <b>Target:</b> ${curSym}${tp}`,
            `• <b>Lot:</b> ${lots} Lot (${totalQty} Qty)`,
            `• <b>Ticket:</b> #${pos.ticket}`,
          ].join("\n");
          sendTelegramNotification(msg).catch((err) => console.warn("Telegram broadcast error:", err));
        }
      }
    }

    // Check for newly closed positions
    const historyList = Array.isArray(demoAccount.history) ? demoAccount.history : [];
    for (const closed of historyList) {
      if (closed?.ticket && !notifiedClosedTicketsRef.current.has(closed.ticket)) {
        notifiedClosedTicketsRef.current.add(closed.ticket);
        const curSym = closed.currency || "₹";
        const profit = typeof closed.profit === "number" ? closed.profit : 0;
        const closePrice = typeof closed.price_close === "number" ? closed.price_close : 0;
        const exitMsg = formatShortExitMessage({
          symbol: closed.symbol,
          contractName: closed.optionContractName,
          profit,
          closePrice,
          closeReason: closed.close_reason,
          currency: curSym,
          ticket: closed.ticket,
        });
        sendTelegramNotification(exitMsg).catch((err) => console.warn("Telegram broadcast error:", err));
      }
    }
  }, [demoAccount.open_positions, demoAccount.history, isMounted]);

  // 2. Active Chart PAVP Signal Detector & Instant Telegram Broadcaster
  useEffect(() => {
    if (!isMounted || !candles || candles.length < 15 || !quote) return;

    try {
      const precision = quote.pipPrecision || 2;
      const pavpConf = getPAVPConfigForTimeframe(timeframe);
      const pavp = calculatePivotAnchoredVolumeProfile(
        candles,
        pavpConf.pvtLength,
        pavpConf.profileLevels,
        pavpConf.valueAreaPct,
        precision
      );
      if (!pavp || pavp.poc <= 0) return;

      const { signals } = detectPAVPSignals(candles, pavp, activeSymbol, precision);
      if (!signals || signals.length === 0) return;

      // Scan signals on recent candles (within the last 5 candles)
      for (const sig of signals) {
        const isRecent = typeof sig.candleIndex === "number" ? sig.candleIndex >= candles.length - 5 : true;
        if (!isRecent) continue;

        const sigKey = `${activeSymbol}_${sig.action}_${sig.time || sig.candleIndex}_${sig.levelPrice}`;
        if (notifiedSignalKeysRef.current.has(sigKey)) continue;

        notifiedSignalKeysRef.current.add(sigKey);

        const optContract = getRecommendedOptionContract(activeSymbol, sig.action, quote.bid);
        const optSpec = getOptionSpec(activeSymbol);
        const curSym = quote.currency || "₹";
        const marketStatus = isIndianMarketOpen(activeSymbol);

        const msg = formatShortEntryMessage({
          symbol: activeSymbol,
          strike: optContract.strike,
          type: optContract.type,
          entryPremium: optContract.premiumAsk,
          lotSize: optSpec.lotSize,
          expiry: optContract.expiry,
          currency: curSym,
          demoStatus: marketStatus.isOpen ? "executed" : "pending_market_open",
        });

        sendTelegramNotification(msg).catch((err) =>
          console.warn("Telegram signal broadcast error:", err)
        );
      }
    } catch (e) {
      console.warn("Signal detector error:", e);
    }
  }, [candles, quote, activeSymbol, timeframe, isMounted]);

  // 3. Multi-Asset Background Scanner (Watches all 36 Indices, MCX Commodities & 30 High-Volume F&O Stocks)
  useEffect(() => {
    if (!isMounted) return;

    const monitoredSymbols: AssetSymbol[] = [
      "NIFTY", "BANKNIFTY", "FINNIFTY", "CRUDEOIL", "NATURALGAS", "SENSEX",
      "RELIANCE", "TATAMOTORS", "TATASTEEL", "HDFCBANK", "SBIN",
      "ICICIBANK", "INFY", "TCS", "BAJFINANCE", "MARUTI",
      "LT", "AXISBANK", "KOTAKBANK", "BHARTIARTL", "ADANIENT",
      "ADANIPORTS", "HINDUNILVR", "ITC", "SUNPHARMA", "TITAN",
      "JSWSTEEL", "COALINDIA", "NTPC", "POWERGRID", "BPCL",
      "ONGC", "VEDL", "BHEL", "DLF", "BEL"
    ];

    const runMultiAssetScan = () => {
      monitoredSymbols.forEach((sym) => {
        if (sym === activeSymbol) return; // handled by primary active effect

        const symQuote = allQuotes[sym] || INITIAL_QUOTES[sym];
        if (!symQuote) return;

        try {
          const precision = symQuote.pipPrecision || 2;
          const symCandles = generateRealisticCandles(sym, "15m", 80, symQuote.bid);
          const pavp = calculatePivotAnchoredVolumeProfile(symCandles, 15, 28, 0.68, precision);
          if (!pavp || pavp.poc <= 0) return;

          const { signals } = detectPAVPSignals(symCandles, pavp, sym, precision);
          if (!signals || signals.length === 0) return;

          for (const sig of signals) {
            const isRecent = typeof sig.candleIndex === "number" ? sig.candleIndex >= symCandles.length - 4 : true;
            if (!isRecent) continue;

            const sigKey = `${sym}_${sig.action}_${sig.time || sig.candleIndex}_${sig.levelPrice}`;
            if (notifiedSignalKeysRef.current.has(sigKey)) continue;

            notifiedSignalKeysRef.current.add(sigKey);

            const optContract = getRecommendedOptionContract(sym, sig.action, symQuote.bid);
            const optSpec = getOptionSpec(sym);
            const curSym = symQuote.currency || "₹";
            const marketStatus = isIndianMarketOpen(sym);

            const msg = formatShortEntryMessage({
              symbol: sym,
              strike: optContract.strike,
              type: optContract.type,
              entryPremium: optContract.premiumAsk,
              lotSize: optSpec.lotSize,
              expiry: optContract.expiry,
              currency: curSym,
              demoStatus: marketStatus.isOpen ? "executed" : "pending_market_open",
            });

            sendTelegramNotification(msg).catch((err) =>
              console.warn("Multi-asset telegram broadcast error:", err)
            );

            // If auto-bot is enabled and market is open, trigger 1 lot demo execution for this symbol!
            setDemoAccount((prev) => {
              if (!prev?.auto_bot?.enabled) return prev;
              return evaluateAutoBot(prev, symQuote, alerts, allQuotes, symCandles, [sig], "15m");
            });
          }
        } catch (err) {
          // ignore scan error
        }
      });
    };

    runMultiAssetScan();
    const scanInterval = setInterval(runMultiAssetScan, 15000);
    return () => clearInterval(scanInterval);
  }, [allQuotes, activeSymbol, alerts, isMounted]);

  // 4. Pure state tick & auto-bot evaluation on live quotes and 5s heartbeat
  useEffect(() => {
    if (!isMounted || !quote) return;

    const runEngineTick = () => {
      setDemoAccount((prev) => {
        const ticked = tickDemoPositions(prev, quote);
        if (ticked?.auto_bot?.enabled) {
          return evaluateAutoBot(ticked, quote, alerts, allQuotes, candles, undefined, timeframe);
        }
        return ticked;
      });
    };

    runEngineTick();
    const heartbeat = setInterval(runEngineTick, 5000);
    return () => clearInterval(heartbeat);
  }, [quote, alerts, allQuotes, candles, timeframe, isMounted]);

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

  const handleClearAlerts = () => {
    setAlerts([]);
    notifiedTicketsRef.current.clear();
    notifiedClosedTicketsRef.current.clear();
  };

  const handleExecuteOptionTrade = (contract: OptionContract, action: "BUY" | "SELL") => {
    const symQuote = allQuotes[contract.symbol] || quote;
    const res = executeDemoTrade(demoAccount, {
      symbol: contract.symbol,
      type: action,
      volume: 1,
      quote: symQuote,
      sl: contract.type === "CE" ? symQuote.bid - 45 : symQuote.bid + 45,
      tp: contract.type === "CE" ? symQuote.bid + 90 : symQuote.bid - 90,
      comment: `OptionAlgo: ${contract.strike} ${contract.type}`,
      optionContractName: `${contract.symbol} ${contract.expiry} ${contract.strike} ${contract.type}`,
      optionType: contract.type,
      optionStrike: contract.strike,
      optionEntryPremium: contract.premiumAsk || contract.premiumBid,
      lotSizeMultiplier: contract.lotSize,
      currency: "₹",
    });

    if (res.success) {
      setDemoAccount(res.state);
      saveDemoAccount(res.state);
      const optPrice = (contract.premiumAsk || contract.premiumBid).toFixed(2);
      sendTelegramNotification(
        formatShort1ClickExecutedMessage({
          symbol: contract.symbol,
          strike: contract.strike,
          type: contract.type,
          side: action,
          price: +(contract.premiumAsk || contract.premiumBid),
          lotSize: contract.lotSize,
          expiry: contract.expiry,
        })
      ).catch(console.error);
      return { success: true, message: `Executed 1 Lot (${contract.lotSize} Qty) @ ₹${optPrice}` };
    } else {
      return { success: false, message: res.message || "Market Closed (NSE 09:15 - 15:00 IST Cutoff)" };
    }
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
              onExecuteOptionTrade={handleExecuteOptionTrade}
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
                alerts={alerts}
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
        onClearAlerts={handleClearAlerts}
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
