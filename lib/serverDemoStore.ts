import { DemoPosition, ClosedTrade, INITIAL_DEMO_BALANCE } from "./demoTradingEngine";
import { OptionContract } from "./types";

let serverPositions: DemoPosition[] = [];
let serverHistory: ClosedTrade[] = [];
let serverBalance: number = INITIAL_DEMO_BALANCE;

export function getServerDemoAccount(): {
  balance: number;
  open_positions: DemoPosition[];
  history: ClosedTrade[];
} {
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
  return newPos;
}

export function clearServerDemoPositions(): void {
  serverPositions = [];
  serverHistory = [];
  serverBalance = INITIAL_DEMO_BALANCE;
}
