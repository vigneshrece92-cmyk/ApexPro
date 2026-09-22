import { AssetSymbol, Quote, InstitutionalAlert, Candle, PAVPSignal, OptionType, PivotAnchoredVPResult } from "./types";
import { INITIAL_QUOTES } from "./defaultData";
import { getRecommendedOptionContract, getOptionSpec } from "./optionsEngine";
import { detectPAVPSignals, calculatePivotAnchoredVolumeProfile } from "./technicals";

export interface DemoPosition {
  ticket: number;
  symbol: AssetSymbol;
  type: "BUY" | "SELL";
  volume: number; // lot size (e.g. 1 lot for Indian F&O, 0.02 for FX)
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  profit: number; // floating P&L
  comment: string;
  time: number; // unix timestamp in ms
  be_triggered?: boolean;
  optionContractName?: string; // e.g. "NIFTY 23350 CE"
  optionType?: OptionType;
  optionStrike?: number;
  optionEntryPremium?: number;
  lotSizeMultiplier?: number;
  currency?: "₹" | "$";
}

export interface ClosedTrade {
  ticket: number;
  symbol: AssetSymbol;
  type: "BUY" | "SELL";
  volume: number;
  price_open: number;
  price_close: number;
  sl: number;
  tp: number;
  profit: number;
  return_percent: number;
  open_time: number;
  close_time: number;
  close_reason: "Take Profit Hit" | "Stop Loss Hit" | "Manual Exit" | "Break-Even Exit";
  optionContractName?: string;
  currency?: "₹" | "$";
}

export interface AutoBotLog {
  id: string;
  timestamp: number;
  type: "info" | "trade" | "success" | "warning";
  message: string;
}

export interface DemoAccountState {
  balance: number;
  equity: number;
  margin: number;
  margin_free: number;
  leverage: number;
  open_profit: number;
  open_positions: DemoPosition[];
  history: ClosedTrade[];
  currency?: "₹" | "$";
  auto_bot: {
    enabled: boolean;
    risk_percent: number; // 0.5, 1.0, 1.5
    market_mode: "STRICT_REAL" | "24_7_PRACTICE";
    strategy_mode?: "VOLUME_PROFILE_ONLY" | "ALL_CONFIRMATIONS";
    logs: AutoBotLog[];
  };
}

const STORAGE_KEY = "apex_pro_indian_broker_v4";

export const INITIAL_DEMO_BALANCE = 100000.0;
export const DEFAULT_LEVERAGE = 1000;

/**
 * Checks whether the Indian NSE/BSE & MCX Commodity market is currently open.
 * NSE F&O: 09:15 AM - 03:30 PM IST (Mon-Fri)
 * MCX Day & Evening: 09:00 AM - 11:30 PM IST (Mon-Fri)
 */
export function isIndianMarketOpen(now = new Date()): {
  isOpen: boolean;
  statusText: string;
} {
  const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = istDate.getDay(); // 0 = Sun, 6 = Sat
  const hour = istDate.getHours();
  const minute = istDate.getMinutes();
  const totalMin = hour * 60 + minute;

  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      statusText: "Weekend Closed (Opens Monday 09:00 AM IST)",
    };
  }

  // MCX is open till 11:30 PM (23:30)
  if (totalMin >= 9 * 60 && totalMin <= 23 * 60 + 30) {
    const isNse = totalMin >= 9 * 60 + 15 && totalMin <= 15 * 60 + 30;
    return {
      isOpen: true,
      statusText: isNse
        ? "NSE F&O & MCX Sessions Active (09:15 - 15:30 IST)"
        : "MCX Commodity Evening Session Active (till 23:30 IST)",
    };
  }

  return {
    isOpen: false,
    statusText: "Overnight Closed (Reopens 09:00 AM IST)",
  };
}

// Alias for seamless backward compatibility
export const isForexMarketOpen = isIndianMarketOpen;

export const INITIAL_ACCOUNT_STATE: DemoAccountState = {
  balance: INITIAL_DEMO_BALANCE,
  equity: INITIAL_DEMO_BALANCE,
  margin: 0,
  margin_free: INITIAL_DEMO_BALANCE,
  leverage: DEFAULT_LEVERAGE,
  open_profit: 0,
  open_positions: [],
  history: [],
  currency: "₹",
  auto_bot: {
    enabled: true,
    risk_percent: 1.0,
    market_mode: "24_7_PRACTICE",
    strategy_mode: "VOLUME_PROFILE_ONLY",
    logs: [
      {
        id: "init-1",
        timestamp: Date.now() - 300000,
        type: "info",
        message: "Apex Terminal Indian F&O & MCX Broker Engine initialized with ₹1,00,000.00 capital (1:1000 Leverage).",
      },
      {
        id: "init-2",
        timestamp: Date.now() - 180000,
        type: "info",
        message: "Autonomous Pivot-Anchored Volume Profile (PAVP) Bot active — monitoring strictly VAH, VAL & POC levels.",
      },
    ],
  },
};

