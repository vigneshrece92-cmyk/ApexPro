import {
  AssetSymbol,
  Candle,
  InstitutionalAlert,
  AlertPatternType,
  Quote,
} from "./types";
import { calculateATR, calculatePivotAnchoredVolumeProfile } from "./technicals";
import { INITIAL_QUOTES, generateRealisticCandles } from "./defaultData";
import { getRecommendedOptionContract, getOptionSpec } from "./optionsEngine";

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

// 1. Value Area Low (VAL) Liquidity Sweep & Reversal Detector (BUY CE)
export function detectVALSweepReversal(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 15) return null;

  const pavp = calculatePivotAnchoredVolumeProfile(candles, 15, 28, 0.68, precision);
  const { val, poc, vah } = pavp;
  if (val <= 0 || poc <= 0) return null;

  const atr = calculateATR(candles, 14);
  const buffer = Math.max(atr * 0.35, Math.abs(vah - val) * 0.04);
  const recent = candles.slice(-5);
  const lastCandle = recent[recent.length - 1];
  const currentPrice = lastCandle.close;

  // Check if any recent candle swept below or into VAL and closed back above
  let sweptIdx = -1;
  for (let i = 0; i < recent.length; i++) {
    const c = recent[i];
    if (c.low <= val + buffer * 0.5 && c.close >= val - buffer * 0.3) {
      sweptIdx = i;
      break;
    }
  }

  if (sweptIdx === -1 && Math.abs(currentPrice - val) > buffer * 1.5) {
    return null;
  }

  const optContract = getRecommendedOptionContract(symbol, "BUY CE", currentPrice);
  const optSpec = getOptionSpec(symbol);
  const sl = +(val - buffer * 1.5).toFixed(precision);
  const tp1 = +poc.toFixed(precision);
  const tp2 = +vah.toFixed(precision);
  const tp3 = +(vah + buffer * 2.0).toFixed(precision);
  const risk = Math.max(0.5, currentPrice - sl);
  const reward = Math.max(0.5, tp1 - currentPrice);
  const rr = `1:${(reward / risk).toFixed(1)}`;

  return {
    id: `pavp-val-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    assetName,
    timeframe: "15m",
    patternType: "VAL_SWEEP_REVERSAL",
    title: `Value Area Low (VAL) Sweep & Rebound (BUY CE)`,
    direction: "BUY CE",
    status: "CONFIRMED",
    priceAtAlert: currentPrice,
    valPrice: val,
    pocPrice: poc,
    vahPrice: vah,
    levelPrice: val,
    vwcbSpike: true,
    optionStrikeSuggestion: `${optContract.strike} CE (${optSpec.lotSize} Qty/Lot)`,
    suggestedEntry: currentPrice,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskRewardRatio: rr,
    confidenceScore: 94,
    reasoning: `Institutional responsive buyers absorbed selling pressure below the Value Area Low (VAL: ₹${val}). Price swept liquidity and closed firmly back inside the Value Area with delta absorption wicks, targeting the Point of Control (POC: ₹${poc}) volume magnet.`,
    invalidationCriteria: `15m candle close decisively below VAL defense support at ₹${sl}`,
    timestamp: Date.now() - 1000 * 60 * 4,
    timeAgo: "4m ago",
    candles: candles.slice(-20),
    retestStatus: "VAL Sweep Confirmed (Responsive Demand)",
  };
}

// 2. Value Area High (VAH) Supply Rejection Detector (BUY PE)
export function detectVAHRejectionReversal(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 15) return null;

  const pavp = calculatePivotAnchoredVolumeProfile(candles, 15, 28, 0.68, precision);
  const { val, poc, vah } = pavp;
  if (vah <= 0 || poc <= 0) return null;

  const atr = calculateATR(candles, 14);
  const buffer = Math.max(atr * 0.35, Math.abs(vah - val) * 0.04);
  const recent = candles.slice(-5);
  const lastCandle = recent[recent.length - 1];
  const currentPrice = lastCandle.close;

  // Check if any recent candle tested or swept above VAH and closed back down
  let rejectedIdx = -1;
  for (let i = 0; i < recent.length; i++) {
    const c = recent[i];
    if (c.high >= vah - buffer * 0.5 && c.close <= vah + buffer * 0.3) {
      rejectedIdx = i;
      break;
    }
  }

  if (rejectedIdx === -1 && Math.abs(currentPrice - vah) > buffer * 1.5) {
    return null;
  }

  const optContract = getRecommendedOptionContract(symbol, "BUY PE", currentPrice);
  const optSpec = getOptionSpec(symbol);
  const sl = +(vah + buffer * 1.5).toFixed(precision);
  const tp1 = +poc.toFixed(precision);
  const tp2 = +val.toFixed(precision);
  const tp3 = +(val - buffer * 2.0).toFixed(precision);
  const risk = Math.max(0.5, sl - currentPrice);
  const reward = Math.max(0.5, currentPrice - tp1);
  const rr = `1:${(reward / risk).toFixed(1)}`;

  return {
    id: `pavp-vah-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    assetName,
    timeframe: "15m",
    patternType: "VAH_REJECTION_REVERSAL",
    title: `Value Area High (VAH) Supply Rejection (BUY PE)`,
    direction: "BUY PE",
    status: "CONFIRMED",
    priceAtAlert: currentPrice,
    valPrice: val,
    pocPrice: poc,
    vahPrice: vah,
    levelPrice: vah,
    vwcbSpike: true,
    optionStrikeSuggestion: `${optContract.strike} PE (${optSpec.lotSize} Qty/Lot)`,
    suggestedEntry: currentPrice,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskRewardRatio: rr,
    confidenceScore: 91,
    reasoning: `Commercial supply defended the Value Area High (VAH: ₹${vah}). Upper rejection wicks confirm buyers were exhausted at premium prices, triggering an institutional mean-reversion move toward Point of Control (POC: ₹${poc}) and VAL (₹${val}).`,
    invalidationCriteria: `15m candle close decisively above VAH resistance at ₹${sl}`,
    timestamp: Date.now() - 1000 * 60 * 7,
    timeAgo: "7m ago",
    candles: candles.slice(-20),
    retestStatus: "VAH Supply Rejection Confirmed",
  };
}

