"use client";

import React, { useState } from "react";
import { AssetSymbol } from "@/lib/types";
import { INITIAL_QUOTES } from "@/lib/defaultData";
import { Calculator, X, AlertCircle, ShieldCheck, DollarSign } from "lucide-react";

interface LotCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: AssetSymbol;
}

export const LotCalculatorModal: React.FC<LotCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = "XAUUSD",
}) => {
  const [symbol, setSymbol] = useState<AssetSymbol>(defaultSymbol);
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLossPips, setStopLossPips] = useState<number>(40); // 40 pips default ($4.00 on Gold)

  if (!isOpen) return null;

  const quote = INITIAL_QUOTES[symbol] || INITIAL_QUOTES.XAUUSD;
  const riskAmount = (balance * riskPercent) / 100;

  // Exact contract calculations
  let pipValuePerStandardLot = 10; // USD default for 1 standard lot of EURUSD
  if (symbol === "XAUUSD") {
    // 1 standard lot = 100 oz. 1 pip = $0.10 move = $10. $1 move = 10 pips = $100.
    pipValuePerStandardLot = 10;
  } else if (symbol === "XAGUSD") {
    // 1 standard lot = 5000 oz. 1 pip = 0.01 = $50.
    pipValuePerStandardLot = 50;
  } else if (symbol === "USDJPY") {
    // 1 standard lot = 1000 yen / exchange rate (~$6.7)
    pipValuePerStandardLot = 1000 / (quote.bid || 148);
  }

  // Lot size formula: Risk Amount / (SL in pips * Pip Value per standard lot)
  const lotSizeRaw = riskAmount / (Math.max(1, stopLossPips) * pipValuePerStandardLot);
  const recommendedLots = +Math.max(0.01, lotSizeRaw).toFixed(2);
  const totalPositionValue = +(recommendedLots * quote.bid * (symbol === "XAUUSD" ? 100 : symbol === "XAGUSD" ? 5000 : 1000)).toFixed(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-terminal-card border border-terminal-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-[#0D121D] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Gold & FX Risk / Lot Calculator</h3>
              <p className="text-[10px] text-terminal-muted">Institutional 1% Risk Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 text-xs font-mono">
          {/* Asset Selection */}
          <div>
            <label className="text-[11px] text-terminal-muted block mb-1">Trading Asset</label>
            <div className="grid grid-cols-5 gap-1">
              {(["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY"] as AssetSymbol[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`py-1.5 text-[11px] font-bold rounded border transition-all ${
                    symbol === s
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-terminal-bg border-terminal-border text-gray-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Account Balance */}
          <div>
            <label className="text-[11px] text-terminal-muted block mb-1">Account Balance ($ USD)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-gray-400">$</span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Math.max(100, Number(e.target.value)))}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-7 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-terminal-muted">Risk Percentage</label>
              <span className="text-cyan-400 font-bold">{riskPercent}% (${riskAmount.toFixed(2)})</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[0.5, 1.0, 1.5, 2.0].map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskPercent(r)}
                  className={`py-1 rounded border text-[11px] ${
                    riskPercent === r
                      ? "bg-accent/20 border-accent text-white font-bold"
                      : "bg-terminal-bg border-terminal-border text-gray-400"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss Distance */}
          <div>
            <label className="text-[11px] text-terminal-muted block mb-1">
              Stop Loss Distance ({symbol === "XAUUSD" ? "Pips / $0.10 increments" : "Pips"})
            </label>
            <input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(Math.max(1, Number(e.target.value)))}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-terminal-muted mt-1">
              {symbol === "XAUUSD"
                ? `40 pips on Gold = $4.00 price distance (e.g. from $2,642 to $2,638)`
                : `Standard 1 pip = 0.0001 (0.01 on JPY pairs)`}
            </p>
          </div>

          {/* Results Box */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-[#0F1829] to-[#0A101C] border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-terminal-muted text-[11px]">Recommended Position Size:</span>
              <span className="text-base font-extrabold text-bull font-mono">{recommendedLots} Lots</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Max Dollar Risk:</span>
              <span className="text-bear font-bold">${riskAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Pip Value @ {recommendedLots} Lots:</span>
              <span className="text-white font-bold">${(recommendedLots * pipValuePerStandardLot).toFixed(2)} / pip</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">1 Standard Lot Spec:</span>
              <span className="text-gray-400">
                {symbol === "XAUUSD" ? "100 Troy Ounces" : symbol === "XAGUSD" ? "5,000 Ounces" : "100,000 Units"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0D121D] border-t border-terminal-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