/**
 * Load demo account state from browser localStorage or default
 */
export function loadDemoAccount(): DemoAccountState {
  if (typeof window === "undefined") return INITIAL_ACCOUNT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACCOUNT_STATE;
    const parsed = JSON.parse(raw);

    const safeBalance = typeof parsed.balance === "number" && !isNaN(parsed.balance) ? parsed.balance : INITIAL_DEMO_BALANCE;
    const safeEquity = typeof parsed.equity === "number" && !isNaN(parsed.equity) ? parsed.equity : safeBalance;
    const safeMargin = typeof parsed.margin === "number" && !isNaN(parsed.margin) ? parsed.margin : 0;
    const safeMarginFree = typeof parsed.margin_free === "number" && !isNaN(parsed.margin_free) ? parsed.margin_free : safeBalance;
    const safeOpenProfit = typeof parsed.open_profit === "number" && !isNaN(parsed.open_profit) ? parsed.open_profit : 0;

    const safeOpenPositions: DemoPosition[] = Array.isArray(parsed.open_positions)
      ? parsed.open_positions
          .filter((p: any) => p && typeof p === "object")
          .map((p: any) => ({
            ticket: typeof p.ticket === "number" ? p.ticket : Math.floor(1000000 + Math.random() * 9000000),
            symbol: (p.symbol as AssetSymbol) || "NIFTY",
            type: p.type === "SELL" ? "SELL" : "BUY",
            volume: typeof p.volume === "number" && !isNaN(p.volume) ? p.volume : 1.0,
            price_open: typeof p.price_open === "number" && !isNaN(p.price_open) ? p.price_open : 23320.00,
            sl: typeof p.sl === "number" && !isNaN(p.sl) ? p.sl : 23285.0,
            tp: typeof p.tp === "number" && !isNaN(p.tp) ? p.tp : 23360.0,
            price_current: typeof p.price_current === "number" && !isNaN(p.price_current) ? p.price_current : (p.price_open || 23320.00),
            profit: typeof p.profit === "number" && !isNaN(p.profit) ? p.profit : 0,
            comment: typeof p.comment === "string" ? p.comment : "PAVP Volume Profile",
            time: typeof p.time === "number" ? p.time : Date.now(),
            be_triggered: !!p.be_triggered,
            optionContractName: p.optionContractName || "NIFTY 23300 CE",
            currency: p.currency || "₹",
          }))
      : [];

    const safeHistory: ClosedTrade[] = Array.isArray(parsed.history)
      ? parsed.history
          .filter((h: any) => h && typeof h === "object")
          .map((h: any) => ({
            ticket: typeof h.ticket === "number" ? h.ticket : Math.floor(1000000 + Math.random() * 9000000),
            symbol: (h.symbol as AssetSymbol) || "NIFTY",
            type: h.type === "SELL" ? "SELL" : "BUY",
            volume: typeof h.volume === "number" && !isNaN(h.volume) ? h.volume : 1.0,
            price_open: typeof h.price_open === "number" && !isNaN(h.price_open) ? h.price_open : 23320.00,
            price_close: typeof h.price_close === "number" && !isNaN(h.price_close) ? h.price_close : 23360.00,
            sl: typeof h.sl === "number" && !isNaN(h.sl) ? h.sl : 23285.0,
            tp: typeof h.tp === "number" && !isNaN(h.tp) ? h.tp : 23360.0,
            profit: typeof h.profit === "number" && !isNaN(h.profit) ? h.profit : 1000,
            return_percent: typeof h.return_percent === "number" && !isNaN(h.return_percent) ? h.return_percent : 1.0,
            open_time: typeof h.open_time === "number" ? h.open_time : Date.now() - 60000,
            close_time: typeof h.close_time === "number" ? h.close_time : Date.now(),
            close_reason: typeof h.close_reason === "string" ? h.close_reason : "Take Profit Hit",
            optionContractName: h.optionContractName || "NIFTY 23300 CE",
            currency: h.currency || "₹",
          }))
      : [];

    return {
      balance: safeBalance,
      equity: safeEquity,
      margin: safeMargin,
      margin_free: safeMarginFree,
      leverage: DEFAULT_LEVERAGE, // Enforce 1:1000 leverage
      open_profit: safeOpenProfit,
      open_positions: safeOpenPositions,
      history: safeHistory,
      auto_bot: {
        ...INITIAL_ACCOUNT_STATE.auto_bot,
        ...(parsed.auto_bot || {}),
        enabled: parsed.auto_bot?.enabled !== undefined ? parsed.auto_bot.enabled : true,
        market_mode: parsed.auto_bot?.market_mode === "STRICT_REAL" ? "STRICT_REAL" : "24_7_PRACTICE",
        logs: Array.isArray(parsed.auto_bot?.logs) ? parsed.auto_bot.logs : INITIAL_ACCOUNT_STATE.auto_bot.logs,
      },
    };
  } catch {
    return INITIAL_ACCOUNT_STATE;
  }
}

