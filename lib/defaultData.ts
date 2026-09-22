import {
  AssetSymbol,
  Quote,
  CalendarEvent,
  NewsItem,
  MarketSession,
  Candle,
  MTFAssetRow,
  CurrencyStrength,
  RetailSentimentItem,
  PropFirmProfile,
} from "./types";

export const INITIAL_QUOTES: Record<AssetSymbol, Quote> = {
  XAUUSD: {
    symbol: "XAUUSD",
    name: "Gold / US Dollar",
    category: "Commodity",
    bid: 4348.20,
    ask: 4348.58,
    spread: 3.8,
    change24h: -0.15,
    high24h: 4358.50,
    low24h: 4341.20,
    pipPrecision: 2,
    pipMultiplier: 10,
    lastUpdate: Date.now(),
  },
  XAGUSD: {
    symbol: "XAGUSD",
    name: "Silver / US Dollar",
    category: "Commodity",
    bid: 66.85,
    ask: 66.90,
    spread: 0.05,
    change24h: -0.36,
    high24h: 67.55,
    low24h: 66.55,
    pipPrecision: 3,
    pipMultiplier: 100,
    lastUpdate: Date.now(),
  },
  EURUSD: {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    category: "Forex",
    bid: 1.1480,
    ask: 1.1481,
    spread: 1.0,
    change24h: -0.09,
    high24h: 1.1495,
    low24h: 1.1478,
    pipPrecision: 5,
    pipMultiplier: 10000,
    lastUpdate: Date.now(),
  },
  GBPUSD: {
    symbol: "GBPUSD",
    name: "British Pound / US Dollar",
    category: "Forex",
    bid: 1.3382,
    ask: 1.3383,
    spread: 1.0,
    change24h: -0.12,
    high24h: 1.3400,
    low24h: 1.3375,
    pipPrecision: 5,
    pipMultiplier: 10000,
    lastUpdate: Date.now(),
  },
  USDJPY: {
    symbol: "USDJPY",
    name: "US Dollar / Japanese Yen",
    category: "Forex",
    bid: 156.92,
    ask: 156.94,
    spread: 1.5,
    change24h: 0.35,
    high24h: 157.10,
    low24h: 156.50,
    pipPrecision: 3,
    pipMultiplier: 100,
    lastUpdate: Date.now(),
  },
  DXY: {
    symbol: "DXY",
    name: "US Dollar Index",
    category: "Macro",
    bid: 100.22,
    ask: 100.24,
    spread: 0.2,
    change24h: -0.01,
    high24h: 100.56,
    low24h: 100.16,
    pipPrecision: 2,
    pipMultiplier: 100,
    lastUpdate: Date.now(),
  },
  US10Y: {
    symbol: "US10Y",
    name: "US 10-Year Treasury Yield",
    category: "Macro",
    bid: 4.998,
    ask: 5.001,
    spread: 0.3,
    change24h: 1.03,
    high24h: 5.040,
    low24h: 4.945,
    pipPrecision: 3,
    pipMultiplier: 100,
    lastUpdate: Date.now(),
  },
};

