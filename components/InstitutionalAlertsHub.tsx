"use client";

import React, { useState, useEffect } from "react";
import { InstitutionalAlert, AssetSymbol } from "@/lib/types";
import { AlertChartSnapshot } from "./AlertChartSnapshot";
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  ExternalLink,
  Copy,
  Check,
  Send,
  Sparkles,
  Layers,
  Zap,
} from "lucide-react";

interface InstitutionalAlertsHubProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: InstitutionalAlert[];
  onSelectSymbol: (symbol: AssetSymbol) => void;
  onOpenDispatcherWithAlert?: (alert: InstitutionalAlert) => void;
  onOpenMT5PanelWithAlert?: (alert: InstitutionalAlert) => void;
  onOpenDemoPanelWithAlert?: (alert: InstitutionalAlert) => void;
}

type FilterCategory =
  | "all"
  | "VAL_SWEEP_REVERSAL"
  | "VAH_REJECTION_REVERSAL"
  | "POC_RETEST_BOUNCE"
  | "POC_RETEST_REJECTION"
  | "VA_EXPANSION_BREAKOUT";

// Web Audio API chime generator (zero audio file dependencies)
function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First tone (880Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Second harmonic tone (1320Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    console.debug("AudioContext chime muted or blocked by browser:", e);
  }
}

