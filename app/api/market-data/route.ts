import { NextRequest, NextResponse } from "next/server";
import { INITIAL_QUOTES, generateRealisticCandles } from "@/lib/defaultData";
import { AssetSymbol, TimeFrame, Candle, Quote } from "@/lib/types";

// Ensure Node TLS allows Yahoo Finance fetch across environments
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "NIFTY") as AssetSymbol;
  const timeframe = (searchParams.get("timeframe") || "5m") as TimeFrame;
  const count = parseInt(searchParams.get("count") || "100", 10);

  const updatedQuotes: Record<AssetSymbol, Quote> = { ...INITIAL_QUOTES };
  let activeCandles: Candle[] = [];

  // Dedicated Indian Options & MCX Commodities Yahoo Symbol Mapping
  const yahooSymbols: Partial<Record<AssetSymbol, string>> = {
    NIFTY: "^NSEI",
    BANKNIFTY: "^NSEBANK",
    SENSEX: "^BSESN",
    FINNIFTY: "NIFTY_FIN_SERVICE.NS",
    CRUDEOIL: "CL=F",
    NATURALGAS: "NG=F",
    INDIAVIX: "^INDIAVIX",
    USDINR: "INR=X",
  };

  const yahooKeys = Object.keys(yahooSymbols) as AssetSymbol[];

  try {
    let yInterval = "5m";
    let yRange = "5d";
    if (timeframe === "1m") {
      yInterval = "1m";
      yRange = "1d";
    } else if (timeframe === "5m") {
      yInterval = "5m";
      yRange = "5d";
    } else if (timeframe === "15m") {
      yInterval = "15m";
      yRange = "5d";
    } else if (timeframe === "1h") {
      yInterval = "1h";
      yRange = "1mo";
    } else if (timeframe === "4h") {
      yInterval = "1h";
      yRange = "1mo";
    } else if (timeframe === "1d") {
      yInterval = "1d";
      yRange = "3mo";
    }

    await Promise.all(
      yahooKeys.map(async (key) => {
        const ySym = yahooSymbols[key];
        if (!ySym) return;

        const isTarget = symbol === key;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          ySym
        )}?interval=${isTarget ? yInterval : "1d"}&range=${isTarget ? yRange : "1d"}`;

        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            next: { revalidate: isTarget ? 10 : 30 },
            signal: AbortSignal.timeout(4000),
          });

          if (res.ok) {
            const data = await res.json();
            const res0 = data?.chart?.result?.[0];
            if (!res0) return;

            const meta = res0.meta;
            const regularPrice = meta?.regularMarketPrice;
            if (regularPrice == null) return;

            const isCrude = key === "CRUDEOIL";
            const isNatGas = key === "NATURALGAS";
            const mcxMultiplier = isCrude ? 93.60 : isNatGas ? 87.58 : 1.0;

            let effectivePrice = regularPrice * mcxMultiplier;
            let prevClose = (meta?.previousClose || meta?.chartPreviousClose || regularPrice) * mcxMultiplier;
            let changePercent = prevClose ? +(((effectivePrice - prevClose) / prevClose) * 100).toFixed(2) : 0;

            const precision = key === "NATURALGAS" || key === "USDINR" || key === "INDIAVIX" ? 2 : 2;
            const multiplier = 100;

            let high = (meta?.regularMarketDayHigh || meta?.highPrice || regularPrice) * mcxMultiplier;
            let low = (meta?.regularMarketDayLow || meta?.lowPrice || regularPrice) * mcxMultiplier;

            const baseQuote = INITIAL_QUOTES[key];

            updatedQuotes[key] = {
              symbol: key,
              name: baseQuote?.name || key,
              category: baseQuote?.category || "Indian Index",
              bid: +effectivePrice.toFixed(precision),
              ask: +(effectivePrice + (key === "NATURALGAS" ? 0.2 : key === "CRUDEOIL" ? 2.0 : 1.5)).toFixed(precision),
              spread: +(key === "NATURALGAS" ? 0.2 : key === "CRUDEOIL" ? 2.0 : 1.5).toFixed(1),
              change24h: changePercent,
              high24h: +high.toFixed(precision),
              low24h: +low.toFixed(precision),
              pipPrecision: precision,
              pipMultiplier: multiplier,
              lotSize: baseQuote?.lotSize,
              strikeStep: baseQuote?.strikeStep,
              currency: baseQuote?.currency || "₹",
              lastUpdate: Date.now(),
            };

            // If this is the requested active symbol, parse its real live exchange candles
            if (isTarget) {
              const times = res0.timestamp || [];
              const quotes = res0.indicators?.quote?.[0] || {};
              const parsed: Candle[] = [];

              for (let i = 0; i < times.length; i++) {
                const o = quotes.open?.[i];
                const h = quotes.high?.[i];
                const l = quotes.low?.[i];
                const c = quotes.close?.[i];
                const v = quotes.volume?.[i] || 0;

                if (o != null && c != null && h != null && l != null) {
                  // Filter out Yahoo metadata artifacts where bar has 0 volume and 0 price range
                  const isFlatArtifact = i === times.length - 1 && v === 0 && Math.abs(h - l) < 0.0001 && parsed.length > 0;
                  if (!isFlatArtifact) {
                    parsed.push({
                      time: times[i],
                      open: +(o * mcxMultiplier).toFixed(precision),
                      high: +(h * mcxMultiplier).toFixed(precision),
                      low: +(l * mcxMultiplier).toFixed(precision),
                      close: +(c * mcxMultiplier).toFixed(precision),
                      volume: v,
                    });
                  }
                }
              }

              if (parsed.length > 0) {
                const lastBar = parsed[parsed.length - 1];
                lastBar.close = +effectivePrice.toFixed(precision);
                lastBar.high = Math.max(lastBar.high, lastBar.close);
                lastBar.low = Math.min(lastBar.low, lastBar.close);
                activeCandles = parsed.slice(-count);
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch Yahoo symbol ${key}:`, err);
        }
      })
    );
  } catch (e) {
    console.warn("Error fetching Yahoo finance data:", e);
  }

  const activeQuote = updatedQuotes[symbol] || INITIAL_QUOTES[symbol] || updatedQuotes.NIFTY;

  // Fallback to realistic candles if network data was unavailable or partial
  if (activeCandles.length === 0) {
    activeCandles = generateRealisticCandles(symbol, timeframe, count, activeQuote.bid);
  } else if (activeCandles.length > 0) {
    const last = activeCandles[activeCandles.length - 1];
    last.close = activeQuote.bid;
    last.high = Math.max(last.high, activeQuote.bid);
    last.low = Math.min(last.low, activeQuote.bid);
  }

  return NextResponse.json({
    symbol,
    timeframe,
    source: "indian-nse-mcx-feed",
    quote: activeQuote,
    candles: activeCandles,
    allQuotes: updatedQuotes,
    timestamp: Date.now(),
  });
}
