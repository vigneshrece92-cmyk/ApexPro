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

    // Dedicated Indian Options & MCX Commodities Config
    const indianAssetConfigs: {
      symbol: AssetSymbol;
      name: string;
      ySym: string;
      pattern: any;
      multiplier?: number;
    }[] = [
      { symbol: "NIFTY", name: "NIFTY 50", ySym: "^NSEI", pattern: "4H_BREAKOUT_RETEST" },
      { symbol: "BANKNIFTY", name: "BANK NIFTY", ySym: "^NSEBANK", pattern: "AMD_ACCUMULATION_DISTRIBUTION" },
      { symbol: "CRUDEOIL", name: "CRUDE OIL (MCX)", ySym: "CL=F", pattern: "FVG_MITIGATION", multiplier: 83.8 },
      { symbol: "NATURALGAS", name: "NATURAL GAS (MCX)", ySym: "NG=F", pattern: "4H_BREAKOUT_RETEST", multiplier: 83.8 },
      { symbol: "SENSEX", name: "BSE SENSEX", ySym: "^BSESN", pattern: "AMD_ACCUMULATION_DISTRIBUTION" },
      { symbol: "FINNIFTY", name: "FIN NIFTY", ySym: "NIFTY_FIN_SERVICE.NS", pattern: "ICT_SILVER_BULLET" },
    ];

    await Promise.all(
      indianAssetConfigs.map(async (item) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ySym)}?interval=1h&range=5d`,
            {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              next: { revalidate: 30 },
              signal: AbortSignal.timeout(4000),
            }
          );

          const defaultQuote = INITIAL_QUOTES[item.symbol];
          const precision = defaultQuote?.pipPrecision || 2;
          const mult = item.multiplier || 1;

          if (res.ok) {
            const data = await res.json();
            const res0 = data?.chart?.result?.[0];
            const regularPrice = res0?.meta?.regularMarketPrice;
            const livePrice =
              regularPrice != null ? +(regularPrice * mult).toFixed(precision) : defaultQuote.bid;

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
                  open: +(o * mult).toFixed(precision),
                  high: +(h * mult).toFixed(precision),
                  low: +(l * mult).toFixed(precision),
                  close: +(c * mult).toFixed(precision),
                  volume: v,
                });
              }
            }

            if (assetCandles.length > 0) {
              assetCandles[assetCandles.length - 1].close = livePrice;
            }

            const itemQuote: Quote = {
              ...defaultQuote,
              bid: livePrice,
              ask: +(livePrice + (item.symbol === "NATURALGAS" ? 0.2 : item.symbol === "CRUDEOIL" ? 2.0 : 1.5)).toFixed(precision),
              lastUpdate: Date.now(),
            };

            // Run institutional detectors
            let detectedAlert: InstitutionalAlert | null = null;
            if (item.pattern === "AMD_ACCUMULATION_DISTRIBUTION") {
              detectedAlert = detectAMDSetup(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "FVG_MITIGATION") {
              detectedAlert = detectFVGMitigation(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "4H_BREAKOUT_RETEST") {
              detectedAlert = detect4HBreakoutRetest(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "ICT_SILVER_BULLET") {
              detectedAlert = detectSilverBullet(item.symbol, item.name, assetCandles, precision);
            }

            if (detectedAlert) {
              alertMap.set(`${item.symbol}-${item.pattern}`, detectedAlert);
            } else {
              alertMap.set(
                `${item.symbol}-${item.pattern}`,
                generateDynamicLiveAlert(item.symbol, item.name, assetCandles, itemQuote, item.pattern)
              );
            }
          } else {
            alertMap.set(
              `${item.symbol}-${item.pattern}`,
              generateDynamicLiveAlert(item.symbol, item.name, [], defaultQuote, item.pattern)
            );
          }
        } catch (err) {
          console.warn(`Error scanning live alerts for ${item.symbol}:`, err);
          const defaultQuote = INITIAL_QUOTES[item.symbol];
          alertMap.set(
            `${item.symbol}-${item.pattern}`,
            generateDynamicLiveAlert(item.symbol, item.name, [], defaultQuote, item.pattern)
          );
        }
      })
    );

    const alerts = Array.from(alertMap.values());

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      market: "INDIAN_OPTIONS_AND_MCX",
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
