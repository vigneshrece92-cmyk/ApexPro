import { AssetSymbol, Quote, InstitutionalAlert } from "./types";
import { INITIAL_QUOTES } from "./defaultData";

export interface DemoPosition {
  ticket: number;
  symbol: AssetSymbol;
  type: "BUY" | "SELL";
  volume: number; // lot size, e.g. 0.02
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  profit: number; // floating P&L
  comment: string;
  time: number; // unix timestamp in ms
  be_triggered?: boolean;
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
  auto_bot: {
    enabled: boolean;
    risk_percent: number; // 0.5, 1.0, 1.5
    market_mode: "STRICT_REAL" | "24_7_PRACTICE";
    logs: AutoBotLog[];
  };
}

const STORAGE_KEY = "apexfx_demo_broker_v2";

export const INITIAL_DEMO_BALANCE = 3000.0;
export const DEFAULT_LEVERAGE = 1000;

/**
 * Checks whether the interbank Forex & Spot Gold market is currently open.
 * Global Forex market closes Friday 5:00 PM NY EST (21:00 UTC) and reopens Sunday 5:00 PM NY EST (21:00 UTC).
 */
export function isForexMarketOpen(now = new Date()): {
  isOpen: boolean;
  statusText: string;
} {
  const day = now.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // Friday after 21:00 UTC
  if (day === 5 && hour >= 21) {
    const hoursLeft = (24 - hour - 1) + 24 + 21;
    const minsLeft = 60 - minute;
    return {
      isOpen: false,
      statusText: `Weekend Closed (Opens in ${hoursLeft}h ${minsLeft}m at Sun 5:00 PM EST)`,
    };
  }

  // Saturday (all day)
  if (day === 6) {
    const hoursLeft = (24 - hour - 1) + 21;
    const minsLeft = 60 - minute;
    return {
      isOpen: false,
      statusText: `Weekend Closed (Opens in ${hoursLeft}h ${minsLeft}m at Sun 5:00 PM EST)`,
    };
  }

  // Sunday before 21:00 UTC
  if (day === 0 && hour < 21) {
    const hoursLeft = 21 - hour - 1;
    const minsLeft = 60 - minute;
    return {
      isOpen: false,
      statusText: `Weekend Closed (Opens in ${hoursLeft}h ${minsLeft}m at Sun 5:00 PM EST)`,
    };
  }

  return {
    isOpen: true,
    statusText: "Market Open (Live Interbank Session)",
  };
}

