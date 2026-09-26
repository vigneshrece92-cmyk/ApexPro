import { NextRequest, NextResponse } from "next/server";
import { AssetSymbol, Candle, Quote } from "@/lib/types";
import { INITIAL_QUOTES } from "@/lib/defaultData";
import {
  calculatePivotAnchoredVolumeProfile,
  detectPAVPSignals,
  getPAVPConfigForTimeframe,
} from "@/lib/technicals";
import { getRecommendedOptionContract, getOptionSpec } from "@/lib/optionsEngine";
import { formatShortEntryMessage } from "@/lib/telegramBroadcaster";
import { isIndianMarketOpen } from "@/lib/demoTradingEngine";

// Ensure Node TLS allows Yahoo Finance & Telegram fetch across environments
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60; // Allow up to 60s for Vercel Serverless

// Server-side persistent deduplication cache: stores "SYMBOL_ACTION_CANDLETIME" -> timestamp
const sentSignalTimestamps = new Map<string, number>();
const lastSymbolAlertTime = new Map<string, number>();
const SYMBOL_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes cooldown per symbol to prevent repeated alerts

const MONITORED_ASSETS: { symbol: AssetSymbol; ySym: string; multiplier?: number }[] = [
  // Primary Indices
  { symbol: "NIFTY", ySym: "^NSEI" },
  { symbol: "BANKNIFTY", ySym: "^NSEBANK" },
  { symbol: "FINNIFTY", ySym: "NIFTY_FIN_SERVICE.NS" },
  { symbol: "SENSEX", ySym: "^BSESN" },

  // MCX Commodities
  { symbol: "CRUDEOIL", ySym: "CL=F" },
  { symbol: "NATURALGAS", ySym: "NG=F" },

  // Top 30 High-Volume Volatile NSE F&O Stocks
  { symbol: "RELIANCE", ySym: "RELIANCE.NS" },
  { symbol: "HDFCBANK", ySym: "HDFCBANK.NS" },
  { symbol: "ICICIBANK", ySym: "ICICIBANK.NS" },
  { symbol: "SBIN", ySym: "SBIN.NS" },
  { symbol: "TATAMOTORS", ySym: "TATAMOTORS.NS" },
  { symbol: "TATASTEEL", ySym: "TATASTEEL.NS" },
  { symbol: "INFY", ySym: "INFY.NS" },
  { symbol: "TCS", ySym: "TCS.NS" },
  { symbol: "BAJFINANCE", ySym: "BAJFINANCE.NS" },
  { symbol: "MARUTI", ySym: "MARUTI.NS" },
  { symbol: "LT", ySym: "LT.NS" },
  { symbol: "AXISBANK", ySym: "AXISBANK.NS" },
  { symbol: "KOTAKBANK", ySym: "KOTAKBANK.NS" },
  { symbol: "BHARTIARTL", ySym: "BHARTIARTL.NS" },
  { symbol: "ADANIENT", ySym: "ADANIENT.NS" },
  { symbol: "ADANIPORTS", ySym: "ADANIPORTS.NS" },
  { symbol: "HINDUNILVR", ySym: "HINDUNILVR.NS" },
  { symbol: "ITC", ySym: "ITC.NS" },
  { symbol: "SUNPHARMA", ySym: "SUNPHARMA.NS" },
  { symbol: "TITAN", ySym: "TITAN.NS" },
  { symbol: "JSWSTEEL", ySym: "JSWSTEEL.NS" },
  { symbol: "COALINDIA", ySym: "COALINDIA.NS" },
  { symbol: "NTPC", ySym: "NTPC.NS" },
  { symbol: "POWERGRID", ySym: "POWERGRID.NS" },
  { symbol: "BPCL", ySym: "BPCL.NS" },
  { symbol: "ONGC", ySym: "ONGC.NS" },
  { symbol: "VEDL", ySym: "VEDL.NS" },
  { symbol: "BHEL", ySym: "BHEL.NS" },
  { symbol: "DLF", ySym: "DLF.NS" },
  { symbol: "BEL", ySym: "BEL.NS" },
];