/**
 * Save demo account state to browser localStorage
 */
export function saveDemoAccount(state: DemoAccountState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to persist demo account state:", e);
  }
}

/**
 * Reset account back to pristine ₹1,00,000
 */
export function resetDemoAccount(): DemoAccountState {
  const resetState: DemoAccountState = {
    ...INITIAL_ACCOUNT_STATE,
    balance: INITIAL_DEMO_BALANCE,
    equity: INITIAL_DEMO_BALANCE,
    margin: 0,
    margin_free: INITIAL_DEMO_BALANCE,
    open_profit: 0,
    open_positions: [],
    history: [],
    currency: "₹",
    auto_bot: {
      enabled: true,
      risk_percent: 1.0,
      market_mode: "24_7_PRACTICE",
      strategy_mode: "VOLUME_PROFILE_ONLY",
      logs: [
        {
          id: `rst-${Date.now()}`,
          timestamp: Date.now(),
          type: "info",
          message: "Account reset to initial ₹1,00,000.00 demo balance. Pivot-Anchored Volume Profile (PAVP) Auto-Bot active & scanning.",
        },
      ],
    },
  };
  saveDemoAccount(resetState);
  return resetState;
}

/**
 * Contract size multipliers:
 * NIFTY: 25 qty per lot
 * BANKNIFTY: 15 qty per lot
 * FINNIFTY: 25 qty per lot
 * SENSEX: 10 qty per lot
 * CRUDEOIL (MCX): 100 bbl per lot
 * NATURALGAS (MCX): 1250 mmBtu per lot
 */
export function getContractSize(symbol: AssetSymbol, pos?: DemoPosition): number {
  if (pos?.lotSizeMultiplier && pos.lotSizeMultiplier > 0) return pos.lotSizeMultiplier;
  if (symbol === "NIFTY" || symbol === "FINNIFTY") return 25;
  if (symbol === "BANKNIFTY") return 15;
  if (symbol === "SENSEX") return 10;
  if (symbol === "CRUDEOIL") return 100;
  if (symbol === "NATURALGAS") return 1250;
  return 25;
}

/**
 * Calculate floating P&L for a position
 */
export function calculatePositionProfit(
  pos: DemoPosition,
  quote: { bid: number; ask: number }
): number {
  const contract = getContractSize(pos.symbol, pos);

  // If this is an Indian Options contract
  if (pos.optionType && pos.optionEntryPremium != null) {
    const delta = 0.50; // ATM options delta approx 0.50
    const spotChange = pos.optionType === "CE" 
      ? (quote.bid - pos.price_open) 
      : (pos.price_open - quote.ask);
    const premiumChange = spotChange * delta;
    const currentPremium = Math.max(0.5, pos.optionEntryPremium + premiumChange);
    const profitPerUnit = currentPremium - pos.optionEntryPremium;
    return Math.round(profitPerUnit * pos.volume * contract * 100) / 100;
  }

  if (pos.type === "BUY") {
    // BUY exits at current Bid
    const diff = quote.bid - pos.price_open;
    return Math.round(diff * pos.volume * contract * 100) / 100;
  } else {
    // SELL exits at current Ask
    const diff = pos.price_open - quote.ask;
    return Math.round(diff * pos.volume * contract * 100) / 100;
  }
}

/**
 * Calculate margin requirement for a position
 */
export function calculateRequiredMargin(
  symbol: AssetSymbol,
  volume: number,
  price: number,
  leverage: number,
  pos?: Partial<DemoPosition>
): number {
  if (pos?.optionType && pos?.optionEntryPremium != null) {
    const contract = getContractSize(symbol, pos as DemoPosition);
    return Math.round(pos.optionEntryPremium * volume * contract * 100) / 100;
  }
  const contract = getContractSize(symbol);
  const notional = volume * contract * price;
  return Math.round((notional / leverage) * 100) / 100;
}

