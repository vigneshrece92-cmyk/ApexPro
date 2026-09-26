/**
 * ApexFX Pro Telegram Broadcast Utility
 * Pre-configured with @profitcatcher_bot and user chat ID
 */

export const DEFAULT_TG_BOT_TOKEN = "8418044614:AAEp4LY018UyKt4_v0Qj-7ux1eEZg8APAd0";
export const DEFAULT_TG_CHAT_ID = "-5005740750";

let clientLastSentTimestamp = 0;
const CLIENT_MIN_COOLDOWN_MS = 500; // 500ms debounce to prevent runaway loops while allowing multiple assets

export async function sendTelegramNotification(message: string): Promise<boolean> {
  const now = Date.now();
  if (now - clientLastSentTimestamp < CLIENT_MIN_COOLDOWN_MS) {
    await new Promise((resolve) => setTimeout(resolve, CLIENT_MIN_COOLDOWN_MS - (now - clientLastSentTimestamp)));
  }

  try {
    clientLastSentTimestamp = Date.now();
    const res = await fetch("/api/telegram-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        botToken: DEFAULT_TG_BOT_TOKEN,
        chatId: DEFAULT_TG_CHAT_ID,
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn("Failed to send Telegram notification:", err);
    return false;
  }
}

export interface ShortEntrySignalParams {
  symbol: string;
  strike: number;
  type: "CE" | "PE";
  entryPremium: number;
  slPremium?: number;
  tp1Premium?: number;
  tp2Premium?: number;
  tp1Label?: string;
  tp2Label?: string;
  tp1SpotPrice?: number;
  tp2SpotPrice?: number;
  spotPrice?: number;
  lotSize: number;
  volumeLots?: number;
  expiry: string;
  currency?: string;
  demoStatus?: "executed" | "pending_market_open" | "manual";
}

/**
 * Short & sweet required-details-alone entry signal message for Telegram
 */
export function formatShortEntryMessage(params: ShortEntrySignalParams): string {
  const cur = params.currency || "₹";
  const emoji = params.type === "CE" ? "🟢" : "🔴";
  const sl = params.slPremium ?? Math.max(0.5, +(params.entryPremium * 0.70).toFixed(1));
  const tp1 = params.tp1Premium ?? +(params.entryPremium * 1.35).toFixed(1);
  const tp2 = params.tp2Premium ?? +(params.entryPremium * 1.65).toFixed(1);
  const lots = params.volumeLots || 1;
  const status =
    params.demoStatus === "pending_market_open"
      ? "⏳ Pre-Market (Opens 09:15)"
      : "✅ Executed";

  const tp1Label = params.tp1Label || "POC";
  const tp2Label = params.tp2Label || (params.type === "CE" ? "VAH" : "VAL");

  const tp1SpotText = params.tp1SpotPrice != null ? ` [Spot ~${params.tp1SpotPrice.toFixed(1)}]` : "";
  const tp2SpotText = params.tp2SpotPrice != null ? ` [Spot ~${params.tp2SpotPrice.toFixed(1)}]` : "";

  return [
    `${emoji} <b>BUY ${params.symbol} ${params.strike} ${params.type}</b>`,
    "━━━━━━━━━━━━━━━",
    `• <b>Entry:</b> ${cur}${params.entryPremium.toFixed(2)}`,
    `• <b>SL:</b> ${cur}${sl.toFixed(2)}`,
    `• <b>Target 1 (${tp1Label}):</b> ${cur}${tp1.toFixed(2)}${tp1SpotText}`,
    `• <b>Target 2 (${tp2Label}):</b> ${cur}${tp2.toFixed(2)}${tp2SpotText}`,
    `• <b>Lot:</b> ${lots} Lot (${params.lotSize * lots} Qty)`,
    `• <b>Expiry:</b> ${params.expiry}`,
    `• <b>Demo:</b> ${status}`,
  ].join("\n");
}

export interface ShortExitParams {
  symbol: string;
  contractName?: string;
  profit: number;
  closePrice: number;
  closeReason?: string;
  currency?: string;
  ticket?: number;
}

/**
 * Short & sweet position exit message for Telegram
 */
export function formatShortExitMessage(params: ShortExitParams): string {
  const cur = params.currency || "₹";
  const isProfit = params.profit >= 0;
  const emoji = isProfit ? "🎯" : "🛑";
  const pnlSign = isProfit ? "+" : "-";

  return [
    `${emoji} <b>EXIT: ${params.contractName || params.symbol}</b>`,
    "━━━━━━━━━━━━━━━",
    `• <b>P&L:</b> ${isProfit ? "🟢" : "🔴"} ${pnlSign}${cur}${Math.abs(params.profit).toFixed(2)}`,
    `• <b>Exit:</b> ${cur}${params.closePrice.toFixed(2)}`,
    `• <b>Reason:</b> ${params.closeReason || "Market Exit"}`,
    params.ticket ? `• <b>Ticket:</b> #${params.ticket}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface Short1ClickExecutedParams {
  symbol: string;
  strike: number;
  type: "CE" | "PE";
  side: "BUY" | "SELL";
  price: number;
  lotSize: number;
  volumeLots?: number;
  expiry: string;
  currency?: string;
}

/**
 * Short & sweet 1-click execution notification for Telegram
 */
export function formatShort1ClickExecutedMessage(params: Short1ClickExecutedParams): string {
  const cur = params.currency || "₹";
  const emoji = params.side === "BUY" ? "🟢" : "🔴";
  const lots = params.volumeLots || 1;

  return [
    `${emoji} <b>EXECUTED: ${params.side} ${params.symbol} ${params.strike} ${params.type}</b>`,
    "━━━━━━━━━━━━━━━",
    `• <b>Price:</b> ${cur}${params.price.toFixed(2)}`,
    `• <b>Lot:</b> ${lots} Lot (${params.lotSize * lots} Qty)`,
    `• <b>Expiry:</b> ${params.expiry}`,
    `• <b>Demo:</b> ✅ Executed`,
  ].join("\n");
}
