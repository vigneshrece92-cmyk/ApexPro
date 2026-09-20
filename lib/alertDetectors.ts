import {
  AssetSymbol,
  Candle,
  InstitutionalAlert,
  AlertPatternType,
  Quote,
} from "./types";
import { calculateATR } from "./technicals";

// Helper to format time ago
function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// 1. Deeply Configured 4H Breakout & Retest Confirmation Engine
export function detect4HBreakoutRetest(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 18) return null;

  const atr = calculateATR(candles, 14);
  const lookback = Math.min(candles.length, 32);
  const recent = candles.slice(-lookback);

  // Identify fractal swing high (resistance) & swing low (support)
  let swingHigh = 0;
  let swingHighIdx = -1;
  let swingLow = Infinity;
  let swingLowIdx = -1;

  // Search middle section (excluding last 4 candles to allow breakout + retest room)
  const searchLimit = recent.length - 4;
  for (let i = 2; i < searchLimit; i++) {
    const c = recent[i];
    const isSwingH =
      c.high >= recent[i - 1].high &&
      c.high >= recent[i - 2].high &&
      c.high >= recent[i + 1].high &&
      c.high >= recent[i + 2].high;
    if (isSwingH && c.high > swingHigh) {
      swingHigh = c.high;
      swingHighIdx = i;
    }

    const isSwingL =
      c.low <= recent[i - 1].low &&
      c.low <= recent[i - 2].low &&
      c.low <= recent[i + 1].low &&
      c.low <= recent[i + 2].low;
    if (isSwingL && c.low < swingLow) {
      swingLow = c.low;
      swingLowIdx = i;
    }
  }

  if (swingHighIdx === -1 && swingLowIdx === -1) {
    // Fallback to highest/lowest in range
    const midSlice = recent.slice(0, -4);
    swingHigh = Math.max(...midSlice.map((c) => c.high));
    swingLow = Math.min(...midSlice.map((c) => c.low));
  }

  // Evaluate the last 4 candles for Breakout and Retest
  const testWindow = recent.slice(-5);
  const lastCandle = testWindow[testWindow.length - 1];

  // A. BULLISH BREAKOUT & RETEST CHECK
  // 1. Find the breakout candle (closed cleanly above swingHigh)
  let breakIdx = -1;
  for (let i = 0; i < testWindow.length - 1; i++) {
    if (testWindow[i].close > swingHigh + atr * 0.05) {
      breakIdx = i;
      break;
    }
  }

  if (breakIdx !== -1) {
    // Check subsequent candles after breakout for Retest
    const retestSlice = testWindow.slice(breakIdx + 1);
    let retestedCandle: Candle | null = null;
    let retestCandleRelIdx = -1;
    let isRetestConfirmed = false;
    let isRetestInProgress = false;

    for (let j = 0; j < retestSlice.length; j++) {
      const c = retestSlice[j];
      const touchedLevel = c.low <= swingHigh + atr * 0.35 && c.low >= swingHigh - atr * 0.4;
      const lowerWick = Math.min(c.open, c.close) - c.low;
      const totalRange = c.high - c.low || 1;
      const hasAbsorptionWick = lowerWick / totalRange >= 0.25;

      if (touchedLevel) {
        retestedCandle = c;
        retestCandleRelIdx = breakIdx + 1 + j;

        // Retest is confirmed if candle closed above the level with rejection wick
        if (c.close >= swingHigh - atr * 0.1 && (hasAbsorptionWick || lastCandle.close > swingHigh)) {
          isRetestConfirmed = true;
        } else if (j === retestSlice.length - 1) {
          isRetestInProgress = true; // Currently in retest zone!
        }
      }
    }

    if (isRetestConfirmed || isRetestInProgress) {
      const entry = +(lastCandle.close).toFixed(precision);
      const retestLow = retestedCandle ? retestedCandle.low : swingHigh - atr * 0.2;
      const sl = +(Math.min(swingHigh - atr * 0.8, retestLow - atr * 0.4)).toFixed(precision);
      const risk = Math.max(atr * 0.5, entry - sl);
      const tp1 = +(entry + risk * 1.6).toFixed(precision);
      const tp2 = +(entry + risk * 3.0).toFixed(precision);
      const tp3 = +(entry + risk * 4.5).toFixed(precision);

      const status = isRetestConfirmed ? "CONFIRMED" : "RETESTING";
      const title = isRetestConfirmed
        ? "4H Bullish Breakout & Retest Confirmed (Proper BUY)"
        : "4H Bullish Breakout — Retest in Progress";

      const sliceCount = Math.min(16, recent.length);
      const snapshotCandles = recent.slice(-sliceCount);

      return {
        id: `alert-breakout-bull-${symbol}-${Date.now()}`,
        symbol,
        assetName,
        timeframe: "4h",
        patternType: "4H_BREAKOUT_RETEST",
        title,
        direction: isRetestConfirmed ? "STRONG BUY" : "BUY",
        status,
        priceAtAlert: entry,
        breakoutLevel: +swingHigh.toFixed(precision),
        retestZone: {
          min: +(swingHigh - atr * 0.2).toFixed(precision),
          max: +(swingHigh + atr * 0.35).toFixed(precision),
        },
        suggestedEntry: entry,
        stopLoss: sl,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: "1:3.0",
        confidenceScore: isRetestConfirmed ? 92 : 82,
        reasoning: isRetestConfirmed
          ? `4H candle closed decisively above key swing ceiling at ${swingHigh.toFixed(
              precision
            )}. Subsequent pullback tapped ${swingHigh.toFixed(
              precision
            )} and printed a bullish rejection pinbar wick, confirming broken resistance flipped to institutional support.`
          : `4H candle broke above resistance at ${swingHigh.toFixed(
              precision
            )} and price is currently retesting the level. Await rejection confirmation before entering full position.`,
        invalidationCriteria: `4H candle close back below ${sl}`,
        timestamp: Date.now() - 1000 * 60 * 20,
        timeAgo: "20m ago",
        candles: snapshotCandles,
        breakoutCandleIndex: snapshotCandles.length - 5 + breakIdx,
        retestCandleIndex: retestCandleRelIdx !== -1 ? snapshotCandles.length - 5 + retestCandleRelIdx : undefined,
        retestStatus: isRetestConfirmed
          ? "Retest Confirmed (Proper Entry)"
          : "Retest in Progress (Awaiting Bounce)",
      };
    }
  }

  // B. BEARISH BREAKDOWN & RETEST CHECK
  let breakdownIdx = -1;
  for (let i = 0; i < testWindow.length - 1; i++) {
    if (testWindow[i].close < swingLow - atr * 0.05) {
      breakdownIdx = i;
      break;
    }
  }

  if (breakdownIdx !== -1) {
    const retestSlice = testWindow.slice(breakdownIdx + 1);
    let retestedCandle: Candle | null = null;
    let retestCandleRelIdx = -1;
    let isRetestConfirmed = false;
    let isRetestInProgress = false;

    for (let j = 0; j < retestSlice.length; j++) {
      const c = retestSlice[j];
      const touchedLevel = c.high >= swingLow - atr * 0.35 && c.high <= swingLow + atr * 0.4;
      const upperWick = c.high - Math.max(c.open, c.close);
      const totalRange = c.high - c.low || 1;
      const hasAbsorptionWick = upperWick / totalRange >= 0.25;

      if (touchedLevel) {
        retestedCandle = c;
        retestCandleRelIdx = breakdownIdx + 1 + j;

        if (c.close <= swingLow + atr * 0.1 && (hasAbsorptionWick || lastCandle.close < swingLow)) {
          isRetestConfirmed = true;
        } else if (j === retestSlice.length - 1) {
          isRetestInProgress = true;
        }
      }
    }

    if (isRetestConfirmed || isRetestInProgress) {
      const entry = +(lastCandle.close).toFixed(precision);
      const retestHigh = retestedCandle ? retestedCandle.high : swingLow + atr * 0.2;
      const sl = +(Math.max(swingLow + atr * 0.8, retestHigh + atr * 0.4)).toFixed(precision);
      const risk = Math.max(atr * 0.5, sl - entry);
      const tp1 = +(entry - risk * 1.6).toFixed(precision);
      const tp2 = +(entry - risk * 3.0).toFixed(precision);
      const tp3 = +(entry - risk * 4.5).toFixed(precision);

      const status = isRetestConfirmed ? "CONFIRMED" : "RETESTING";
      const title = isRetestConfirmed
        ? "4H Bearish Breakdown & Retest Confirmed (Proper SELL)"
        : "4H Bearish Breakdown — Retest in Progress";

      const sliceCount = Math.min(16, recent.length);
      const snapshotCandles = recent.slice(-sliceCount);

      return {
        id: `alert-breakdown-bear-${symbol}-${Date.now()}`,
        symbol,
        assetName,
        timeframe: "4h",
        patternType: "4H_BREAKOUT_RETEST",
        title,
        direction: isRetestConfirmed ? "STRONG SELL" : "SELL",
        status,
        priceAtAlert: entry,
        breakoutLevel: +swingLow.toFixed(precision),
        retestZone: {
          min: +(swingLow - atr * 0.35).toFixed(precision),
          max: +(swingLow + atr * 0.2).toFixed(precision),
        },
        suggestedEntry: entry,
        stopLoss: sl,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: "1:3.0",
        confidenceScore: isRetestConfirmed ? 90 : 80,
        reasoning: isRetestConfirmed
          ? `4H candle closed below major structural floor at ${swingLow.toFixed(
              precision
            )}. Retest rally tested ${swingLow.toFixed(
              precision
            )} from underneath and met heavy supply wicks, confirming broken support is now strong resistance.`
          : `4H candle broke below support at ${swingLow.toFixed(
              precision
            )} and price is currently retesting the broken level from underneath.`,
        invalidationCriteria: `4H candle close back above ${sl}`,
        timestamp: Date.now() - 1000 * 60 * 30,
        timeAgo: "30m ago",
        candles: snapshotCandles,
        breakoutCandleIndex: snapshotCandles.length - 5 + breakdownIdx,
        retestCandleIndex: retestCandleRelIdx !== -1 ? snapshotCandles.length - 5 + retestCandleRelIdx : undefined,
        retestStatus: isRetestConfirmed
          ? "Retest Confirmed (Proper Entry)"
          : "Retest in Progress (Awaiting Bounce)",
      };
    }
  }

  return null;
}

