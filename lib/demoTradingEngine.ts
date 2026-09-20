import { AssetSymbol, Quote, InstitutionalAlert } from "./types";

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
    enabled: false,
    risk_percent: 1.0,
    market_mode: "STRICT_REAL",
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
        message: "Institutional 4H PO3 & Breakout detector ready. Fixed 0.02 lot size applied across all pairs.",
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
    return {
      ...INITIAL_ACCOUNT_STATE,
      ...parsed,
      leverage: DEFAULT_LEVERAGE, // Enforce 1:1000 leverage
      open_positions: Array.isArray(parsed.open_positions) ? parsed.open_positions : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      auto_bot: {
        ...INITIAL_ACCOUNT_STATE.auto_bot,
        ...(parsed.auto_bot || {}),
        market_mode: parsed.auto_bot?.market_mode || "STRICT_REAL",
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
      enabled: false,
      risk_percent: 1.0,
      market_mode: "STRICT_REAL",
      logs: [
        {
          id: `rst-${Date.now()}`,
          timestamp: Date.now(),
          type: "info",
          message: "Account reset to initial $3,000.00 demo balance. All positions cleared.",
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
  const safeVolume = Math.max(0.01, Math.min(0.05, Math.round(volume * 100) / 100));
  const openPrice = type === "BUY" ? quote.ask : quote.bid;

  const requiredMargin = calculateRequiredMargin(symbol, safeVolume, openPrice, state.leverage);
  if (state.margin_free < requiredMargin) {
    return {
      success: false,
      state,
      message: `Insufficient free margin. Required: $${requiredMargin.toFixed(2)}, Available: $${state.margin_free.toFixed(2)}`,
    };
  }

  const newTicket = Math.floor(1000000 + Math.random() * 9000000);
  const newPosition: DemoPosition = {
    ticket: newTicket,
    symbol,
    type,
    volume: safeVolume,
    price_open: openPrice,
    sl: Math.round(sl * 100) / 100,
    tp: Math.round(tp * 100) / 100,
    price_current: openPrice,
    profit: 0,
    comment: comment || "ApexFX 4H PO3",
    time: Date.now(),
    be_triggered: false,
  };

  const nextPositions = [newPosition, ...state.open_positions];
  const newMargin = Math.round((state.margin + requiredMargin) * 100) / 100;
  const newMarginFree = Math.round((state.equity - newMargin) * 100) / 100;

  const logMessage: AutoBotLog = {
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type: "trade",
    message: `[Order #${newTicket}] ${type} ${safeVolume} ${symbol} @ $${openPrice.toFixed(2)} executed. SL: $${sl.toFixed(2)}, TP: $${tp.toFixed(2)}.`,
  };

  const nextLogs = [logMessage, ...state.auto_bot.logs].slice(0, 50);

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
 * Scans active 4H Breakout/Retest and AMD setups and auto-executes if enabled
 */
export function evaluateAutoBot(
  state: DemoAccountState,
  quote: Quote,
  alerts: InstitutionalAlert[]
): DemoAccountState {
  if (!state.auto_bot.enabled || quote.symbol !== "XAUUSD") {
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
  if (state.open_positions.length >= 2) {
    return state;
  }

  // Find confirmed 4H Breakout, AMD, FVG, Order Block, or Silver Bullet alerts on XAUUSD
  const eligibleAlert = alerts.find((a) => {
    if (a.symbol !== "XAUUSD") return false;
    const isAMD = a.patternType === "AMD_ACCUMULATION_DISTRIBUTION" && a.amdPhase?.includes("Distribution");
    const is4HBreakout = a.patternType === "4H_BREAKOUT_RETEST" && a.status === "CONFIRMED";
    const isFVG = a.patternType === "FVG_MITIGATION" && a.status === "CONFIRMED";
    const isOB = (a.patternType as string) === "ORDER_BLOCK_MITIGATION" && a.status === "CONFIRMED";
    const isSB = a.patternType === "ICT_SILVER_BULLET" && a.status === "CONFIRMED";
    return isAMD || is4HBreakout || isFVG || isOB || isSB;
  });

  if (!eligibleAlert) return state;

  // Check if a position already exists for this alert id or recently opened
  const recentTrade = state.open_positions.some(
    (p) => p.comment.includes(eligibleAlert.id.slice(0, 8)) || Date.now() - p.time < 300000 // 5 minutes cool down
  );
  if (recentTrade) return state;

  const action: "BUY" | "SELL" = eligibleAlert.direction.includes("BUY") ? "BUY" : "SELL";
  const sl = eligibleAlert.stopLoss;
  const tp = eligibleAlert.takeProfit1;
  const slDist = Math.abs((action === "BUY" ? quote.ask : quote.bid) - sl);

  // Standard fixed 0.02 lot sizing across all pairs
  const safeLot = 0.02;

  const patternLabel =
    eligibleAlert.patternType === "4H_BREAKOUT_RETEST"
      ? "4H Breakout & Retest"
      : eligibleAlert.patternType === "FVG_MITIGATION"
      ? "4H Fair Value Gap (FVG) Mitigation"
      : eligibleAlert.patternType === "AMD_ACCUMULATION_DISTRIBUTION"
      ? "ICT PO3 Judas Distribution Sweep"
      : eligibleAlert.patternType === "ICT_SILVER_BULLET"
      ? "ICT Silver Bullet Kill Zone Imbalance"
      : "Institutional Order Block Mitigation";

  const botLog: AutoBotLog = {
    id: `bot-scan-${Date.now()}`,
    timestamp: Date.now(),
    type: "info",
    message: `⚡ [Auto-Bot Trigger] Confirmed ${patternLabel} detected! Executing standard 0.02 lots (1:1000 leverage).`,
  };

  const stateWithLog: DemoAccountState = {
    ...state,
    auto_bot: {
      ...state.auto_bot,
      logs: [botLog, ...state.auto_bot.logs].slice(0, 50),
    },
  };

  const tradeRes = executeDemoTrade(stateWithLog, {
    symbol: "XAUUSD",
    type: action,
    volume: safeLot,
    quote,
    sl,
    tp,
    comment: `PO3_Bot_${eligibleAlert.id.slice(0, 8)}`,
  });

  return tradeRes.state;
}