export const INITIAL_ACCOUNT_STATE: DemoAccountState = {
  balance: INITIAL_DEMO_BALANCE,
  equity: INITIAL_DEMO_BALANCE,
  margin: 0,
  margin_free: INITIAL_DEMO_BALANCE,
  leverage: DEFAULT_LEVERAGE,
  open_profit: 0,
  open_positions: [],
  history: [],
  auto_bot: {
    enabled: true,
    risk_percent: 1.0,
    market_mode: "24_7_PRACTICE",
    logs: [
      {
        id: "init-1",
        timestamp: Date.now() - 300000,
        type: "info",
        message: "ApexFX Virtual Broker Engine initialized with $3,000.00 demo balance (1:1000 Leverage • 0.02 Lots Standard • 100% Vercel Ready).",
      },
      {
        id: "init-2",
        timestamp: Date.now() - 180000,
        type: "info",
        message: "Autonomous 4H PO3 Auto-Bot active & scanning confirmed institutional setups (24/7 Practice Mode).",
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
            symbol: (p.symbol as AssetSymbol) || "XAUUSD",
            type: p.type === "SELL" ? "SELL" : "BUY",
            volume: typeof p.volume === "number" && !isNaN(p.volume) ? p.volume : 0.02,
            price_open: typeof p.price_open === "number" && !isNaN(p.price_open) ? p.price_open : 4363.80,
            sl: typeof p.sl === "number" && !isNaN(p.sl) ? p.sl : 4350.0,
            tp: typeof p.tp === "number" && !isNaN(p.tp) ? p.tp : 4385.0,
            price_current: typeof p.price_current === "number" && !isNaN(p.price_current) ? p.price_current : (p.price_open || 4363.80),
            profit: typeof p.profit === "number" && !isNaN(p.profit) ? p.profit : 0,
            comment: typeof p.comment === "string" ? p.comment : "ApexFX 4H PO3",
            time: typeof p.time === "number" ? p.time : Date.now(),
            be_triggered: !!p.be_triggered,
          }))
      : [];

    const safeHistory: ClosedTrade[] = Array.isArray(parsed.history)
      ? parsed.history
          .filter((h: any) => h && typeof h === "object")
          .map((h: any) => ({
            ticket: typeof h.ticket === "number" ? h.ticket : Math.floor(1000000 + Math.random() * 9000000),
            symbol: (h.symbol as AssetSymbol) || "XAUUSD",
            type: h.type === "SELL" ? "SELL" : "BUY",
            volume: typeof h.volume === "number" && !isNaN(h.volume) ? h.volume : 0.02,
            price_open: typeof h.price_open === "number" && !isNaN(h.price_open) ? h.price_open : 4363.80,
            price_close: typeof h.price_close === "number" && !isNaN(h.price_close) ? h.price_close : 4365.0,
            sl: typeof h.sl === "number" && !isNaN(h.sl) ? h.sl : 4360.0,
            tp: typeof h.tp === "number" && !isNaN(h.tp) ? h.tp : 4400.0,
            profit: typeof h.profit === "number" && !isNaN(h.profit) ? h.profit : 0,
            return_percent: typeof h.return_percent === "number" && !isNaN(h.return_percent) ? h.return_percent : 0,
            open_time: typeof h.open_time === "number" ? h.open_time : Date.now() - 60000,
            close_time: typeof h.close_time === "number" ? h.close_time : Date.now(),
            close_reason: typeof h.close_reason === "string" ? h.close_reason : "Manual Exit",
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
 * Reset account back to pristine $3,000
 */
export function resetDemoAccount(): DemoAccountState {
  const resetState: DemoAccountState = {
    ...INITIAL_ACCOUNT_STATE,
    auto_bot: {
      enabled: true,
      risk_percent: 1.0,
      market_mode: "24_7_PRACTICE",
      logs: [
        {
          id: `rst-${Date.now()}`,
          timestamp: Date.now(),
          type: "info",
          message: "Account reset to initial $3,000.00 demo balance. 4H PO3 Auto-Bot active & scanning.",
        },
      ],
    },
  };
  saveDemoAccount(resetState);
  return resetState;
}

/**
 * Contract size multipliers:
 * XAUUSD: 100 oz per 1.00 lot ($1.00 move on 0.01 lot = $1.00 P&L)
 * XAGUSD: 5000 oz per 1.00 lot
 * Forex pairs: 100,000 units per lot
 */
function getContractSize(symbol: AssetSymbol): number {
  if (symbol === "XAUUSD") return 100;
  if (symbol === "XAGUSD") return 5000;
  return 100000;
}

/**
 * Calculate floating P&L for a position
 */
export function calculatePositionProfit(
  pos: DemoPosition,
  quote: { bid: number; ask: number }
): number {
  const contract = getContractSize(pos.symbol);
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
function calculateRequiredMargin(symbol: AssetSymbol, volume: number, price: number, leverage: number): number {
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
        message: `Execution blocked: Forex & Spot Gold markets are closed for the weekend (${marketCheck.statusText}). Switch to "24/7 Practice Mode" to execute simulated trades.`,
      };
    }
  }

  // Enforce safe lot bounds for $3,000 account
  const safeVolume = Math.max(0.01, Math.min(0.05, Math.round((volume || 0.02) * 100) / 100));
  const openPrice = type === "BUY" ? (quote.ask || quote.bid || 4363.80) : (quote.bid || quote.ask || 4363.80);
  const safeSL = typeof sl === "number" && !isNaN(sl) ? Math.round(sl * 100) / 100 : (type === "BUY" ? openPrice - 15.0 : openPrice + 15.0);
  const safeTP = typeof tp === "number" && !isNaN(tp) ? Math.round(tp * 100) / 100 : (type === "BUY" ? openPrice + 30.0 : openPrice - 30.0);

  const requiredMargin = calculateRequiredMargin(symbol, safeVolume, openPrice, state.leverage || 1000);
  const marginFree = typeof state.margin_free === "number" && !isNaN(state.margin_free) ? state.margin_free : INITIAL_DEMO_BALANCE;
  if (marginFree < requiredMargin) {
    return {
      success: false,
      state,
      message: `Insufficient free margin. Required: $${requiredMargin.toFixed(2)}, Available: $${marginFree.toFixed(2)}`,
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
    comment: comment || "ApexFX 4H PO3",
    time: Date.now(),
    be_triggered: false,
  };

  const nextPositions = [newPosition, ...(state.open_positions || [])];
  const currentMargin = typeof state.margin === "number" && !isNaN(state.margin) ? state.margin : 0;
  const currentEquity = typeof state.equity === "number" && !isNaN(state.equity) ? state.equity : INITIAL_DEMO_BALANCE;
  const newMargin = Math.round((currentMargin + requiredMargin) * 100) / 100;
  const newMarginFree = Math.round((currentEquity - newMargin) * 100) / 100;

  const logMessage: AutoBotLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: Date.now(),
    type: "trade",
    message: `[Order #${newTicket}] ${type} ${safeVolume} ${symbol} @ $${openPrice.toFixed(2)} executed. SL: $${safeSL.toFixed(2)}, TP: $${safeTP.toFixed(2)}.`,
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
    message: `Order #${newTicket} executed: ${type} ${safeVolume} ${symbol} at $${openPrice.toFixed(2)}`,
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
  const returnPercent = Math.round((profit / (pos.volume * getContractSize(pos.symbol) * pos.price_open)) * 10000) / 100;

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
  };

  const nextPositions = state.open_positions.filter((p) => p.ticket !== ticket);
  const nextHistory = [closedRecord, ...state.history].slice(0, 100);

  // Recalculate account totals
  const nextBalance = Math.round((state.balance + profit) * 100) / 100;
  
  // Recalculate remaining margin
  let totalMargin = 0;
  for (const p of nextPositions) {
    totalMargin += calculateRequiredMargin(p.symbol, p.volume, p.price_current, state.leverage);
  }
  totalMargin = Math.round(totalMargin * 100) / 100;

  let totalFloatingProfit = 0;
  for (const p of nextPositions) {
    totalFloatingProfit += p.profit;
  }
  totalFloatingProfit = Math.round(totalFloatingProfit * 100) / 100;

  const nextEquity = Math.round((nextBalance + totalFloatingProfit) * 100) / 100;
  const nextMarginFree = Math.round((nextEquity - totalMargin) * 100) / 100;

  const logMessage: AutoBotLog = {
    id: `log-close-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type: profit >= 0 ? "success" : "warning",
    message: `[Closed #${pos.ticket}] ${pos.type} ${pos.volume} ${pos.symbol} closed @ $${closePrice.toFixed(2)}. P&L: ${profit >= 0 ? "+" : ""}$${profit.toFixed(2)} (${reason}).`,
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
    message: `Position #${ticket} closed. Realized P&L: ${profit >= 0 ? "+" : ""}$${profit.toFixed(2)}`,
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
  // Entry price with small 0.20 point buffer
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
    message: `[Break-Even #${ticket}] Stop Loss moved to $${updatedPos.sl.toFixed(2)} (Entry Defense). Trade is now 100% risk-free.`,
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

    // 3. Auto Break-Even Check: If in profit by >= +$15.00 and BE not yet triggered
    let updatedPos = { ...pos, price_current: currentPrice, profit };
    if (!pos.be_triggered && profit >= 15.0) {
      const newSL = pos.type === "BUY" ? pos.price_open + 0.2 : pos.price_open - 0.2;
      updatedPos.sl = Math.round(newSL * 100) / 100;
      updatedPos.be_triggered = true;

      const beLog: AutoBotLog = {
        id: `auto-be-${Date.now()}-${pos.ticket}`,
        timestamp: Date.now(),
        type: "success",
        message: `🛡️ [Auto Break-Even] Position #${pos.ticket} hit +$15.00 profit! SL moved to $${updatedPos.sl.toFixed(2)} (Trade Risk-Free).`,
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
export function evaluateAutoBot(
  state: DemoAccountState,
  quote: Quote,
  alerts: InstitutionalAlert[],
  allQuotes?: Record<AssetSymbol, Quote>
): DemoAccountState {
  if (!state.auto_bot || !state.auto_bot.enabled) {
    return state;
  }

  // Strictly enforce Real Market Hours if configured
  if (state.auto_bot.market_mode === "STRICT_REAL") {
    const marketCheck = isForexMarketOpen();
    if (!marketCheck.isOpen) {
      return state; // Market closed for the weekend; Auto-Bot stands by
    }
  }

  // Limit max concurrent open positions to 2 to strictly protect the $3,000 account
  const openPositions = Array.isArray(state.open_positions) ? state.open_positions : [];
  if (openPositions.length >= 2) {
    return state;
  }

  if (!Array.isArray(alerts) || alerts.length === 0) {
    return state;
  }

  // Find confirmed alerts (4H Breakout, AMD Judas, FVG, Order Block, Silver Bullet)
  // Loop through all confirmed alerts to find one not already traded or on active symbol
  let targetAlert: InstitutionalAlert | null = null;
  let targetQuote: Quote | null = null;

  for (const a of alerts) {
    if (!a || !a.symbol) continue;
    const isAMD = a.patternType === "AMD_ACCUMULATION_DISTRIBUTION" && typeof a.amdPhase === "string" && a.amdPhase.includes("Distribution");
    const is4HBreakout = a.patternType === "4H_BREAKOUT_RETEST" && a.status === "CONFIRMED";
    const isFVG = a.patternType === "FVG_MITIGATION" && a.status === "CONFIRMED";
    const isOB = (a.patternType as string) === "ORDER_BLOCK_MITIGATION" && a.status === "CONFIRMED";
    const isSB = a.patternType === "ICT_SILVER_BULLET" && a.status === "CONFIRMED";
    if (!isAMD && !is4HBreakout && !isFVG && !isOB && !isSB) continue;

    // Check if symbol already has an active open position
    const alreadyOpenOnSymbol = openPositions.some((p) => p.symbol === a.symbol);
    if (alreadyOpenOnSymbol) continue;

    // Resolve matching quote for this alert with reliable fallback
    const resolvedQuote = allQuotes?.[a.symbol] || (quote?.symbol === a.symbol ? quote : null) || INITIAL_QUOTES[a.symbol];
    if (!resolvedQuote || typeof resolvedQuote.bid !== "number" || typeof resolvedQuote.ask !== "number") {
      continue;
    }

    // Per-symbol cooldown: don't open trade on same symbol within 60s
    const recentlyTradedSymbol = openPositions.some(
      (p) => p.symbol === a.symbol && typeof p.time === "number" && Date.now() - p.time < 60000
    );
    if (recentlyTradedSymbol) continue;

    targetAlert = a;
    targetQuote = resolvedQuote;
    break;
  }

  if (!targetAlert || !targetQuote) {
    return state;
  }

  const action: "BUY" | "SELL" = (targetAlert.direction || "BUY").includes("BUY") ? "BUY" : "SELL";
  const openPrice = action === "BUY" ? (targetQuote.ask || targetQuote.bid) : (targetQuote.bid || targetQuote.ask);

  const sl =
    typeof targetAlert.stopLoss === "number" && !isNaN(targetAlert.stopLoss)
      ? targetAlert.stopLoss
      : action === "BUY"
      ? openPrice - 15.0
      : openPrice + 15.0;

  const tp =
    typeof targetAlert.takeProfit1 === "number" && !isNaN(targetAlert.takeProfit1)
      ? targetAlert.takeProfit1
      : action === "BUY"
      ? openPrice + 30.0
      : openPrice - 30.0;

  // Standard fixed 0.02 lot sizing across all pairs (1:1000 leverage)
  const safeLot = 0.02;

  const patternLabel =
    targetAlert.patternType === "4H_BREAKOUT_RETEST"
      ? "4H Breakout & Retest"
      : targetAlert.patternType === "FVG_MITIGATION"
      ? "4H Fair Value Gap (FVG) Mitigation"
      : targetAlert.patternType === "AMD_ACCUMULATION_DISTRIBUTION"
      ? "ICT PO3 Judas Distribution Sweep"
      : targetAlert.patternType === "ICT_SILVER_BULLET"
      ? "ICT Silver Bullet Kill Zone Imbalance"
      : "Institutional Order Block Mitigation";

  const botLog: AutoBotLog = {
    id: `bot-scan-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: Date.now(),
    type: "info",
    message: `⚡ [Auto-Bot Trigger] Confirmed ${patternLabel} on ${targetAlert.symbol} detected! Executing standard 0.02 lots (1:1000 leverage).`,
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
    symbol: targetAlert.symbol,
    type: action,
    volume: safeLot,
    quote: targetQuote,
    sl,
    tp,
    comment: `PO3_Bot_${targetAlert.symbol}`,
  });

  return tradeRes.state;
}