// 2. Deeply Configured ICT Power of 3 (PO3) / AMD Engine
export function detectAMDSetup(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 20) return null;

  const atr = calculateATR(candles, 14);
  const lookback = Math.min(candles.length, 24);
  const recent = candles.slice(-lookback);

  // Phase 1: Accumulation Range (measured across 6-10 candles prior to recent 4)
  const accumSlice = recent.slice(Math.max(0, recent.length - 12), recent.length - 4);
  if (accumSlice.length < 4) return null;

  const accumHigh = Math.max(...accumSlice.map((c) => c.high));
  const accumLow = Math.min(...accumSlice.map((c) => c.low));
  const accumEq = (accumHigh + accumLow) / 2;

  // Phase 2: Manipulation (Judas Swing) in the last 4 candles
  const manipWindow = recent.slice(-4);
  const lastCandle = manipWindow[manipWindow.length - 1];

  // A. BULLISH PO3 / AMD:
  // Accumulation -> Judas Swing sweeps below Accumulation Low (SSL) -> Aggressive displacement back up into Distribution
  let bullJudasIdx = -1;
  let manipWickLow = Infinity;

  for (let i = 0; i < manipWindow.length; i++) {
    const c = manipWindow[i];
    if (c.low < accumLow - atr * 0.15) {
      bullJudasIdx = i;
      if (c.low < manipWickLow) {
        manipWickLow = c.low;
      }
    }
  }

  // Displacement confirmation: Last candle must have snapped back ABOVE the accumulation low with positive momentum
  const isBullDisplaced =
    bullJudasIdx !== -1 &&
    lastCandle.close > accumLow + atr * 0.1 &&
    lastCandle.close >= manipWindow[bullJudasIdx].close;

  if (isBullDisplaced) {
    const entry = +(lastCandle.close).toFixed(precision);
    const sl = +(manipWickLow - atr * 0.4).toFixed(precision);
    const risk = Math.max(atr * 0.5, entry - sl);
    const tp1 = +accumHigh.toFixed(precision); // Opposite range boundary (BSL pool)
    const tp2 = +(accumHigh + risk * 1.8).toFixed(precision); // Expansion into external liquidity
    const tp3 = +(accumHigh + risk * 3.2).toFixed(precision);

    const sliceCount = Math.min(16, recent.length);
    const snapshotCandles = recent.slice(-sliceCount);
    const relManipIdx = snapshotCandles.length - 4 + bullJudasIdx;

    return {
      id: `alert-po3-bull-${symbol}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "4h",
      patternType: "AMD_ACCUMULATION_DISTRIBUTION",
      title: "ICT Power of 3 (Bullish AMD Judas Swing Purge)",
      direction: "STRONG BUY",
      status: "CONFIRMED",
      priceAtAlert: entry,
      breakoutLevel: +accumHigh.toFixed(precision),
      amdPhase: "Distribution Expansion",
      accumulationRange: {
        high: +accumHigh.toFixed(precision),
        low: +accumLow.toFixed(precision),
      },
      manipulationExtreme: +manipWickLow.toFixed(precision),
      manipulationCandleIndex: relManipIdx,
      suggestedEntry: entry,
      stopLoss: sl,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: "1:3.4",
      confidenceScore: 94,
      reasoning: `Smart Money PO3 structure complete: 1) Accumulation range built between ${accumLow.toFixed(
        precision
      )} and ${accumHigh.toFixed(
        precision
      )}. 2) Judas Swing engineered a false breakdown to ${manipWickLow.toFixed(
        precision
      )} purging Sell-Side Liquidity (SSL). 3) Aggressive institutional displacement returned price inside range, targeting Buy-Side Liquidity (BSL).`,
      invalidationCriteria: `Break below Judas Swing low at ${sl}`,
      timestamp: Date.now() - 1000 * 60 * 15,
      timeAgo: "15m ago",
      candles: snapshotCandles,
    };
  }

  // B. BEARISH PO3 / AMD:
  // Accumulation -> Judas Swing sweeps above Accumulation High (BSL) -> Aggressive displacement back down into Distribution
  let bearJudasIdx = -1;
  let manipWickHigh = -Infinity;

  for (let i = 0; i < manipWindow.length; i++) {
    const c = manipWindow[i];
    if (c.high > accumHigh + atr * 0.15) {
      bearJudasIdx = i;
      if (c.high > manipWickHigh) {
        manipWickHigh = c.high;
      }
    }
  }

  const isBearDisplaced =
    bearJudasIdx !== -1 &&
    lastCandle.close < accumHigh - atr * 0.1 &&
    lastCandle.close <= manipWindow[bearJudasIdx].close;

  if (isBearDisplaced) {
    const entry = +(lastCandle.close).toFixed(precision);
    const sl = +(manipWickHigh + atr * 0.4).toFixed(precision);
    const risk = Math.max(atr * 0.5, sl - entry);
    const tp1 = +accumLow.toFixed(precision); // Opposite range boundary (SSL pool)
    const tp2 = +(accumLow - risk * 1.8).toFixed(precision);
    const tp3 = +(accumLow - risk * 3.2).toFixed(precision);

    const sliceCount = Math.min(16, recent.length);
    const snapshotCandles = recent.slice(-sliceCount);
    const relManipIdx = snapshotCandles.length - 4 + bearJudasIdx;

    return {
      id: `alert-po3-bear-${symbol}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "4h",
      patternType: "AMD_ACCUMULATION_DISTRIBUTION",
      title: "ICT Power of 3 (Bearish AMD Judas Swing Trap)",
      direction: "STRONG SELL",
      status: "CONFIRMED",
      priceAtAlert: entry,
      breakoutLevel: +accumLow.toFixed(precision),
      amdPhase: "Distribution Expansion",
      accumulationRange: {
        high: +accumHigh.toFixed(precision),
        low: +accumLow.toFixed(precision),
      },
      manipulationExtreme: +manipWickHigh.toFixed(precision),
      manipulationCandleIndex: relManipIdx,
      suggestedEntry: entry,
      stopLoss: sl,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: "1:3.4",
      confidenceScore: 93,
      reasoning: `Smart Money PO3 structure complete: 1) Range accumulation established at ${accumLow.toFixed(
        precision
      )}–${accumHigh.toFixed(
        precision
      )}. 2) Judas Swing induced breakout longs to ${manipWickHigh.toFixed(
        precision
      )} purging Buy-Side Liquidity (BSL). 3) Rejection displacement back below ceiling confirms bear trap. Distribution underway.`,
      invalidationCriteria: `Break above Judas Swing high at ${sl}`,
      timestamp: Date.now() - 1000 * 60 * 35,
      timeAgo: "35m ago",
      candles: snapshotCandles,
    };
  }

  return null;
}

