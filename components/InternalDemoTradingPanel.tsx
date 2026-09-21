"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Zap,
  DollarSign,
  Activity,
  History,
  CheckCircle2,
  Lock,
  Cpu,
  Terminal,
  Send,
} from "lucide-react";
import {
  DemoAccountState,
  DemoPosition,
  ClosedTrade,
  AutoBotLog,
  executeDemoTrade,
  closeDemoPosition,
  setPositionBreakEven,
  resetDemoAccount,
  saveDemoAccount,
  isForexMarketOpen,
} from "@/lib/demoTradingEngine";
import { sendTelegramNotification } from "@/lib/telegramBroadcaster";
import { Quote } from "@/lib/types";

interface InternalDemoTradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  account: DemoAccountState;
  onUpdateAccount: (nextState: DemoAccountState) => void;
  liveQuote: Quote;
  prefillSetup?: {
    action: "BUY" | "SELL";
    suggestedEntry: number;
    stopLoss: number;
    takeProfit1: number;
  } | null;
}

export const InternalDemoTradingPanel: React.FC<InternalDemoTradingPanelProps> = ({
  isOpen,
  onClose,
  account,
  onUpdateAccount,
  liveQuote,
  prefillSetup,
}) => {
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [lotSize, setLotSize] = useState<number>(0.02);
  const [stopLoss, setStopLoss] = useState<number>(4360.0);
  const [takeProfit, setTakeProfit] = useState<number>(4400.0);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const fmt2 = (v?: number, fallback = "0.00") => (typeof v === "number" && !isNaN(v) ? v.toFixed(2) : fallback);

  // Sync prefill setup when an alert is clicked
  useEffect(() => {
    if (prefillSetup) {
      setAction(prefillSetup.action);
      if (prefillSetup.stopLoss) setStopLoss(round2(prefillSetup.stopLoss));
      if (prefillSetup.takeProfit1) setTakeProfit(round2(prefillSetup.takeProfit1));
    } else if (liveQuote) {
      const ask = liveQuote.ask || 4364.18;
      const bid = liveQuote.bid || 4363.80;
      if (action === "BUY") {
        setStopLoss(round2(ask - 15.0));
        setTakeProfit(round2(ask + 30.0));
      } else {
        setStopLoss(round2(bid + 15.0));
        setTakeProfit(round2(bid - 30.0));
      }
    }
  }, [prefillSetup, liveQuote?.symbol]);

  if (!isOpen) return null;

  // Safe lot calculation for $3,000 account based on stop loss distance
  const currentOpenPrice = action === "BUY" ? (liveQuote?.ask || liveQuote?.bid || 4363.80) : (liveQuote?.bid || liveQuote?.ask || 4363.80);
  const slDistance = Math.abs(currentOpenPrice - stopLoss);
  const tpDistance = Math.abs(takeProfit - currentOpenPrice);
  const currentEquity = typeof account?.equity === "number" && !isNaN(account.equity) ? account.equity : 3000.0;
  const riskPct = typeof account?.auto_bot?.risk_percent === "number" ? account.auto_bot.risk_percent : 1.0;
  const riskDollar = (currentEquity * riskPct) / 100.0;
  const potentialLoss = round2(lotSize * 100 * slDistance);
  const potentialGain = round2(lotSize * 100 * tpDistance);
  const rrRatio = slDistance > 0 ? (tpDistance / slDistance).toFixed(2) : "1.00";

  const handleAutoSafeLot = () => {
    setLotSize(0.02);
    setStatusMessage({
      type: "success",
      text: "Standard 0.02 lot sizing applied across all pairs (1:1000 leverage).",
    });
  };

  const handleExecute = () => {
    setStatusMessage({ type: null, text: "" });
    const res = executeDemoTrade(account, {
      symbol: "XAUUSD",
      type: action,
      volume: lotSize,
      quote: liveQuote,
      sl: stopLoss,
      tp: takeProfit,
      comment: prefillSetup ? "Alert_PO3_Retest" : "Manual_Entry",
    });

    if (res.success) {
      onUpdateAccount(res.state);
      setStatusMessage({ type: "success", text: res.message });
      const newPos = res.state.open_positions[0];
      sendTelegramNotification(
        `⚡ <b>ApexFX Trade Executed</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Action:</b> ${action} ${lotSize} XAUUSD\n<b>Price:</b> $${fmt2(currentOpenPrice)}\n<b>Stop Loss:</b> $${fmt2(stopLoss)}\n<b>Take Profit:</b> $${fmt2(takeProfit)}\n<b>Ticket:</b> #${newPos ? newPos.ticket : ""}\n<i>ApexFX Virtual Broker • 1:1000 Leverage</i>`
      ).catch(() => {});
    } else {
      setStatusMessage({ type: "error", text: res.message });
    }
  };

  const handleClose = (ticket: number) => {
    const res = closeDemoPosition(account, ticket, liveQuote, "Manual Exit");
    if (res.success) {
      onUpdateAccount(res.state);
      setStatusMessage({ type: "success", text: res.message });
      const closed = res.state.history[0];
      if (closed) {
        sendTelegramNotification(
          `🎯 <b>ApexFX Trade Closed</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Position:</b> #${ticket} ${closed.type} ${closed.symbol}\n<b>P&L:</b> ${closed.profit >= 0 ? "🟢 +" : "🔴 -"}$${Math.abs(closed.profit).toFixed(2)}\n<b>Close Price:</b> $${closed.price_close.toFixed(2)}\n<b>Exit Reason:</b> ${closed.close_reason}\n<i>ApexFX Virtual Broker</i>`
        );
      }
    } else {
      setStatusMessage({ type: "error", text: res.message });
    }
  };

  const handleBE = (ticket: number) => {
    const res = setPositionBreakEven(account, ticket);
    if (res.success) {
      onUpdateAccount(res.state);
      setStatusMessage({ type: "success", text: res.message });
      sendTelegramNotification(
        `🛡️ <b>ApexFX Stop Loss Moved to Break-Even</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Position:</b> #${ticket}\n<b>Status:</b> Risk-Free Trade Secured (+0.20 buffer)`
      );
    } else {
      setStatusMessage({ type: "error", text: res.message });
    }
  };

  const [isTestingTg, setIsTestingTg] = useState(false);
  const handleTestTelegram = async () => {
    setIsTestingTg(true);
    try {
      const res = await fetch("/api/telegram-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `⚡ <b>ApexFX Pro Terminal — Telegram Broadcast Active</b>\n━━━━━━━━━━━━━━━━━━━━\n<b>Status:</b> 🟢 Connected\n<b>Bot:</b> @profitcatcher_bot\n<b>Account Balance:</b> $${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n<b>Open Positions:</b> ${account.open_positions.length}\n<b>Auto-Bot:</b> ${account.auto_bot.enabled ? "ACTIVE 🟢" : "PAUSED ⏸️"}\n<b>Timestamp:</b> ${new Date().toLocaleTimeString()} UTC`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: "✅ Telegram Ping delivered to @profitcatcher_bot (Chat: -5005740750)!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Telegram ping failed: ${data.error}`,
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Failed to connect to Telegram endpoint",
      });
    } finally {
      setIsTestingTg(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset Demo Account balance back to initial $3,000.00 and clear all positions?")) {
      const resetState = resetDemoAccount();
      onUpdateAccount(resetState);
      setStatusMessage({ type: "success", text: "Demo Account successfully reset to $3,000.00." });
    }
  };

  const handleToggleAutoBot = () => {
    const nextEnabled = !account.auto_bot.enabled;
    const newLog: AutoBotLog = {
      id: `bot-toggle-${Date.now()}`,
      timestamp: Date.now(),
      type: nextEnabled ? "success" : "info",
      message: nextEnabled
        ? `🤖 4H PO3 Auto-Bot ACTIVATED. Scanning 4H XAUUSD Judas sweeps & breakout retests (${account.auto_bot.risk_percent}% risk).`
        : "⏸️ 4H PO3 Auto-Bot PAUSED by user.",
    };
    const nextState: DemoAccountState = {
      ...account,
      auto_bot: {
        ...account.auto_bot,
        enabled: nextEnabled,
        logs: [newLog, ...(account.auto_bot?.logs || [])].slice(0, 50),
      },
    };
    saveDemoAccount(nextState);
    onUpdateAccount(nextState);
    setStatusMessage({
      type: "success",
      text: nextEnabled ? "4H PO3 Auto-Bot ACTIVATED! Scanning active market setups..." : "Auto-Bot paused.",
    });
  };

  const handleSetRisk = (pct: number) => {
    const eq = typeof account?.equity === "number" && !isNaN(account.equity) ? account.equity : 3000.0;
    const newLog: AutoBotLog = {
      id: `bot-risk-${Date.now()}`,
      timestamp: Date.now(),
      type: "info",
      message: `Risk per trade adjusted to ${pct}% ($${((eq * pct) / 100).toFixed(2)}).`,
    };
    const nextState: DemoAccountState = {
      ...account,
      auto_bot: {
        ...account.auto_bot,
        risk_percent: pct,
        logs: [newLog, ...(account.auto_bot?.logs || [])].slice(0, 50),
      },
    };
    saveDemoAccount(nextState);
    onUpdateAccount(nextState);
  };

  const handleToggleMarketMode = (mode: "STRICT_REAL" | "24_7_PRACTICE") => {
    const newLog: AutoBotLog = {
      id: `bot-mode-${Date.now()}`,
      timestamp: Date.now(),
      type: "info",
      message:
        mode === "STRICT_REAL"
          ? "🏛️ Switched to 'Real Market Hours (Strict)'. Orders blocked Friday 5 PM - Sunday 5 PM EST."
          : "⚡ Switched to '24/7 Practice Mode'. Active 24/7 simulated trading enabled.",
    };
    const nextState: DemoAccountState = {
      ...account,
      auto_bot: {
        ...account.auto_bot,
        market_mode: mode,
        logs: [newLog, ...(account.auto_bot?.logs || [])].slice(0, 50),
      },
    };
    saveDemoAccount(nextState);
    onUpdateAccount(nextState);
    setStatusMessage({
      type: "success",
      text:
        mode === "STRICT_REAL"
          ? "Switched to Real Market Hours (Strict): Orders only execute during official Sun 5PM - Fri 5PM EST market hours."
          : "Switched to 24/7 Practice Mode: Demo trades can execute anytime.",
    });
  };

  const marketStatus = isForexMarketOpen();

  // Trade History calculations
  const totalTrades = account.history.length;
  const winningTrades = account.history.filter((t) => t.profit > 0).length;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const totalClosedProfit = account.history.reduce((acc, t) => acc + t.profit, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0B0F17] border border-terminal-border rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-terminal-border bg-[#070A0F]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-wide">
                  ApexFX Institutional Demo Trading Station
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  100% VERCEL CLOUD READY
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border flex items-center gap-1.5 ${
                    marketStatus.isOpen
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}
                  title={marketStatus.statusText}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      marketStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  ></span>
                  {marketStatus.isOpen ? "MARKET OPEN" : "WEEKEND CLOSED"}
                </span>
              </div>
              <p className="text-xs text-terminal-muted">
                Internal Simulated Execution Engine • $3,000 Starting Balance • 1:1000 Leverage • 0.02 Lots Standard (All Pairs)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-all font-mono"
              title="Reset balance to $3,000 and clear trades"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset ($3k)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-terminal-border/50 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Message Banner */}
        {statusMessage.text && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
              statusMessage.type === "success"
                ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/70 border-rose-500/40 text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Top Real-Time Account Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Balance */}
            <div className="p-3 rounded-lg bg-terminal-card border border-terminal-border">
              <span className="text-[11px] text-terminal-muted uppercase tracking-wider block">
                Account Balance
              </span>
              <div className="text-lg sm:text-xl font-mono font-bold text-white mt-1">
                ${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Demo $3,000 Base</span>
            </div>

            {/* Equity */}
            <div className="p-3 rounded-lg bg-terminal-card border border-terminal-border">
              <span className="text-[11px] text-terminal-muted uppercase tracking-wider block">
                Live Equity
              </span>
              <div
                className={`text-lg sm:text-xl font-mono font-bold mt-1 ${
                  account.equity >= account.balance
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                ${account.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-terminal-muted font-mono">
                Floating: {account.open_profit >= 0 ? "+" : ""}${account.open_profit.toFixed(2)}
              </span>
            </div>

            {/* Free Margin */}
            <div className="p-3 rounded-lg bg-terminal-card border border-terminal-border">
              <span className="text-[11px] text-terminal-muted uppercase tracking-wider block">
                Free Margin
              </span>
              <div className="text-lg sm:text-xl font-mono font-bold text-cyan-300 mt-1">
                ${account.margin_free.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-terminal-muted font-mono">
                Used: ${account.margin.toFixed(2)} • 1:1000 Lev
              </span>
            </div>

            {/* Floating P&L */}
            <div
              className={`p-3 rounded-lg border ${
                account.open_profit > 0
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400"
                  : account.open_profit < 0
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-400"
                  : "bg-terminal-card border-terminal-border text-gray-300"
              }`}
            >
              <span className="text-[11px] uppercase tracking-wider block opacity-80">
                Open P&L
              </span>
              <div className="text-lg sm:text-xl font-mono font-bold mt-1">
                {account.open_profit >= 0 ? "+" : ""}${account.open_profit.toFixed(2)}
              </div>
              <span className="text-[10px] font-mono opacity-80">
                {account.open_positions.length} active position(s)
              </span>
            </div>

            {/* Live XAUUSD Market Quote */}
            <div className="p-3 rounded-lg bg-terminal-card border border-terminal-border col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                  XAUUSD Live
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                Bid: ${fmt2(liveQuote?.bid, "4363.80")}
              </div>
              <div className="text-xs font-mono text-terminal-muted">
                Ask: ${fmt2(liveQuote?.ask, "4364.18")} • Spr: {liveQuote?.spread ?? 3.8} pts
              </div>
            </div>
          </div>

          {/* Autonomous 4H PO3 Auto-Bot Command Center */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1424] via-[#09101d] to-[#070b14] border border-blue-500/30 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/20">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg border ${
                    account.auto_bot.enabled
                      ? "bg-blue-600/30 border-blue-400 text-blue-300 animate-pulse"
                      : "bg-gray-800/50 border-gray-700 text-gray-400"
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Autonomous 4H PO3 & Breakout Auto-Bot
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                        account.auto_bot.enabled
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/50 animate-pulse"
                          : "bg-gray-800/80 text-gray-400 border-gray-700"
                      }`}
                    >
                      {account.auto_bot.enabled ? "ACTIVE & SCANNING" : "PAUSED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-terminal-muted">
                    Scans 4H Judas sweeps & breakout retests • Auto Break-Even @ +$15 • Max 2 positions
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Market Hours Mode Selector */}
                <div className="flex items-center gap-1 bg-[#05080E] p-1 rounded-lg border border-terminal-border text-xs">
                  <span className="text-[10px] text-terminal-muted px-1 font-mono">Hours:</span>
                  <button
                    onClick={() => handleToggleMarketMode("STRICT_REAL")}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      account.auto_bot.market_mode === "STRICT_REAL"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Real Market Hours: Sunday 5:00 PM EST to Friday 5:00 PM EST. Blocks trades on weekends."
                  >
                    🏛️ Real Hours
                  </button>
                  <button
                    onClick={() => handleToggleMarketMode("24_7_PRACTICE")}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      account.auto_bot.market_mode === "24_7_PRACTICE"
                        ? "bg-amber-500 text-black font-extrabold shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="24/7 Practice Mode: Demo trades can execute anytime."
                  >
                    ⚡ 24/7 Practice
                  </button>
                </div>

                {/* Risk Tier Selection */}
                <div className="flex items-center gap-1 bg-[#05080E] p-1 rounded-lg border border-terminal-border text-xs">
                  <span className="text-[10px] text-terminal-muted px-1 font-mono">Risk:</span>
                  {[0.5, 1.0, 1.5].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleSetRisk(pct)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                        account.auto_bot.risk_percent === pct
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Auto-Bot Toggle Button */}
                <button
                  onClick={handleToggleAutoBot}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                    account.auto_bot.enabled
                      ? "bg-amber-600 hover:bg-amber-500 text-black shadow-amber-500/20"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20"
                  }`}
                >
                  {account.auto_bot.enabled ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Bot</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Activate Bot</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Strict Market Hours Weekend Alert Banner */}
            {account.auto_bot.market_mode === "STRICT_REAL" && !marketStatus.isOpen && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Market Closed:</strong> {marketStatus.statusText}. Auto-Bot and manual trades safely paused until market opens.
                  </span>
                </div>
                <button
                  onClick={() => handleToggleMarketMode("24_7_PRACTICE")}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold whitespace-nowrap"
                >
                  Switch to 24/7 Practice &rarr;
                </button>
              </div>
            )}

            {/* Live Bot Audit Terminal Console */}
            <div className="mt-3 bg-[#05070D] rounded-lg border border-terminal-border/80 p-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-terminal-border/50 text-gray-400 text-[10px] flex-wrap gap-2">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-blue-400" />
                  <span>AUTONOMOUS ENGINE LOG AUDIT</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                    <Send className="w-2.5 h-2.5" />
                    <span>TG: @profitcatcher_bot</span>
                  </span>
                  <button
                    onClick={handleTestTelegram}
                    disabled={isTestingTg}
                    className="text-[10px] px-2 py-0.5 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 hover:text-white border border-sky-500/40 font-mono transition-all disabled:opacity-50"
                    title="Send test ping to Telegram channel"
                  >
                    {isTestingTg ? "Pinging..." : "Test Ping"}
                  </button>
                  <span>{(account.auto_bot?.logs || []).length} events</span>
                </div>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
                {(account.auto_bot?.logs || []).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-tight">
                    <span className="text-gray-500 shrink-0">
                      {typeof log.timestamp === "number" && !isNaN(log.timestamp)
                        ? new Date(log.timestamp).toLocaleTimeString()
                        : "--:--:--"}
                    </span>
                    <span
                      className={`${
                        log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "trade"
                          ? "text-cyan-300 font-bold"
                          : log.type === "warning"
                          ? "text-amber-300"
                          : "text-gray-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 1-Click Order Execution Workbench */}
          <div className="p-4 rounded-xl bg-terminal-card border border-terminal-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                1-Click Manual Execution Workbench (XAUUSD)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAction("BUY")}
                  className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all ${
                    action === "BUY"
                      ? "bg-bull text-black shadow-md shadow-bull/20"
                      : "bg-terminal-bg text-gray-400 hover:text-white"
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setAction("SELL")}
                  className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all ${
                    action === "SELL"
                      ? "bg-bear text-white shadow-md shadow-bear/20"
                      : "bg-terminal-bg text-gray-400 hover:text-white"
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Lot Size */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-terminal-muted">Lot Size (0.02 Standard All Pairs):</span>
                  <button
                    onClick={handleAutoSafeLot}
                    className="text-[10px] text-accent hover:underline font-mono"
                  >
                    0.02 Fixed Lot
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.05"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.02)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 font-mono text-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* Stop Loss */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-terminal-muted">Stop Loss (SL):</span>
                  <span className="text-[10px] font-mono text-rose-400">
                    Risk: -${potentialLoss.toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 font-mono text-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* Take Profit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-terminal-muted">Take Profit (TP):</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Target: +${potentialGain.toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 font-mono text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Risk / Reward Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] px-3 py-2 rounded bg-terminal-bg border border-terminal-border/60 text-terminal-muted font-mono gap-1 sm:gap-0">
              <span>Risk:Reward: <strong className="text-white font-bold">{rrRatio}</strong></span>
              <span>Potential Loss: <strong className="text-rose-400">-${potentialLoss.toFixed(2)}</strong></span>
              <span>Potential Gain: <strong className="text-emerald-400">+${potentialGain.toFixed(2)}</strong></span>
            </div>

            {/* Weekend Closed Warning Banner for Manual Workbench */}
            {account.auto_bot.market_mode === "STRICT_REAL" && !marketStatus.isOpen && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Real Market Hours: Orders blocked for weekend ({marketStatus.statusText}).</span>
                </div>
                <button
                  onClick={() => handleToggleMarketMode("24_7_PRACTICE")}
                  className="text-amber-400 underline hover:text-amber-200 text-[11px] font-bold"
                >
                  Switch to 24/7 Practice Mode
                </button>
              </div>
            )}

            {/* Big Execute Button */}
            <button
              onClick={handleExecute}
              className={`w-full py-2.5 px-3 rounded-lg font-mono font-bold text-xs sm:text-sm transition-all shadow-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
                action === "BUY"
                  ? "bg-bull hover:bg-bull/90 text-black shadow-bull/20"
                  : "bg-bear hover:bg-bear/90 text-white shadow-bear/20"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 shrink-0" />
                <span>Execute {action} {lotSize} XAUUSD @ ${currentOpenPrice.toFixed(2)}</span>
              </div>
              <span className="text-[10px] sm:text-xs opacity-85 font-normal sm:font-bold">
                (SL: ${stopLoss.toFixed(2)} • TP: ${takeProfit.toFixed(2)})
              </span>
            </button>
          </div>

          {/* Positions & Trade History Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 border-b border-terminal-border pb-1">
              <button
                onClick={() => setActiveTab("positions")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono transition-all border-b-2 ${
                  activeTab === "positions"
                    ? "border-accent text-accent"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <span>Open Positions ({account.open_positions.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono transition-all border-b-2 ${
                  activeTab === "history"
                    ? "border-accent text-accent"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Trade History ({account.history.length})</span>
                {totalTrades > 0 && (
                  <span className="text-[10px] text-emerald-400">
                    ({winRate}% Win Rate • ${totalClosedProfit >= 0 ? "+" : ""}${totalClosedProfit.toFixed(2)})
                  </span>
                )}
              </button>
            </div>

            {activeTab === "positions" ? (
              <div>
                {account.open_positions.length === 0 ? (
                  <div className="text-center py-8 text-terminal-muted text-xs border border-dashed border-terminal-border rounded-lg">
                    No active positions currently open. Execute a trade above or turn on the 4H PO3 Auto-Bot.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-terminal-border rounded-lg">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="bg-[#070A0F] text-terminal-muted uppercase text-[10px] border-b border-terminal-border">
                        <tr>
                          <th className="px-3 py-2">Ticket</th>
                          <th className="px-3 py-2">Side</th>
                          <th className="px-3 py-2">Lots</th>
                          <th className="px-3 py-2">Open Price</th>
                          <th className="px-3 py-2">Current</th>
                          <th className="px-3 py-2">SL / TP</th>
                          <th className="px-3 py-2">Floating P&L</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-terminal-border bg-terminal-card/50">
                        {account.open_positions.map((pos) => (
                          <tr key={pos.ticket} className="hover:bg-terminal-hover/40">
                            <td className="px-3 py-2 font-bold text-gray-300">
                              #{pos.ticket}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  pos.type === "BUY"
                                    ? "bg-bull/20 text-bull border border-bull/40"
                                    : "bg-bear/20 text-bear border border-bear/40"
                                }`}
                              >
                                {pos.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-white">{pos.volume}</td>
                            <td className="px-3 py-2 text-gray-300">
                              ${fmt2(pos.price_open)}
                            </td>
                            <td className="px-3 py-2 text-gray-200">
                              ${fmt2(pos.price_current)}
                            </td>
                            <td className="px-3 py-2 text-terminal-muted text-[11px]">
                              <span>SL: ${fmt2(pos.sl)}</span>
                              <br />
                              <span>TP: ${fmt2(pos.tp)}</span>
                            </td>
                            <td className="px-3 py-2 font-bold">
                              <span
                                className={`${
                                  (pos.profit || 0) >= 0 ? "text-bull" : "text-bear"
                                }`}
                              >
                                {(pos.profit || 0) >= 0 ? "+" : ""}${fmt2(pos.profit)}
                              </span>
                              {pos.be_triggered && (
                                <span className="ml-1 text-[9px] px-1 rounded bg-blue-500/20 text-blue-400">
                                  BE
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right space-x-1.5">
                              {!pos.be_triggered && (
                                <button
                                  onClick={() => handleBE(pos.ticket)}
                                  className="px-2 py-1 text-[10px] rounded bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 font-bold transition-all"
                                  title="Move Stop Loss to entry price"
                                >
                                  🛡️ BE
                                </button>
                              )}
                              <button
                                onClick={() => handleClose(pos.ticket)}
                                className="px-2 py-1 text-[10px] rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold transition-all"
                                title="Close position now at market"
                              >
                                ✖ Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {account.history.length === 0 ? (
                  <div className="text-center py-8 text-terminal-muted text-xs border border-dashed border-terminal-border rounded-lg">
                    No closed trades recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-terminal-border rounded-lg max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="bg-[#070A0F] text-terminal-muted uppercase text-[10px] border-b border-terminal-border sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Ticket</th>
                          <th className="px-3 py-2">Side</th>
                          <th className="px-3 py-2">Lots</th>
                          <th className="px-3 py-2">Open / Close</th>
                          <th className="px-3 py-2">Exit Reason</th>
                          <th className="px-3 py-2 text-right">Profit / Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-terminal-border bg-terminal-card/50">
                        {account.history.map((t) => (
                          <tr key={t.ticket} className="hover:bg-terminal-hover/40">
                            <td className="px-3 py-2 font-bold text-gray-300">#{t.ticket}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  t.type === "BUY"
                                    ? "bg-bull/20 text-bull border border-bull/40"
                                    : "bg-bear/20 text-bear border border-bear/40"
                                }`}
                              >
                                {t.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-white">{t.volume}</td>
                            <td className="px-3 py-2 text-gray-300 text-[11px]">
                              ${fmt2(t.price_open)} → ${fmt2(t.price_close)}
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-[11px]">
                              {t.close_reason}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              <span
                                className={`${
                                  (t.profit || 0) >= 0 ? "text-bull" : "text-bear"
                                }`}
                              >
                                {(t.profit || 0) >= 0 ? "+" : ""}${fmt2(t.profit)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-[#070A0F] border-t border-terminal-border/70 flex items-center justify-between text-[11px] text-terminal-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Cloud Execution Engine Active • 0ms Internal Latency</span>
          </div>
          <span className="font-mono">
            Vercel Serverless Ready • LocalStorage Persisted
          </span>
        </div>
      </div>
    </div>
  );
};