export const INITIAL_CALENDAR: CalendarEvent[] = [
  {
    id: "cal-1",
    time: "12:30",
    date: "This Week",
    currency: "USD",
    event: "Flash Manufacturing PMI",
    impact: "high",
    forecast: "53.4",
    previous: "53.2",
    timestamp: Date.now() + 1000 * 60 * 45,
  },
  {
    id: "cal-2",
    time: "14:00",
    date: "This Week",
    currency: "USD",
    event: "FOMC Member Williams Speaks",
    impact: "high",
    forecast: "-",
    previous: "-",
    timestamp: Date.now() + 1000 * 60 * 135,
  },
  {
    id: "cal-3",
    time: "03:30",
    date: "This Week",
    currency: "EUR",
    event: "German Flash Manufacturing PMI",
    impact: "high",
    actual: "54.0",
    forecast: "54.1",
    previous: "54.1",
    timestamp: Date.now() - 1000 * 60 * 180,
  },
  {
    id: "cal-4",
    time: "04:30",
    date: "This Week",
    currency: "GBP",
    event: "Flash Services PMI",
    impact: "medium",
    forecast: "52.0",
    previous: "52.8",
    timestamp: Date.now() + 1000 * 60 * 300,
  },
  {
    id: "cal-5",
    time: "05:15",
    date: "This Week",
    currency: "GBP",
    event: "BOE Gov Bailey Speaks",
    impact: "high",
    forecast: "-",
    previous: "-",
    timestamp: Date.now() + 1000 * 60 * 600,
  },
  {
    id: "cal-6",
    time: "08:30",
    date: "This Week",
    currency: "USD",
    event: "Unemployment Claims",
    impact: "medium",
    forecast: "201K",
    previous: "196K",
    timestamp: Date.now() + 1000 * 60 * 1440,
  }
];

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: "news-1",
    headline: "Gold (XAU/USD) rallies toward $4,365 as treasury yields soften ahead of Fed verdict",
    source: "FXStreet",
    timeAgo: "4m ago",
    sentiment: "bullish",
    affectedAssets: ["XAUUSD", "US10Y", "DXY"],
  },
  {
    id: "news-2",
    headline: "Silver crosses $66.80 amid clean-energy supply deficit and surging physical demand",
    source: "Brave New Coin",
    timeAgo: "15m ago",
    sentiment: "bullish",
    affectedAssets: ["XAGUSD", "XAUUSD"],
  },
  {
    id: "news-3",
    headline: "EUR/USD holds firm near 1.1460 supported by steady European Central Bank rate outlook",
    source: "Frankfurt Desk",
    timeAgo: "28m ago",
    sentiment: "bullish",
    affectedAssets: ["EURUSD", "DXY"],
  },
  {
    id: "news-4",
    headline: "USD/JPY pressures 157.90 as yield differentials widen against Bank of Japan posture",
    source: "Tokyo FX Live",
    timeAgo: "42m ago",
    sentiment: "bullish",
    affectedAssets: ["USDJPY", "DXY"],
  },
  {
    id: "news-5",
    headline: "GBP/USD tests 1.3350 ahead of Bank of England Governor Andrew Bailey speech",
    source: "London FX Wire",
    timeAgo: "1h ago",
    sentiment: "neutral",
    affectedAssets: ["GBPUSD", "DXY"],
  },
  {
    id: "news-6",
    headline: "US Dollar Index (DXY) stabilizes at 100.25 following durable goods orders data",
    source: "Macro Alpha",
    timeAgo: "2h ago",
    sentiment: "neutral",
    affectedAssets: ["DXY", "EURUSD", "GBPUSD"],
  }
];

export const MARKET_SESSIONS: MarketSession[] = [
  { name: "Sydney", city: "Sydney", openUtc: 22, closeUtc: 7, status: "closed" },
  { name: "Tokyo", city: "Tokyo", openUtc: 0, closeUtc: 9, status: "open" },
  { name: "London", city: "London", openUtc: 8, closeUtc: 17, status: "open" },
  { name: "New York", city: "New York", openUtc: 13, closeUtc: 22, status: "open", isOverlap: true },
];

