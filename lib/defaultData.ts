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
  NIFTY: {
    symbol: "NIFTY",
    name: "NIFTY 50 Index (NSE F&O)",
    category: "Indian Index",
    bid: 23329.00,
    ask: 23330.50,
    spread: 1.5,
    change24h: 0.42,
    high24h: 23410.00,
    low24h: 23280.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 25,
    strikeStep: 50,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BANKNIFTY: {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY Index (NSE F&O)",
    category: "Indian Index",
    bid: 56215.50,
    ask: 56218.00,
    spread: 2.5,
    change24h: 0.65,
    high24h: 56450.00,
    low24h: 55980.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 15,
    strikeStep: 100,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  CRUDEOIL: {
    symbol: "CRUDEOIL",
    name: "CRUDE OIL (MCX Futures)",
    category: "MCX Commodity",
    bid: 8840.00,
    ask: 8842.00,
    spread: 2.0,
    change24h: -0.85,
    high24h: 8920.00,
    low24h: 8760.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 100,
    strikeStep: 50,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  NATURALGAS: {
    symbol: "NATURALGAS",
    name: "NATURAL GAS (MCX Futures)",
    category: "MCX Commodity",
    bid: 271.60,
    ask: 271.90,
    spread: 0.3,
    change24h: 1.25,
    high24h: 278.40,
    low24h: 267.50,
    pipPrecision: 2,
    pipMultiplier: 10,
    lotSize: 1250,
    strikeStep: 5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  SENSEX: {
    symbol: "SENSEX",
    name: "BSE SENSEX Index (F&O)",
    category: "Indian Index",
    bid: 74529.00,
    ask: 74533.00,
    spread: 4.0,
    change24h: 0.38,
    high24h: 74800.00,
    low24h: 74350.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 10,
    strikeStep: 100,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  FINNIFTY: {
    symbol: "FINNIFTY",
    name: "NIFTY FINANCIAL SERVICES",
    category: "Indian Index",
    bid: 24520.00,
    ask: 24522.50,
    spread: 2.5,
    change24h: 0.52,
    high24h: 24650.00,
    low24h: 24410.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 25,
    strikeStep: 50,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  INDIAVIX: {
    symbol: "INDIAVIX",
    name: "India Volatility Index (NSE)",
    category: "Macro",
    bid: 13.45,
    ask: 13.48,
    spread: 0.03,
    change24h: -2.15,
    high24h: 14.10,
    low24h: 13.20,
    pipPrecision: 2,
    pipMultiplier: 100,
    lotSize: 1,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  USDINR: {
    symbol: "USDINR",
    name: "USD / Indian Rupee (RBI Ref)",
    category: "Macro",
    bid: 83.85,
    ask: 83.86,
    spread: 0.01,
    change24h: 0.05,
    high24h: 83.92,
    low24h: 83.80,
    pipPrecision: 2,
    pipMultiplier: 100,
    lotSize: 1000,
    currency: "₹",
    lastUpdate: Date.now(),
  },
};

export const INITIAL_CALENDAR: CalendarEvent[] = [
  {
    id: "cal-1",
    time: "10:00",
    date: "This Week",
    currency: "INR",
    event: "RBI Monetary Policy Committee (MPC) Rate Decision",
    impact: "high",
    forecast: "6.50%",
    previous: "6.50%",
    timestamp: Date.now() + 1000 * 60 * 45,
  },
  {
    id: "cal-2",
    time: "20:00",
    date: "Thursday",
    currency: "USD",
    event: "US EIA Crude Oil Inventories (Critical for MCX Crude)",
    impact: "high",
    forecast: "-2.1M",
    previous: "+1.3M",
    timestamp: Date.now() + 1000 * 60 * 180,
  },
  {
    id: "cal-3",
    time: "20:00",
    date: "Thursday",
    currency: "USD",
    event: "EIA Natural Gas Storage Report (Critical for MCX NatGas)",
    impact: "high",
    forecast: "+65B",
    previous: "+72B",
    timestamp: Date.now() + 1000 * 60 * 240,
  },
  {
    id: "cal-4",
    time: "17:30",
    date: "Friday",
    currency: "INR",
    event: "India Consumer Price Index (CPI Inflation YoY)",
    impact: "high",
    forecast: "4.85%",
    previous: "5.08%",
    timestamp: Date.now() + 1000 * 60 * 360,
  },
  {
    id: "cal-5",
    time: "12:00",
    date: "Next Week",
    currency: "INR",
    event: "India WPI Inflation (Wholesale Prices)",
    impact: "medium",
    forecast: "1.20%",
    previous: "1.26%",
    timestamp: Date.now() + 1000 * 60 * 600,
  },
];

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: "news-1",
    headline: "NIFTY 50 consolidates above 23,300 as Call writers unwind at 23,350 ATM strike",
    source: "NSE Pulse",
    timeAgo: "3m ago",
    sentiment: "bullish",
    affectedAssets: ["NIFTY", "BANKNIFTY", "FINNIFTY"],
  },
  {
    id: "news-2",
    headline: "MCX Crude Oil surges toward ₹7,680 following Middle East supply disruption concerns",
    source: "Commodity Wire India",
    timeAgo: "12m ago",
    sentiment: "bullish",
    affectedAssets: ["CRUDEOIL", "NATURALGAS"],
  },
  {
    id: "news-3",
    headline: "BANK NIFTY rallies 320 pts as private banks lead institutional short covering",
    source: "Dalal Street Desk",
    timeAgo: "22m ago",
    sentiment: "bullish",
    affectedAssets: ["BANKNIFTY", "NIFTY"],
  },
  {
    id: "news-4",
    headline: "MCX Natural Gas rebounds sharply from ₹254.10 Value Area Low as cold forecast looms",
    source: "Energy Analyst India",
    timeAgo: "35m ago",
    sentiment: "bullish",
    affectedAssets: ["NATURALGAS", "CRUDEOIL"],
  },
  {
    id: "news-5",
    headline: "BSE SENSEX tests 74,600 POC resistance backed by ₹2,400 Cr FII cash inflows",
    source: "BSE Financials",
    timeAgo: "48m ago",
    sentiment: "bullish",
    affectedAssets: ["SENSEX", "NIFTY"],
  },
  {
    id: "news-6",
    headline: "India VIX softens to 13.45 indicating calm options expiry and reduced volatility skew",
    source: "Options Desk Mumbai",
    timeAgo: "1h ago",
    sentiment: "neutral",
    affectedAssets: ["NIFTY", "BANKNIFTY"],
  },
];

export const MARKET_SESSIONS: MarketSession[] = [
  { name: "NSE Pre-Open", city: "Mumbai", openUtc: 3.5, closeUtc: 3.75, status: "closed" },
  { name: "NSE / BSE Regular F&O", city: "Mumbai", openUtc: 3.75, closeUtc: 10.0, status: "open", isOverlap: true },
  { name: "MCX Commodity (Day)", city: "Mumbai", openUtc: 3.5, closeUtc: 11.5, status: "open" },
  { name: "MCX Evening (Crude/Gas)", city: "Mumbai", openUtc: 11.5, closeUtc: 18.0, status: "open", isOverlap: true },
];

export const DEFAULT_MTF_DATA: MTFAssetRow[] = [
  {
    symbol: "NIFTY",
    name: "NIFTY 50 Index (F&O)",
    price: 23329.0,
    structures: {
      "15m": { bias: "bullish", detail: "Discount Zone / Bullish VAL Retest (23,280)", isBOS: true },
      "1h": { bias: "bullish", detail: "Holding Above POC (23,350) Value Node", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish Value Area Expansion Toward VAH", isBOS: true },
      "1d": { bias: "bullish", detail: "Ascending Channel / FII Accumulation", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 94,
  },
  {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY Index (F&O)",
    price: 56215.5,
    structures: {
      "15m": { bias: "ranging", detail: "Consolidating near 56,200 POC Pivot", isBOS: false },
      "1h": { bias: "bullish", detail: "Rebound off 55,980 VAL Demand Node", isBOS: true },
      "4h": { bias: "bullish", detail: "Higher Highs / Value Area Expansion", isBOS: true },
      "1d": { bias: "bullish", detail: "Banking Liquidity Inflow Rally", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 88,
  },
  {
    symbol: "CRUDEOIL",
    name: "CRUDE OIL (MCX Futures)",
    price: 8840.0,
    structures: {
      "15m": { bias: "bearish", detail: "Testing VAH (8,920) Supply Rejection", isBOS: true },
      "1h": { bias: "ranging", detail: "VWCB Volume Cluster at 8,840 POC", isBOS: false },
      "4h": { bias: "bearish", detail: "Bearish Mean Reversion to VAL (8,760)", isBOS: true },
      "1d": { bias: "ranging", detail: "Macro Range ₹8,600 - ₹9,100", isBOS: false },
    },
    overallBias: "SELL",
    confluenceScore: 82,
  },
  {
    symbol: "NATURALGAS",
    name: "NATURAL GAS (MCX Futures)",
    price: 271.6,
    structures: {
      "15m": { bias: "bullish", detail: "VAL (267.5) Sweep & Bullish Rebound", isBOS: true },
      "1h": { bias: "bullish", detail: "Expanding to POC ₹271.6 Magnet", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish Divergence off Structural Low", isBOS: true },
      "1d": { bias: "bullish", detail: "Winter Demand Supply Deficit Setup", isBOS: false },
    },
    overallBias: "STRONG BUY",
    confluenceScore: 91,
  },
  {
    symbol: "SENSEX",
    name: "BSE SENSEX Index (F&O)",
    price: 74529.0,
    structures: {
      "15m": { bias: "bullish", detail: "Holding Above VAL (74,350) Node", isBOS: true },
      "1h": { bias: "bullish", detail: "Testing POC (74,600) Resistance", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish Market Structure Continuation", isBOS: true },
      "1d": { bias: "bullish", detail: "Macro Trend Extension to 75,000+", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 86,
  },
  {
    symbol: "FINNIFTY",
    name: "NIFTY FINANCIAL SERVICES",
    price: 24520.0,
    structures: {
      "15m": { bias: "bullish", detail: "Testing 24,500 POC Value Area", isBOS: false },
      "1h": { bias: "bullish", detail: "Rebound off 24,410 VAL Support", isBOS: true },
      "4h": { bias: "bullish", detail: "Bullish Trend Channel Intact", isBOS: true },
      "1d": { bias: "bullish", detail: "Institutional Accumulation Phase", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 85,
  },
];

export const DEFAULT_CURRENCY_STRENGTH: CurrencyStrength[] = [
  { currency: "BANKING", name: "Bank Nifty Sector", score: 88, change: +0.65, status: "Bullish" },
  { currency: "ENERGY", name: "MCX Crude & NatGas", score: 82, change: +0.45, status: "Bullish" },
  { currency: "NIFTY 50", name: "NSE Benchmark", score: 79, change: +0.42, status: "Bullish" },
  { currency: "IT SECTOR", name: "Nifty IT Index", score: 62, change: +0.12, status: "Neutral" },
  { currency: "AUTO", name: "Nifty Auto Index", score: 71, change: +0.35, status: "Bullish" },
];

export const DEFAULT_RETAIL_SENTIMENT: RetailSentimentItem[] = [
  {
    symbol: "NIFTY",
    name: "NIFTY 50 (PCR: 0.85)",
    longPercent: 32,
    shortPercent: 68,
    contrarianSignal: "Bullish Short Squeeze Alert",
    cotInstitutionalBias: "FII Net Long (Index Futures)",
  },
  {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY (PCR: 0.92)",
    longPercent: 41,
    shortPercent: 59,
    contrarianSignal: "Bullish Reversal / VAL Sweep",
    cotInstitutionalBias: "DII Heavy Accumulation",
  },
  {
    symbol: "CRUDEOIL",
    name: "CRUDE OIL MCX (PCR: 1.25)",
    longPercent: 71,
    shortPercent: 29,
    contrarianSignal: "Bearish Trap / VAH Rejection",
    cotInstitutionalBias: "Commercial Hedging Short",
  },
  {
    symbol: "NATURALGAS",
    name: "NATURAL GAS MCX (PCR: 0.70)",
    longPercent: 26,
    shortPercent: 74,
    contrarianSignal: "Extreme Oversold Squeeze",
    cotInstitutionalBias: "Managed Money Bottoming",
  },
  {
    symbol: "SENSEX",
    name: "BSE SENSEX (PCR: 0.88)",
    longPercent: 38,
    shortPercent: 62,
    contrarianSignal: "Bullish Liquidity Absorption",
    cotInstitutionalBias: "Institutional Inflows Strong",
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
  if (symbol === "NIFTY" || symbol === "FINNIFTY") {
    if (timeframe === "1m") return 12.0;
    if (timeframe === "5m") return 24.0;
    if (timeframe === "15m") return 48.0;
    if (timeframe === "1h") return 110.0;
    if (timeframe === "4h") return 220.0;
    return 350.0; // 1d
  }

  if (symbol === "BANKNIFTY") {
    if (timeframe === "1m") return 35.0;
    if (timeframe === "5m") return 70.0;
    if (timeframe === "15m") return 140.0;
    if (timeframe === "1h") return 280.0;
    if (timeframe === "4h") return 550.0;
    return 850.0; // 1d
  }

  if (symbol === "SENSEX") {
    if (timeframe === "1m") return 45.0;
    if (timeframe === "5m") return 90.0;
    if (timeframe === "15m") return 180.0;
    if (timeframe === "1h") return 360.0;
    if (timeframe === "4h") return 700.0;
    return 1100.0; // 1d
  }

  if (symbol === "CRUDEOIL") {
    if (timeframe === "1m") return 4.5;
    if (timeframe === "5m") return 12.0;
    if (timeframe === "15m") return 26.0;
    if (timeframe === "1h") return 60.0;
    if (timeframe === "4h") return 110.0;
    return 200.0; // 1d
  }

  if (symbol === "NATURALGAS") {
    if (timeframe === "1m") return 0.4;
    if (timeframe === "5m") return 1.1;
    if (timeframe === "15m") return 2.6;
    if (timeframe === "1h") return 6.0;
    if (timeframe === "4h") return 12.0;
    return 22.0; // 1d
  }

  return 25.0; // default Indian index ATR
}

// Helper to generate candles anchored directly to live price with realistic timeframe-proportional ATR
export function generateRealisticCandles(
  symbol: AssetSymbol,
  timeframe: string,
  count = 60,
  anchorPrice?: number
): Candle[] {
  const quote = INITIAL_QUOTES[symbol] || INITIAL_QUOTES.NIFTY;
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

