import fs from "fs";
import path from "path";
import os from "os";
import { DemoPosition, ClosedTrade, INITIAL_DEMO_BALANCE } from "./demoTradingEngine";
import { OptionContract } from "./types";

const DEMO_STORE_FILE = path.join(os.tmpdir(), "apex_server_demo.json");

let serverPositions: DemoPosition[] = [];
let serverHistory: ClosedTrade[] = [];
let serverBalance: number = INITIAL_DEMO_BALANCE;
let isLoaded = false;

function loadStore() {
  if (isLoaded) return;
  try {
    if (fs.existsSync(DEMO_STORE_FILE)) {
      const raw = fs.readFileSync(DEMO_STORE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (typeof data.balance === "number") serverBalance = data.balance;
      if (Array.isArray(data.open_positions)) serverPositions = data.open_positions;
      if (Array.isArray(data.history)) serverHistory = data.history;
    }
  } catch (err) {
    // silent fallback
  }
  isLoaded = true;
}

function saveStore() {
  try {
    fs.writeFileSync(
      DEMO_STORE_FILE,
      JSON.stringify({
        balance: serverBalance,
        open_positions: serverPositions,
        history: serverHistory,
      }),
      "utf-8"
    );
  } catch (err) {
    // silent fallback
  }
}

export function getServerDemoAccount(): {
  balance: number;
  open_positions: DemoPosition[];
  history: ClosedTrade[];
} {
  loadStore();
  return {
    balance: serverBalance,
    open_positions: serverPositions,
    history: serverHistory,
  };
}

export function recordServerDemoPosition(
  contract: OptionContract,
  slPrice: number,
  tpPrice: number,
  comment = "PAVP Signal Auto-Trade"
): DemoPosition {
  loadStore();

  // 1. Prevent duplicate open positions for the same symbol
  const existing = serverPositions.find((p) => p.symbol === contract.symbol);
  if (existing) {
    return existing; // Leave existing open trade active, do not duplicate
  }

  const ticket = Math.floor(1000000 + Math.random() * 9000000);
  const newPos: DemoPosition = {
    ticket,
    symbol: contract.symbol,
    type: "BUY",
    volume: 1, // Standard 1 Lot
    price_open: contract.spotPrice,
    price_current: contract.spotPrice,
    sl: slPrice,
    tp: tpPrice,
    profit: 0,
    comment,
    time: Date.now(),
    optionContractName: `${contract.symbol} ${contract.strike} ${contract.type} ${contract.expiry}`,
    optionType: contract.type,
    optionStrike: contract.strike,
    optionEntryPremium: contract.premiumAsk,
    optionCurrentPremium: contract.premiumAsk,
    lotSizeMultiplier: contract.lotSize,
    currency: "₹",
  };

  if (serverPositions.length >= 10) {
    serverPositions.pop();
  }
  serverPositions.unshift(newPos);
  saveStore();
  return newPos;
}

/**
 * Ticks open positions with live underlying spot prices, updates floating P&L,
 * automatically manages Break-Even at +₹500 profit, and triggers TP / SL exits into history.
 */
export function tickServerDemoPosition(symbol: string, currentSpot: number): void {
  loadStore();
  let updated = false;

  serverPositions = serverPositions.filter((pos) => {
    if (pos.symbol !== symbol) return true;

    // Delta model for realistic Indian option premium tracking
    const spotChange = currentSpot - pos.price_open;
    const delta = pos.optionType === "CE" ? 0.5 : -0.5;
    const estimatedPremium = Math.max(0.05, +(pos.optionEntryPremium! + spotChange * delta).toFixed(2));
    pos.optionCurrentPremium = estimatedPremium;
    pos.price_current = currentSpot;

    // Calculate floating P&L
    const premiumDiff = estimatedPremium - pos.optionEntryPremium!;
    pos.profit = +(premiumDiff * (pos.lotSizeMultiplier || 1) * pos.volume).toFixed(2);

    // Auto Break-Even: if profit >= ₹500 and SL is still below entry, move SL to entry + 0.50 buffer
    if (pos.profit >= 500 && pos.sl < pos.optionEntryPremium!) {
      pos.sl = +(pos.optionEntryPremium! + 0.5).toFixed(2);
      pos.comment = `${pos.comment || ""} (SL moved to Break-Even)`;
      updated = true;
    }

    // Check Take Profit target hit
    if (pos.tp && estimatedPremium >= pos.tp) {
      serverBalance += pos.profit;
      const retPct = pos.optionEntryPremium && pos.optionEntryPremium > 0
        ? +(((estimatedPremium - pos.optionEntryPremium) / pos.optionEntryPremium) * 100).toFixed(1)
        : 0;

      serverHistory.unshift({
        ticket: pos.ticket,
        symbol: pos.symbol,
        type: pos.type,
        volume: pos.volume,
        price_open: pos.price_open,
        price_close: currentSpot,
        sl: pos.sl,
        tp: pos.tp,
        profit: pos.profit,
        return_percent: retPct,
        open_time: pos.time,
        close_time: Date.now(),
        close_reason: "Take Profit Hit",
        optionContractName: pos.optionContractName,
        currency: pos.currency,
      });
      if (serverHistory.length > 50) serverHistory.pop();
      updated = true;
      return false; // Closed
    }

    // Check Stop Loss hit
    if (pos.sl && estimatedPremium <= pos.sl) {
      serverBalance += pos.profit;
      const retPct = pos.optionEntryPremium && pos.optionEntryPremium > 0
        ? +(((estimatedPremium - pos.optionEntryPremium) / pos.optionEntryPremium) * 100).toFixed(1)
        : 0;

      serverHistory.unshift({
        ticket: pos.ticket,
        symbol: pos.symbol,
        type: pos.type,
        volume: pos.volume,
        price_open: pos.price_open,
        price_close: currentSpot,
        sl: pos.sl,
        tp: pos.tp,
        profit: pos.profit,
        return_percent: retPct,
        open_time: pos.time,
        close_time: Date.now(),
        close_reason: "Stop Loss Hit",
        optionContractName: pos.optionContractName,
        currency: pos.currency,
      });
      if (serverHistory.length > 50) serverHistory.pop();
      updated = true;
      return false; // Closed
    }

    updated = true;
    return true;
  });

  if (updated) {
    saveStore();
  }
}

export function clearServerDemoPositions(): void {
  serverPositions = [];
  serverHistory = [];
  serverBalance = INITIAL_DEMO_BALANCE;
  saveStore();
}
