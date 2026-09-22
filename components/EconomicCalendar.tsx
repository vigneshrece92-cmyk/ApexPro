"use client";

import React, { useState, useEffect } from "react";
import { CalendarEvent } from "@/lib/types";
import { INITIAL_CALENDAR } from "@/lib/defaultData";
import { Calendar, Clock, AlertCircle, Filter } from "lucide-react";

export const EconomicCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR);
  const [impactFilter, setImpactFilter] = useState<"all" | "high" | "medium">("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [countdown, setCountdown] = useState<string>("");
  const [isLive, setIsLive] = useState<boolean>(false);

  // Fetch real live calendar data on mount
  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.calendar && data.calendar.length > 0) {
          setEvents(data.calendar);
          setIsLive(true);
        }
      })
      .catch((err) => console.warn("Using default calendar events", err));
  }, []);

  // Countdown to next high-impact event
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const nextHigh = events.find((e) => e.impact === "high" && e.timestamp > now);
      if (!nextHigh) {
        setCountdown("No high-impact releases imminent");
        return;
      }

      const diffSec = Math.floor((nextHigh.timestamp - now) / 1000);
      if (diffSec <= 0) {
        setCountdown(`${nextHigh.event} releasing now!`);
        return;
      }

      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      const timeStr = `${hours > 0 ? `${hours}h ` : ""}${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
      setCountdown(`${nextHigh.currency} ${nextHigh.event} in ${timeStr}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [events]);

  const filteredEvents = events.filter((e) => {
    if (impactFilter === "high" && e.impact !== "high") return false;
    if (impactFilter === "medium" && e.impact === "low") return false;
    if (currencyFilter !== "ALL" && e.currency !== currencyFilter) return false;
    return true;
  });

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-[#0D121D] border-b border-terminal-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Economic Calendar</h3>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 text-[11px]">
          {/* Impact filter */}
          <div className="flex items-center bg-terminal-bg rounded p-0.5 border border-terminal-border">
            <button
              onClick={() => setImpactFilter("all")}
              className={`px-2 py-0.5 rounded ${impactFilter === "all" ? "bg-terminal-card text-white font-bold" : "text-terminal-muted"}`}
            >
              All
            </button>
            <button
              onClick={() => setImpactFilter("high")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 ${impactFilter === "high" ? "bg-bear/20 text-bear font-bold" : "text-terminal-muted"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-bear"></span>
              High 🔴
            </button>
          </div>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-terminal-bg border border-terminal-border text-terminal-muted text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
          >
            <option value="ALL">All Catalysts</option>
            <option value="INR">INR (RBI / India)</option>
            <option value="USD">USD (EIA Energy)</option>
          </select>
        </div>
      </div>

      {/* Real-time Countdown Banner */}
      <div className="px-3 py-1.5 bg-[#090D15] border-b border-terminal-border flex items-center gap-2 text-xs font-mono">
        <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-pulse" />
        <span className="text-terminal-muted text-[11px]">Next Catalyst:</span>
        <span className="text-yellow-300 font-bold text-[11px] truncate">{countdown}</span>
      </div>

      {/* Events Table / List */}
      <div className="divide-y divide-terminal-border/60 overflow-y-auto max-h-[300px]">
        {filteredEvents.map((item) => {
          const isHigh = item.impact === "high";
          const isMed = item.impact === "medium";

          return (
            <div
              key={item.id}
              className="p-2.5 hover:bg-terminal-hover/60 transition-colors flex items-center justify-between text-xs font-mono gap-2"
            >
              {/* Left: Time & Impact */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-400 w-10 text-[11px]">{item.time}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    item.currency === "USD"
                      ? "bg-green-500/20 text-green-300"
                      : item.currency === "EUR"
                      ? "bg-blue-500/20 text-blue-300"
                      : item.currency === "GBP"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {item.currency}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHigh ? "bg-bear shadow-sm shadow-bear" : isMed ? "bg-yellow-400" : "bg-gray-500"
                  }`}
                  title={isHigh ? "High Impact" : isMed ? "Medium Impact" : "Low Impact"}
                />
              </div>

              {/* Center: Event Name */}
              <div className="flex-1 truncate">
                <span className="text-gray-200 text-[11px] font-sans font-medium">{item.event}</span>
              </div>

              {/* Right: Actual vs Forecast vs Previous */}
              <div className="flex items-center gap-2 text-[11px] text-right shrink-0">
                {item.actual && (
                  <span className="text-bull font-bold">Act: {item.actual}</span>
                )}
                <span className="text-terminal-muted">Fcst: {item.forecast}</span>
                <span className="text-gray-500 hidden sm:inline">Prev: {item.previous}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
