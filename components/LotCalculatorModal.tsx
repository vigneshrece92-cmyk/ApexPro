"use client";

import React, { useState } from "react";
import { AssetSymbol } from "@/lib/types";
import { INITIAL_QUOTES } from "@/lib/defaultData";
import { getOptionSpec } from "@/lib/optionsEngine";
import { Calculator, X, ShieldCheck } from "lucide-react";

interface LotCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: AssetSymbol;
}

export const LotCalculatorModal: React.FC<LotCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = "NIFTY",
}) => {
  const [symbol, setSymbol] = useState<AssetSymbol>(
    ["NIFTY", "BANKNIFTY", "CRUDEOIL", "NATURALGAS", "SENSEX", "FINNIFTY"].includes(defaultSymbol)
      ? defaultSymbol
      : "NIFTY"
  );
  const [balance, setBalance] = useState<number>(1000000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [stopLossPoints, setStopLossPoints] = useState<number>(25);

  if (!isOpen) return null;

  const quote = INITIAL_QUOTES[symbol] || INITIAL_QUOTES.NIFTY;
  const spec = getOptionSpec(symbol);
  const riskAmount = (balance * riskPercent) / 100;

  // Total risk per 1 lot = Stop loss points * Lot size
  const riskPerLot = Math.max(0.5, stopLossPoints) * spec.lotSize;
  const recommendedLots = Math.max(1, Math.floor(riskAmount / riskPerLot));
  const totalQuantity = recommendedLots * spec.lotSize;
  const actualRisk = +(recommendedLots * riskPerLot).toFixed(0);

  const indianSymbols: { sym: AssetSymbol; label: string; lot: number }[] = [
    { sym: "NIFTY", label: "NIFTY 50", lot: 65 },
    { sym: "BANKNIFTY", label: "BANK NIFTY", lot: 15 },
    { sym: "CRUDEOIL", label: "CRUDE OIL", lot: 100 },
    { sym: "NATURALGAS", label: "NAT GAS", lot: 1250 },
    { sym: "SENSEX", label: "SENSEX", lot: 10 },
    { sym: "FINNIFTY", label: "FIN NIFTY", lot: 65 },
  ];

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
              <h3 className="text-sm font-bold text-white">Indian F&O & MCX Lot Calculator</h3>
              <p className="text-[10px] text-terminal-muted">Exchange Lot Size & Capital Risk Budgeting</p>
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
            <label className="text-[11px] text-terminal-muted block mb-1">Exchange Instrument</label>
            <div className="grid grid-cols-3 gap-1.5">
              {indianSymbols.map((item) => (
                <button
                  key={item.sym}
                  onClick={() => {
                    setSymbol(item.sym);
                    if (item.sym === "CRUDEOIL") setStopLossPoints(35);
                    else if (item.sym === "NATURALGAS") setStopLossPoints(2.5);
                    else if (item.sym === "BANKNIFTY") setStopLossPoints(70);
                    else setStopLossPoints(25);
                  }}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded border transition-all flex flex-col items-center ${
                    symbol === item.sym
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-terminal-bg border-terminal-border text-gray-400 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[9px] text-terminal-muted font-normal">{item.lot} Qty/Lot</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Balance */}
          <div>
            <label className="text-[11px] text-terminal-muted block mb-1">Trading Capital (₹ INR)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Math.max(1000, Number(e.target.value)))}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-7 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-terminal-muted">Risk Budget per Trade</label>
              <span className="text-cyan-400 font-bold">{riskPercent}% (₹{riskAmount.toLocaleString("en-IN")})</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[1.0, 1.5, 2.0, 3.0].map((r) => (
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
              Stop Loss Buffer (Points in Premium / Spot)
            </label>
            <input
              type="number"
              step={symbol === "NATURALGAS" ? "0.1" : "1"}
              value={stopLossPoints}
              onChange={(e) => setStopLossPoints(Math.max(0.1, Number(e.target.value)))}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 text-white font-bold focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-terminal-muted mt-1">
              {stopLossPoints} points risk × {spec.lotSize} contract size = ₹{riskPerLot.toLocaleString("en-IN")} risk per 1 lot.
            </p>
          </div>

          {/* Results Box */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-[#0F1829] to-[#0A101C] border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-terminal-muted text-[11px]">Recommended Position Size:</span>
              <span className="text-base font-extrabold text-bull font-mono">{recommendedLots} Lot{recommendedLots > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Total Quantity:</span>
              <span className="text-white font-bold">{totalQuantity} Qty</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Max Trade Risk:</span>
              <span className="text-bear font-bold">₹{actualRisk.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted">Exchange Contract Spec:</span>
              <span className="text-gray-400">
                {symbol}: 1 Lot = {spec.lotSize} Qty (Step: {spec.strikeStep})
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
