import { NextRequest, NextResponse } from "next/server";

// Ensure Node TLS allows Telegram API calls across environments and local proxies
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function extractDedupKey(message: string): { key: string; windowMs: number } {
  // Strip HTML tags and normalize whitespace
  const plain = message.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const firstLine = plain.split("\n")[0] || plain;
  const upper = firstLine.toUpperCase();

  // 1. Entry Signal (e.g., "BUY CRUDEOIL 9150 CE", "BUY DLF 670 CE", "BUY NIFTY 24850 PE")
  const entryMatch = upper.match(/(BUY|SELL)\s+([A-Z0-9_\-]+)\s+(\d+(?:\.\d+)?)\s+(CE|PE)/);
  if (entryMatch) {
    const [, side, sym, strike, type] = entryMatch;
    return {
      key: `ENTRY_${side}_${sym}_${strike}_${type}`,
      windowMs: 10 * 60 * 1000, // 10-minute cooldown window for the exact same contract
    };
  }

  // 2. Auto-bot or 1-Click execution
  if (upper.includes("AUTO-BOT") || upper.includes("EXECUTED")) {
    const cleaned = upper.replace(/[^A-Z0-9_]/g, "_").slice(0, 80);
    return {
      key: `EXEC_${cleaned}`,
      windowMs: 5 * 60 * 1000, // 5-minute cooldown
    };
  }

  // 3. Exit alerts
  if (upper.includes("EXIT") || upper.includes("CLOSED")) {
    const cleaned = upper.replace(/[^A-Z0-9_]/g, "_").slice(0, 80);
    return {
      key: `EXIT_${cleaned}`,
      windowMs: 2 * 60 * 1000, // 2-minute cooldown
    };
  }

  // 4. Default fallback
  const fallbackKey = upper.replace(/[^A-Z0-9_]/g, "").slice(0, 80);
  return {
    key: `GEN_${fallbackKey}`,
    windowMs: 60 * 1000, // 1-minute cooldown
  };
}

// Server-side anti-spam firewall to strictly prevent alert flooding
let lastBroadcastTimestamp = 0;
const recentMessageHashes = new Map<string, number>();

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

    // 1. Safe rate limiting with auto-pacing (avoids dropping signals across different assets)
    const throttleMs = isTest ? 500 : 800;
    const timeSinceLast = now - lastBroadcastTimestamp;
    if (timeSinceLast < throttleMs) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs - timeSinceLast));
    }

    // 2. Smart Contract & Content Deduplication Check
    if (!isTest) {
      const { key: dedupKey, windowMs } = extractDedupKey(message);
      const lastSeen = recentMessageHashes.get(dedupKey);

      if (lastSeen && now - lastSeen < windowMs) {
        const remainingSec = Math.ceil((windowMs - (now - lastSeen)) / 1000);
        console.warn(`[Telegram Firewall] Duplicate alert dropped for key '${dedupKey}'. Cooldown remaining: ${remainingSec}s`);
        return NextResponse.json({
          success: true,
          throttled: true,
          message: `Duplicate alert dropped within anti-spam window (${remainingSec}s remaining).`,
        });
      }
      recentMessageHashes.set(dedupKey, now);
    }

    // Prune stale hashes older than 30 minutes
    if (recentMessageHashes.size > 200) {
      const expiry = now - 30 * 60 * 1000;
      recentMessageHashes.forEach((time, key) => {
        if (time < expiry) {
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