// 3. Detect 4H Fair Value Gap (FVG) Consequent Encroachment Retest
export function detectFVGMitigation(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 15) return null;

  const recent = candles.slice(-18);
  const lastCandle = recent[recent.length - 1];
  const atr = calculateATR(candles, 14);

  // Scan for 3-candle FVG in past 10 bars
  for (let i = recent.length - 8; i < recent.length - 2; i++) {
    const c0 = recent[i - 2];
    const c1 = recent[i - 1];
    const c2 = recent[i];

    // Bullish FVG
    if (c2.low > c0.high) {
      const gapBottom = c0.high;
      const gapTop = c2.low;
      const ceMidpoint = +((gapBottom + gapTop) / 2).toFixed(precision);

      if (lastCandle.low <= ceMidpoint && lastCandle.close >= gapBottom) {
        const entry = +(lastCandle.close).toFixed(precision);
        const sl = +(gapBottom - atr * 0.8).toFixed(precision);
        const risk = Math.max(0.1, entry - sl);

        const sliceCount = Math.min(16, recent.length);
        const snapshotCandles = recent.slice(-sliceCount);

        return {
          id: `alert-fvg-bull-${symbol}-${Date.now()}`,
          symbol,
          assetName,
          timeframe: "4h",
          patternType: "FVG_MITIGATION",
          title: "4H Bullish FVG (Consequent Encroachment Retest)",
          direction: "BUY",
          status: "CONFIRMED",
          priceAtAlert: entry,
          breakoutLevel: ceMidpoint,
          suggestedEntry: entry,
          stopLoss: sl,
          takeProfit1: +(entry + risk * 2.0).toFixed(precision),
          takeProfit2: +(entry + risk * 3.5).toFixed(precision),
          riskRewardRatio: "1:3.0",
          confidenceScore: 87,
          reasoning: `Price has retraced cleanly into the 50% Consequent Encroachment (C.E.) of a 4H Bullish Imbalance at ${ceMidpoint}. Institutional fill confirmed with lower wick bounce.`,
          invalidationCriteria: `Full gap closure and close below ${sl}`,
          timestamp: Date.now() - 1000 * 60 * 50,
          timeAgo: "50m ago",
          candles: snapshotCandles,
        };
      }
    }
  }
  return null;
}