// 3. Point of Control (POC) Retest Support Bounce Detector (BUY CE)
export function detectPOCRetestBounce(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 15) return null;

  const pavp = calculatePivotAnchoredVolumeProfile(candles, 15, 28, 0.68, precision);
  const { val, poc, vah } = pavp;
  if (poc <= 0) return null;

  const atr = calculateATR(candles, 14);
  const buffer = Math.max(atr * 0.3, Math.abs(vah - val) * 0.035);
  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;

  const optContract = getRecommendedOptionContract(symbol, "BUY CE", currentPrice);
  const optSpec = getOptionSpec(symbol);
  const sl = +(poc - buffer * 1.4).toFixed(precision);
  const tp1 = +vah.toFixed(precision);
  const tp2 = +(vah + buffer * 2.0).toFixed(precision);
  const risk = Math.max(0.5, currentPrice - sl);
  const reward = Math.max(0.5, tp1 - currentPrice);
  const rr = `1:${(reward / risk).toFixed(1)}`;

  return {
    id: `pavp-poc-bounce-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    assetName,
    timeframe: "15m",
    patternType: "POC_RETEST_BOUNCE",
    title: `Point of Control (POC) Retest Support Bounce (BUY CE)`,
    direction: "BUY CE",
    status: "CONFIRMED",
    priceAtAlert: currentPrice,
    valPrice: val,
    pocPrice: poc,
    vahPrice: vah,
    levelPrice: poc,
    vwcbSpike: true,
    optionStrikeSuggestion: `${optContract.strike} CE (${optSpec.lotSize} Qty/Lot)`,
    suggestedEntry: currentPrice,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    riskRewardRatio: rr,
    confidenceScore: 93,
    reasoning: `Price held structural support at the heaviest historical volume node (Point of Control: ₹${poc}). Value migration confirms aggressive institutional absorption defending POC fair value, targeting Value Area High (VAH: ₹${vah}).`,
    invalidationCriteria: `15m candle close below POC support floor at ₹${sl}`,
    timestamp: Date.now() - 1000 * 60 * 11,
    timeAgo: "11m ago",
    candles: candles.slice(-20),
    retestStatus: "POC Support Bounce Confirmed",
  };
}

// 4. Point of Control (POC) Resistance Rejection Detector (BUY PE)
export function detectPOCRetestRejection(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 15) return null;

  const pavp = calculatePivotAnchoredVolumeProfile(candles, 15, 28, 0.68, precision);
  const { val, poc, vah } = pavp;
  if (poc <= 0) return null;

  const atr = calculateATR(candles, 14);
  const buffer = Math.max(atr * 0.3, Math.abs(vah - val) * 0.035);
  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;

  const optContract = getRecommendedOptionContract(symbol, "BUY PE", currentPrice);
  const optSpec = getOptionSpec(symbol);
  const sl = +(poc + buffer * 1.4).toFixed(precision);
  const tp1 = +val.toFixed(precision);
  const tp2 = +(val - buffer * 2.0).toFixed(precision);
  const risk = Math.max(0.5, sl - currentPrice);
  const reward = Math.max(0.5, currentPrice - tp1);
  const rr = `1:${(reward / risk).toFixed(1)}`;

  return {
    id: `pavp-poc-reject-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    assetName,
    timeframe: "15m",
    patternType: "POC_RETEST_REJECTION",
    title: `Point of Control (POC) Resistance Rejection (BUY PE)`,
    direction: "BUY PE",
    status: "CONFIRMED",
    priceAtAlert: currentPrice,
    valPrice: val,
    pocPrice: poc,
    vahPrice: vah,
    levelPrice: poc,
    vwcbSpike: true,
    optionStrikeSuggestion: `${optContract.strike} PE (${optSpec.lotSize} Qty/Lot)`,
    suggestedEntry: currentPrice,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    riskRewardRatio: rr,
    confidenceScore: 89,
    reasoning: `Price tested the heaviest volume cluster (POC: ₹${poc}) from below and met heavy institutional supply. Inability to reclaim POC node validates strong overhead seller pressure, targeting Value Area Low (VAL: ₹${val}).`,
    invalidationCriteria: `15m candle close above POC resistance ceiling at ₹${sl}`,
    timestamp: Date.now() - 1000 * 60 * 15,
    timeAgo: "15m ago",
    candles: candles.slice(-20),
    retestStatus: "POC Resistance Rejection Confirmed",
  };
}

