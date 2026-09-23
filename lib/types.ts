export type AssetSymbol =
  | "NIFTY"
  | "BANKNIFTY"
  | "CRUDEOIL"
  | "NATURALGAS"
  | "FINNIFTY"
  | "SENSEX"
  | "INDIAVIX"
  | "USDINR";

export type MarketMode = "INDIAN_OPTIONS";

export type OptionType = "CE" | "PE";

export interface OptionContract {
  symbol: AssetSymbol;
  strike: number;
  type: OptionType;
  expiry: string;
  spotPrice: number;
  premiumBid: number;
  premiumAsk: number;
  lotSize: number;
  delta: number;
  gamma?: number;
  theta?: number;
  iv?: number;
}

export interface OptionChainItem {
  strike: number;
  call: OptionContract;
  put: OptionContract;
  isATM: boolean;
}

export type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  symbol: AssetSymbol;
  name: string;
  category: "Indian Index" | "MCX Commodity" | "Macro";
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  high24h: number;
  low24h: number;
  pipPrecision: number;
  pipMultiplier: number;
  lastUpdate: number;
  lotSize?: number;
  strikeStep?: number;
  currency?: "₹";
}

export interface PAVPVolumeRow {
  price: number;
  volume: number;
  isValueArea: boolean;
  isPOC: boolean;
}

export interface PivotPoint {
  index: number;
  time: number;
  price: number;
  type: "high" | "low";
  pvtLength: number;
  changePercent?: number;
  volume?: number;
}

export interface PivotAnchoredVPResult {
  poc: number; // Point of Control price
  vah: number; // Value Area High price
  val: number; // Value Area Low price
  totalVolume: number;
  vaVolume: number;
  startIndex: number;
  startTime: number;
  endIndex: number;
  endTime: number;
  pivot: PivotPoint | null;
  rows: PAVPVolumeRow[];
  isDeveloping: boolean;
  vwcbHighVolIndices: number[]; // Indices of candles flagged with High Volume in dgtrd VWCB
}

export interface PAVPSignal {
  type: "BUY_CE_VAL" | "BUY_PE_VAH" | "BUY_CE_POC" | "BUY_PE_POC";
  label: string;
  action: "BUY CE" | "BUY PE";
  strikeSuggestion?: string;
  levelPrice: number;
  candleIndex: number;
  time: number;
  sl: number;
  tp1: number;
  tp2: number;
  rationale: string;
}

export interface TechnicalIndicatorSet {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  atr14: number;
  pivots: {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
  smc?: SMCData;
  volumeProfile?: VolumeProfileResult;
  pavp?: PivotAnchoredVPResult;
  sessionLevels?: SessionLevelsResult;
}

export interface SessionLevelsResult {
  pdh: number; // Previous Day High (Key Buyside Liquidity)
  pdl: number; // Previous Day Low (Key Sellside Liquidity)
  dailyOpen: number; // Day Open Price Baseline
  orbHigh: number; // Opening Range High (15M / 30M Session Open Range)
  orbLow: number; // Opening Range Low (15M / 30M Session Open Range)
  orbMid: number; // Opening Range Midpoint (50% Equilibrium)
  asiaHigh: number; // Asian Session High (Asia Liquidity Pool)
  asiaLow: number; // Asian Session Low (Asia Liquidity Pool)
}

export interface VolumeProfileBin {
  price: number;
  volume: number;
  isValueArea: boolean;
}

export interface VolumeProfileResult {
  poc: number; // Point of Control
  vah: number; // Value Area High (70%)
  val: number; // Value Area Low (70%)
  totalVolume: number;
  bins: VolumeProfileBin[];
}

export interface ChartSignalMarker {
  time: number | string;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown";
  text: string;
  size: number;
}

export interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  fib0: number;
  fib236: number;
  fib382: number;
  fib50: number; // Equilibrium
  fib618: number; // Golden Pocket
  fib786: number;
  fib100: number;
}

export interface OrderBlock {
  type: "bullish" | "bearish";
  high: number;
  low: number;
  time: number;
  mitigated: boolean;
}

export interface FairValueGap {
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  time: number;
  mitigated: boolean;
}

export interface SMCData {
  zone: "Premium" | "Discount" | "Equilibrium";
  equilibriumPrice: number;
  fibonacci: FibonacciLevels;
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  confluenceScore?: number;
}