export const DEFAULT_MTF_DATA: MTFAssetRow[] = [
  {
    symbol: "XAUUSD",
    name: "Gold / US Dollar",
    price: 4363.80,
    structures: {
      "15m": { bias: "bullish", detail: "Discount Zone / Bullish OB Retest", isBOS: true },
      "1h": { bias: "bullish", detail: "Holding Above 50% Equilibrium (4362.0)", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish Market Structure Break", isBOS: true },
      "1d": { bias: "bullish", detail: "Macro Expansion Toward 4400+", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 94,
  },
  {
    symbol: "XAGUSD",
    name: "Silver / US Dollar",
    price: 66.85,
    structures: {
      "15m": { bias: "ranging", detail: "Consolidating near 67.00 Resistance", isBOS: false },
      "1h": { bias: "bullish", detail: "Demand Zone Rebound", isBOS: true },
      "4h": { bias: "bullish", detail: "Clean Higher Highs Channel", isBOS: true },
      "1d": { bias: "bullish", detail: "Clean Energy Deficit Rally", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 82,
  },
  {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    price: 1.1480,
    structures: {
      "15m": { bias: "ranging", detail: "Tight range below 1.1495 high", isBOS: false },
      "1h": { bias: "bullish", detail: "Holding 1.1475 support base", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish flag continuation", isBOS: true },
      "1d": { bias: "bullish", detail: "Dollar weakness macro tailwind", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 78,
  },
  {
    symbol: "GBPUSD",
    name: "British Pound / USD",
    price: 1.3382,
    structures: {
      "15m": { bias: "bullish", detail: "Asia session liquidity sweep done", isBOS: true },
      "1h": { bias: "bullish", detail: "Rebound off 1.3370 demand block", isBOS: false },
      "4h": { bias: "bullish", detail: "Holding above 1.3360 support", isBOS: true },
      "1d": { bias: "bullish", detail: "Higher timeframe ascending channel", isBOS: false },
    },
    overallBias: "STRONG BUY",
    confluenceScore: 91,
  },
  {
    symbol: "USDJPY",
    name: "US Dollar / Japanese Yen",
    price: 156.92,
    structures: {
      "15m": { bias: "bearish", detail: "Mitigating Bearish Supply at 157.10", isBOS: true },
      "1h": { bias: "ranging", detail: "BoJ intervention threat cap", isBOS: false },
      "4h": { bias: "bearish", detail: "Lower highs rejected at 157.10", isBOS: true },
      "1d": { bias: "ranging", detail: "Macro range bound 155 - 158", isBOS: false },
    },
    overallBias: "SELL",
    confluenceScore: 85,
  },
];

export const DEFAULT_CURRENCY_STRENGTH: CurrencyStrength[] = [
  { currency: "XAU", name: "Gold (Spot)", score: 92, change: +0.85, status: "Bullish" },
  { currency: "GBP", name: "British Pound", score: 81, change: +0.42, status: "Bullish" },
  { currency: "EUR", name: "Euro", score: 68, change: +0.18, status: "Bullish" },
  { currency: "JPY", name: "Japanese Yen", score: 45, change: -0.15, status: "Neutral" },
  { currency: "USD", name: "US Dollar Index", score: 32, change: -0.38, status: "Bearish" },
];

export const DEFAULT_RETAIL_SENTIMENT: RetailSentimentItem[] = [
  {
    symbol: "XAUUSD",
    name: "Gold / USD",
    longPercent: 24,
    shortPercent: 76,
    contrarianSignal: "Bullish Squeeze Alert",
    cotInstitutionalBias: "Net Long (+142k)",
  },
  {
    symbol: "XAGUSD",
    name: "Silver / USD",
    longPercent: 31,
    shortPercent: 69,
    contrarianSignal: "Bullish Squeeze Alert",
    cotInstitutionalBias: "Net Long (+48k)",
  },
  {
    symbol: "EURUSD",
    name: "EUR / USD",
    longPercent: 44,
    shortPercent: 56,
    contrarianSignal: "Neutral Flow",
    cotInstitutionalBias: "Net Long (+32k)",
  },
  {
    symbol: "GBPUSD",
    name: "GBP / USD",
    longPercent: 38,
    shortPercent: 62,
    contrarianSignal: "Bullish Squeeze Alert",
    cotInstitutionalBias: "Net Long (+28k)",
  },
  {
    symbol: "USDJPY",
    name: "USD / JPY",
    longPercent: 74,
    shortPercent: 26,
    contrarianSignal: "Bearish Liquidity Hunt",
    cotInstitutionalBias: "Net Short (-68k)",
  },
];

export const PROP_FIRM_PROFILES: PropFirmProfile[] = [
  { id: "ftmo", name: "FTMO Standard", maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 10 },
  { id: "fundednext", name: "FundedNext Stellar", maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8 },
  { id: "the5ers", name: "The5ers High Stakes", maxDailyLossPercent: 5, maxTotalLossPercent: 10, profitTargetPercent: 8 },
  { id: "alpha", name: "Alpha Capital Pro", maxDailyLossPercent: 4, maxTotalLossPercent: 8, profitTargetPercent: 8 },
];

// Timeframe-specific ATR / bar volatility configuration
function getTimeframeVol(symbol: AssetSymbol, timeframe: string): number {
  const isGold = symbol === "XAUUSD";
  const isSilver = symbol === "XAGUSD";
  const isJpy = symbol === "USDJPY";
  const isFx = symbol === "EURUSD" || symbol === "GBPUSD";

  // Base ATR per timeframe for Gold
  let goldAtr = 0.85; // 5m default
  if (timeframe === "1m") goldAtr = 0.35;
  else if (timeframe === "5m") goldAtr = 0.85;
  else if (timeframe === "15m") goldAtr = 1.75;
  else if (timeframe === "1h") goldAtr = 4.20;
  else if (timeframe === "4h") goldAtr = 9.50;
  else if (timeframe === "1d") goldAtr = 22.00;

  if (isGold) return goldAtr;
  if (isSilver) return +(goldAtr * 0.015).toFixed(3);
  if (isJpy) return +(goldAtr * 0.07).toFixed(3);
  if (isFx) return +(goldAtr * 0.00035).toFixed(5);
  return +(goldAtr * 0.02).toFixed(2);
}

// Helper to generate candles anchored directly to live price with realistic timeframe-proportional ATR
export function generateRealisticCandles(
  symbol: AssetSymbol,
  timeframe: string,
  count = 60,
  anchorPrice?: number
): Candle[] {
  const quote = INITIAL_QUOTES[symbol] || INITIAL_QUOTES.XAUUSD;
  const currentBid = anchorPrice != null && anchorPrice > 0 ? anchorPrice : quote.bid;
  const precision = quote.pipPrecision;
  const atr = getTimeframeVol(symbol, timeframe);

  let stepSec = 300; // 5m default
  if (timeframe === "1m") stepSec = 60;
  else if (timeframe === "5m") stepSec = 300;
  else if (timeframe === "15m") stepSec = 900;
  else if (timeframe === "1h") stepSec = 3600;
  else if (timeframe === "4h") stepSec = 14400;
  else if (timeframe === "1d") stepSec = 86400;

  const nowSec = Math.floor(Date.now() / 1000);
  const currentBucketTime = Math.floor(nowSec / stepSec) * stepSec;
  const startTime = currentBucketTime - (count - 1) * stepSec;

  // Build a realistic structural curve ending at currentBid
  // Model 3 phases across historical bars: Accumulation -> Expansion -> Retest/Current
  const closes: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1); // 0 to 1
    // Sinusoidal swing to create realistic peaks, valleys, and Volume Area nodes
    const swingFactor =
      Math.sin((i / count) * Math.PI * 2.2) * (atr * 4.5) +
      Math.cos((i / count) * Math.PI * 4.4) * (atr * 2.0);

    // Fade swing to 0 near the end so last candle lands exactly at currentBid
    const target = currentBid + swingFactor * (1 - progress * 0.85);
    closes.push(target);
  }
  // Ensure the final close matches currentBid exactly
  closes[count - 1] = currentBid;

  const candles: Candle[] = [];

  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSec;
    // Deterministic pseudo-random generation to prevent hydration mismatches
    const pr1 = Math.abs(Math.sin(i * 12.9898 + 1.234)) % 1;
    const pr2 = Math.abs(Math.cos(i * 4.8932 + 2.345)) % 1;
    const pr3 = Math.abs(Math.sin(i * 7.1234 + 3.456)) % 1;

    let open: number;
    let close: number;

    if (i === 0) {
      const delta = (pr1 - 0.5) * atr * 0.6;
      open = +(closes[0] - delta).toFixed(precision);
      close = +closes[0].toFixed(precision);
    } else {
      // Connect previous candle close seamlessly to next open
      open = candles[i - 1].close;
      close = +closes[i].toFixed(precision);
    }

    // For the last candle, make sure body is realistically small (live candle in formation)
    if (i === count - 1) {
      const liveBodyOffset = ((pr1 - 0.5) * atr * 0.4);
      open = +(currentBid - liveBodyOffset).toFixed(precision);
      close = currentBid;
    }

    const wickTop = pr2 * atr * 0.45;
    const wickBottom = pr3 * atr * 0.45;
    const high = +(Math.max(open, close) + wickTop).toFixed(precision);
    const low = +(Math.min(open, close) - wickBottom).toFixed(precision);
    const volume = Math.floor(pr1 * 350) + 120;

    candles.push({ time, open, high, low, close, volume });
  }

  return candles;
}