async function scanAsset(
  item: { symbol: AssetSymbol; ySym: string },
  usdInrRate: number
): Promise<{ symbol: AssetSymbol; triggered: boolean; message?: string }> {
  const marketStatus = isIndianMarketOpen(item.symbol);
  if (!marketStatus.isOpen) {
    return { symbol: item.symbol, triggered: false, message: `Market Closed (${marketStatus.statusText})` };
  }

  // Check symbol-level cooldown (prevent sending multiple alerts for the same symbol within 20 mins)
  const lastAlert = lastSymbolAlertTime.get(item.symbol) || 0;
  if (Date.now() - lastAlert < SYMBOL_COOLDOWN_MS) {
    return { symbol: item.symbol, triggered: false, message: "In cooldown period" };
  }

  const isCrude = item.symbol === "CRUDEOIL";
  const isNatGas = item.symbol === "NATURALGAS";
  const baseQuote = INITIAL_QUOTES[item.symbol];
  const precision = baseQuote?.pipPrecision || 2;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      item.ySym
    )}?interval=15m&range=5d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return { symbol: item.symbol, triggered: false, message: "Yahoo chart fetch failed" };
    }

    const data = await res.json();
    const res0 = data?.chart?.result?.[0];
    if (!res0) {
      return { symbol: item.symbol, triggered: false, message: "No chart data returned" };
    }

    const regularPrice = res0?.meta?.regularMarketPrice;
    const factor = isCrude ? usdInrRate * 1.0215 : isNatGas ? usdInrRate : 1.0;
    const livePrice = regularPrice != null ? +(regularPrice * factor).toFixed(precision) : baseQuote.bid;

    const times = res0.timestamp || [];
    const quotes = res0.indicators?.quote?.[0] || {};
    const candles: Candle[] = [];

    for (let i = 0; i < times.length; i++) {
      const o = quotes.open?.[i];
      const h = quotes.high?.[i];
      const l = quotes.low?.[i];
      const c = quotes.close?.[i];
      const v = quotes.volume?.[i] || 0;

      if (o != null && c != null && h != null && l != null) {
        // Drop flat zero-volume artifact at the very end
        if (v === 0 && Math.abs(h - l) < 0.0001 && i === times.length - 1 && candles.length > 0) {
          continue;
        }
        candles.push({
          time: times[i],
          open: +(o * factor).toFixed(precision),
          high: +(h * factor).toFixed(precision),
          low: +(l * factor).toFixed(precision),
          close: +(c * factor).toFixed(precision),
          volume: v,
        });
      }
    }

    if (candles.length < 20) {
      return { symbol: item.symbol, triggered: false, message: "Insufficient candles" };
    }

    // Set latest price
    candles[candles.length - 1].close = livePrice;

    // Calculate institutional PAVP (PineScript v6 dgtrd PAVP)
    const pavpConf = getPAVPConfigForTimeframe("15m");
    const pavp = calculatePivotAnchoredVolumeProfile(
      candles,
      pavpConf.pvtLength,
      pavpConf.profileLevels,
      pavpConf.valueAreaPct,
      precision
    );

    if (!pavp || pavp.poc <= 0) {
      return { symbol: item.symbol, triggered: false, message: "PAVP calculation failed" };
    }

    const { signals } = detectPAVPSignals(candles, pavp, item.symbol, precision);
    if (!signals || signals.length === 0) {
      return { symbol: item.symbol, triggered: false, message: "No active PAVP signals" };
    }

    // Only look at the latest completed candle (the last 2 bars: latest or immediate previous bar)
    const latestBarIdx = candles.length - 1;
    const targetSignal = signals.find((s) => {
      if (typeof s.candleIndex === "number") {
        return latestBarIdx - s.candleIndex <= 1; // Strictly on the latest 1-2 bars
      }
      return false;
    });

    if (!targetSignal) {
      return { symbol: item.symbol, triggered: false, message: "No fresh signals on current candle" };
    }

    const candleTime = targetSignal.time || candles[targetSignal.candleIndex || latestBarIdx].time;

    // STRICT DEDUPLICATION KEY: tied to SYMBOL + ACTION + CANDLE_TIMESTAMP
    // Since a 15-minute candle timestamp is fixed, this key CAN NEVER FIRE TWICE FOR THE SAME CANDLE
    const dedupKey = `${item.symbol}_${targetSignal.action}_${candleTime}`;

    if (sentSignalTimestamps.has(dedupKey)) {
      return { symbol: item.symbol, triggered: false, message: "Already notified for this candle" };
    }

    const optContract = getRecommendedOptionContract(item.symbol, targetSignal.action, livePrice);
    const optSpec = getOptionSpec(item.symbol);
    const curSym = baseQuote.currency || "₹";

    const alertMessage = formatShortEntryMessage({
      symbol: item.symbol,
      strike: optContract.strike,
      type: optContract.type,
      entryPremium: optContract.premiumAsk,
      lotSize: optSpec.lotSize,
      expiry: optContract.expiry,
      currency: curSym,
      demoStatus: "executed",
    });

    // Dispatch directly to Telegram via internal API or direct POST
    const botToken = process.env.TG_BOT_TOKEN || "8418044614:AAEp4LY018UyKt4_v0Qj-7ux1eEZg8APAd0";
    const chatId = process.env.TG_CHAT_ID || "-5005740750";

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: alertMessage,
        parse_mode: "HTML",
      }),
    });

    if (tgRes.ok) {
      sentSignalTimestamps.set(dedupKey, Date.now());
      lastSymbolAlertTime.set(item.symbol, Date.now());
      return { symbol: item.symbol, triggered: true, message: `Alert sent: ${optContract.strike} ${optContract.type}` };
    } else {
      const errData = await tgRes.json().catch(() => ({}));
      return { symbol: item.symbol, triggered: false, message: `Telegram error: ${errData.description || "Unknown"}` };
    }
  } catch (err) {
    return {
      symbol: item.symbol,
      triggered: false,
      message: err instanceof Error ? err.message : "Internal scan error",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const usdInrRate = 95.945;
    const results: { symbol: AssetSymbol; triggered: boolean; message?: string }[] = [];

    // Scan all monitored assets in concurrent batches of 6
    const BATCH_SIZE = 6;
    for (let i = 0; i < MONITORED_ASSETS.length; i += BATCH_SIZE) {
      const batch = MONITORED_ASSETS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((item) => scanAsset(item, usdInrRate))
      );
      results.push(...batchResults);
    }

    const triggeredCount = results.filter((r) => r.triggered).length;

    // Prune deduplication cache entries older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    sentSignalTimestamps.forEach((timestamp, key) => {
      if (timestamp < oneDayAgo) {
        sentSignalTimestamps.delete(key);
      }
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      triggeredCount,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron execution error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
