"use client";

import React, { useState, useEffect } from "react";
import { MARKET_SESSIONS } from "@/lib/defaultData";
import { Clock, X, Globe, Zap } from "lucide-react";

interface MarketSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketSessionsModal: React.FC<MarketSessionsModalProps> = ({ isOpen, onClose }) => {
  const [currentUtcHour, setCurrentUtcHour] = useState<number>(0);
  const [currentUtcTime, setCurrentUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentUtcHour(now.getUTCHours());
      setCurrentUtcTime(now.toUTCString().slice(17, 25) + " UTC");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  // Check if session is active
  const isSessionOpen = (open: number, close: number, current: number) => {
    if (open < close) {
      return current >= open && current < close;
    }
    // Overnight session (e.g. Sydney 22 to 7)
    return current >= open || current < close;
  };

  const isOverlap = currentUtcHour >= 13 && currentUtcHour < 17;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-terminal-card border border-terminal-border rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-[#0D121D] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Global Forex Trading Sessions</h3>
              <p className="text-[10px] text-terminal-muted">Current Time: {currentUtcTime}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Overlap Alert */}
          {isOverlap ? (
            <div className="p-3 rounded-lg bg-bull-glow border border-bull/40 flex items-center gap-2 text-xs">
              <Zap className="w-4 h-4 text-bull animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-bull">Peak Liquidity: London / New York Overlap Active!</span>
                <p className="text-[11px] text-gray-300">
                  Highest daily volatility on Gold (XAU/USD), EUR/USD, and GBP/USD occurs during this 4-hour window.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-terminal-bg border border-terminal-border flex items-center gap-2 text-xs text-terminal-muted">
              <Globe className="w-4 h-4 text-accent" />
              <span>London / New York overlap occurs daily between 13:00 and 17:00 UTC.</span>
            </div>
          )}

          {/* Sessions Grid */}
          <div className="space-y-2">
            {MARKET_SESSIONS.map((session) => {
              const active = isSessionOpen(session.openUtc, session.closeUtc, currentUtcHour);
              const openStr = `${session.openUtc.toString().padStart(2, "0")}:00`;
              const closeStr = `${session.closeUtc.toString().padStart(2, "0")}:00`;

              return (
                <div
                  key={session.name}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                    active
                      ? "bg-[#111A2C] border-cyan-500/50 shadow-md shadow-cyan-500/5"
                      : "bg-terminal-bg border-terminal-border opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        active ? "bg-bull animate-pulse shadow-sm shadow-bull" : "bg-gray-600"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{session.name}</span>
                        {session.isOverlap && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                            High Volatility
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-terminal-muted font-mono">
                        {openStr} - {closeStr} UTC
                      </span>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        active ? "bg-bull-glow text-bull border border-bull/30" : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {active ? "OPEN NOW" : "CLOSED"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0D121D] border-t border-terminal-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
