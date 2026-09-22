"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  AlertTriangle,
  RefreshCw,
  Zap,
  Terminal,
  DollarSign,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface MT5Position {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  profit: number;
  comment: string;
  time: number;
}

interface MT5AccountData {
  connected: boolean;
  login?: number;
  name?: string;
  server?: string;
  balance?: number;
  equity?: number;
  margin?: number;
  margin_free?: number;
  leverage?: number;
  trade_allowed?: boolean;
  trade_expert?: boolean;
  open_profit?: number;
  open_positions?: MT5Position[];
  nifty?: {
    bid: number;
    ask: number;
    spread: number;
  };
  auto_bot?: {
    enabled: boolean;
    risk_percent: number;
    logs: string[];
  };
  error?: string;
}

interface MT5TradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prefillSetup?: {
    action: "BUY" | "SELL";
    suggestedEntry: number;
    stopLoss: number;
    takeProfit1: number;
  } | null;
}

export const MT5TradingPanel: React.FC<MT5TradingPanelProps> = ({
  isOpen,
  onClose,
  prefillSetup,
}) => {
  const [account, setAccount] = useState<MT5AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // Order state
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [lotSize, setLotSize] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<number>(23280.0);
  const [takeProfit, setTakeProfit] = useState<number>(23450.0);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);

  // Sync prefill setup if passed from 4H PO3 alert
  useEffect(() => {
    if (prefillSetup) {
      setAction(prefillSetup.action);
      if (prefillSetup.stopLoss) setStopLoss(prefillSetup.stopLoss);
      if (prefillSetup.takeProfit1) setTakeProfit(prefillSetup.takeProfit1);
    }
  }, [prefillSetup]);

  // Fetch MT5 status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/mt5");
      if (res.ok) {
        const data = await res.json();
        setAccount(data);
        const tick = data.nifty;
        if (tick && !prefillSetup) {
          if (action === "BUY") {
            setStopLoss(round2(tick.ask - 40.0));
            setTakeProfit(round2(tick.ask + 80.0));
          } else {
            setStopLoss(round2(tick.bid + 40.0));
            setTakeProfit(round2(tick.bid - 80.0));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch MT5 status:", e);
    }
  }, [action, prefillSetup]);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchStatus]);

  const round2 = (num: number) => Math.round(num * 100) / 100;

  // Calculate safe lot for $3,000 account
  const calculateAutoLot = (slDistance: number) => {
    const eq = account?.equity || 3000.0;
    const riskDollar = (eq * riskPercent) / 100.0; // $30 on $3,000
    if (slDistance <= 0) return 0.01;
    // Gold contract is 100 oz per lot
    const lot = riskDollar / (slDistance * 100.0);
    return Math.max(0.01, Math.min(0.05, Math.floor(lot * 100) / 100));
  };

  const handleExecuteTrade = async (chosenAction: "BUY" | "SELL") => {
    setExecuting(true);
    setStatusMessage({ type: null, text: "" });

    try {
      const res = await fetch("/api/mt5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "trade",
          symbol: "NIFTY",
          action: chosenAction,
          lot: lotSize,
          sl: stopLoss,
          tp: takeProfit,
          comment: "Apex_Nifty_F&O",
          risk_percent: riskPercent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Executed #${data.order}: ${chosenAction} ${lotSize} NIFTY @ ${data.price}`,
        });
        fetchStatus();
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Trade rejected by MT5",
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Execution failed",
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleClosePosition = async (ticket?: number, closeAll = false) => {
    try {
      const res = await fetch("/api/mt5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "close",
          ticket,
          close_all: closeAll,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: data.message });
        fetchStatus();
      } else {
        setStatusMessage({ type: "error", text: data.error });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToBreakEven = async (ticket: number) => {
    try {
      const res = await fetch("/api/mt5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "modify",
          ticket,
          break_even: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: data.message });
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAutoBot = async () => {
    try {
      const nextState = !account?.auto_bot?.enabled;
      const res = await fetch("/api/mt5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "auto-bot",
          enabled: nextState,
          risk_percent: riskPercent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const currentBid = account?.nifty?.bid || 23329.00;
  const currentAsk = account?.nifty?.ask || 23330.50;
  const slDist = action === "BUY" ? Math.max(0.5, currentAsk - stopLoss) : Math.max(0.5, stopLoss - currentBid);
  const potentialRisk = round2(slDist * lotSize * 25);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-terminal-card border border-terminal-border rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#080C14] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  MetaTrader 5 Live Bridge & 4H PO3 Execution Terminal
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {account?.server || "MetaQuotes-Demo"} #{account?.login || "112917195"}
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted">
                Direct Local Terminal Execution • Indian F&O & MCX Contract • Standard Risk Model
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              className="p-1.5 rounded text-terminal-muted hover:text-white hover:bg-terminal-hover transition-colors"
              title="Refresh MT5 Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-terminal-muted hover:text-white hover:bg-terminal-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Account Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-[#05080E] border-b border-terminal-border text-xs font-mono">
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted uppercase block">Account Balance</span>
            <span className="text-sm font-bold text-white">
              ${account?.balance?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "3,000.00"}
            </span>
          </div>

          <div className="p-2 rounded bg-terminal-bg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted uppercase block">Equity</span>
            <span className="text-sm font-bold text-cyan-300">
              ${account?.equity?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "3,000.00"}
            </span>
          </div>

          <div className="p-2 rounded bg-terminal-bg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted uppercase block">Free Margin</span>
            <span className="text-sm font-bold text-gray-200">
              ${account?.margin_free?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "3,000.00"}
            </span>
          </div>

          <div className="p-2 rounded bg-terminal-bg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted uppercase block">Open Floating P&L</span>
            <span
              className={`text-sm font-bold ${
                (account?.open_profit || 0) >= 0 ? "text-bull" : "text-bear"
              }`}
            >
              {(account?.open_profit || 0) >= 0 ? "+" : ""}$
              {account?.open_profit?.toFixed(2) || "0.00"}
            </span>
          </div>

          <div className="p-2 rounded bg-terminal-bg border border-terminal-border col-span-2 sm:col-span-1">
            <span className="text-[10px] text-terminal-muted uppercase block">NIFTY Live Quote</span>
            <div className="flex items-center gap-1.5 text-xs font-bold mt-0.5">
              <span className="text-bear">{currentBid}</span>
              <span className="text-terminal-muted">/</span>
              <span className="text-bull">{currentAsk}</span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Status Message Toast */}
          {statusMessage.text && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
                statusMessage.type === "success"
                  ? "bg-bull-glow text-bull border border-bull/40"
                  : "bg-bear-glow text-bear border border-bear/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage({ type: null, text: "" })}
                className="text-[10px] underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Autonomous 4H PO3 Auto-Bot Section */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/30 via-indigo-950/20 to-blue-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                  4H PO3 & Breakout Autonomous Execution Bot
                </h4>
                <span
                  className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                    account?.auto_bot?.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {account?.auto_bot?.enabled ? "● RUNNING" : "○ PAUSED"}
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted max-w-xl">
                Continuously evaluates Volume Profile VAH/VAL/POC levels directly on your broker rates.
                Auto-executes with strict risk management and trails Stop Loss to Break-Even at target.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleAutoBot}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                  account?.auto_bot?.enabled
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                }`}
              >
                {account?.auto_bot?.enabled ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause Auto-Bot</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Activate Auto-Bot</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 1-Click Order Execution Workbench */}
          <div className="p-3 bg-[#080C14] rounded-xl border border-terminal-border space-y-3">
            <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  1-Click Order Execution Workbench (NIFTY)
                </h4>
              </div>

              {/* Risk Sizing Selector */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-terminal-muted text-[11px]">Risk Model:</span>
                {[0.5, 1.0, 1.5].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      setRiskPercent(pct);
                      const lot = calculateAutoLot(slDist);
                      setLotSize(lot);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      riskPercent === pct
                        ? "bg-cyan-500 text-black"
                        : "bg-terminal-bg text-terminal-muted hover:text-white"
                    }`}
                  >
                    {pct}% (${((3000 * pct) / 100).toFixed(0)})
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              {/* Lot Size */}
              <div className="space-y-1">
                <label className="text-[10px] text-terminal-muted uppercase block">
                  Lot Size (Max 0.05)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.05"
                    value={lotSize}
                    onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                    className="w-full px-2.5 py-1.5 rounded bg-terminal-bg border border-terminal-border text-white font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => setLotSize(calculateAutoLot(slDist))}
                    className="px-2 py-1.5 rounded bg-terminal-card border border-terminal-border text-[10px] hover:text-cyan-400"
                    title="Auto-calculate safe lot based on $3,000 balance"
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Stop Loss */}
              <div className="space-y-1">
                <label className="text-[10px] text-terminal-muted uppercase block flex items-center justify-between">
                  <span>Stop Loss (SL)</span>
                  <span className="text-bear">{slDist.toFixed(1)} pts</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded bg-terminal-bg border border-bear/40 text-bear font-bold focus:outline-none"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1">
                <label className="text-[10px] text-terminal-muted uppercase block">
                  Take Profit (TP)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#05080E] border border-terminal-border rounded px-3 py-1.5 text-white font-mono text-xs focus:border-accent outline-none"
                />
              </div>
            </div>

            {/* Execution Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleExecuteTrade("BUY")}
                disabled={executing}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <TrendingUp className="w-4 h-4" />
                <span>
                  {executing ? "Sending Order..." : `⚡ BUY ${lotSize} NIFTY @ ${currentAsk}`}
                </span>
              </button>

              <button
                onClick={() => handleExecuteTrade("SELL")}
                disabled={executing}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs tracking-wider transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <TrendingDown className="w-4 h-4" />
                <span>
                  {executing ? "Sending Order..." : `⚡ SELL ${lotSize} NIFTY @ ${currentBid}`}
                </span>
              </button>
            </div>
          </div>

          {/* Live Open Positions Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Active MT5 Open Positions ({account?.open_positions?.length || 0})
                </h4>
              </div>

              {account?.open_positions && account.open_positions.length > 0 && (
                <button
                  onClick={() => handleClosePosition(undefined, true)}
                  className="px-2.5 py-1 rounded bg-bear/20 hover:bg-bear/30 text-bear border border-bear/40 text-[10px] font-bold transition-colors"
                >
                  Close All Trades
                </button>
              )}
            </div>

            {(!account?.open_positions || account.open_positions.length === 0) ? (
              <div className="p-6 text-center text-terminal-muted bg-[#080C14] rounded-lg border border-terminal-border text-xs">
                No active open trades on your MT5 terminal. Ready to execute!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-terminal-border bg-[#080C14]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0C101A] text-terminal-muted text-[10px] uppercase border-b border-terminal-border">
                    <tr>
                      <th className="p-2.5">Ticket</th>
                      <th className="p-2.5">Symbol</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Volume</th>
                      <th className="p-2.5">Open Price</th>
                      <th className="p-2.5">Current</th>
                      <th className="p-2.5">SL / TP</th>
                      <th className="p-2.5">Profit ($)</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/50 text-gray-200">
                    {account.open_positions.map((pos) => {
                      const isPosBuy = pos.type === "BUY";
                      return (
                        <tr key={pos.ticket} className="hover:bg-terminal-card/50">
                          <td className="p-2.5 font-bold text-gray-400">#{pos.ticket}</td>
                          <td className="p-2.5 font-bold text-white">{pos.symbol}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPosBuy ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"
                              }`}
                            >
                              {pos.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold">{pos.volume}</td>
                          <td className="p-2.5 text-gray-300">{pos.price_open}</td>
                          <td className="p-2.5 text-cyan-300 font-bold">{pos.price_current}</td>
                          <td className="p-2.5 text-[10px] text-terminal-muted">
                            SL: {pos.sl || "None"} | TP: {pos.tp || "None"}
                          </td>
                          <td
                            className={`p-2.5 font-bold ${
                              pos.profit >= 0 ? "text-bull" : "text-bear"
                            }`}
                          >
                            {pos.profit >= 0 ? "+" : ""}${pos.profit.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right space-x-1">
                            <button
                              onClick={() => handleMoveToBreakEven(pos.ticket)}
                              className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] transition-colors"
                              title="Move Stop Loss to Break-Even"
                            >
                              BE
                            </button>
                            <button
                              onClick={() => handleClosePosition(pos.ticket)}
                              className="px-2 py-0.5 rounded bg-bear/20 hover:bg-bear/30 text-bear border border-bear/40 text-[10px] transition-colors"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#080B10] border-t border-terminal-border flex items-center justify-between text-xs text-terminal-muted">
          <span>ApexFX MetaTrader 5 Bridge • 127.0.0.1:5001</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-terminal-bg hover:bg-terminal-hover text-gray-300 border border-terminal-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