/**
 * Execute a new market trade on the internal demo account
 */
export function executeDemoTrade(
  state: DemoAccountState,
  params: {
    symbol: AssetSymbol;
    type: "BUY" | "SELL";
    volume: number;
    quote: Quote;
    sl: number;
    tp: number;
    comment?: string;
    optionContractName?: string;
    optionType?: OptionType;
    optionStrike?: number;
    optionEntryPremium?: number;
    lotSizeMultiplier?: number;
    currency?: "₹" | "$";
  }
): { success: boolean; state: DemoAccountState; message: string } {
  const { symbol, type, volume, quote, sl, tp, comment } = params;

  // Enforce Real Interbank Market Hours if STRICT_REAL mode is selected
  if (state.auto_bot.market_mode === "STRICT_REAL") {
    const marketCheck = isForexMarketOpen();
    if (!marketCheck.isOpen) {
      return {
        success: false,
        state,
        message: `Execution blocked: Market closed for the weekend (${marketCheck.statusText}). Switch to "24/7 Practice Mode" to execute simulated trades.`,
      };
    }
  }

  const isOption = !!params.optionContractName;
  const safeVolume = isOption
    ? Math.max(1, Math.round(volume || 1))
    : Math.max(0.01, Math.min(0.05, Math.round((volume || 0.02) * 100) / 100));

  const openPrice = type === "BUY" ? (quote.ask || quote.bid || 23330) : (quote.bid || quote.ask || 23330);
  const safeSL = typeof sl === "number" && !isNaN(sl) ? Math.round(sl * 100) / 100 : (type === "BUY" ? openPrice - 50 : openPrice + 50);
  const safeTP = typeof tp === "number" && !isNaN(tp) ? Math.round(tp * 100) / 100 : (type === "BUY" ? openPrice + 100 : openPrice - 100);

  const currencySym = params.currency || quote.currency || (state.currency || "₹");
  const requiredMargin = calculateRequiredMargin(symbol, safeVolume, openPrice, state.leverage || 1000, params);
  const marginFree = typeof state.margin_free === "number" && !isNaN(state.margin_free) ? state.margin_free : INITIAL_DEMO_BALANCE;
  
  if (marginFree < requiredMargin) {
    return {
      success: false,
      state,
      message: `Insufficient free margin. Required: ${currencySym}${requiredMargin.toFixed(2)}, Available: ${currencySym}${marginFree.toFixed(2)}`,
    };
  }

  const newTicket = Math.floor(1000000 + Math.random() * 9000000);
  const newPosition: DemoPosition = {
    ticket: newTicket,
    symbol,
    type,
    volume: safeVolume,
    price_open: openPrice,
    sl: safeSL,
    tp: safeTP,
    price_current: openPrice,
    profit: 0,
    comment: comment || (isOption ? "PAVP Option Entry" : "Apex Terminal Trade"),
    time: Date.now(),
    be_triggered: false,
    optionContractName: params.optionContractName,
    optionType: params.optionType,
    optionStrike: params.optionStrike,
    optionEntryPremium: params.optionEntryPremium,
    lotSizeMultiplier: params.lotSizeMultiplier || getContractSize(symbol),
    currency: currencySym,
  };

  const nextPositions = [newPosition, ...(state.open_positions || [])];
  const currentMargin = typeof state.margin === "number" && !isNaN(state.margin) ? state.margin : 0;
  const currentEquity = typeof state.equity === "number" && !isNaN(state.equity) ? state.equity : INITIAL_DEMO_BALANCE;
  const newMargin = Math.round((currentMargin + requiredMargin) * 100) / 100;
  const newMarginFree = Math.round((currentEquity - newMargin) * 100) / 100;

  const lotDesc = isOption ? `${safeVolume} Lot (${newPosition.lotSizeMultiplier} Qty)` : `${safeVolume} lots`;
  const tradeDesc = isOption
    ? `BOUGHT ${params.optionContractName} @ ${currencySym}${params.optionEntryPremium?.toFixed(2)} (${lotDesc})`
    : `${type} ${safeVolume} ${symbol} @ ${currencySym}${openPrice.toFixed(2)}`;

  const logMessage: AutoBotLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: Date.now(),
    type: "trade",
    message: `[Order #${newTicket}] ${tradeDesc} executed. SL: ${currencySym}${safeSL.toFixed(2)}, TP: ${currencySym}${safeTP.toFixed(2)}.`,
  };

  const nextLogs = [logMessage, ...(state.auto_bot?.logs || [])].slice(0, 50);

  const nextState: DemoAccountState = {
    ...state,
    open_positions: nextPositions,
    margin: newMargin,
    margin_free: newMarginFree,
    auto_bot: {
      ...state.auto_bot,
      logs: nextLogs,
    },
  };

  saveDemoAccount(nextState);
  return {
    success: true,
    state: nextState,
    message: `Order #${newTicket} executed: ${tradeDesc}`,
  };
}

