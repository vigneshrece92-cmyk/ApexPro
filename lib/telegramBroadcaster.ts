/**
 * ApexFX Pro Telegram Broadcast Utility
 * Pre-configured with @profitcatcher_bot and user chat ID
 */

export const DEFAULT_TG_BOT_TOKEN = "8418044614:AAEp4LY018UyKt4_v0Qj-7ux1eEZg8APAd0";
export const DEFAULT_TG_CHAT_ID = "-5005740750";

let clientLastSentTimestamp = 0;
const CLIENT_MIN_COOLDOWN_MS = 15000; // 15 seconds

export async function sendTelegramNotification(message: string): Promise<boolean> {
  const now = Date.now();
  if (now - clientLastSentTimestamp < CLIENT_MIN_COOLDOWN_MS) {
    return false; // Safely throttled
  }

  try {
    clientLastSentTimestamp = now;
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