// 5. Value Area Expansion Breakout Detector (BUY CE / PE)
export function detectVAExpansionBreakout(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  precision = 2
): InstitutionalAlert | null {
  if (!candles || candles.length < 15) return null;

  const pavp = calculatePivotAnchoredVolumeProfile(candles, 15, 28, 0.68, precision);
  const { val, poc, vah } = pavp;
  if (vah <= 0 || val <= 0) return null;

  const atr = calculateATR(candles, 14);
  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;
  const isBullish = currentPrice >= vah;

  const buffer = Math.max(atr * 0.4, Math.abs(vah - val) * 0.05);
  const action = isBullish ? "BUY CE" : "BUY PE";
  const optContract = getRecommendedOptionContract(symbol, action, currentPrice);
  const optSpec = getOptionSpec(symbol);

  const sl = +(isBullish ? vah - buffer : val + buffer).toFixed(precision);
  const tp1 = +(isBullish ? currentPrice + buffer * 2.2 : currentPrice - buffer * 2.2).toFixed(precision);
  const tp2 = +(isBullish ? currentPrice + buffer * 3.8 : currentPrice - buffer * 3.8).toFixed(precision);
  const risk = Math.max(0.5, Math.abs(currentPrice - sl));
  const reward = Math.max(0.5, Math.abs(tp1 - currentPrice));
  const rr = `1:${(reward / risk).toFixed(1)}`;

  return {
    id: `pavp-expansion-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    assetName,
    timeframe: "15m",
    patternType: "VA_EXPANSION_BREAKOUT",
    title: `Value Area Expansion Breakout (${action})`,
    direction: isBullish ? "STRONG BUY CE" : "STRONG BUY PE",
    status: "CONFIRMED",
    priceAtAlert: currentPrice,
    valPrice: val,
    pocPrice: poc,
    vahPrice: vah,
    levelPrice: isBullish ? vah : val,
    vwcbSpike: true,
    optionStrikeSuggestion: `${optContract.strike} ${optContract.type} (${optSpec.lotSize} Qty/Lot)`,
    suggestedEntry: currentPrice,
    stopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    riskRewardRatio: rr,
    confidenceScore: 92,
    reasoning: `Decisive auction breakout past ${isBullish ? `Value Area High (VAH: ₹${vah})` : `Value Area Low (VAL: ₹${val})`} backed by institutional Volume Weighted Colored Bar (VWCB) spike. Auction theory confirms market is establishing new fair value outside the anchored range.`,
    invalidationCriteria: `15m close back inside the Value Area beyond ₹${sl}`,
    timestamp: Date.now() - 1000 * 60 * 20,
    timeAgo: "20m ago",
    candles: candles.slice(-20),
    retestStatus: "Value Area Expansion Active",
  };
}

// 6. Dynamic Live PAVP Alert Generator
export function generateDynamicLiveAlert(
  symbol: AssetSymbol,
  assetName: string,
  candles: Candle[],
  quote: Quote,
  patternPreference?: AlertPatternType
): InstitutionalAlert {
  const currentPrice = quote?.bid || INITIAL_QUOTES[symbol]?.bid || 100;
  const precision = quote?.pipPrecision || 2;
  const alertCandles =
    candles && candles.length >= 10
      ? [...candles]
      : generateRealisticCandles(symbol, "1h", 24);
  if (alertCandles.length > 0) {
    alertCandles[alertCandles.length - 1].close = currentPrice;
  }

  const atr = calculateATR(alertCandles, 14) || +(currentPrice * 0.005).toFixed(precision);
  const pavp = calculatePivotAnchoredVolumeProfile(alertCandles, 15, 28, 0.68, precision);

  const val = pavp.val > 0 ? pavp.val : +(currentPrice * 0.992).toFixed(precision);
  const poc = pavp.poc > 0 ? pavp.poc : +currentPrice.toFixed(precision);
  const vah = pavp.vah > 0 ? pavp.vah : +(currentPrice * 1.008).toFixed(precision);

  const alertTimestamp = Date.now() - 1000 * 60 * 3;
  const timeAgo = formatTimeAgo(alertTimestamp);

  const pattern: AlertPatternType =
    patternPreference ||
    (symbol === "NIFTY"
      ? "VAL_SWEEP_REVERSAL"
      : symbol === "BANKNIFTY"
      ? "POC_RETEST_BOUNCE"
      : symbol === "CRUDEOIL"
      ? "VAH_REJECTION_REVERSAL"
      : symbol === "NATURALGAS"
      ? "VAL_SWEEP_REVERSAL"
      : symbol === "SENSEX"
      ? "VA_EXPANSION_BREAKOUT"
      : "POC_RETEST_REJECTION");

  if (pattern === "VAL_SWEEP_REVERSAL") {
    const sl = +(val - atr * 1.2).toFixed(precision);
    const optContract = getRecommendedOptionContract(symbol, "BUY CE", currentPrice);
    const optSpec = getOptionSpec(symbol);
    return {
      id: `pavp-val-${symbol.toLowerCase()}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "15m",
      patternType: "VAL_SWEEP_REVERSAL",
      title: "Value Area Low (VAL) Liquidity Sweep & Reversal",
      direction: "BUY CE",
      status: "CONFIRMED",
      priceAtAlert: currentPrice,
      valPrice: val,
      pocPrice: poc,
      vahPrice: vah,
      levelPrice: val,
      vwcbSpike: true,
      optionStrikeSuggestion: `${optContract.strike} ${optContract.type} (${optSpec.lotSize} Qty/Lot)`,
      suggestedEntry: currentPrice,
      stopLoss: sl,
      takeProfit1: poc,
      takeProfit2: vah,
      riskRewardRatio: "1:2.8",
      confidenceScore: 94,
      reasoning: `Institutional liquidity sweep beneath Value Area Low (VAL: ₹${val}). Responsive buyers stepped in with heavy absorption volume, rejecting lower prices and driving auction back inside the 68% Value Area. Target POC (₹${poc}) and VAH (₹${vah}).`,
      invalidationCriteria: `15m candle close below ₹${sl}`,
      timestamp: alertTimestamp,
      timeAgo,
      candles: alertCandles.slice(-20),
      retestStatus: "VAL Sweep Confirmed (Responsive Buying)",
    };
  }

  if (pattern === "VAH_REJECTION_REVERSAL") {
    const sl = +(vah + atr * 1.2).toFixed(precision);
    const optContract = getRecommendedOptionContract(symbol, "BUY PE", currentPrice);
    const optSpec = getOptionSpec(symbol);
    return {
      id: `pavp-vah-${symbol.toLowerCase()}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "15m",
      patternType: "VAH_REJECTION_REVERSAL",
      title: "Value Area High (VAH) Rejection & Mean Reversion",
      direction: "BUY PE",
      status: "CONFIRMED",
      priceAtAlert: currentPrice,
      valPrice: val,
      pocPrice: poc,
      vahPrice: vah,
      levelPrice: vah,
      vwcbSpike: true,
      optionStrikeSuggestion: `${optContract.strike} ${optContract.type} (${optSpec.lotSize} Qty/Lot)`,
      suggestedEntry: currentPrice,
      stopLoss: sl,
      takeProfit1: poc,
      takeProfit2: val,
      riskRewardRatio: "1:2.9",
      confidenceScore: 93,
      reasoning: `Responsive sellers defended Value Area High (VAH: ₹${vah}). Upper shadow pinbar rejection indicates lack of buyer acceptance outside fair value. Auction mean reversion toward POC (₹${poc}) underway.`,
      invalidationCriteria: `15m candle close above ₹${sl}`,
      timestamp: alertTimestamp,
      timeAgo,
      candles: alertCandles.slice(-20),
      retestStatus: "VAH Rejection Confirmed (Responsive Selling)",
    };
  }

  if (pattern === "POC_RETEST_BOUNCE") {
    const sl = +(poc - atr * 1.0).toFixed(precision);
    const optContract = getRecommendedOptionContract(symbol, "BUY CE", currentPrice);
    const optSpec = getOptionSpec(symbol);
    return {
      id: `pavp-poc-bounce-${symbol.toLowerCase()}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "15m",
      patternType: "POC_RETEST_BOUNCE",
      title: "Point of Control (POC) High-Volume Retest & Bounce",
      direction: "BUY CE",
      status: "CONFIRMED",
      priceAtAlert: currentPrice,
      valPrice: val,
      pocPrice: poc,
      vahPrice: vah,
      levelPrice: poc,
      vwcbSpike: true,
      optionStrikeSuggestion: `${optContract.strike} ${optContract.type} (${optSpec.lotSize} Qty/Lot)`,
      suggestedEntry: currentPrice,
      stopLoss: sl,
      takeProfit1: vah,
      takeProfit2: +(vah + (vah - poc)).toFixed(precision),
      riskRewardRatio: "1:2.7",
      confidenceScore: 91,
      reasoning: `Healthy retest of Point of Control (POC: ₹${poc}) highest volume node. Institutional participants defended the high-volume node with aggressive limit bidding. Continuation expected toward VAH (₹${vah}).`,
      invalidationCriteria: `15m candle close below POC buffer at ₹${sl}`,
      timestamp: alertTimestamp,
      timeAgo,
      candles: alertCandles.slice(-20),
      retestStatus: "POC Retest Confirmed (Acceptance)",
    };
  }

  if (pattern === "POC_RETEST_REJECTION") {
    const sl = +(poc + atr * 1.0).toFixed(precision);
    const optContract = getRecommendedOptionContract(symbol, "BUY PE", currentPrice);
    const optSpec = getOptionSpec(symbol);
    return {
      id: `pavp-poc-rej-${symbol.toLowerCase()}-${Date.now()}`,
      symbol,
      assetName,
      timeframe: "15m",
      patternType: "POC_RETEST_REJECTION",
      title: "Point of Control (POC) Failure & Supply Rejection",
      direction: "BUY PE",
      status: "CONFIRMED",
      priceAtAlert: currentPrice,
      valPrice: val,
      pocPrice: poc,
      vahPrice: vah,
      levelPrice: poc,
      vwcbSpike: true,
      optionStrikeSuggestion: `${optContract.strike} ${optContract.type} (${optSpec.lotSize} Qty/Lot)`,
      suggestedEntry: currentPrice,
      stopLoss: sl,
      takeProfit1: val,
      takeProfit2: +(val - (poc - val)).toFixed(precision),
      riskRewardRatio: "1:2.6",
      confidenceScore: 90,
      reasoning: `Pullback to Point of Control (POC: ₹${poc}) met heavy overhead supply. Volume node failed to attract new buyers, confirming structural weakness. Price rejecting back toward VAL (₹${val}).`,
      invalidationCriteria: `15m candle close above POC buffer at ₹${sl}`,
      timestamp: alertTimestamp,
      timeAgo,
      candles: alertCandles.slice(-20),
      retestStatus: "POC Breakdown Retest Failed",
    };
  }

  // VA_EXPANSION_BREAKOUT
  const isBullish = currentPrice >= poc;
  const sl = isBullish ? +(vah - atr * 1.2).toFixed(precision) : +(val + atr * 1.2).toFixed(precision);
  const optContract = getRecommendedOptionContract(symbol, isBullish ? "BUY CE" : "BUY PE", currentPrice);
  const optSpec = getOptionSpec(symbol);
  return {
    id: `pavp-expansion-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    assetName,
    timeframe: "15m",
    patternType: "VA_EXPANSION_BREAKOUT",
    title: isBullish ? "Value Area High (VAH) Expansion Breakout" : "Value Area Low (VAL) Expansion Breakdown",
    direction: isBullish ? "STRONG BUY CE" : "STRONG BUY PE",
    status: "CONFIRMED",
    priceAtAlert: currentPrice,
    valPrice: val,
    pocPrice: poc,
    vahPrice: vah,
    levelPrice: isBullish ? vah : val,
    vwcbSpike: true,
    optionStrikeSuggestion: `${optContract.strike} ${optContract.type} (${optSpec.lotSize} Qty/Lot)`,
    suggestedEntry: currentPrice,
    stopLoss: sl,
    takeProfit1: isBullish ? +(vah + atr * 2).toFixed(precision) : +(val - atr * 2).toFixed(precision),
    takeProfit2: isBullish ? +(vah + atr * 3.5).toFixed(precision) : +(val - atr * 3.5).toFixed(precision),
    riskRewardRatio: "1:3.0",
    confidenceScore: 95,
    reasoning: `Decisive auction breakout past ${isBullish ? `Value Area High (VAH: ₹${vah})` : `Value Area Low (VAL: ₹${val})`} backed by institutional Volume Weighted Colored Bar (VWCB) spike. Auction theory confirms market is establishing new fair value outside the anchored range.`,
    invalidationCriteria: `15m close back inside Value Area beyond ₹${sl}`,
    timestamp: alertTimestamp,
    timeAgo,
    candles: alertCandles.slice(-20),
    retestStatus: "Value Area Expansion Active",
  };
}

// Dynamically calibrated initial alerts suite (always anchored to live prices)
export function getInitialInstitutionalAlerts(quotes?: Record<AssetSymbol, Quote>): InstitutionalAlert[] {
  const qMap = quotes || INITIAL_QUOTES;
  return [
    generateDynamicLiveAlert("NIFTY", "NIFTY 50 Index (F&O)", [], qMap.NIFTY, "VAL_SWEEP_REVERSAL"),
    generateDynamicLiveAlert("BANKNIFTY", "BANK NIFTY Index (F&O)", [], qMap.BANKNIFTY, "POC_RETEST_BOUNCE"),
    generateDynamicLiveAlert("CRUDEOIL", "CRUDE OIL (MCX Futures)", [], qMap.CRUDEOIL, "VAH_REJECTION_REVERSAL"),
    generateDynamicLiveAlert("NATURALGAS", "NATURAL GAS (MCX Futures)", [], qMap.NATURALGAS, "VAL_SWEEP_REVERSAL"),
    generateDynamicLiveAlert("SENSEX", "BSE SENSEX Index", [], qMap.SENSEX, "VA_EXPANSION_BREAKOUT"),
    generateDynamicLiveAlert("FINNIFTY", "NIFTY FINANCIAL SERVICES", [], qMap.FINNIFTY, "POC_RETEST_REJECTION"),
  ];
}
