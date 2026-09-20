"use client";

import React, { useState } from "react";
import { PROP_FIRM_PROFILES } from "@/lib/defaultData";
import { ShieldCheck, ShieldAlert, AlertTriangle, Calculator, X, DollarSign, Lock, RefreshCw } from "lucide-react";

interface PropFirmGuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PropFirmGuardianModal: React.FC<PropFirmGuardianModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFirm, setSelectedFirm] = useState(PROP_FIRM_PROFILES[0].id);
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [startingBalance, setStartingBalance] = useState<number>(100000);
  const [currentEquity, setCurrentEquity] = useState<number>(99200);
  const [stopLossDistance, setStopLossDistance] = useState<number>(15); // e.g. $15 for Gold or 15 pips for FX
  const [riskPerTradePercent, setRiskPerTradePercent] = useState<number>(0.5); // 0.5% risk

  if (!isOpen) return null;

  const firm = PROP_FIRM_PROFILES.find((f) => f.id === selectedFirm) || PROP_FIRM_PROFILES[0];

  // Calculations
  const maxDailyLossAllowed = (accountSize * firm.maxDailyLossPercent) / 100;
  const maxTotalLossAllowed = (accountSize * firm.maxTotalLossPercent) / 100;

  // Daily drawdown used today
  const dailyLossSoFar = Math.max(0, startingBalance - currentEquity);
  const dailyLossRemaining = Math.max(0, maxDailyLossAllowed - dailyLossSoFar);
  const dailyBufferPercent = (dailyLossRemaining / maxDailyLossAllowed) * 100;

  // Total drawdown used
  const totalLossSoFar = Math.max(0, accountSize - currentEquity);
  const totalLossRemaining = Math.max(0, maxTotalLossAllowed - totalLossSoFar);
  const totalBufferPercent = (totalLossRemaining / maxTotalLossAllowed) * 100;

  // Safe Dollar Risk based on chosen % (e.g. 0.5% of account)
  const safeDollarRisk = (accountSize * riskPerTradePercent) / 100;

  // Max Safe Lot Size
  // Gold: 1 lot = 100 oz -> $1 SL move = $100 loss per lot
  const maxGoldLots = +(safeDollarRisk / (stopLossDistance * 100)).toFixed(2);

  // FX: 1 lot = 100,000 units -> 1 pip SL move = $10 loss per lot
  const maxFxLots = +(safeDollarRisk / (stopLossDistance * 10)).toFixed(2);

  // Status Indicator
  const isDanger = dailyBufferPercent < 20 || totalBufferPercent < 20;
  const isCaution = (dailyBufferPercent < 50 || totalBufferPercent < 50) && !isDanger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#0D121D] border border-terminal-border rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-[#090D15] border-b border-terminal-border">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border ${
                isDanger
                  ? "bg-bear/20 text-bear border-bear/40"
                  : isCaution
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                  : "bg-bull/20 text-bull border-bull/40"
              }`}
            >
              {isDanger ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isCaution ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Prop Firm Drawdown Guardian
                </h3>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                    isDanger
                      ? "bg-bear text-white"
                      : isCaution
                      ? "bg-yellow-400 text-black"
                      : "bg-bull text-black"
                  }`}
                >
                  {isDanger ? "LOCKOUT RISK" : isCaution ? "CAUTION" : "SAFE ZONE"}
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted">
                Rule violation protector & maximum safe position size engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-terminal-muted hover:text-white hover:bg-terminal-card transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Firm & Tier Select */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Prop Firm Model
              </label>
              <select
                value={selectedFirm}
                onChange={(e) => setSelectedFirm(e.target.value)}
                className="w-full bg-[#080B11] border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-accent outline-none"
              >
                {PROP_FIRM_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Daily {p.maxDailyLossPercent}% / Max {p.maxTotalLossPercent}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Account Size ($)
              </label>
              <select
                value={accountSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAccountSize(val);
                  setStartingBalance(val);
                  setCurrentEquity(val);
                }}
                className="w-full bg-[#080B11] border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-accent outline-none"
              >
                <option value={10000}>$10,000</option>
                <option value={25000}>$25,000</option>
                <option value={50000}>$50,000</option>
                <option value={100000}>$100,000</option>
                <option value={200000}>$200,000</option>
              </select>
            </div>
          </div>

          {/* Balance & Equity Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Day Starting Balance ($)
              </label>
              <input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                className="w-full bg-[#080B11] border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-accent outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Current Live Equity ($)
              </label>
              <input
                type="number"
                value={currentEquity}
                onChange={(e) => setCurrentEquity(Number(e.target.value))}
                className="w-full bg-[#080B11] border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-accent outline-none"
              />
            </div>
          </div>

          {/* Real-time Drawdown Gauges */}
          <div className="grid grid-cols-2 gap-3">
            {/* Daily Drawdown Gauge */}
            <div className="p-3 rounded-lg bg-[#080B11] border border-terminal-border/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-terminal-muted">Daily Loss Buffer:</span>
                <span className={`font-bold ${isDanger ? "text-bear" : "text-bull"}`}>
                  ${dailyLossRemaining.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-terminal-border/40">
                <div
                  className={`h-full rounded-full transition-all ${
                    dailyBufferPercent < 25 ? "bg-bear" : dailyBufferPercent < 50 ? "bg-yellow-400" : "bg-bull"
                  }`}
                  style={{ width: `${Math.min(100, dailyBufferPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-terminal-muted">
                <span>Max Allowed: ${maxDailyLossAllowed}</span>
                <span>Used: ${dailyLossSoFar.toFixed(2)}</span>
              </div>
            </div>

            {/* Total Drawdown Gauge */}
            <div className="p-3 rounded-lg bg-[#080B11] border border-terminal-border/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-terminal-muted">Max Loss Buffer:</span>
                <span className={`font-bold ${totalBufferPercent < 25 ? "text-bear" : "text-bull"}`}>
                  ${totalLossRemaining.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-terminal-border/40">
                <div
                  className={`h-full rounded-full transition-all ${
                    totalBufferPercent < 25 ? "bg-bear" : totalBufferPercent < 50 ? "bg-yellow-400" : "bg-cyan-400"
                  }`}
                  style={{ width: `${Math.min(100, totalBufferPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-terminal-muted">
                <span>Max Allowed: ${maxTotalLossAllowed}</span>
                <span>Used: ${totalLossSoFar.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Position Sizing Guard */}
          <div className="p-3.5 rounded-lg bg-[#090D16] border border-accent/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent uppercase flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Maximum Safe Lot Size Lockout
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-terminal-muted">Risk/Trade:</span>
                <select
                  value={riskPerTradePercent}
                  onChange={(e) => setRiskPerTradePercent(Number(e.target.value))}
                  className="bg-[#080B11] border border-terminal-border rounded px-1.5 py-0.5 text-white font-mono"
                >
                  <option value={0.25}>0.25% ($ {(accountSize * 0.0025).toFixed(0)})</option>
                  <option value={0.5}>0.50% ($ {(accountSize * 0.005).toFixed(0)})</option>
                  <option value={1.0}>1.00% ($ {(accountSize * 0.01).toFixed(0)})</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Gold Position */}
              <div className="p-2.5 rounded bg-[#080B11] border border-terminal-border/60">
                <span className="text-[10px] text-gold font-bold block mb-1">GOLD (XAU/USD - 100oz)</span>
                <div className="text-lg font-bold text-white font-mono">{maxGoldLots} Lots</div>
                <span className="text-[9px] text-terminal-muted block">
                  Based on ${stopLossDistance} Stop Loss distance
                </span>
              </div>

              {/* FX Position */}
              <div className="p-2.5 rounded bg-[#080B11] border border-terminal-border/60">
                <span className="text-[10px] text-cyan-300 font-bold block mb-1">FOREX (EUR, GBP, JPY)</span>
                <div className="text-lg font-bold text-white font-mono">{maxFxLots} Lots</div>
                <span className="text-[9px] text-terminal-muted block">
                  Based on {stopLossDistance} Pips Stop Loss distance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3 bg-[#090D15] border-t border-terminal-border">
          <div className="flex items-center gap-1 text-[10px] text-terminal-muted">
            <Lock className="w-3 h-3 text-accent" />
            <span>Settings saved automatically to local terminal state</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-accent hover:bg-accent/90 text-white transition-all shadow-md"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