export type TradeSignalAction = "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";

export interface LevelCoordinate {
  label: string;
  price: number;
  type: "support" | "resistance" | "entry" | "stoploss" | "takeprofit";
  confidence: number;
  yPercent?: number; // 0 to 100 on the image
}

export interface AIAnalysisResult {
  assetDetected: string;
  timeframeDetected: string;
  trendBias: TradeSignalAction;
  confidenceScore: number; // 0 - 100
  marketStructure: "Bullish Trend" | "Bearish Trend" | "Consolidation / Range" | "Liquidity Sweep Breakout" | "Reversal Zone";
  patternDetected: string;
  currentPrice?: number;
  
  // Suggested Trade Setup
  action: TradeSignalAction;
  suggestedEntry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: string; // e.g. "1:2.8"
  
  // Levels
  supportLevels: number[];
  resistanceLevels: number[];
  visualLevels?: LevelCoordinate[];

  // Confluence Factors
  confluences: {
    factor: string;
    status: "bullish" | "bearish" | "neutral";
  }[];
  
  // Detailed Institutional Commentary
  reasoning: string;
  invalidationCriteria: string;
  timestamp: string;
  smc?: SMCData;
}

export interface CalendarEvent {
  id: string;
  time: string; // HH:mm UTC or ISO
  date: string; // YYYY-MM-DD
  currency: "INR" | "USD" | string;
  event: string;
  impact: "high" | "medium" | "low";
  actual?: string;
  forecast: string;
  previous: string;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timeAgo: string;
  sentiment: "bullish" | "bearish" | "neutral";
  affectedAssets: AssetSymbol[];
  url?: string;
}

export interface MarketSession {
  name: string;
  city: string;
  openUtc: number; // Hour (0-23)
  closeUtc: number; // Hour (0-23)
  status: "open" | "closed";
  isOverlap?: boolean;
}

export interface MTFStructure {
  bias: "bullish" | "bearish" | "ranging";
  detail: string;
  isBOS?: boolean; // Break of Structure
}

export interface MTFAssetRow {
  symbol: AssetSymbol;
  name: string;
  price: number;
  structures: {
    "15m": MTFStructure;
    "1h": MTFStructure;
    "4h": MTFStructure;
    "1d": MTFStructure;
  };
  overallBias: TradeSignalAction;
  confluenceScore: number;
}

export interface CurrencyStrength {
  currency: string;
  name: string;
  score: number; // 0 to 100
  change: number; // 24h change
  status: "Bullish" | "Neutral" | "Bearish";
}

export interface RetailSentimentItem {
  symbol: AssetSymbol;
  name: string;
  longPercent: number;
  shortPercent: number;
  contrarianSignal: string;
  cotInstitutionalBias: string;
}

export interface PropFirmProfile {
  id: string;
  name: string;
  maxDailyLossPercent: number;
  maxTotalLossPercent: number;
  profitTargetPercent: number;
}

export type AlertPatternType =
  | "VAL_SWEEP_REVERSAL"
  | "VAH_REJECTION_REVERSAL"
  | "POC_RETEST_BOUNCE"
  | "POC_RETEST_REJECTION"
  | "VA_EXPANSION_BREAKOUT";

export type AlertStatus = "CONFIRMED" | "RETESTING" | "TRIGGERED";

export interface InstitutionalAlert {
  id: string;
  symbol: AssetSymbol;
  assetName: string;
  timeframe: "4h" | "1h" | "15m" | "5m";
  patternType: AlertPatternType;
  title: string;
  direction: "BUY CE" | "BUY PE" | "STRONG BUY CE" | "STRONG BUY PE" | "BUY" | "SELL" | "STRONG BUY" | "STRONG SELL";
  status: AlertStatus;
  priceAtAlert: number;
  vahPrice?: number;
  valPrice?: number;
  pocPrice?: number;
  vwcbSpike?: boolean;
  optionStrikeSuggestion?: string;
  suggestedEntry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3?: number;
  riskRewardRatio: string;
  confidenceScore: number;
  reasoning: string;
  invalidationCriteria: string;
  timestamp: number;
  timeAgo: string;
  candles: Candle[];
  levelPrice?: number;
  retestStatus?: string;
  breakoutCandleIndex?: number;
  retestCandleIndex?: number;
}