export const InstitutionalAlertsHub: React.FC<InstitutionalAlertsHubProps> = ({
  isOpen,
  onClose,
  alerts,
  onSelectSymbol,
  onOpenDispatcherWithAlert,
  onOpenMT5PanelWithAlert,
  onOpenDemoPanelWithAlert,
}) => {
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSound = localStorage.getItem("apex_alert_sound");
      if (savedSound !== null) setSoundEnabled(savedSound === "true");
      if ("Notification" in window) {
        setNotificationsAllowed(Notification.permission === "granted");
      }
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("apex_alert_sound", String(next));
    }
    if (next) playAlertChime();
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationsAllowed(perm === "granted");
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.patternType === filter;
  });

  const handleCopyAlertScript = (alert: InstitutionalAlert) => {
    const script = `// Apex Pro Indian Options & MCX PAVP Setup - ${alert.symbol}
// Setup: ${alert.title}
Direction: ${alert.direction}
Option Strike: ${alert.optionStrikeSuggestion || "ATM"}
Entry: ₹${alert.suggestedEntry}
SL: ₹${alert.stopLoss}
TP1: ₹${alert.takeProfit1}
TP2: ₹${alert.takeProfit2}
${alert.valPrice ? `VAL: ₹${alert.valPrice} | POC: ₹${alert.pocPrice} | VAH: ₹${alert.vahPrice}` : ""}
R:R: ${alert.riskRewardRatio}
Confidence: ${alert.confidenceScore}%`;

    navigator.clipboard.writeText(script);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-terminal-card border border-terminal-border rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#090D16] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Bell className="w-5 h-5 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Pivot-Anchored Volume Profile (PAVP) Alerts Hub
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                  {alerts.length} PAVP SIGNALS
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted">
                VAL Liquidity Sweeps • POC High-Volume Retests • VAH Mean Reversions • Value Area Expansions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded border text-xs flex items-center gap-1.5 transition-all ${
                soundEnabled
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                  : "bg-terminal-bg border-terminal-border text-terminal-muted hover:text-white"
              }`}
              title={soundEnabled ? "Mute Alert Chime" : "Enable Alert Chime"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{soundEnabled ? "Audio On" : "Muted"}</span>
            </button>

            {/* Desktop Notification Request */}
            {!notificationsAllowed && (
              <button
                onClick={requestNotificationPermission}
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] hover:text-white transition-colors"
                title="Enable browser notifications"
              >
                <span>Allow Notifications</span>
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-terminal-muted hover:text-white hover:bg-terminal-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex border-b border-terminal-border bg-[#0C101A] px-4 py-2 text-xs font-mono overflow-x-auto gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded transition-all shrink-0 ${
              filter === "all"
                ? "bg-accent text-black font-bold"
                : "text-terminal-muted hover:text-white bg-terminal-bg border border-terminal-border"
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter("VAL_SWEEP_REVERSAL")}
            className={`px-3 py-1 rounded transition-all shrink-0 flex items-center gap-1.5 ${
              filter === "VAL_SWEEP_REVERSAL"
                ? "bg-cyan-500 text-black font-bold"
                : "text-terminal-muted hover:text-white bg-terminal-bg border border-terminal-border"
            }`}
          >
            <span>VAL Sweep (BUY CE)</span>
          </button>
          <button
            onClick={() => setFilter("VAH_REJECTION_REVERSAL")}
            className={`px-3 py-1 rounded transition-all shrink-0 flex items-center gap-1.5 ${
              filter === "VAH_REJECTION_REVERSAL"
                ? "bg-purple-500 text-white font-bold"
                : "text-terminal-muted hover:text-white bg-terminal-bg border border-terminal-border"
            }`}
          >
            <span>VAH Rejection (BUY PE)</span>
          </button>
          <button
            onClick={() => setFilter("POC_RETEST_BOUNCE")}
            className={`px-3 py-1 rounded transition-all shrink-0 flex items-center gap-1.5 ${
              filter === "POC_RETEST_BOUNCE"
                ? "bg-emerald-500 text-black font-bold"
                : "text-terminal-muted hover:text-white bg-terminal-bg border border-terminal-border"
            }`}
          >
            <span>POC Bounce (BUY CE)</span>
          </button>
          <button
            onClick={() => setFilter("POC_RETEST_REJECTION")}
            className={`px-3 py-1 rounded transition-all shrink-0 flex items-center gap-1.5 ${
              filter === "POC_RETEST_REJECTION"
                ? "bg-rose-500 text-white font-bold"
                : "text-terminal-muted hover:text-white bg-terminal-bg border border-terminal-border"
            }`}
          >
            <span>POC Rejection (BUY PE)</span>
          </button>
          <button
            onClick={() => setFilter("VA_EXPANSION_BREAKOUT")}
            className={`px-3 py-1 rounded transition-all shrink-0 flex items-center gap-1.5 ${
              filter === "VA_EXPANSION_BREAKOUT"
                ? "bg-amber-400 text-black font-black shadow-md shadow-amber-500/20"
                : "text-terminal-muted hover:text-white bg-terminal-bg border border-terminal-border"
            }`}
          >
            <span>⚡ VA Expansion</span>
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-terminal-muted bg-[#080C14] rounded-lg border border-terminal-border">
              <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-white">No active alerts in this category</p>
              <p className="text-xs text-terminal-muted mt-1">
                PAVP scanner is monitoring live 15M/1H Volume Profiles and high-volume auction nodes.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isBuy = alert.direction.includes("BUY");
              const isSell = alert.direction.includes("SELL");
              const actionColor = isBuy ? "text-bull" : isSell ? "text-bear" : "text-yellow-400";
              const actionBg = isBuy
                ? "bg-bull-glow border-bull/40 text-bull"
                : "bg-bear-glow border-bear/40 text-bear";

              return (
                <div
                  key={alert.id}
                  className="bg-[#080C14] border border-terminal-border rounded-xl overflow-hidden shadow-lg hover:border-cyan-500/40 transition-all flex flex-col space-y-3 p-4"
                >
                  {/* Alert Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`px-2.5 py-1 rounded-lg border font-extrabold text-xs tracking-wider flex items-center gap-1.5 ${actionBg}`}>
                        {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {alert.direction}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{alert.symbol}</span>
                          <span className="text-xs text-terminal-muted">({alert.assetName})</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                            {alert.timeframe.toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-gray-200 mt-0.5">{alert.title}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-terminal-muted">{alert.timeAgo}</span>
                      <div className="px-2 py-0.5 rounded bg-terminal-card border border-terminal-border text-[11px] font-mono font-bold text-cyan-300">
                        {alert.confidenceScore}% Conf.
                      </div>
                    </div>
                  </div>

                  {/* Visual Chart Snapshot */}
                  <div className="w-full">
                    <AlertChartSnapshot alert={alert} height={190} />
                  </div>

                  {/* Trade Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono bg-terminal-bg p-2.5 rounded-lg border border-terminal-border">
                    <div className="p-1.5 rounded bg-terminal-card border border-terminal-border/80">
                      <span className="text-[9px] text-terminal-muted uppercase block">Entry</span>
                      <span className="font-bold text-cyan-300">₹{alert.suggestedEntry}</span>
                    </div>
                    <div className="p-1.5 rounded bg-terminal-card border border-terminal-border/80">
                      <span className="text-[9px] text-terminal-muted uppercase block">Stop Loss</span>
                      <span className="font-bold text-bear">₹{alert.stopLoss}</span>
                    </div>
                    <div className="p-1.5 rounded bg-terminal-card border border-terminal-border/80">
                      <span className="text-[9px] text-terminal-muted uppercase block">TP1 (Safe)</span>
                      <span className="font-bold text-bull">₹{alert.takeProfit1}</span>
                    </div>
                    <div className="p-1.5 rounded bg-terminal-card border border-terminal-border/80">
                      <span className="text-[9px] text-terminal-muted uppercase block">TP2 (Runner)</span>
                      <span className="font-bold text-bull">₹{alert.takeProfit2}</span>
                    </div>
                    <div className="p-1.5 rounded bg-terminal-card border border-terminal-border/80 col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-terminal-muted uppercase block">Risk : Reward</span>
                      <span className="font-bold text-gold">{alert.riskRewardRatio}</span>
                    </div>
                  </div>

                  {/* Volume Profile Structural Metrics & Strike Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    {alert.retestStatus && (
                      <div className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span>{alert.retestStatus}</span>
                      </div>
                    )}
                    {alert.valPrice != null && (
                      <div className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30 text-[10px]">
                        VAL: ₹{alert.valPrice}
                      </div>
                    )}
                    {alert.pocPrice != null && (
                      <div className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-500/30 text-[10px] font-bold">
                        POC: ₹{alert.pocPrice}
                      </div>
                    )}
                    {alert.vahPrice != null && (
                      <div className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30 text-[10px]">
                        VAH: ₹{alert.vahPrice}
                      </div>
                    )}
                    {alert.optionStrikeSuggestion && (
                      <div className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        Strike: {alert.optionStrikeSuggestion}
                      </div>
                    )}
                    {alert.vwcbSpike && (
                      <div className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[10px]">
                        ⚡ VWCB Spike
                      </div>
                    )}
                  </div>

                  {/* Reasoning & Invalidation */}
                  <div className="space-y-1.5 text-xs">
                    <p className="text-gray-300 text-[11px] leading-relaxed bg-[#0B0F19] p-2.5 rounded border border-terminal-border/50">
                      <strong className="text-cyan-300">PAVP Mechanics:</strong> {alert.reasoning}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                      <span><strong>Invalidation:</strong> {alert.invalidationCriteria}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-terminal-border/40">
                    <button
                      onClick={() => {
                        onSelectSymbol(alert.symbol);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-semibold transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Load Chart & PAVP</span>
                    </button>

                    {(onOpenDemoPanelWithAlert || onOpenMT5PanelWithAlert) && (
                      <button
                        onClick={() => {
                          if (onOpenDemoPanelWithAlert) onOpenDemoPanelWithAlert(alert);
                          else if (onOpenMT5PanelWithAlert) onOpenMT5PanelWithAlert(alert);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                        title="Execute this trade directly on your internal ₹1,00,000 Virtual Broker"
                      >
                        <Zap className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                        <span>Execute on Demo (₹1L)</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyAlertScript(alert)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-terminal-card hover:bg-terminal-hover text-gray-300 hover:text-white border border-terminal-border text-xs transition-colors"
                        title="Copy Order Specifications"
                      >
                        {copiedId === alert.id ? (
                          <Check className="w-3.5 h-3.5 text-bull" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === alert.id ? "Copied!" : "Copy Order"}</span>
                      </button>

                      {onOpenDispatcherWithAlert && (
                        <button
                          onClick={() => onOpenDispatcherWithAlert(alert)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-colors"
                          title="Broadcast to Discord / Telegram"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Alert</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#080B10] border-t border-terminal-border flex items-center justify-between text-xs text-terminal-muted">
          <span>Apex Pro Indian Options & MCX Institutional Scanner</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-terminal-bg hover:bg-terminal-hover text-gray-300 border border-terminal-border transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
