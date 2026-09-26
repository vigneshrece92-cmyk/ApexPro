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
    bid: 23140.50,
    ask: 23142.00,
    spread: 1.5,
    change24h: 0.42,
    high24h: 23220.00,
    low24h: 23050.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 65,
    strikeStep: 50,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BANKNIFTY: {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY Index (NSE F&O)",
    category: "Indian Index",
    bid: 55580.40,
    ask: 55583.00,
    spread: 2.6,
    change24h: 0.65,
    high24h: 55800.00,
    low24h: 55300.00,
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
    bid: 9056.90,
    ask: 9058.90,
    spread: 2.0,
    change24h: -1.25,
    high24h: 9150.00,
    low24h: 8980.00,
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
    bid: 309.42,
    ask: 309.62,
    spread: 0.2,
    change24h: 1.45,
    high24h: 315.00,
    low24h: 305.00,
    pipPrecision: 2,
    pipMultiplier: 100,
    lotSize: 1250,
    strikeStep: 5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  SENSEX: {
    symbol: "SENSEX",
    name: "BSE SENSEX Index (F&O)",
    category: "Indian Index",
    bid: 73895.74,
    ask: 73900.00,
    spread: 4.26,
    change24h: 0.38,
    high24h: 74200.00,
    low24h: 73600.00,
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
    bid: 25094.85,
    ask: 25097.50,
    spread: 2.65,
    change24h: 0.52,
    high24h: 25250.00,
    low24h: 24950.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 65,
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

  // 30 High-Volume Volatile NSE F&O Stocks (Aligned with live NSE exchange quotes)
  RELIANCE: {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1226.00,
    ask: 1227.00,
    spread: 1.0,
    change24h: 0.55,
    high24h: 1235.00,
    low24h: 1215.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 250,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  HDFCBANK: {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 735.60,
    ask: 736.00,
    spread: 0.4,
    change24h: 0.92,
    high24h: 739.00,
    low24h: 723.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 550,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  ICICIBANK: {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1326.80,
    ask: 1327.50,
    spread: 0.7,
    change24h: 0.85,
    high24h: 1335.00,
    low24h: 1318.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 700,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  SBIN: {
    symbol: "SBIN",
    name: "State Bank of India (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 983.00,
    ask: 983.50,
    spread: 0.5,
    change24h: 1.40,
    high24h: 992.00,
    low24h: 975.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 750,
    strikeStep: 5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  TATAMOTORS: {
    symbol: "TATAMOTORS",
    name: "Tata Motors Passenger Veh (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 290.45,
    ask: 290.75,
    spread: 0.3,
    change24h: -0.45,
    high24h: 295.00,
    low24h: 288.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 575,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  TATASTEEL: {
    symbol: "TATASTEEL",
    name: "Tata Steel Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 187.97,
    ask: 188.10,
    spread: 0.13,
    change24h: 1.85,
    high24h: 190.00,
    low24h: 185.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 5500,
    strikeStep: 1,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  INFY: {
    symbol: "INFY",
    name: "Infosys Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1000.20,
    ask: 1000.80,
    spread: 0.6,
    change24h: 0.35,
    high24h: 1010.00,
    low24h: 990.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 400,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  TCS: {
    symbol: "TCS",
    name: "Tata Consultancy Services (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 2082.00,
    ask: 2083.50,
    spread: 1.5,
    change24h: -0.45,
    high24h: 2090.00,
    low24h: 2038.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 175,
    strikeStep: 50,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BAJFINANCE: {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 996.90,
    ask: 997.50,
    spread: 0.6,
    change24h: 1.50,
    high24h: 1010.00,
    low24h: 985.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 125,
    strikeStep: 50,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  MARUTI: {
    symbol: "MARUTI",
    name: "Maruti Suzuki India (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 12065.00,
    ask: 12075.00,
    spread: 10.0,
    change24h: 0.70,
    high24h: 12200.00,
    low24h: 11950.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 50,
    strikeStep: 100,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  LT: {
    symbol: "LT",
    name: "Larsen & Toubro Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 3876.20,
    ask: 3878.00,
    spread: 1.8,
    change24h: 1.30,
    high24h: 3910.00,
    low24h: 3840.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 150,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  AXISBANK: {
    symbol: "AXISBANK",
    name: "Axis Bank Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1222.40,
    ask: 1223.00,
    spread: 0.6,
    change24h: 0.50,
    high24h: 1235.00,
    low24h: 1215.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 625,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  KOTAKBANK: {
    symbol: "KOTAKBANK",
    name: "Kotak Mahindra Bank (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 404.00,
    ask: 404.50,
    spread: 0.5,
    change24h: -0.30,
    high24h: 409.00,
    low24h: 398.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 400,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BHARTIARTL: {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1785.40,
    ask: 1786.50,
    spread: 1.1,
    change24h: 1.25,
    high24h: 1800.00,
    low24h: 1770.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 475,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  ADANIENT: {
    symbol: "ADANIENT",
    name: "Adani Enterprises Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 2916.50,
    ask: 2918.00,
    spread: 1.5,
    change24h: 2.85,
    high24h: 2960.00,
    low24h: 2890.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 300,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  ADANIPORTS: {
    symbol: "ADANIPORTS",
    name: "Adani Ports & SEZ (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1788.00,
    ask: 1789.00,
    spread: 1.0,
    change24h: 1.60,
    high24h: 1810.00,
    low24h: 1770.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 400,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  HINDUNILVR: {
    symbol: "HINDUNILVR",
    name: "Hindustan Unilever (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1942.90,
    ask: 1944.00,
    spread: 1.1,
    change24h: 0.49,
    high24h: 1955.00,
    low24h: 1915.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 300,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  ITC: {
    symbol: "ITC",
    name: "ITC Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 269.00,
    ask: 269.30,
    spread: 0.3,
    change24h: 0.75,
    high24h: 272.00,
    low24h: 266.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 1600,
    strikeStep: 5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  SUNPHARMA: {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical Ind (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1852.20,
    ask: 1853.50,
    spread: 1.3,
    change24h: 1.10,
    high24h: 1870.00,
    low24h: 1840.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 350,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  TITAN: {
    symbol: "TITAN",
    name: "Titan Company Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 4884.00,
    ask: 4886.00,
    spread: 2.0,
    change24h: 0.90,
    high24h: 4930.00,
    low24h: 4850.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 175,
    strikeStep: 20,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  JSWSTEEL: {
    symbol: "JSWSTEEL",
    name: "JSW Steel Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 1277.00,
    ask: 1278.00,
    spread: 1.0,
    change24h: 1.95,
    high24h: 1295.00,
    low24h: 1265.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 675,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  COALINDIA: {
    symbol: "COALINDIA",
    name: "Coal India Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 426.10,
    ask: 426.50,
    spread: 0.4,
    change24h: 1.20,
    high24h: 432.00,
    low24h: 422.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 2100,
    strikeStep: 5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  NTPC: {
    symbol: "NTPC",
    name: "NTPC Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 326.60,
    ask: 326.90,
    spread: 0.3,
    change24h: 0.80,
    high24h: 332.00,
    low24h: 323.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 1500,
    strikeStep: 2.5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  POWERGRID: {
    symbol: "POWERGRID",
    name: "Power Grid Corp of India (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 269.50,
    ask: 269.80,
    spread: 0.3,
    change24h: 0.45,
    high24h: 273.00,
    low24h: 266.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 1800,
    strikeStep: 2.5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BPCL: {
    symbol: "BPCL",
    name: "Bharat Petroleum Corp (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 308.50,
    ask: 308.80,
    spread: 0.3,
    change24h: 1.75,
    high24h: 314.00,
    low24h: 305.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 1800,
    strikeStep: 2.5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  ONGC: {
    symbol: "ONGC",
    name: "Oil & Natural Gas Corp (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 235.86,
    ask: 236.10,
    spread: 0.24,
    change24h: 1.45,
    high24h: 240.00,
    low24h: 232.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 2250,
    strikeStep: 2.5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  VEDL: {
    symbol: "VEDL",
    name: "Vedanta Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 266.35,
    ask: 266.70,
    spread: 0.35,
    change24h: 3.10,
    high24h: 272.00,
    low24h: 262.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 1550,
    strikeStep: 5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BHEL: {
    symbol: "BHEL",
    name: "Bharat Heavy Electricals (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 418.95,
    ask: 419.30,
    spread: 0.35,
    change24h: 2.40,
    high24h: 426.00,
    low24h: 413.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 2625,
    strikeStep: 2.5,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  DLF: {
    symbol: "DLF",
    name: "DLF Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 683.00,
    ask: 683.50,
    spread: 0.5,
    change24h: 1.65,
    high24h: 695.00,
    low24h: 675.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 825,
    strikeStep: 10,
    currency: "₹",
    lastUpdate: Date.now(),
  },
  BEL: {
    symbol: "BEL",
    name: "Bharat Electronics Ltd (NSE F&O)",
    category: "NSE F&O Stock",
    bid: 393.55,
    ask: 393.90,
    spread: 0.35,
    change24h: 2.15,
    high24h: 401.00,
    low24h: 388.00,
    pipPrecision: 2,
    pipMultiplier: 1,
    lotSize: 2850,
    strikeStep: 2.5,
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
      "15m": { bias: "bearish", detail: "Internal Flow Drifting to VAL (23,280)", isBOS: false },
      "1h": { bias: "bearish", detail: "Overhead POC Supply (23,350) Defending", isBOS: false },
      "4h": { bias: "bearish", detail: "Trading Below POC (23,350) / Discount Node", isBOS: false },
      "1d": { bias: "bearish", detail: "Trading Negative (-0.07%) Below Prev Day Close", isBOS: false },
    },
    overallBias: "SELL",
    confluenceScore: 78,
  },
  {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY Index (F&O)",
    price: 56215.5,
    structures: {
      "15m": { bias: "ranging", detail: "Consolidating near 56,200 POC Pivot", isBOS: false },
      "1h": { bias: "bearish", detail: "Testing 56,100 VAL Support Pressure", isBOS: false },
      "4h": { bias: "bearish", detail: "Lower High Below 56,400 POC", isBOS: false },
      "1d": { bias: "bearish", detail: "Pullback (-0.25%) Below Day Open", isBOS: false },
    },
    overallBias: "SELL",
    confluenceScore: 74,
  },
  {
    symbol: "CRUDEOIL",
    name: "CRUDE OIL (MCX Futures)",
    price: 9181.0,
    structures: {
      "15m": { bias: "bearish", detail: "VAH (₹9,340) Rejection -> Rotation to VAL (9,180)", isBOS: true },
      "1h": { bias: "bearish", detail: "Failed at 9,400 High -> Trading Below POC (9,260)", isBOS: false },
      "4h": { bias: "bearish", detail: "Re-entered 68% Value Area Toward VAL Support", isBOS: true },
      "1d": { bias: "bearish", detail: "Session Reversal (-2.23%) Off Weekly Resistance", isBOS: true },
    },
    overallBias: "STRONG SELL",
    confluenceScore: 94,
  },
  {
    symbol: "NATURALGAS",
    name: "NATURAL GAS (MCX Futures)",
    price: 313.10,
    structures: {
      "15m": { bias: "bullish", detail: "VAL (308.5) Sweep & Bullish Rebound", isBOS: true },
      "1h": { bias: "bullish", detail: "Expanding Above POC ₹313.10", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish Expansion off Structural Low", isBOS: true },
      "1d": { bias: "bullish", detail: "Strong Inflow (+1.45%) / Supply Deficit", isBOS: true },
    },
    overallBias: "STRONG BUY",
    confluenceScore: 94,
  },
  {
    symbol: "SENSEX",
    name: "BSE SENSEX Index (F&O)",
    price: 74529.0,
    structures: {
      "15m": { bias: "bullish", detail: "Holding Above VAL (74,350) Node", isBOS: true },
      "1h": { bias: "bullish", detail: "Testing POC (74,600) Resistance", isBOS: false },
      "4h": { bias: "bullish", detail: "Bullish Market Structure Continuation", isBOS: true },
      "1d": { bias: "bullish", detail: "Positive Flow (+0.32%) Above Prev Day Close", isBOS: false },
    },
    overallBias: "BUY",
    confluenceScore: 84,
  },
  {
    symbol: "FINNIFTY",
    name: "NIFTY FINANCIAL SERVICES",
    price: 25417.95,
    structures: {
      "15m": { bias: "bearish", detail: "Testing 25,405 VAL / Bearish Pressure", isBOS: false },
      "1h": { bias: "bearish", detail: "POC Supply Resistance Rejection (25,452)", isBOS: true },
      "4h": { bias: "bearish", detail: "Below 25,480 POC Value Area", isBOS: false },
      "1d": { bias: "bearish", detail: "Selling Pressure (-0.42%) / Profit Booking", isBOS: false },
    },
    overallBias: "SELL",
    confluenceScore: 82,
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

  const q = INITIAL_QUOTES[symbol];
  const refBid = q?.bid || 1000;
  const pct =
    timeframe === "1m"
      ? 0.0015
      : timeframe === "5m"
      ? 0.0035
      : timeframe === "15m"
      ? 0.007
      : timeframe === "1h"
      ? 0.015
      : timeframe === "4h"
      ? 0.03
      : 0.05;
  return Math.max(0.5, +(refBid * pct).toFixed(2));
}

// Authentic MCX Crude Oil Session Candlestick Generator
// Mathematically mirrors the TradingView reference chart (CRUDEOILV2026):
// 1. Swing low anchor at ₹8,529 (16:00) with volume spike (58.27K)
// 2. Immediate reclaim of VAL (₹8,590) -> fires BUY CE @ VAL
// 3. Dense Value Area trading around POC (₹8,665)
// 4. Expansion through VAH (₹8,735) up to Session High ₹8,800
// 5. Upper rejection wick at ₹8,800 & breakdown below VAH -> fires SELL PE @ VAH
// 6. Plunge to ₹8,585 (-1.30%) at the live candle
export function generateCrudeOilSessionCandles(
  timeframe: string,
  count = 60,
  currentBid = 9181.0,
  precision = 2
): Candle[] {
  let stepSec = 900; // 15m default
  if (timeframe === "1m") stepSec = 60;
  else if (timeframe === "5m") stepSec = 300;
  else if (timeframe === "15m") stepSec = 900;
  else if (timeframe === "1h") stepSec = 3600;
  else if (timeframe === "4h") stepSec = 14400;
  else if (timeframe === "1d") stepSec = 86400;

  const nowSec = Math.floor(Date.now() / 1000);
  const currentBucketTime = Math.floor(nowSec / stepSec) * stepSec;
  const startTime = currentBucketTime - (count - 1) * stepSec;

  const candles: Candle[] = [];

  const anchorIdx = Math.max(5, count - 28);
  const reclaimIdx = anchorIdx + 1;
  const highIdx = Math.max(anchorIdx + 18, count - 6);
  const rejectIdx = highIdx + 2;

  const ratio = currentBid / 8585.0;
  const anchorLow = +(8529.0 * ratio).toFixed(precision);
  const val = +(8590.0 * ratio).toFixed(precision);
  const poc = +(8665.0 * ratio).toFixed(precision);
  const vah = +(8735.0 * ratio).toFixed(precision);
  const sessionHigh = +(8800.0 * ratio).toFixed(precision);

  let prevClose = +(8780.0 * ratio).toFixed(precision);

  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSec;
    let open = prevClose;
    let close = prevClose;
    let high = prevClose;
    let low = prevClose;
    let volume = 15000;

    // Pseudo-random deterministic noise
    const noise = Math.sin(i * 3.7 + 1.2) * 8.5;
    const isBull = Math.cos(i * 2.3 + 0.4) > 0;

    if (i < anchorIdx) {
      // Natural 2-wave pullback before the anchor low (mix of green and red bars)
      const prog = i / anchorIdx;
      // Multi-wave oscillation descending toward anchorLow
      const wave = Math.sin(prog * Math.PI * 2.5) * 35.0;
      const baseline = 8780.0 - prog * 190.0 + wave + noise;
      
      const bodySize = Math.max(4, Math.abs(Math.sin(i * 1.9)) * 14);
      open = +(baseline + (isBull ? -bodySize * 0.5 : bodySize * 0.5)).toFixed(precision);
      close = +(baseline + (isBull ? bodySize * 0.5 : -bodySize * 0.5)).toFixed(precision);
      
      const wickTop = Math.max(3, Math.abs(Math.sin(i * 4.1)) * 12);
      const wickBottom = Math.max(3, Math.abs(Math.cos(i * 3.3)) * 12);
      high = +(Math.max(open, close) + wickTop).toFixed(precision);
      low = +(Math.max(anchorLow + 5, Math.min(open, close) - wickBottom)).toFixed(precision);
      volume = Math.floor(18000 + Math.abs(Math.sin(i * 2.4)) * 9000);
    } else if (i === anchorIdx) {
      // 16:00 ANCHOR SWING LOW (8,529) with long lower rejection wick
      open = 8565.0;
      close = 8572.0;
      high = 8585.0;
      low = anchorLow; // 8,529.00!
      volume = 58270; // 58.27K!
    } else if (i === reclaimIdx) {
      // BUY CE @ VAL (Reclaim back above VAL 8,590)
      open = 8572.0;
      close = 8614.0;
      high = 8626.0;
      low = 8564.0;
      volume = 38400;
    } else if (i > reclaimIdx && i < highIdx) {
      const relIdx = i - reclaimIdx;
      if (relIdx <= 5) {
        // Phase 1: Consolidation in VAL zone (8,580 - 8,630) with alternating green & red
        const localNoise = Math.sin(relIdx * 2.8) * 12;
        const body = Math.max(3, Math.abs(Math.cos(relIdx * 1.7)) * 10);
        open = +(8598 + localNoise - (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        close = +(8598 + localNoise + (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        high = +(Math.max(open, close) + 8).toFixed(precision);
        low = +(Math.min(open, close) - 8).toFixed(precision);
        volume = Math.floor(30000 + Math.abs(Math.sin(relIdx * 1.5)) * 8000);
      } else if (relIdx <= 14) {
        // Phase 2: Institutional rotation at POC (8,650 - 8,680)
        const localNoise = Math.sin((relIdx - 5) * 1.6) * 12;
        const body = Math.max(3, Math.abs(Math.sin(relIdx * 2.1)) * 9);
        open = +(poc + localNoise - (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        close = +(poc + localNoise + (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        high = +(Math.max(open, close) + 7).toFixed(precision);
        low = +(Math.min(open, close) - 7).toFixed(precision);
        volume = Math.floor(45000 + Math.abs(Math.sin(relIdx * 1.9)) * 12000);
      } else {
        // Phase 3: Upward expansion toward VAH (8,705 - 8,760)
        const subProg = (relIdx - 14) / 6;
        const base = 8705 + subProg * 55;
        const body = Math.max(4, Math.abs(Math.cos(relIdx * 2.5)) * 11);
        open = +(base - (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        close = +(base + (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        high = +(Math.max(open, close) + 9).toFixed(precision);
        low = +(Math.min(open, close) - 7).toFixed(precision);
        volume = Math.floor(28000 + subProg * 6000);
      }
    } else if (i === highIdx) {
      // SESSION HIGH AT 8,800 WITH UPPER WICK
      open = 8768.0;
      high = sessionHigh; // 8,800.00!
      close = 8760.0;
      low = 8752.0;
      volume = 26500;
    } else if (i > highIdx && i < count - 1) {
      if (i === rejectIdx) {
        // SELL PE @ VAH (Rejection back inside Value Area)
        open = 8744.0;
        high = 8752.0;
        close = 8718.0;
        low = 8712.0;
        volume = 32500;
      } else {
        const fallProg = (i - highIdx) / (count - 1 - highIdx);
        const base = 8740 - fallProg * 140;
        const body = Math.max(3, Math.abs(Math.sin(i * 1.8)) * 8);
        open = +(base - (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        close = +(base + (isBull ? body * 0.5 : -body * 0.5)).toFixed(precision);
        high = +(Math.max(open, close) + 6).toFixed(precision);
        low = +(Math.min(open, close) - 6).toFixed(precision);
        volume = 24000;
      }
    } else {
      // FINAL CANDLE (Smoothly connecting to currentBid)
      open = +(currentBid + 6.0).toFixed(precision);
      high = +(currentBid + 12.0).toFixed(precision);
      low = +(currentBid - 8.0).toFixed(precision);
      close = currentBid; // 8585.00
      volume = 35900;
    }

    prevClose = close;
    candles.push({ time, open, high, low, close, volume });
  }

  return candles;
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

  if (symbol === "CRUDEOIL") {
    return generateCrudeOilSessionCandles(timeframe, count, currentBid, precision);
  }

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

