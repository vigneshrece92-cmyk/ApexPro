import { NextRequest, NextResponse } from "next/server";

// Ensure Node TLS allows Telegram API calls across environments and local proxies
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Server-side anti-spam firewall to strictly prevent alert flooding
let lastBroadcastTimestamp = 0;
const recentMessageHashes = new Map<string, number>();
const DEDUP_WINDOW_MS = 180000; // 3 minutes deduplication window for identical messages

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, botToken, chatId, isTest, clearCache } = body;

    if (clearCache) {
      recentMessageHashes.clear();
      lastBroadcastTimestamp = 0;
      return NextResponse.json({ success: true, message: "Telegram throttle cache cleared." });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "No message provided" }, { status: 400 });
    }

    const now = Date.now();

    // 1. Minimum global cooldown throttle (3 seconds)
    const throttleMs = isTest ? 1000 : 3000;
    const timeSinceLast = now - lastBroadcastTimestamp;
    if (timeSinceLast < throttleMs) {
      console.warn(`[Telegram Firewall] Throttled message. Cooldown active (${Math.round((throttleMs - timeSinceLast) / 1000)}s remaining)`);
      return NextResponse.json({
        success: true,
        throttled: true,
        message: "Message safely throttled by anti-spam rate limiter.",
      });
    }

    // 2. Content deduplication check (differentiates distinct tickets)
    if (!isTest) {
      const isDistinctTrade = message.includes("Ticket:");
      const normalizedKey = isDistinctTrade
        ? message.replace(/\d{2}:\d{2}:\d{2}/g, "").trim()
        : message.replace(/Ticket:\s*#?\d+/g, "").replace(/\d{2}:\d{2}:\d{2}/g, "").trim();

      const lastSeen = recentMessageHashes.get(normalizedKey);
      if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
        console.warn("[Telegram Firewall] Duplicate message dropped within window.");
        return NextResponse.json({
          success: true,
          throttled: true,
          message: "Duplicate alert dropped within anti-spam window.",
        });
      }
      recentMessageHashes.set(normalizedKey, now);
    }

    // Cleanup old hashes periodically
    if (recentMessageHashes.size > 200) {
      recentMessageHashes.forEach((time, key) => {
        if (now - time > DEDUP_WINDOW_MS) {
          recentMessageHashes.delete(key);
        }
      });
    }

    const resolvedBotToken =
      botToken || process.env.TG_BOT_TOKEN || "8418044614:AAEp4LY018UyKt4_v0Qj-7ux1eEZg8APAd0";
    const resolvedChatId = chatId || process.env.TG_CHAT_ID || "-5005740750";

    const tgUrl = `https://api.telegram.org/bot${resolvedBotToken}/sendMessage`;
    const resp = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: resolvedChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await resp.json();
    if (!data.ok) {
      return NextResponse.json(
        { success: false, error: `Telegram error: ${data.description}` },
        { status: 400 }
      );
    }

    lastBroadcastTimestamp = now;

    return NextResponse.json({ success: true, message: "Broadcast sent to Telegram!" });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
