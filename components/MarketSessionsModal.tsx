"use client";

import React, { useState, useEffect } from "react";
import { Clock, X, Globe, Zap } from "lucide-react";

interface MarketSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IndianSession {
  name: string;
  category: "NSE/BSE" | "MCX Commodity";
  timing: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  description: string;
  isPeak?: boolean;
}

const INDIAN_MARKET_SCHEDULE: IndianSession[] = [
  {
    name: "NSE / BSE Pre-Open Market",
    category: "NSE/BSE",
    timing: "09:00 AM – 09:15 AM IST",
    startHour: 9,
    startMin: 0,
    endHour: 9,
    endMin: 15,
    description: "Order entry, matching & opening price discovery.",
  },
  {
    name: "NSE / BSE Regular F&O Session",
    category: "NSE/BSE",
    timing: "09:15 AM – 03:30 PM IST",
    startHour: 9,
    startMin: 15,
    endHour: 15,
    endMin: 30,
    description: "Active trading session for NIFTY 50, BANK NIFTY, SENSEX & FINNIFTY options.",
    isPeak: true,
  },
  {
    name: "MCX Commodity Day Session",
    category: "MCX Commodity",
    timing: "09:00 AM – 05:00 PM IST",
    startHour: 9,
    startMin: 0,
    endHour: 17,
    endMin: 0,
    description: "Domestic commercial hedging and volume baseline for Crude Oil & Natural Gas.",
  },
  {
    name: "MCX Commodity Evening Session",
    category: "MCX Commodity",
    timing: "05:00 PM – 11:30 PM IST",
    startHour: 17,
    startMin: 0,
    endHour: 23,
    endMin: 30,
    description: "US NYMEX & EIA inventory overlap. Peak volatility and liquidity for MCX Crude & Gas.",
    isPeak: true,
  },
];

export const MarketSessionsModal: React.FC<MarketSessionsModalProps> = ({ isOpen, onClose }) => {
  const [currentIstTime, setCurrentIstTime] = useState<string>("");
  const [currentTotalMinutes, setCurrentTotalMinutes] = useState<number>(0);
  const [isWeekend, setIsWeekend] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentIstTime(istStr + " IST");

      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const dayOfWeek = istDate.getDay();
      setIsWeekend(dayOfWeek === 0 || dayOfWeek === 6);
      setCurrentTotalMinutes(istDate.getHours() * 60 + istDate.getMinutes());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const isSessionActive = (session: IndianSession) => {
    if (isWeekend) return false;
    const startM = session.startHour * 60 + session.startMin;
    const endM = session.endHour * 60 + session.endMin;
    return currentTotalMinutes >= startM && currentTotalMinutes < endM;
  };

  const isNseOpen = !isWeekend && currentTotalMinutes >= 9 * 60 + 15 && currentTotalMinutes < 15 * 60 + 30;
  const isMcxEveningOpen = !isWeekend && currentTotalMinutes >= 17 * 60 && currentTotalMinutes < 23 * 60 + 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-terminal-card border border-terminal-border rounded-xl max-w-xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-[#0D121D] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-gold flex items-center justify-center border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">NSE F&O & MCX Commodity Market Timings</h3>
              <p className="text-[10px] text-terminal-muted font-mono">Current Time: {currentIstTime}</p>
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
          {/* Active Session Highlight Banner */}
          {isWeekend ? (
            <div className="p-3 rounded-lg bg-[#141A26] border border-terminal-border text-xs text-terminal-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              <span>Weekend Market Closed. NSE F&O and MCX resume Monday at 09:00 AM IST.</span>
            </div>
          ) : isNseOpen ? (
            <div className="p-3 rounded-lg bg-bull-glow border border-bull/40 flex items-center gap-2.5 text-xs">
              <Zap className="w-4 h-4 text-bull animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-bull">NSE / BSE Regular F&O Active!</span>
                <p className="text-[11px] text-gray-300">
                  Peak liquidity window for NIFTY & BANK NIFTY options and intraday scalping.
                </p>
              </div>
            </div>
          ) : isMcxEveningOpen ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center gap-2.5 text-xs">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-amber-300">MCX Evening Session Active (US EIA Overlap)!</span>
                <p className="text-[11px] text-gray-300">
                  Peak global volatility on MCX Crude Oil & Natural Gas in sync with NYMEX.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-terminal-bg border border-terminal-border flex items-center gap-2 text-xs text-terminal-muted">
              <Globe className="w-4 h-4 text-accent" />
              <span>Markets will reopen for the next official Indian trading session.</span>
            </div>
          )}

          {/* Sessions Grid */}
          <div className="space-y-2">
            {INDIAN_MARKET_SCHEDULE.map((session) => {
              const active = isSessionActive(session);

              return (
                <div
                  key={session.name}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                    active
                      ? "bg-[#111A2C] border-cyan-500/50 shadow-md shadow-cyan-500/5"
                      : "bg-terminal-bg border-terminal-border opacity-75"
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
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-black/40 text-terminal-muted rounded border border-white/5">
                          {session.category}
                        </span>
                        {session.isPeak && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-bold">
                            Peak Volatility
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-terminal-muted font-mono mt-0.5">
                        {session.timing}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 max-w-md">
                        {session.description}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
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
        <div className="p-3 bg-[#0D121D] border-t border-terminal-border flex items-center justify-between">
          <span className="text-[11px] text-terminal-muted font-mono">
            Exchange Time: Asia/Kolkata (IST • UTC+5:30)
          </span>
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
