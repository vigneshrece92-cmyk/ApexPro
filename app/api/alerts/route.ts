import { NextResponse } from "next/server";
import {
  detect4HBreakoutRetest,
  detectAMDSetup,
  detectFVGMitigation,
  getInitialInstitutionalAlerts,
} from "@/lib/alertDetectors";
import { AssetSymbol, Candle, InstitutionalAlert } from "@/lib/types";

export async function GET() {
  try {
    const liveAlerts: InstitutionalAlert[] = [];
    const baselineAlerts = getInitialInstitutionalAlerts();

    // 1. Fetch Real 4H Spot Gold Candles from Binance PAXG (4h klines)
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
        fetch("https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=4h&limit=30", {
          next: { revalidate: 30 },
        })
          .then((r) => r.json())
          .catch(() => null),
      ]);

      const spotPrice = spotGoldRes?.price ? parseFloat(spotGoldRes.price) : 4379.0;
      const paxgLast = tickerRes ? parseFloat(tickerRes.lastPrice || tickerRes.bidPrice) : spotPrice;
      const offset = spotPrice - paxgLast;

      if (klinesRes && Array.isArray(klinesRes) && klinesRes.length >= 15) {
        const gold4HCandles: Candle[] = klinesRes.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: +(parseFloat(k[1]) + offset).toFixed(2),
          high: +(parseFloat(k[2]) + offset).toFixed(2),
          low: +(parseFloat(k[3]) + offset).toFixed(2),
          close: +(parseFloat(k[4]) + offset).toFixed(2),
          volume: +parseFloat(k[5]).toFixed(2),
        }));

        // Run detectors on live 4H Gold candles
        const breakoutAlert = detect4HBreakoutRetest("XAUUSD", "Gold / US Dollar", gold4HCandles, 2);
        if (breakoutAlert) liveAlerts.push(breakoutAlert);

        const amdAlert = detectAMDSetup("XAUUSD", "Gold / US Dollar", gold4HCandles, 2);
        if (amdAlert) liveAlerts.push(amdAlert);

        const fvgAlert = detectFVGMitigation("XAUUSD", "Gold / US Dollar", gold4HCandles, 2);
        if (fvgAlert) liveAlerts.push(fvgAlert);
      }
    } catch (e) {
      console.warn("Live 4H Gold alert scan fallback:", e);
    }

    // Merge live detected alerts with baseline alerts (deduping by symbol & patternType)
    const alertMap = new Map<string, InstitutionalAlert>();

    // Add baseline alerts first
    baselineAlerts.forEach((a) => {
      alertMap.set(`${a.symbol}-${a.patternType}`, a);
    });

    // Override or prepend newly detected live alerts
    liveAlerts.forEach((a) => {
      alertMap.set(`${a.symbol}-${a.patternType}`, a);
    });

    const finalAlerts = Array.from(alertMap.values());

    return NextResponse.json({
      success: true,
      alerts: finalAlerts,
      count: finalAlerts.length,
      liveScanned: liveAlerts.length,
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
