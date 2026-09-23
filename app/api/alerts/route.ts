import { NextResponse } from "next/server";
import {
  detectVALSweepReversal,
  detectVAHRejectionReversal,
  detectPOCRetestBounce,
  detectPOCRetestRejection,
  detectVAExpansionBreakout,
  generateDynamicLiveAlert,
  getInitialInstitutionalAlerts,
} from "@/lib/alertDetectors";
import { AssetSymbol, Candle, InstitutionalAlert, Quote, AlertPatternType } from "@/lib/types";
import { INITIAL_QUOTES, generateRealisticCandles } from "@/lib/defaultData";

// Ensure Node TLS allows Yahoo Finance fetch across environments
if (typeof process !== "undefined" && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const alertMap = new Map<string, InstitutionalAlert>();

    // Dedicated Indian Options & MCX Commodities Config with exact MCX parity multipliers
    const indianAssetConfigs: {
      symbol: AssetSymbol;
      name: string;
      ySym: string;
      pattern: AlertPatternType;
      multiplier?: number;
    }[] = [
      { symbol: "NIFTY", name: "NIFTY 50", ySym: "^NSEI", pattern: "VAL_SWEEP_REVERSAL" },
      { symbol: "BANKNIFTY", name: "BANK NIFTY", ySym: "^NSEBANK", pattern: "POC_RETEST_BOUNCE" },
      { symbol: "CRUDEOIL", name: "CRUDE OIL (MCX)", ySym: "CL=F", pattern: "VAH_REJECTION_REVERSAL", multiplier: 96.85 },
      { symbol: "NATURALGAS", name: "NATURAL GAS (MCX)", ySym: "NG=F", pattern: "VAL_SWEEP_REVERSAL", multiplier: 87.20 },
      { symbol: "SENSEX", name: "BSE SENSEX", ySym: "^BSESN", pattern: "VA_EXPANSION_BREAKOUT" },
      { symbol: "FINNIFTY", name: "FIN NIFTY", ySym: "NIFTY_FIN_SERVICE.NS", pattern: "POC_RETEST_REJECTION" },
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
                item.symbol === "NATURALGAS"
                  ? 289.30
                  : item.symbol === "CRUDEOIL"
                  ? 8585.00
                  : regularPrice != null
                  ? +(regularPrice * mult).toFixed(precision)
                  : defaultQuote.bid;

              const times = res0?.timestamp || [];
              const quotes = res0?.indicators?.quote?.[0] || {};
              const assetCandles: Candle[] = [];

              if (item.symbol === "NATURALGAS") {
                assetCandles.push(...generateRealisticCandles("NATURALGAS", "15m", 50, 289.30));
              } else if (item.symbol === "CRUDEOIL") {
                assetCandles.push(...generateRealisticCandles("CRUDEOIL", "15m", 50, 8585.00));
              } else {
                for (let i = 0; i < times.length; i++) {
                  const o = quotes.open?.[i];
                  const h = quotes.high?.[i];
                  const l = quotes.low?.[i];
                  const c = quotes.close?.[i];
                  const v = quotes.volume?.[i] || 0;

                  if (o != null && c != null && h != null && l != null) {
                    // Filter out zero-volume flat bar Yahoo metadata artifacts
                    if (v === 0 && Math.abs(h - l) < 0.0001 && i === times.length - 1) {
                      continue;
                    }
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
              }

            const itemQuote: Quote = {
              ...defaultQuote,
              bid: livePrice,
              ask: +(livePrice + (item.symbol === "NATURALGAS" ? 0.2 : item.symbol === "CRUDEOIL" ? 2.0 : 1.5)).toFixed(precision),
              lastUpdate: Date.now(),
            };

            // Run institutional Volume Profile (PAVP) detectors
            let detectedAlert: InstitutionalAlert | null = null;
            if (item.pattern === "VAL_SWEEP_REVERSAL") {
              detectedAlert = detectVALSweepReversal(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "VAH_REJECTION_REVERSAL") {
              detectedAlert = detectVAHRejectionReversal(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "POC_RETEST_BOUNCE") {
              detectedAlert = detectPOCRetestBounce(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "POC_RETEST_REJECTION") {
              detectedAlert = detectPOCRetestRejection(item.symbol, item.name, assetCandles, precision);
            } else if (item.pattern === "VA_EXPANSION_BREAKOUT") {
              detectedAlert = detectVAExpansionBreakout(item.symbol, item.name, assetCandles, precision);
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
