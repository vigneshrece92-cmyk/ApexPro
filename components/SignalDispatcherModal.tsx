"use client";

import React, { useState, useEffect } from "react";
import { AIAnalysisResult } from "@/lib/types";
import {
  X,
  Copy,
  Check,
  Send,
  Code2,
  Share2,
  Terminal,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface SignalDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AIAnalysisResult | null;
}

type ScriptFormat = "mql5" | "mql4" | "ctrader" | "copier";
type WebhookPlatform = "discord" | "telegram";

export const SignalDispatcherModal: React.FC<SignalDispatcherModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [activeTab, setActiveTab] = useState<"scripts" | "webhook">("scripts");
  const [scriptFormat, setScriptFormat] = useState<ScriptFormat>("mql5");
  const [copiedScript, setCopiedScript] = useState(false);

  // Webhook state
  const [platform, setPlatform] = useState<WebhookPlatform>("discord");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Load saved credentials
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDiscord = localStorage.getItem("apex_discord_webhook");
      if (savedDiscord) setDiscordWebhookUrl(savedDiscord);
      const savedTgToken = localStorage.getItem("apex_tg_token");
      if (savedTgToken) setTgBotToken(savedTgToken);
      const savedTgChat = localStorage.getItem("apex_tg_chat_id");
      if (savedTgChat) setTgChatId(savedTgChat);
    }
  }, []);

  if (!isOpen || !result) return null;

  const isBuy = result.action.includes("BUY");
  const symbol = result.assetDetected.replace("/", "");
  const orderTypeMql5 = isBuy ? "ORDER_TYPE_BUY_LIMIT" : "ORDER_TYPE_SELL_LIMIT";
  const orderTypeMql4 = isBuy ? "OP_BUYLIMIT" : "OP_SELLLIMIT";

  // Generate scripts dynamically
  const generateScript = (): string => {
    switch (scriptFormat) {
      case "mql5":
        return `//+------------------------------------------------------------------+
//| ApexFX Institutional Order Script - MetaTrader 5                  |
//| Setup: ${result.action} ${symbol} (${result.timeframeDetected})                      |
//| Confluence: ${result.confidenceScore}% | R:R ${result.riskRewardRatio}                     |
//+------------------------------------------------------------------+
#include <Trade\\Trade.mqh>
CTrade trade;

void OnStart()
{
   string symbol = "${symbol}";
   double entry  = ${result.suggestedEntry};
   double sl     = ${result.stopLoss};
   double tp1    = ${result.takeProfit1};
   double tp2    = ${result.takeProfit2};
   double tp3    = ${result.takeProfit3};
   double lots   = 0.10; // Adjust for your risk model
   
   // Place 3 Pending Limit Orders for Multi-Target TP Execution
   // Position 1 (Safe TP1)
   trade.OrderOpen(symbol, ${orderTypeMql5}, lots, 0, entry, sl, tp1, ORDER_TIME_GTC, 0, "ApexFX TP1");
   
   // Position 2 (Runner TP2)
   trade.OrderOpen(symbol, ${orderTypeMql5}, lots, 0, entry, sl, tp2, ORDER_TIME_GTC, 0, "ApexFX TP2");
   
   // Position 3 (Moonshot TP3)
   trade.OrderOpen(symbol, ${orderTypeMql5}, lots, 0, entry, sl, tp3, ORDER_TIME_GTC, 0, "ApexFX TP3");
   
   Print("ApexFX: Executed 3-tier order block on ", symbol, " @ ", entry);
}`;

      case "mql4":
        return `//+------------------------------------------------------------------+
//| ApexFX Institutional Order Script - MetaTrader 4                  |
//| Setup: ${result.action} ${symbol} (${result.timeframeDetected})                      |
//+------------------------------------------------------------------+
int start()
{
   string sym   = "${symbol}";
   int cmd      = ${orderTypeMql4};
   double entry = ${result.suggestedEntry};
   double sl    = ${result.stopLoss};
   double tp1   = ${result.takeProfit1};
   double tp2   = ${result.takeProfit2};
   double tp3   = ${result.takeProfit3};
   double lots  = 0.10;
   
   // Split position across 3 take profits
   OrderSend(sym, cmd, lots, entry, 3, sl, tp1, "ApexFX TP1", 1001, 0, clrCyan);
   OrderSend(sym, cmd, lots, entry, 3, sl, tp2, "ApexFX TP2", 1002, 0, clrBlue);
   OrderSend(sym, cmd, lots, entry, 3, sl, tp3, "ApexFX TP3", 1003, 0, clrGold);
   
   return(0);
}`;

      case "ctrader":
        return `//+------------------------------------------------------------------+
//| ApexFX Institutional cBot Snippet - cTrader C#                   |
//+------------------------------------------------------------------+
using cAlgo.API;

namespace cAlgo.Robots
{
    public class ApexFXOrderRunner : Robot
    {
        protected override void OnStart()
        {
            var symbol = Symbols.GetSymbol("${symbol}");
            var targetType = TargetTradeType.${isBuy ? "Buy" : "Sell"};
            double entry = ${result.suggestedEntry};
            double sl    = ${result.stopLoss};
            double tp1   = ${result.takeProfit1};
            
            // Place Limit Order
            PlaceLimitOrder(targetType, symbol.Name, 10000, entry, "ApexFX_Setup", sl, tp1);
            Print("ApexFX cTrader Limit Order placed at {0}", entry);
        }
    }
}`;

      case "copier":
        return `// Telegram / WhatsApp Signal Copier Syntax
${isBuy ? "BUY" : "SELL"} LIMIT ${symbol}
Entry: ${result.suggestedEntry}
SL: ${result.stopLoss}
TP1: ${result.takeProfit1}
TP2: ${result.takeProfit2}
TP3: ${result.takeProfit3}
Risk/Reward: ${result.riskRewardRatio}
Timeframe: ${result.timeframeDetected}
Confidence: ${result.confidenceScore}%
SMC Zone: ${result.smc?.zone || "SMC Validated"}`;
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generateScript());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDispatchWebhook = async () => {
    setIsSending(true);
    setDispatchStatus({ type: null, message: "" });

    try {
      if (platform === "discord") {
        if (!discordWebhookUrl) {
          setDispatchStatus({ type: "error", message: "Please enter a Discord Webhook URL" });
          setIsSending(false);
          return;
        }
        localStorage.setItem("apex_discord_webhook", discordWebhookUrl);
      } else {
        if (!tgBotToken || !tgChatId) {
          setDispatchStatus({
            type: "error",
            message: "Please enter both Telegram Bot Token and Chat ID",
          });
          setIsSending(false);
          return;
        }
        localStorage.setItem("apex_tg_token", tgBotToken);
        localStorage.setItem("apex_tg_chat_id", tgChatId);
      }

      const res = await fetch("/api/dispatch-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          webhookUrl: discordWebhookUrl,
          botToken: tgBotToken,
          chatId: tgChatId,
          signal: result,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchStatus({
          type: "success",
          message: data.message || `Signal dispatched successfully to ${platform.toUpperCase()}!`,
        });
      } else {
        setDispatchStatus({
          type: "error",
          message: data.error || "Failed to dispatch signal",
        });
      }
    } catch (err) {
      setDispatchStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-terminal-card border border-terminal-border rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#0A0E17] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Signal Exporter & Webhook Dispatcher</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    isBuy ? "bg-bull-glow text-bull border border-bull/40" : "bg-bear-glow text-bear border border-bear/40"
                  }`}
                >
                  {result.action} {result.assetDetected}
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted">
                1-Click Pending Orders for MetaTrader/cTrader & Instant Webhook Broadcasts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-terminal-muted hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-terminal-border bg-[#0D121F] text-xs font-semibold">
          <button
            onClick={() => setActiveTab("scripts")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "scripts"
                ? "border-accent text-accent bg-terminal-card"
                : "border-transparent text-terminal-muted hover:text-gray-300"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>MT4 / MT5 / cTrader Pending Order Scripts</span>
          </button>
          <button
            onClick={() => setActiveTab("webhook")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "webhook"
                ? "border-accent text-accent bg-terminal-card"
                : "border-transparent text-terminal-muted hover:text-gray-300"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Telegram & Discord Webhook Broadcaster</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === "scripts" ? (
            <div className="space-y-3">
              {/* Format Selector Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-terminal-bg rounded-lg border border-terminal-border text-xs font-mono">
                  {(["mql5", "mql4", "ctrader", "copier"] as ScriptFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setScriptFormat(fmt)}
                      className={`px-3 py-1 rounded transition-all font-semibold ${
                        scriptFormat === fmt
                          ? "bg-accent text-black shadow-sm"
                          : "text-terminal-muted hover:text-white"
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-md shadow-cyan-600/20"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? "Copied Script!" : "Copy Order Script"}</span>
                </button>
              </div>

              {/* Code Display */}
              <div className="relative rounded-lg overflow-hidden border border-terminal-border bg-[#070A0F]">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D131F] border-b border-terminal-border/60 text-[10px] font-mono text-terminal-muted">
                  <span>SCRIPT GENERATOR • READY FOR EXECUTION</span>
                  <span>{symbol} • {result.timeframeDetected}</span>
                </div>
                <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-[320px] select-all">
                  {generateScript()}
                </pre>
              </div>

              {/* Instructions Tip */}
              <div className="p-3 rounded-lg bg-[#0E1524] border border-blue-500/20 text-xs flex items-start gap-2.5">
                <Terminal className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="text-gray-300 text-[11px] leading-relaxed">
                  <strong className="text-accent font-semibold block mb-0.5">Quick Execution Guide:</strong>
                  Press <kbd className="px-1 py-0.5 rounded bg-terminal-bg border border-terminal-border text-white">F4</kbd> in MetaTrader to open MetaEditor. Create a new Script, paste the generated code, click <kbd className="px-1 py-0.5 rounded bg-terminal-bg border border-terminal-border text-white">Compile</kbd>, and double-click the script in your Navigator to place 3 split-target pending limit orders instantly.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Webhook Platform Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlatform("discord")}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                    platform === "discord"
                      ? "bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                      : "bg-terminal-bg border-terminal-border text-terminal-muted hover:border-terminal-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👾</span>
                    <div>
                      <div className="text-xs font-bold text-white">Discord Webhook</div>
                      <div className="text-[10px] text-terminal-muted">Rich embeds with live color cues</div>
                    </div>
                  </div>
                  {platform === "discord" && <span className="w-2 h-2 rounded-full bg-indigo-400"></span>}
                </button>

                <button
                  onClick={() => setPlatform("telegram")}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                    platform === "telegram"
                      ? "bg-sky-950/40 border-sky-500 text-white shadow-lg shadow-sky-500/10"
                      : "bg-terminal-bg border-terminal-border text-terminal-muted hover:border-terminal-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✈️</span>
                    <div>
                      <div className="text-xs font-bold text-white">Telegram Channel / Bot</div>
                      <div className="text-[10px] text-terminal-muted">Direct dispatch to trading groups</div>
                    </div>
                  </div>
                  {platform === "telegram" && <span className="w-2 h-2 rounded-full bg-sky-400"></span>}
                </button>
              </div>

              {/* Inputs */}
              {platform === "discord" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 block">
                    Discord Channel Webhook URL
                  </label>
                  <input
                    type="text"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-terminal-bg border border-terminal-border text-white focus:outline-none focus:border-accent"
                  />
                  <p className="text-[10px] text-terminal-muted">
                    Channel Settings → Integrations → Webhooks → Copy Webhook URL. Saved securely in local storage.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 block">
                      Telegram Bot Token
                    </label>
                    <input
                      type="password"
                      value={tgBotToken}
                      onChange={(e) => setTgBotToken(e.target.value)}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRstuv..."
                      className="w-full px-3 py-2 text-xs font-mono rounded bg-terminal-bg border border-terminal-border text-white focus:outline-none focus:border-accent"
                    />
                    <p className="text-[10px] text-terminal-muted">Get from @BotFather on Telegram.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 block">
                      Channel or Group Chat ID
                    </label>
                    <input
                      type="text"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      placeholder="@your_channel or -100123456789"
                      className="w-full px-3 py-2 text-xs font-mono rounded bg-terminal-bg border border-terminal-border text-white focus:outline-none focus:border-accent"
                    />
                    <p className="text-[10px] text-terminal-muted">Make sure bot is added as admin.</p>
                  </div>
                </div>
              )}

              {/* Payload Preview */}
              <div className="p-3 rounded-lg bg-[#090D15] border border-terminal-border space-y-2">
                <div className="flex items-center justify-between text-[11px] text-terminal-muted">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" /> Live Dispatch Payload Preview
                  </span>
                  <span className="font-mono text-[10px] text-cyan-400">
                    Confidence: {result.confidenceScore}%
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 bg-terminal-bg p-2.5 rounded border border-terminal-border/60">
                  <div className="text-white font-bold flex items-center gap-2">
                    <span className={isBuy ? "text-bull" : "text-bear"}>
                      {isBuy ? "🟢 BUY" : "🔴 SELL"} {result.assetDetected} ({result.timeframeDetected})
                    </span>
                    <span className="text-gray-400 font-normal">| R:R {result.riskRewardRatio}</span>
                  </div>
                  <div className="text-gray-300 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>Entry: <strong className="text-cyan-300">{result.suggestedEntry}</strong></div>
                    <div>SL: <strong className="text-bear">{result.stopLoss}</strong></div>
                    <div>TP1: <strong className="text-bull">{result.takeProfit1}</strong></div>
                    <div>TP2: <strong className="text-bull">{result.takeProfit2}</strong></div>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {dispatchStatus.message && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    dispatchStatus.type === "success"
                      ? "bg-bull-glow text-bull border border-bull/40"
                      : "bg-bear-glow text-bear border border-bear/40"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{dispatchStatus.message}</span>
                </div>
              )}

              {/* Dispatch Button */}
              <button
                onClick={handleDispatchWebhook}
                disabled={isSending}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSending ? "animate-spin" : ""}`} />
                <span>{isSending ? "Broadcasting Signal..." : `Dispatch Signal to ${platform.toUpperCase()}`}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#080B10] border-t border-terminal-border flex items-center justify-between text-xs text-terminal-muted">
          <span>ApexFX Execution Intelligence</span>
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