/**
 * Close an existing open position
 */
export function closeDemoPosition(
  state: DemoAccountState,
  ticket: number,
  quote: { bid: number; ask: number },
  reason: ClosedTrade["close_reason"] = "Manual Exit"
): { success: boolean; state: DemoAccountState; message: string } {
  const posIndex = state.open_positions.findIndex((p) => p.ticket === ticket);
  if (posIndex === -1) {
    return { success: false, state, message: `Position #${ticket} not found` };
  }

  const pos = state.open_positions[posIndex];
  const closePrice = pos.type === "BUY" ? quote.bid : quote.ask;
  const profit = calculatePositionProfit(pos, quote);
  const contract = getContractSize(pos.symbol, pos);
  const baseCost = pos.optionEntryPremium ? (pos.optionEntryPremium * pos.volume * contract) : (pos.volume * contract * pos.price_open);
  const returnPercent = Math.round((profit / Math.max(1, baseCost)) * 10000) / 100;

  const closedRecord: ClosedTrade = {
    ticket: pos.ticket,
    symbol: pos.symbol,
    type: pos.type,
    volume: pos.volume,
    price_open: pos.price_open,
    price_close: closePrice,
    sl: pos.sl,
    tp: pos.tp,
    profit,
    return_percent: returnPercent,
    open_time: pos.time,
    close_time: Date.now(),
    close_reason: reason,
    optionContractName: pos.optionContractName,
    currency: pos.currency || state.currency || "₹",
  };

  const nextPositions = state.open_positions.filter((p) => p.ticket !== ticket);
  const nextHistory = [closedRecord, ...state.history].slice(0, 100);

  // Recalculate account totals
  const nextBalance = Math.round((state.balance + profit) * 100) / 100;
  
  // Recalculate remaining margin
  let totalMargin = 0;
  for (const p of nextPositions) {
    totalMargin += calculateRequiredMargin(p.symbol, p.volume, p.price_current, state.leverage, p);
  }
  totalMargin = Math.round(totalMargin * 100) / 100;

  let totalFloatingProfit = 0;
  for (const p of nextPositions) {
    totalFloatingProfit += p.profit;
  }
  totalFloatingProfit = Math.round(totalFloatingProfit * 100) / 100;

  const nextEquity = Math.round((nextBalance + totalFloatingProfit) * 100) / 100;
  const nextMarginFree = Math.round((nextEquity - totalMargin) * 100) / 100;

  const cur = pos.currency || state.currency || "₹";
  const logMessage: AutoBotLog = {
    id: `log-close-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type: profit >= 0 ? "success" : "warning",
    message: `[Closed #${pos.ticket}] ${pos.optionContractName || `${pos.type} ${pos.volume} ${pos.symbol}`} closed @ ${cur}${closePrice.toFixed(2)}. P&L: ${profit >= 0 ? "+" : ""}${cur}${profit.toFixed(2)} (${reason}).`,
  };

  const nextLogs = [logMessage, ...state.auto_bot.logs].slice(0, 50);

  const nextState: DemoAccountState = {
    ...state,
    balance: nextBalance,
    equity: nextEquity,
    margin: totalMargin,
    margin_free: nextMarginFree,
    open_profit: totalFloatingProfit,
    open_positions: nextPositions,
    history: nextHistory,
    auto_bot: {
      ...state.auto_bot,
      logs: nextLogs,
    },
  };

  saveDemoAccount(nextState);
  return {
    success: true,
    state: nextState,
    message: `Position #${ticket} closed. Realized P&L: ${profit >= 0 ? "+" : ""}${cur}${profit.toFixed(2)}`,
  };
}

/**
 * Move position Stop Loss to Break-Even (entry price + spread buffer)
 */
export function setPositionBreakEven(
  state: DemoAccountState,
  ticket: number
): { success: boolean; state: DemoAccountState; message: string } {
  const posIndex = state.open_positions.findIndex((p) => p.ticket === ticket);
  if (posIndex === -1) {
    return { success: false, state, message: `Position #${ticket} not found` };
  }

  const pos = state.open_positions[posIndex];
  const cur = pos.currency || state.currency || "₹";
  // Entry price with small buffer
  const newSL = pos.type === "BUY" ? pos.price_open + 0.2 : pos.price_open - 0.2;

  const updatedPos: DemoPosition = {
    ...pos,
    sl: Math.round(newSL * 100) / 100,
    be_triggered: true,
  };

  const nextPositions = [...state.open_positions];
  nextPositions[posIndex] = updatedPos;

  const logMessage: AutoBotLog = {
    id: `log-be-${Date.now()}`,
    timestamp: Date.now(),
    type: "info",
    message: `[Break-Even #${ticket}] Stop Loss moved to ${cur}${updatedPos.sl.toFixed(2)} (Entry Defense). Trade is now 100% risk-free.`,
  };

  const nextLogs = [logMessage, ...state.auto_bot.logs].slice(0, 50);

  const nextState: DemoAccountState = {
    ...state,
    open_positions: nextPositions,
    auto_bot: {
      ...state.auto_bot,
      logs: nextLogs,
    },
  };

  saveDemoAccount(nextState);
  return {
    success: true,
    state: nextState,
    message: `Stop Loss for #${ticket} moved to Break-Even ($${updatedPos.sl.toFixed(2)})`,
  };
}

/**
 * Recalculate floating profits, trigger SL/TP hits, and auto Break-Even on live price tick
 */
export function tickDemoPositions(
  state: DemoAccountState,
  quote: Quote
): DemoAccountState {
  if (state.open_positions.length === 0) {
    if (state.open_profit !== 0 || state.equity !== state.balance) {
      const synched = {
        ...state,
        equity: state.balance,
        margin: 0,
        margin_free: state.balance,
        open_profit: 0,
      };
      saveDemoAccount(synched);
      return synched;
    }
    return state;
  }

  let stateCopy = { ...state };
  let positionsToClose: { ticket: number; reason: ClosedTrade["close_reason"] }[] = [];

  const updatedPositions: DemoPosition[] = [];

  for (const pos of state.open_positions) {
    if (pos.symbol !== quote.symbol) {
      updatedPositions.push(pos);
      continue;
    }

    const currentPrice = pos.type === "BUY" ? quote.bid : quote.ask;
    const profit = calculatePositionProfit(pos, quote);

    // 1. Check Take Profit Hit
    let tpHit = false;
    if (pos.type === "BUY" && pos.tp > 0 && currentPrice >= pos.tp) {
      tpHit = true;
    } else if (pos.type === "SELL" && pos.tp > 0 && currentPrice <= pos.tp) {
      tpHit = true;
    }

    if (tpHit) {
      positionsToClose.push({ ticket: pos.ticket, reason: "Take Profit Hit" });
      continue;
    }

    // 2. Check Stop Loss Hit
    let slHit = false;
    if (pos.type === "BUY" && pos.sl > 0 && currentPrice <= pos.sl) {
      slHit = true;
    } else if (pos.type === "SELL" && pos.sl > 0 && currentPrice >= pos.sl) {
      slHit = true;
    }

    if (slHit) {
      positionsToClose.push({
        ticket: pos.ticket,
        reason: pos.be_triggered ? "Break-Even Exit" : "Stop Loss Hit",
      });
      continue;
    }

    // 3. Auto Break-Even Check: If in profit by >= +₹500.00 and BE not yet triggered
    let updatedPos = { ...pos, price_current: currentPrice, profit };
    const curSym = pos.currency || stateCopy.currency || "₹";
    const beProfitThreshold = pos.currency === "$" ? 15.0 : 500.0;
    if (!pos.be_triggered && profit >= beProfitThreshold) {
      const newSL = pos.type === "BUY" ? pos.price_open + 0.5 : pos.price_open - 0.5;
      updatedPos.sl = Math.round(newSL * 100) / 100;
      updatedPos.be_triggered = true;

      const beLog: AutoBotLog = {
        id: `auto-be-${Date.now()}-${pos.ticket}`,
        timestamp: Date.now(),
        type: "success",
        message: `🛡️ [Auto Break-Even] Position #${pos.ticket} hit +${curSym}${beProfitThreshold.toFixed(0)} profit! SL moved to ${curSym}${updatedPos.sl.toFixed(2)} (Trade Risk-Free).`,
      };
      stateCopy.auto_bot = {
        ...stateCopy.auto_bot,
        logs: [beLog, ...stateCopy.auto_bot.logs].slice(0, 50),
      };
    }

    updatedPositions.push(updatedPos);
  }

  stateCopy.open_positions = updatedPositions;

  // Execute queued auto-closures
  for (const item of positionsToClose) {
    const res = closeDemoPosition(stateCopy, item.ticket, quote, item.reason);
    if (res.success) {
      stateCopy = res.state;
    }
  }

  // Recalculate totals
  let totalProfit = 0;
  let totalMargin = 0;
  for (const p of stateCopy.open_positions) {
    totalProfit += p.profit;
    totalMargin += calculateRequiredMargin(p.symbol, p.volume, p.price_current, stateCopy.leverage);
  }

  totalProfit = Math.round(totalProfit * 100) / 100;
  totalMargin = Math.round(totalMargin * 100) / 100;
  const totalEquity = Math.round((stateCopy.balance + totalProfit) * 100) / 100;
  const totalMarginFree = Math.round((totalEquity - totalMargin) * 100) / 100;

  const finalState: DemoAccountState = {
    ...stateCopy,
    equity: totalEquity,
    margin: totalMargin,
    margin_free: totalMarginFree,
    open_profit: totalProfit,
  };

  saveDemoAccount(finalState);
  return finalState;
}

/**
 * Autonomous 4H PO3 Auto-Bot Engine
 * Scans active 4H Breakout/Retest, AMD, FVG, Order Block, and Silver Bullet setups and auto-executes if enabled
 */
/**
 * Autonomous Pivot-Anchored Volume Profile (PAVP) & Institutional Trading Engine
 * Executes trades strictly on Volume Profile key levels:
 * - BUY CE @ VAL: Price sweeps/tests VAL and bounces -> Buys ATM Call (CE)
 * - BUY PE @ VAH: Price sweeps/tests VAH and rejects -> Buys ATM Put (PE)
 * - BUY CE @ POC: Retest bounce off POC -> Buys ATM Call (CE)
 * - BUY PE @ POC: Retest rejection off POC -> Buys ATM Put (PE)
 */
export function evaluateAutoBot(
  state: DemoAccountState,
  quote: Quote,
  alerts: InstitutionalAlert[],
  allQuotes?: Record<AssetSymbol, Quote>,
  candles?: Candle[],
  pavpSignals?: PAVPSignal[]
): DemoAccountState {
  if (!state.auto_bot || !state.auto_bot.enabled) {
    return state;
  }

  // Limit max concurrent open positions to 2 to protect account capital
  const openPositions = Array.isArray(state.open_positions) ? state.open_positions : [];
  if (openPositions.length >= 2) {
    return state;
  }

  const isIndianOrMCX =
    quote.symbol === "NIFTY" ||
    quote.symbol === "BANKNIFTY" ||
    quote.symbol === "CRUDEOIL" ||
    quote.symbol === "NATURALGAS" ||
    quote.symbol === "SENSEX" ||
    quote.symbol === "FINNIFTY";

  // 1. Check for Strict Volume Profile (PAVP) Entry
  let activeSignals = pavpSignals;
  let pavpRes: PivotAnchoredVPResult | null = null;
  if (!activeSignals && candles && candles.length >= 15) {
    const liveCandles = [...candles];
    const lastBar = { ...liveCandles[liveCandles.length - 1] };
    lastBar.close = quote.bid;
    if (quote.bid > lastBar.high) lastBar.high = quote.bid;
    if (quote.bid < lastBar.low) lastBar.low = quote.bid;
    liveCandles[liveCandles.length - 1] = lastBar;

    pavpRes = calculatePivotAnchoredVolumeProfile(liveCandles, 15, 28, 0.68, quote.pipPrecision || 2);
    activeSignals = detectPAVPSignals(liveCandles, pavpRes, quote.symbol, quote.pipPrecision || 2).signals;
  }

  // Live real-time proximity check if no recent historical signal found
  if ((!activeSignals || activeSignals.length === 0) && pavpRes && pavpRes.poc > 0 && candles && candles.length >= 15) {
    const { val, vah, poc } = pavpRes;
    const vaRange = Math.abs(vah - val);
    const buffer = Math.max(0.15, vaRange * 0.05);
    const precision = quote.pipPrecision || 2;
    const lastCandle = candles[candles.length - 1];

    if (Math.abs(quote.bid - val) <= buffer * 1.5) {
      activeSignals = [{
        type: "BUY_CE_VAL",
        label: `BUY CE @ VAL ${quote.bid.toFixed(precision)}`,
        action: "BUY CE",
        levelPrice: val,
        candleIndex: candles.length - 1,
        time: lastCandle.time,
        sl: +(val - buffer * 1.5).toFixed(precision),
        tp1: +poc.toFixed(precision),
        tp2: +vah.toFixed(precision),
        rationale: `Live sweep/rebound at Value Area Low (VAL: ${val.toFixed(precision)}). Target POC magnet (${poc.toFixed(precision)}).`,
      }];
    } else if (Math.abs(quote.bid - vah) <= buffer * 1.5) {
      activeSignals = [{
        type: "BUY_PE_VAH",
        label: `BUY PE @ VAH ${quote.bid.toFixed(precision)}`,
        action: "BUY PE",
        levelPrice: vah,
        candleIndex: candles.length - 1,
        time: lastCandle.time,
        sl: +(vah + buffer * 1.5).toFixed(precision),
        tp1: +poc.toFixed(precision),
        tp2: +val.toFixed(precision),
        rationale: `Live test/rejection at Value Area High (VAH: ${vah.toFixed(precision)}). Target POC magnet (${poc.toFixed(precision)}).`,
      }];
    } else if (Math.abs(quote.bid - poc) <= buffer * 0.8) {
      const isAbove = quote.bid >= poc;
      activeSignals = [{
        type: isAbove ? "BUY_CE_POC" : "BUY_PE_POC",
        label: isAbove ? `BUY CE @ POC ${quote.bid.toFixed(precision)}` : `BUY PE @ POC ${quote.bid.toFixed(precision)}`,
        action: isAbove ? "BUY CE" : "BUY PE",
        levelPrice: poc,
        candleIndex: candles.length - 1,
        time: lastCandle.time,
        sl: +(isAbove ? poc - buffer * 1.2 : poc + buffer * 1.2).toFixed(precision),
        tp1: +(isAbove ? vah : val).toFixed(precision),
        tp2: +(isAbove ? vah + buffer : val - buffer).toFixed(precision),
        rationale: `Point of Control (${poc.toFixed(precision)}) active retest. Target ${isAbove ? "VAH" : "VAL"}.`,
      }];
    }
  }

  if (activeSignals && activeSignals.length > 0) {
    const latestSignal = activeSignals[activeSignals.length - 1];
    const alreadyOpenOnSymbol = openPositions.some((p) => p.symbol === quote.symbol);

    const recentlyTradedSymbol = openPositions.some(
      (p) => p.symbol === quote.symbol && typeof p.time === "number" && Date.now() - p.time < 60000
    );

    const isRecent = !candles || (latestSignal.candleIndex >= candles.length - 12);
    const isStillValid = latestSignal.action === "BUY CE"
      ? quote.bid <= latestSignal.tp1 && quote.bid >= latestSignal.sl
      : quote.bid >= latestSignal.tp1 && quote.bid <= latestSignal.sl;

    if (!alreadyOpenOnSymbol && !recentlyTradedSymbol && latestSignal && isRecent && isStillValid) {
      const optContract = getRecommendedOptionContract(quote.symbol, latestSignal.action, quote.bid);
      const optSpec = getOptionSpec(quote.symbol);
      const currencySym = quote.currency || state.currency || "₹";

      const botLog: AutoBotLog = {
        id: `bot-pavp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: Date.now(),
        type: "trade",
        message: `⚡ [PAVP Bot Trigger] ${latestSignal.label} confirmed on ${quote.symbol}! Auto-executing 1 Lot (${optSpec.lotSize} Qty) ${quote.symbol} ${optContract.strike} ${optContract.type} @ ${currencySym}${optContract.premiumAsk.toFixed(2)}. SL: ${currencySym}${latestSignal.sl}, TP1 (POC): ${currencySym}${latestSignal.tp1}.`,
      };

      const currentLogs = Array.isArray(state.auto_bot?.logs) ? state.auto_bot.logs : [];
      const stateWithLog: DemoAccountState = {
        ...state,
        auto_bot: {
          ...state.auto_bot,
          logs: [botLog, ...currentLogs].slice(0, 50),
        },
      };

      const tradeRes = executeDemoTrade(stateWithLog, {
        symbol: quote.symbol,
        type: latestSignal.action === "BUY CE" ? "BUY" : "SELL",
        volume: 1.0, // 1 lot standard
        quote,
        sl: latestSignal.sl,
        tp: latestSignal.tp1,
        comment: latestSignal.label,
        optionContractName: `${quote.symbol} ${optContract.strike} ${optContract.type}`,
        optionType: optContract.type,
        optionStrike: optContract.strike,
        optionEntryPremium: optContract.premiumAsk,
        lotSizeMultiplier: optSpec.lotSize,
        currency: currencySym,
      });

      return tradeRes.state;
    }
  }

  // Return current state if no new PAVP Volume Profile signal triggered
  return state;
}
