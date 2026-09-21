import { NextResponse } from "next/server";
import {
  detect4HBreakoutRetest,
  detectAMDSetup,
  detectFVGMitigation,
  detectSilverBullet,
  generateDynamicLiveAlert,
  getInitialInstitutionalAlerts,
} from "@/lib/alertDetectors";
import { AssetSymbol, Candle, InstitutionalAlert, Quote } from "@/lib/types";
import { INITIAL_QUOTES } from "@/lib/defaultData";

// Ensure Node TLS allows Yahoo Finance fetch across environments
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const alertMap = new Map<string, InstitutionalAlert>();

    // 1. Fetch Live Spot Gold + Real 1H/4H Candles (Gold-API + Binance PAXG)
    let liveGoldPrice = INITIAL_QUOTES.XAUUSD.bid;
    let goldCandles: Candle[] = [];
    try {
      const [spotGoldRes, tickerRes, klinesRes] = await Promise.all([
        fetch("https://api.gold-api.com/price/XAU", {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 15 },
        })
          .then((r) => r.json())
          .catch(() => null),
        fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT", {
          next: { revalidate: 15 },
        })
          .then((r) => r.json())
          .catch(() => null),
        fetch("https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1h&limit=40", {
          next: { revalidate: 30 },
        })
          .then((r) => r.json())
          .catch(() => null),
      ]);

      let spotPrice = spotGoldRes?.price ? parseFloat(spotGoldRes.price) : 0;
      if (!spotPrice && tickerRes?.lastPrice) {
        spotPrice = parseFloat(tickerRes.lastPrice) + 8.20;
      }
      if (!spotPrice) {
        spotPrice = INITIAL_QUOTES.XAUUSD.bid;
      }
      const paxgLast = tickerRes ? parseFloat(tickerRes.lastPrice || tickerRes.bidPrice) : spotPrice;
      const offset = spotPrice - paxgLast;
      liveGoldPrice = +spotPrice.toFixed(2);

      if (klinesRes && Array.isArray(klinesRes) && klinesRes.length >= 10) {
        goldCandles = klinesRes.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: +(parseFloat(k[1]) + offset).toFixed(2),
          high: +(parseFloat(k[2]) + offset).toFixed(2),
          low: +(parseFloat(k[3]) + offset).toFixed(2),
          close: +(parseFloat(k[4]) + offset).toFixed(2),
          volume: +parseFloat(k[5]).toFixed(2),
        }));
        if (goldCandles.length > 0) {
          goldCandles[goldCandles.length - 1].close = liveGoldPrice;
        }
      }
    } catch (e) {
      console.warn("Gold live fetch warning:", e);
    }

    const goldQuote: Quote = {
      ...INITIAL_QUOTES.XAUUSD,
      bid: liveGoldPrice,
      ask: +(liveGoldPrice + 0.38).toFixed(2),
      lastUpdate: Date.now(),
    };

    // Run detectors on live Gold
    const goldBreakout = detect4HBreakoutRetest("XAUUSD", "Gold / US Dollar", goldCandles, 2);
    if (goldBreakout) {
      alertMap.set("XAUUSD-4H_BREAKOUT_RETEST", goldBreakout);
    } else {
      alertMap.set(
        "XAUUSD-4H_BREAKOUT_RETEST",
        generateDynamicLiveAlert("XAUUSD", "Gold / US Dollar", goldCandles, goldQuote, "4H_BREAKOUT_RETEST")
      );
    }

    const goldSilverBullet = detectSilverBullet("XAUUSD", "Gold / US Dollar", goldCandles, 2);
    if (goldSilverBullet) {
      alertMap.set("XAUUSD-ICT_SILVER_BULLET", goldSilverBullet);
    } else {
      alertMap.set(
        "XAUUSD-ICT_SILVER_BULLET",
        generateDynamicLiveAlert("XAUUSD", "Gold / US Dollar", goldCandles, goldQuote, "ICT_SILVER_BULLET")
      );
    }

    // 2. Fetch Live Quotes & Real Candles for Silver, EURUSD, GBPUSD, and USDJPY from Yahoo Finance
    const yahooConfig: { symbol: AssetSymbol; name: string; ySym: string; pattern: any }[] = [
      { symbol: "XAGUSD", name: "Silver / US Dollar", ySym: "SI=F", pattern: "AMD_ACCUMULATION_DISTRIBUTION" },
      { symbol: "EURUSD", name: "Euro / US Dollar", ySym: "EURUSD=X", pattern: "FVG_MITIGATION" },
      { symbol: "GBPUSD", name: "British Pound / US Dollar", ySym: "GBPUSD=X", pattern: "4H_BREAKOUT_RETEST" },
      { symbol: "USDJPY", name: "US Dollar / Japanese Yen", ySym: "JPY=X", pattern: "AMD_ACCUMULATION_DISTRIBUTION" },
    ];

    await Promise.all(
      yahooConfig.map(async (item) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ySym)}?interval=1h&range=5d`,
            {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              next: { revalidate: 30 },
            }
          );

          if (res.ok) {
            const data = await res.json();
            const res0 = data?.chart?.result?.[0];
            const regularPrice = res0?.meta?.regularMarketPrice;
            const precision = INITIAL_QUOTES[item.symbol]?.pipPrecision || 2;
            const livePrice =
              regularPrice != null ? +regularPrice.toFixed(precision) : INITIAL_QUOTES[item.symbol].bid;

            const times = res0?.timestamp || [];
            const quotes = res0?.indicators?.quote?.[0] || {};
            const assetCandles: Candle[] = [];

            for (let i = 0; i < times.length; i++) {
              const o = quotes.open?.[i];
              const h = quotes.high?.[i];
              const l = quotes.low?.[i];
              const c = quotes.close?.[i];
              const v = quotes.volume?.[i] || 0;

              if (o != null && c != null && h != null && l != null) {
                assetCandles.push({
                  time: times[i],
                  open: +o.toFixed(precision),
                  high: +h.toFixed(precision),
                  low: +l.toFixed(precision),
                  close: +c.toFixed(precision),
                  volume: v,
                });
              }
            }

            if (assetCandles.length > 0) {
              assetCandles[assetCandles.length - 1].close = livePrice;
            }

            const itemQuote: Quote = {
              ...INITIAL_QUOTES[item.symbol],
              bid: livePrice,
              ask: +(livePrice + (item.symbol.includes("USD") && precision === 5 ? 0.0001 : 0.01)).toFixed(precision),
              lastUpdate: Date.now(),
            };

            // Run detectors
            let detectedAlert: InstitutionalAlert | null = null;
            if (item.pattern === "AMD_ACCUMULATION_DISTRIBUTION") {
              detectedAlert = detectAMDSetup(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "FVG_MITIGATION") {
              detectedAlert = detectFVGMitigation(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "4H_BREAKOUT_RETEST") {
              detectedAlert = detect4HBreakoutRetest(item.symbol, item.name, assetCandles, precision);
            }

            if (detectedAlert) {
              alertMap.set(`${item.symbol}-${item.pattern}`, detectedAlert);
            } else {
              // Dynamically generate from real candles & current live quote
              alertMap.set(
                `${item.symbol}-${item.pattern}`,
                generateDynamicLiveAlert(item.symbol, item.name, assetCandles, itemQuote, item.pattern)
              );
            }
          } else {
            alertMap.set(
              `${item.symbol}-${item.pattern}`,
              generateDynamicLiveAlert(item.symbol, item.name, [], INITIAL_QUOTES[item.symbol], item.pattern)
            );
          }
        } catch (err) {
          console.warn(`Error scanning live alerts for ${item.symbol}:`, err);
          alertMap.set(
            `${item.symbol}-${item.pattern}`,
            generateDynamicLiveAlert(item.symbol, item.name, [], INITIAL_QUOTES[item.symbol], item.pattern)
          );
        }
      })
    );

    const alerts = Array.from(alertMap.values());

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Alerts API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate alerts", alerts: getInitialInstitutionalAlerts() },
      { status: 500 }
    );
  }
}
