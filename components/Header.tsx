"use client";

import React, { useState, useEffect } from "react";
import { AssetSymbol, Quote } from "@/lib/types";
import { INITIAL_QUOTES } from "@/lib/defaultData";
import {
  TrendingUp,
  TrendingDown,
  Camera,
  Calculator,
  Clock,
  Settings,
  Sparkles,
  Activity,
  Flame,
  ShieldCheck,
  Layers,
  Bell,
  Zap,
} from "lucide-react";

interface HeaderProps {
  activeSymbol: AssetSymbol;
  onSelectSymbol: (symbol: AssetSymbol) => void;
  onOpenLotCalc: () => void;
  onOpenSessions: () => void;
  onOpenSettings: () => void;
  onOpenScanner: () => void;
  onOpenPropGuardian?: () => void;
  onScrollToMatrix?: () => void;
  onOpenAlertsHub?: () => void;
  activeAlertCount?: number;
  onOpenMT5Panel?: () => void;
  mt5Balance?: number;
  mt5Connected?: boolean;
  onOpenDemoPanel?: () => void;
  demoBalance?: number;
  externalQuotes?: Record<AssetSymbol, Quote>;
}

export const Header: React.FC<HeaderProps> = ({
  activeSymbol,
  onSelectSymbol,
  onOpenLotCalc,
  onOpenSessions,
  onOpenSettings,
  onOpenScanner,
  onOpenPropGuardian,
  onScrollToMatrix,
  onOpenAlertsHub,
  activeAlertCount = 0,
  onOpenMT5Panel,
  mt5Balance = 3000.0,
  mt5Connected = true,
  onOpenDemoPanel,
  demoBalance = 3000.0,
  externalQuotes,
}) => {
  const [quotes, setQuotes] = useState<Record<AssetSymbol, Quote>>(externalQuotes || INITIAL_QUOTES);
  const [tickDirection, setTickDirection] = useState<Record<string, "up" | "down">>({});

  // Sync external real quotes and track real tick directions
  useEffect(() => {
    if (externalQuotes) {
      setQuotes((prev) => {
        const nextDirs: Record<string, "up" | "down"> = {};
        for (const [sym, q] of Object.entries(externalQuotes)) {
          const prevQuote = prev[sym as AssetSymbol];
          if (prevQuote && q.bid !== prevQuote.bid) {
            nextDirs[sym] = q.bid > prevQuote.bid ? "up" : "down";
          }
        }
        if (Object.keys(nextDirs).length > 0) {
          setTickDirection((td) => ({ ...td, ...nextDirs }));
        }
        return { ...prev, ...externalQuotes };
      });
    }
  }, [externalQuotes]);

  const macroSymbols: AssetSymbol[] = ["DXY", "US10Y"];
  const tradingAssets: AssetSymbol[] = ["XAUUSD", "XAGUSD", "USDJPY", "GBPUSD", "EURUSD"];

  return (
    <header className="sticky top-0 z-40 bg-terminal-bg/95 backdrop-blur border-b border-terminal-border">
      {/* Top Ticker Marquee / Barometer */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-terminal-border/60 bg-[#070A0F] overflow-x-auto scrollbar-none gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-accent font-semibold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-bull animate-live-pulse"></span>
            LIVE FEED
          </div>

          {/* Macro Dollar & Yield Barometer */}
          <div className="flex items-center gap-3 pl-2 border-l border-terminal-border/50 text-[11px]">
            <span className="text-terminal-muted flex items-center gap-1">
              <Activity className="w-3 h-3 text-accent" /> MACRO BAROMETER:
            </span>
            {macroSymbols.map((sym) => {
              const q = quotes[sym];
              const isPositive = q.change24h >= 0;
              return (
                <div key={sym} className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-300">{sym}</span>
                  <span className="font-mono text-white">{q.bid}</span>
                  <span className={`text-[10px] font-mono ${isPositive ? "text-bull" : "text-bear"}`}>
                    {isPositive ? "+" : ""}{q.change24h}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Gold / Silver Ratio */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] pl-2 border-l border-terminal-border/50">
            <span className="text-terminal-muted">XAU/XAG Ratio:</span>
            <span className="font-mono font-bold text-gold">
              {(quotes.XAUUSD.bid / quotes.XAGUSD.bid).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Sessions & Quick Links */}
        <div className="flex items-center gap-3 text-[11px] text-terminal-muted shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-bull-glow border border-bull/30 text-bull font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-bull"></span>
            LONDON / NY ACTIVE
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white leading-none">
                <span className="text-sm sm:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  APEX<span className="text-gold">FX</span>
                </span>
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono bg-blue-500/20 text-cyan-400 rounded border border-cyan-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-terminal-muted">Metals & Major FX</p>
            </div>
          </div>

          {/* Desktop Quick Asset Selector Tabs */}
          <div className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-terminal-border">
            {tradingAssets.map((sym) => {
              const q = quotes[sym];
              const isSelected = activeSymbol === sym;
              const isUp = q.change24h >= 0;
              const tick = tickDirection[sym];

              return (
                <button
                  key={sym}
                  onClick={() => onSelectSymbol(sym)}
                  className={`flex flex-col px-2.5 py-1 rounded transition-all text-left border ${
                    isSelected
                      ? "bg-terminal-card border-accent text-white shadow-sm"
                      : "border-transparent text-terminal-muted hover:text-white hover:bg-terminal-card/50"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span className={sym.includes("XAU") ? "text-gold" : sym.includes("XAG") ? "text-silver" : ""}>
                      {sym}
                    </span>
                    {isUp ? (
                      <TrendingUp className="w-3 h-3 text-bull" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-bear" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className={`font-semibold ${tick === "up" ? "text-bull" : tick === "down" ? "text-bear" : "text-gray-300"}`}>
                      {q.bid}
                    </span>
                    <span className={isUp ? "text-bull" : "text-bear"}>
                      {isUp ? "+" : ""}{q.change24h}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Internal Demo Broker Live Pill ($3,000 Balance - 100% Vercel Ready) */}
          {(onOpenDemoPanel || onOpenMT5Panel) && (
            <button
              onClick={onOpenDemoPanel || onOpenMT5Panel}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-950/70 to-teal-950/70 hover:from-emerald-900/80 hover:to-teal-900/80 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold transition-all shadow-md shadow-emerald-500/10"
              title="ApexFX Internal Demo Broker ($3,000) • 100% Vercel Ready • 4H PO3 Auto-Bot"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                <span className="hidden xs:inline">Demo: </span>${(demoBalance ?? mt5Balance ?? 3000.0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </button>
          )}

          {/* Institutional Alerts Bell Trigger */}
          {onOpenAlertsHub && (
            <button
              onClick={onOpenAlertsHub}
              className="relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 transition-all shadow-md shadow-amber-500/10"
              title="4H Breakout/Retest & AMD Radar Alerts"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="hidden sm:inline">4H Alerts</span>
              {activeAlertCount !== undefined && activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-400 text-black font-black">
                  {activeAlertCount}
                </span>
              )}
            </button>
          )}

          {/* AI Chart Scanner Trigger */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all border border-blue-400/30"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">AI Chart Scanner</span>
            <span className="sm:hidden text-xs">AI Scan</span>
            <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse hidden sm:inline" />
          </button>

          {/* MTF Matrix Quick Jump */}
          {onScrollToMatrix && (
            <button
              onClick={onScrollToMatrix}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-terminal-card hover:bg-terminal-hover text-gray-300 hover:text-white border border-terminal-border transition-all"
              title="Multi-Timeframe SMC Confluence Matrix"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>MTF Matrix</span>
            </button>
          )}

          {/* Prop Firm Drawdown Guardian */}
          {onOpenPropGuardian && (
            <button
              onClick={onOpenPropGuardian}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-white border border-emerald-500/40 transition-all shadow-sm shadow-emerald-500/10"
              title="Prop Firm Drawdown & Daily Buffer Guardian"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Prop Guardian</span>
              <span className="sm:hidden">Guardian</span>
            </button>
          )}

          {/* Lot Size Calculator */}
          <button
            onClick={onOpenLotCalc}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-terminal-card hover:bg-terminal-hover text-gray-300 hover:text-white border border-terminal-border transition-all"
            title="Gold & Forex Lot Size Risk Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-accent" />
            <span>Lot Calculator</span>
          </button>

          {/* Session Clock */}
          <button
            onClick={onOpenSessions}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-terminal-card hover:bg-terminal-hover text-gray-300 hover:text-white border border-terminal-border transition-all"
            title="Global Forex Sessions"
          >
            <Clock className="w-3.5 h-3.5 text-gold" />
            <span>Sessions</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md bg-terminal-card hover:bg-terminal-hover text-gray-400 hover:text-white border border-terminal-border transition-all"
            title="Configure AI API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Asset Quick-Switcher Strip */}
      <div className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-[#070A0F] border-t border-terminal-border/60 overflow-x-auto scrollbar-none">
        {tradingAssets.map((sym) => {
          const q = quotes[sym];
          const isSelected = activeSymbol === sym;
          const isUp = q.change24h >= 0;
          return (
            <button
              key={sym}
              onClick={() => onSelectSymbol(sym)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-terminal-card border-accent text-white shadow-sm"
                  : "border-terminal-border/40 text-terminal-muted hover:text-white"
              }`}
            >
              <span className={sym.includes("XAU") ? "text-gold" : sym.includes("XAG") ? "text-silver" : ""}>
                {sym}
              </span>
              <span className={`text-[10px] ${isUp ? "text-bull" : "text-bear"}`}>
                {isUp ? "+" : ""}{q.change24h}%
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