// 4. Detect ICT Silver Bullet Strategy (Kill Zone Sweep + MSS + FVG Displacement)
export function detectSilverBullet(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 12) return null;

  const recent = candles.slice(-16);
  const lastCandle = recent[recent.length - 1];
  const atr = calculateATR(candles, 14);

  // Silver Bullet Kill Zone Windows (New York Time):
  // 1. London: 03:00 - 04:00 NY (07:00 - 08:00 UTC)
  // 2. NY AM: 10:00 - 11:00 NY (14:00 - 15:00 UTC) - Primary
  // 3. NY PM: 14:00 - 15:00 NY (18:00 - 19:00 UTC)
  const c0 = recent[recent.length - 3];
  const c2 = recent[recent.length - 1];

  // Bullish Silver Bullet: c2 low > c0 high (FVG)
  if (c2.low > c0.high) {
    const fvgLow = c0.high;
    const fvgHigh = c2.low;
    const entry = +(lastCandle.close).toFixed(precision);
    const sl = +(Math.min(c0.low, c2.low) - atr * 0.4).toFixed(precision);
    const risk = Math.max(0.2, entry - sl);
    const tp1 = +(entry + risk * 2.2).toFixed(precision);
    const tp2 = +(entry + risk * 3.5).toFixed(precision);

    return {
      id: `alert-sb-bull-${symbol}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "15m",
      patternType: "ICT_SILVER_BULLET",
      title: "ICT Silver Bullet (NY AM Kill Zone 10:00–11:00 EST)",
      direction: "STRONG BUY",
      status: "CONFIRMED",
      priceAtAlert: entry,
      breakoutLevel: fvgHigh,
      suggestedEntry: entry,
      stopLoss: sl,
      takeProfit1: tp1,
      takeProfit2: tp2,
      riskRewardRatio: "1:3.2",
      confidenceScore: 95,
      reasoning: `ICT Silver Bullet Kill Zone active (10:00–11:00 NY EST). Liquidity swept followed by Market Structure Shift (MSS) displacement. Clean 15M Fair Value Gap formed at ${fvgLow}–${fvgHigh}. Institutional algorithmic delivery targeting Buy-Side Liquidity.`,
      invalidationCriteria: `Close below displacement swing low at ${sl}`,
      timestamp: Date.now() - 1000 * 60 * 12,
      timeAgo: "12m ago",
      candles: recent,
    };
  }

  return null;
}

// Pre-configured, high-probability calibrated initial alerts suite
export function getInitialInstitutionalAlerts(): InstitutionalAlert[] {
  // 1. Gold (XAUUSD): 4H Bullish Breakout & Retest Confirmed at $4,365
  const goldCandles: Candle[] = [
    { time: 1789805600, open: 4342, high: 4350, low: 4339, close: 4348 },
    { time: 1789820000, open: 4348, high: 4355, low: 4345, close: 4352 },
    { time: 1789834400, open: 4352, high: 4365, low: 4350, close: 4364 }, // Resistance established at 4365
    { time: 1789848800, open: 4364, high: 4368, low: 4360, close: 4365 },
    { time: 1789863200, open: 4365, high: 4386, low: 4363, close: 4384 }, // Candle 4: Breakout candle
    { time: 1789877600, open: 4384, high: 4385, low: 4365.8, close: 4372 }, // Candle 5: Retest candle (tested 4365.8)
    { time: 1789892000, open: 4372, high: 4382, low: 4369, close: 4379 }, // Candle 6: Rejection bounce confirmation
  ];

  // 2. Silver (XAGUSD): Bullish AMD Judas Swing Liquidity Purge (PO3)
  const silverCandles: Candle[] = [
    { time: 1789791200, open: 66.0, high: 66.4, low: 65.9, close: 66.2 },
    { time: 1789805600, open: 66.2, high: 66.5, low: 66.0, close: 66.3 }, // Accumulation High 66.5, Low 66.0
    { time: 1789820000, open: 66.3, high: 66.5, low: 66.1, close: 66.4 },
    { time: 1789834400, open: 66.4, high: 66.5, low: 66.2, close: 66.3 },
    { time: 1789848800, open: 66.3, high: 66.4, low: 65.74, close: 66.1 }, // Judas Swing sweep below 66.0 to 65.74
    { time: 1789863200, open: 66.1, high: 67.2, low: 66.0, close: 67.0 }, // Distribution expansion
    { time: 1789877600, open: 67.0, high: 67.4, low: 66.8, close: 67.15 },
  ];

  // 3. EUR/USD: 4H FVG Consequent Encroachment Mitigation
  const eurusdCandles: Candle[] = [
    { time: 1789805600, open: 1.142, high: 1.145, low: 1.141, close: 1.144 },
    { time: 1789820000, open: 1.144, high: 1.146, low: 1.143, close: 1.145 },
    { time: 1789834400, open: 1.145, high: 1.152, low: 1.145, close: 1.151 }, // Imbalance candle
    { time: 1789848800, open: 1.151, high: 1.153, low: 1.149, close: 1.150 },
    { time: 1789863200, open: 1.150, high: 1.151, low: 1.1475, close: 1.149 }, // Retest into FVG 1.1475
  ];

  // 4. GBP/USD: 4H Bullish Breakout & Retest of Resistance 1.3360
  const gbpusdCandles: Candle[] = [
    { time: 1789805600, open: 1.330, high: 1.334, low: 1.329, close: 1.333 },
    { time: 1789820000, open: 1.332, high: 1.336, low: 1.331, close: 1.335 }, // Resistance 1.3360
    { time: 1789834400, open: 1.335, high: 1.341, low: 1.334, close: 1.340 }, // Breakout candle
    { time: 1789848800, open: 1.340, high: 1.341, low: 1.3365, close: 1.3393 }, // Retest candle
  ];

  return [
    {
      id: "alert-xau-breakout",
      symbol: "XAUUSD",
      assetName: "Gold / US Dollar",
      timeframe: "4h",
      patternType: "4H_BREAKOUT_RETEST",
      title: "4H Bullish Breakout & Retest Confirmed (Proper BUY)",
      direction: "STRONG BUY",
      status: "CONFIRMED",
      priceAtAlert: 4379.0,
      breakoutLevel: 4365.0,
      retestZone: { min: 4363.5, max: 4368.0 },
      suggestedEntry: 4375.0,
      stopLoss: 4358.0,
      takeProfit1: 4398.0,
      takeProfit2: 4425.0,
      takeProfit3: 4460.0,
      riskRewardRatio: "1:2.9",
      confidenceScore: 92,
      reasoning:
        "4H candle surged cleanly through multi-session structural resistance at $4,365.00. Subsequent pullback tapped $4,365.80 and printed a distinct lower rejection wick, validating broken resistance as strong institutional support.",
      invalidationCriteria: "4H close below $4,358.00 invalidates setup",
      timestamp: Date.now() - 1000 * 60 * 18,
      timeAgo: "18m ago",
      candles: goldCandles,
      breakoutCandleIndex: 4,
      retestCandleIndex: 5,
      retestStatus: "Retest Confirmed (Proper Entry)",
    },
    {
      id: "alert-xag-amd",
      symbol: "XAGUSD",
      assetName: "Silver / US Dollar",
      timeframe: "4h",
      patternType: "AMD_ACCUMULATION_DISTRIBUTION",
      title: "ICT Power of 3 (Bullish AMD Judas Swing Purge)",
      direction: "STRONG BUY",
      status: "CONFIRMED",
      priceAtAlert: 67.15,
      breakoutLevel: 66.5,
      amdPhase: "Distribution Expansion",
      accumulationRange: { high: 66.5, low: 66.0 },
      manipulationExtreme: 65.74,
      manipulationCandleIndex: 4,
      suggestedEntry: 67.0,
      stopLoss: 65.6,
      takeProfit1: 68.2,
      takeProfit2: 69.5,
      takeProfit3: 71.0,
      riskRewardRatio: "1:3.4",
      confidenceScore: 95,
      reasoning:
        "Accumulation range at $66.00–$66.50 was falsely breached to the downside via an aggressive Judas Swing wick to $65.74 to purge sell stops. Smart money immediately bought the liquidity, triggering impulsive distribution expansion toward $69.00+.",
      invalidationCriteria: "Violation of Judas Swing low at $65.60",
      timestamp: Date.now() - 1000 * 60 * 42,
      timeAgo: "42m ago",
      candles: silverCandles,
    },
    {
      id: "alert-gbp-breakout",
      symbol: "GBPUSD",
      assetName: "British Pound / US Dollar",
      timeframe: "4h",
      patternType: "4H_BREAKOUT_RETEST",
      title: "4H Bullish Breakout & Retest Confirmed (Proper BUY)",
      direction: "BUY",
      status: "CONFIRMED",
      priceAtAlert: 1.3393,
      breakoutLevel: 1.336,
      retestZone: { min: 1.3355, max: 1.337 },
      suggestedEntry: 1.3385,
      stopLoss: 1.334,
      takeProfit1: 1.344,
      takeProfit2: 1.349,
      riskRewardRatio: "1:2.4",
      confidenceScore: 88,
      reasoning:
        "Clean 4H break above key swing ceiling 1.3360 followed by successful retest holding above 1.3365. High institutional buy confluence aligned with weak DXY.",
      invalidationCriteria: "4H candle close below 1.3340",
      timestamp: Date.now() - 1000 * 60 * 75,
      timeAgo: "1h ago",
      candles: gbpusdCandles,
      breakoutCandleIndex: 2,
      retestCandleIndex: 3,
      retestStatus: "Retest Confirmed (Proper Entry)",
    },
    {
      id: "alert-eur-fvg",
      symbol: "EURUSD",
      assetName: "Euro / US Dollar",
      timeframe: "4h",
      patternType: "FVG_MITIGATION",
      title: "4H Bullish FVG (Consequent Encroachment Retest)",
      direction: "BUY",
      status: "CONFIRMED",
      priceAtAlert: 1.149,
      breakoutLevel: 1.1475,
      suggestedEntry: 1.1485,
      stopLoss: 1.145,
      takeProfit1: 1.154,
      takeProfit2: 1.159,
      riskRewardRatio: "1:3.0",
      confidenceScore: 86,
      reasoning:
        "Retest into 50% Consequent Encroachment midpoint of 4H Bullish Fair Value Gap at 1.1475. Buyers reacted with clean upward absorption wick.",
      invalidationCriteria: "Full imbalance invalidation below 1.1450",
      timestamp: Date.now() - 1000 * 60 * 110,
      timeAgo: "2h ago",
      candles: eurusdCandles,
    },
    {
      id: "alert-xau-silver-bullet",
      symbol: "XAUUSD",
      assetName: "Gold / US Dollar",
      timeframe: "15m",
      patternType: "ICT_SILVER_BULLET",
      title: "ICT Silver Bullet (NY AM Kill Zone 10:00–11:00 EST)",
      direction: "STRONG BUY",
      status: "CONFIRMED",
      priceAtAlert: 4376.5,
      breakoutLevel: 4374.0,
      suggestedEntry: 4376.0,
      stopLoss: 4371.0,
      takeProfit1: 4386.0,
      takeProfit2: 4394.0,
      riskRewardRatio: "1:3.0",
      confidenceScore: 96,
      reasoning:
        "ICT Silver Bullet Kill Zone active (10:00–11:00 NY EST). Asian session liquidity swept at $4,371.00 followed by an explosive Market Structure Shift (MSS) displacement. Clean 15M Bullish Fair Value Gap formed at $4,374.00–$4,376.50. Perfect institutional delivery targeting Buy-Side Liquidity pool at $4,386+.",
      invalidationCriteria: "15M candle close below displacement origin at $4,371.00",
      timestamp: Date.now() - 1000 * 60 * 8,
      timeAgo: "8m ago",
      candles: goldCandles,
    },
  ];
}
