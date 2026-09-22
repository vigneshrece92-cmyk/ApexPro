"use client";

import React, { useState } from "react";
import { PROP_FIRM_PROFILES } from "@/lib/defaultData";
import { ShieldCheck, ShieldAlert, AlertTriangle, Calculator, X, Lock } from "lucide-react";

interface PropFirmGuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PropFirmGuardianModal: React.FC<PropFirmGuardianModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFirm, setSelectedFirm] = useState(PROP_FIRM_PROFILES[0].id);
  const [accountSize, setAccountSize] = useState<number>(500000); // ₹5,00,000 default Indian prop/f&o capital
  const [startingBalance, setStartingBalance] = useState<number>(500000);
  const [currentEquity, setCurrentEquity] = useState<number>(496000);
  const [stopLossPoints, setStopLossPoints] = useState<number>(25); // 25 index points SL
  const [riskPerTradePercent, setRiskPerTradePercent] = useState<number>(0.5); // 0.5% risk

  if (!isOpen) return null;

  const firm = PROP_FIRM_PROFILES.find((f) => f.id === selectedFirm) || PROP_FIRM_PROFILES[0];

  // Calculations in INR
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

  // Safe Rupee Risk based on chosen % (e.g. 0.5% of account)
  const safeRupeeRisk = (accountSize * riskPerTradePercent) / 100;

  // Max Safe Lot Sizes:
  // NIFTY 50: 25 qty per lot -> 1 point SL = ₹25/lot
  const maxNiftyLots = Math.max(1, Math.floor(safeRupeeRisk / (stopLossPoints * 25)));

  // BANK NIFTY: 15 qty per lot -> 1 point SL = ₹15/lot (usually 60-80 pt SL)
  const bankNiftySl = stopLossPoints * 2.5;
  const maxBankNiftyLots = Math.max(1, Math.floor(safeRupeeRisk / (bankNiftySl * 15)));

  // MCX CRUDE OIL: 100 bbl per lot -> 1 point SL = ₹100/lot (20-30 pt SL)
  const crudeSl = Math.max(10, stopLossPoints);
  const maxCrudeLots = Math.max(1, Math.floor(safeRupeeRisk / (crudeSl * 100)));

  // MCX NATURAL GAS: 1250 mmBtu per lot -> 1 point SL = ₹1250/lot (2-3 pt SL)
  const natGasSl = Math.max(1.5, +(stopLossPoints * 0.1).toFixed(1));
  const maxNatGasLots = Math.max(1, Math.floor(safeRupeeRisk / (natGasSl * 1250)));

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
                  F&O & MCX Capital Drawdown Guardian
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
                Indian account capital protection & maximum safe lot sizing engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Rules & Profile Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Risk Management Profile
              </label>
              <select
                value={selectedFirm}
                onChange={(e) => setSelectedFirm(e.target.value)}
                className="w-full bg-[#080B11] border border-terminal-border rounded px-2.5 py-1.5 text-white font-mono focus:border-accent outline-none"
              >
                {PROP_FIRM_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Max {p.maxDailyLossPercent}% Daily)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Account Capital Size
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
                <option value={100000}>₹1,00,000 (1 Lakh)</option>
                <option value={250000}>₹2,50,000 (2.5 Lakhs)</option>
                <option value={500000}>₹5,00,000 (5 Lakhs)</option>
                <option value={1000000}>₹10,00,000 (10 Lakhs)</option>
                <option value={2500000}>₹25,00,000 (25 Lakhs)</option>
              </select>
            </div>
          </div>

          {/* Balance & Equity Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-terminal-muted mb-1">
                Day Starting Balance (₹)
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
                Current Live Equity (₹)
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
                  ₹{dailyLossRemaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
                <span>Max: ₹{maxDailyLossAllowed.toLocaleString("en-IN")}</span>
                <span>Used: ₹{dailyLossSoFar.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Total Drawdown Gauge */}
            <div className="p-3 rounded-lg bg-[#080B11] border border-terminal-border/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-terminal-muted">Max Loss Buffer:</span>
                <span className={`font-bold ${totalBufferPercent < 25 ? "text-bear" : "text-bull"}`}>
                  ₹{totalLossRemaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
                <span>Max: ₹{maxTotalLossAllowed.toLocaleString("en-IN")}</span>
                <span>Used: ₹{totalLossSoFar.toLocaleString("en-IN")}</span>
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
                  <option value={0.25}>0.25% (₹{(accountSize * 0.0025).toLocaleString("en-IN")})</option>
                  <option value={0.5}>0.50% (₹{(accountSize * 0.005).toLocaleString("en-IN")})</option>
                  <option value={1.0}>1.00% (₹{(accountSize * 0.01).toLocaleString("en-IN")})</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* NIFTY 50 */}
              <div className="p-2.5 rounded bg-[#080B11] border border-terminal-border/60">
                <span className="text-[10px] text-cyan-400 font-bold block mb-1">NIFTY 50 (25 Qty)</span>
                <div className="text-base font-bold text-white font-mono">{maxNiftyLots} Lots</div>
                <span className="text-[9px] text-terminal-muted block">{maxNiftyLots * 25} Qty @ {stopLossPoints} pt SL</span>
              </div>

              {/* BANK NIFTY */}
              <div className="p-2.5 rounded bg-[#080B11] border border-terminal-border/60">
                <span className="text-[10px] text-blue-300 font-bold block mb-1">BANK NIFTY (15 Qty)</span>
                <div className="text-base font-bold text-white font-mono">{maxBankNiftyLots} Lots</div>
                <span className="text-[9px] text-terminal-muted block">{maxBankNiftyLots * 15} Qty @ {bankNiftySl} pt SL</span>
              </div>

              {/* MCX CRUDE */}
              <div className="p-2.5 rounded bg-[#080B11] border border-terminal-border/60">
                <span className="text-[10px] text-amber-400 font-bold block mb-1">CRUDE OIL (100 Qty)</span>
                <div className="text-base font-bold text-white font-mono">{maxCrudeLots} Lots</div>
                <span className="text-[9px] text-terminal-muted block">{maxCrudeLots * 100} Bbl @ {crudeSl} pt SL</span>
              </div>

              {/* MCX NAT GAS */}
              <div className="p-2.5 rounded bg-[#080B11] border border-terminal-border/60">
                <span className="text-[10px] text-teal-300 font-bold block mb-1">NAT GAS (1250 Qty)</span>
                <div className="text-base font-bold text-white font-mono">{maxNatGasLots} Lots</div>
                <span className="text-[9px] text-terminal-muted block">{maxNatGasLots * 1250} mmBtu @ {natGasSl} pt SL</span>
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
