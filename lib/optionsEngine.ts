import { AssetSymbol, OptionContract, OptionChainItem, OptionType } from "./types";

export interface SymbolOptionSpec {
  lotSize: number;
  strikeStep: number;
  defaultIV: number;
  currency: "₹";
}

export const SYMBOL_OPTION_SPECS: Record<string, SymbolOptionSpec> = {
  NIFTY: { lotSize: 65, strikeStep: 50, defaultIV: 13.2, currency: "₹" },
  BANKNIFTY: { lotSize: 15, strikeStep: 100, defaultIV: 15.8, currency: "₹" },
  FINNIFTY: { lotSize: 65, strikeStep: 50, defaultIV: 14.0, currency: "₹" },
  SENSEX: { lotSize: 10, strikeStep: 100, defaultIV: 13.0, currency: "₹" },
  CRUDEOIL: { lotSize: 100, strikeStep: 50, defaultIV: 28.5, currency: "₹" },
  NATURALGAS: { lotSize: 1250, strikeStep: 5, defaultIV: 45.0, currency: "₹" },

  // Top 30 High-Volume Volatile NSE F&O Stocks (Official NSE lot sizes & strike steps)
  RELIANCE: { lotSize: 250, strikeStep: 20, defaultIV: 18.5, currency: "₹" },
  HDFCBANK: { lotSize: 550, strikeStep: 10, defaultIV: 17.2, currency: "₹" },
  ICICIBANK: { lotSize: 700, strikeStep: 10, defaultIV: 19.0, currency: "₹" },
  SBIN: { lotSize: 750, strikeStep: 5, defaultIV: 22.4, currency: "₹" },
  TATAMOTORS: { lotSize: 575, strikeStep: 10, defaultIV: 28.6, currency: "₹" },
  TATASTEEL: { lotSize: 5500, strikeStep: 1, defaultIV: 27.5, currency: "₹" },
  INFY: { lotSize: 400, strikeStep: 20, defaultIV: 21.0, currency: "₹" },
  TCS: { lotSize: 175, strikeStep: 50, defaultIV: 18.2, currency: "₹" },
  BAJFINANCE: { lotSize: 125, strikeStep: 50, defaultIV: 26.5, currency: "₹" },
  MARUTI: { lotSize: 50, strikeStep: 100, defaultIV: 22.0, currency: "₹" },
  LT: { lotSize: 150, strikeStep: 20, defaultIV: 20.5, currency: "₹" },
  AXISBANK: { lotSize: 625, strikeStep: 10, defaultIV: 22.8, currency: "₹" },
  KOTAKBANK: { lotSize: 400, strikeStep: 20, defaultIV: 19.5, currency: "₹" },
  BHARTIARTL: { lotSize: 475, strikeStep: 10, defaultIV: 19.8, currency: "₹" },
  ADANIENT: { lotSize: 300, strikeStep: 20, defaultIV: 38.5, currency: "₹" },
  ADANIPORTS: { lotSize: 400, strikeStep: 10, defaultIV: 32.0, currency: "₹" },
  HINDUNILVR: { lotSize: 300, strikeStep: 20, defaultIV: 16.5, currency: "₹" },
  ITC: { lotSize: 1600, strikeStep: 5, defaultIV: 17.8, currency: "₹" },
  SUNPHARMA: { lotSize: 350, strikeStep: 10, defaultIV: 20.0, currency: "₹" },
  TITAN: { lotSize: 175, strikeStep: 20, defaultIV: 23.5, currency: "₹" },
  JSWSTEEL: { lotSize: 675, strikeStep: 10, defaultIV: 26.0, currency: "₹" },
  COALINDIA: { lotSize: 2100, strikeStep: 5, defaultIV: 24.2, currency: "₹" },
  NTPC: { lotSize: 1500, strikeStep: 2.5, defaultIV: 23.0, currency: "₹" },
  POWERGRID: { lotSize: 1800, strikeStep: 2.5, defaultIV: 21.5, currency: "₹" },
  BPCL: { lotSize: 1800, strikeStep: 2.5, defaultIV: 29.0, currency: "₹" },
  ONGC: { lotSize: 2250, strikeStep: 2.5, defaultIV: 28.5, currency: "₹" },
  VEDL: { lotSize: 1550, strikeStep: 5, defaultIV: 36.0, currency: "₹" },
  BHEL: { lotSize: 2625, strikeStep: 2.5, defaultIV: 39.5, currency: "₹" },
  DLF: { lotSize: 825, strikeStep: 10, defaultIV: 31.0, currency: "₹" },
  BEL: { lotSize: 2850, strikeStep: 2.5, defaultIV: 33.0, currency: "₹" },
};

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Computes authentic upcoming expiry date for Indian Equity & Commodity derivatives.
 * Formats as "DD-MMM" (e.g. "24-SEP" or "19-OCT")
 */
export function getUpcomingOptionExpiry(symbol: AssetSymbol | string): string {
  const now = new Date();
  const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const currentDay = istDate.getDay(); // 0 = Sun ... 4 = Thu ... 6 = Sat

  if (symbol === "CRUDEOIL") {
    const expDate = new Date(istDate);
    if (istDate.getDate() > 19) {
      expDate.setMonth(expDate.getMonth() + 1);
    }
    expDate.setDate(19);
    return `19-${MONTH_NAMES[expDate.getMonth()]}`;
  }

  if (symbol === "NATURALGAS") {
    const expDate = new Date(istDate);
    if (istDate.getDate() > 26) {
      expDate.setMonth(expDate.getMonth() + 1);
    }
    expDate.setDate(26);
    return `26-${MONTH_NAMES[expDate.getMonth()]}`;
  }

  const isStock = !(
    symbol === "NIFTY" ||
    symbol === "BANKNIFTY" ||
    symbol === "FINNIFTY" ||
    symbol === "SENSEX"
  );

  // Indian Stock Options expire on the last Thursday of the month
  if (isStock) {
    const year = istDate.getFullYear();
    let month = istDate.getMonth();
    
    // Find last Thursday of current month
    const findLastThursday = (y: number, m: number) => {
      const lastDay = new Date(y, m + 1, 0); // last day of month
      const dow = lastDay.getDay();
      const diff = (dow >= 4 ? dow - 4 : dow + 3);
      return new Date(y, m, lastDay.getDate() - diff);
    };

    let expDate = findLastThursday(year, month);
    if (istDate.getTime() > expDate.getTime() + 15.5 * 3600 * 1000) {
      // already passed, take next month
      month += 1;
      expDate = findLastThursday(year, month);
    }

    const dd = String(expDate.getDate()).padStart(2, "0");
    const mmm = MONTH_NAMES[expDate.getMonth() % 12];
    return `${dd}-${mmm}`;
  }

  // NSE Indices:
  // NIFTY: Thursday (4)
  // BANKNIFTY: Wednesday (3)
  // FINNIFTY: Tuesday (2)
  // SENSEX: Friday (5)
  let targetDow = 4;
  if (symbol === "BANKNIFTY") targetDow = 3;
  else if (symbol === "FINNIFTY") targetDow = 2;
  else if (symbol === "SENSEX") targetDow = 5;

  let daysAhead = (targetDow - currentDay + 7) % 7;
  if (daysAhead === 0 && (istDate.getHours() > 15 || (istDate.getHours() === 15 && istDate.getMinutes() >= 30))) {
    daysAhead = 7;
  }

  const expDate = new Date(istDate);
  expDate.setDate(istDate.getDate() + daysAhead);

  const dd = String(expDate.getDate()).padStart(2, "0");
  const mmm = MONTH_NAMES[expDate.getMonth()];
  return `${dd}-${mmm}`;
}

export function getOptionSpec(symbol: AssetSymbol | string): SymbolOptionSpec {
  return SYMBOL_OPTION_SPECS[symbol] || { lotSize: 65, strikeStep: 50, defaultIV: 15.0, currency: "₹" };
}

export function calculateATMStrike(spotPrice: number, strikeStep: number): number {
  if (strikeStep <= 0) return Math.round(spotPrice);
  return +(Math.round(spotPrice / strikeStep) * strikeStep).toFixed(2);
}

export function estimateOptionPremium(
  spot: number,
  strike: number,
  type: OptionType,
  symbol: AssetSymbol | string,
  daysToExpiry = 3.5
): { premium: number; delta: number; gamma: number; theta: number; vega: number; iv: number } {
  const spec = getOptionSpec(symbol);
  const iv = spec.defaultIV / 100;
  const t = Math.max(0.1, daysToExpiry) / 365;

  const volPeriod = iv * Math.sqrt(t);
  const moneyness = Math.log(spot / strike);
  const d1 = (moneyness + 0.5 * iv * iv * t) / volPeriod;
  const d2 = d1 - volPeriod;

  const cdf = (x: number) => {
    const b1 = 0.31938153;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const c = 0.39894228;
    if (x >= 0.0) {
      const k = 1.0 / (1.0 + p * x);
      return 1.0 - c * Math.exp(-x * x / 2.0) * k * (k * (k * (k * (k * b5 + b4) + b3) + b2) + b1);
    } else {
      const k = 1.0 / (1.0 - p * x);
      return c * Math.exp(-x * x / 2.0) * k * (k * (k * (k * (k * b5 + b4) + b3) + b2) + b1);
    }
  };

  const pdf = (x: number) => {
    return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  };

  const nd1 = cdf(d1);
  const nd2 = cdf(d2);
  const pd1 = pdf(d1);

  let theoretical = 0;
  let delta = 0.5;

  if (type === "CE") {
    theoretical = spot * nd1 - strike * nd2;
    delta = +nd1.toFixed(2);
  } else {
    theoretical = strike * (1 - nd2) - spot * (1 - nd1);
    delta = -(1 - nd1);
    delta = +delta.toFixed(2);
  }

  const gamma = +(pd1 / (spot * volPeriod)).toFixed(4);
  const vega = +((spot * pd1 * Math.sqrt(t)) / 100).toFixed(2);

  const minPremium = spec.strikeStep * 0.05;
  const premium = +Math.max(minPremium, theoretical).toFixed(2);
  const theta = -+(premium * 0.12).toFixed(2);

  return { premium, delta, gamma, theta, vega, iv: spec.defaultIV };
}

export function generateOptionChain(
  symbol: AssetSymbol | string,
  spotPrice: number
): OptionChainItem[] {
  const spec = getOptionSpec(symbol);
  const atmStrike = calculateATMStrike(spotPrice, spec.strikeStep);
  const expiry = getUpcomingOptionExpiry(symbol);
  const chain: OptionChainItem[] = [];

  const halfStrikes = 7;
  for (let i = -halfStrikes; i <= halfStrikes; i++) {
    const strike = +(atmStrike + i * spec.strikeStep).toFixed(2);
    const isATM = strike === atmStrike;

    const callCalc = estimateOptionPremium(spotPrice, strike, "CE", symbol);
    const putCalc = estimateOptionPremium(spotPrice, strike, "PE", symbol);

    // Realistic Open Interest model:
    // Call OI peaks at round strikes above spot (resistance)
    // Put OI peaks at round strikes below spot (support)
    const distFromATM = (strike - atmStrike) / spec.strikeStep;
    const callOIWeight = Math.max(0.15, Math.exp(-Math.pow(distFromATM - 2, 2) / 8));
    const putOIWeight = Math.max(0.15, Math.exp(-Math.pow(distFromATM + 2, 2) / 8));

    const baseOI = symbol === "NIFTY" ? 240000 : symbol === "BANKNIFTY" ? 120000 : 45000;
    const callOI = Math.round(baseOI * callOIWeight * (1 + 0.3 * Math.sin(strike)));
    const putOI = Math.round(baseOI * putOIWeight * (1 + 0.3 * Math.cos(strike)));

    const callOIChange = Math.round((callOI * 0.08) * (distFromATM >= 0 ? 1 : -0.5));
    const putOIChange = Math.round((putOI * 0.08) * (distFromATM <= 0 ? 1 : -0.5));

    const callVolume = Math.round(callOI * 1.8);
    const putVolume = Math.round(putOI * 1.6);

    const callContract: OptionContract = {
      symbol: symbol as AssetSymbol,
      strike,
      type: "CE",
      expiry,
      spotPrice,
      premiumBid: +Math.max(0.5, callCalc.premium - 0.5).toFixed(2),
      premiumAsk: +(callCalc.premium + 0.5).toFixed(2),
      lotSize: spec.lotSize,
      delta: callCalc.delta,
      gamma: callCalc.gamma,
      theta: callCalc.theta,
      vega: callCalc.vega,
      iv: callCalc.iv,
      oi: callOI,
      oiChange: callOIChange,
      volume: callVolume,
    };

    const putContract: OptionContract = {
      symbol: symbol as AssetSymbol,
      strike,
      type: "PE",
      expiry,
      spotPrice,
      premiumBid: +Math.max(0.5, putCalc.premium - 0.5).toFixed(2),
      premiumAsk: +(putCalc.premium + 0.5).toFixed(2),
      lotSize: spec.lotSize,
      delta: putCalc.delta,
      gamma: putCalc.gamma,
      theta: putCalc.theta,
      vega: putCalc.vega,
      iv: putCalc.iv,
      oi: putOI,
      oiChange: putOIChange,
      volume: putVolume,
    };

    chain.push({
      strike,
      call: callContract,
      put: putContract,
      isATM,
    });
  }

  return chain;
}

export function getRecommendedOptionContract(
  symbol: AssetSymbol | string,
  action: "BUY CE" | "BUY PE",
  spotPrice: number
): OptionContract {
  const spec = getOptionSpec(symbol);
  const atmStrike = calculateATMStrike(spotPrice, spec.strikeStep);
  const type: OptionType = action === "BUY CE" ? "CE" : "PE";
  const est = estimateOptionPremium(spotPrice, atmStrike, type, symbol);
  const expiry = getUpcomingOptionExpiry(symbol);

  return {
    symbol: symbol as AssetSymbol,
    strike: atmStrike,
    type,
    expiry,
    spotPrice,
    premiumBid: +Math.max(0.5, est.premium - 0.4).toFixed(2),
    premiumAsk: +(est.premium + 0.4).toFixed(2),
    lotSize: spec.lotSize,
    delta: est.delta,
    gamma: est.gamma,
    theta: est.theta,
    vega: est.vega,
    iv: est.iv,
  };
}

/**
 * Calculates OptionAlgo Data Intelligence metrics:
 * Gamma Walls, Max Pain, PCR, Gamma Flip, Expected Move Cone, and Central Pivot Range.
 */
export function calculateOptionIntelligence(
  symbol: AssetSymbol | string,
  spotPrice: number,
  chain?: OptionChainItem[],
  high24h?: number,
  low24h?: number,
  close24h?: number
): import("./types").OptionsIntelligenceData {
  const optionChain = chain && chain.length > 0 ? chain : generateOptionChain(symbol, spotPrice);
  const spec = getOptionSpec(symbol);

  let maxCallOI = -1;
  let callWall = spotPrice;
  let maxPutOI = -1;
  let putWall = spotPrice;
  let totalCallOI = 0;
  let totalPutOI = 0;

  for (const item of optionChain) {
    const cOI = item.call.oi || 0;
    const pOI = item.put.oi || 0;
    totalCallOI += cOI;
    totalPutOI += pOI;

    if (cOI > maxCallOI) {
      maxCallOI = cOI;
      callWall = item.strike;
    }
    if (pOI > maxPutOI) {
      maxPutOI = pOI;
      putWall = item.strike;
    }
  }

  // Max Pain calculation:
  // For each strike, sum total value if expiry settles at that strike
  let minTotalPayout = Infinity;
  let maxPain = spotPrice;

  for (const expStrike of optionChain) {
    let currentPayout = 0;
    for (const item of optionChain) {
      // Call buyers payout
      if (expStrike.strike > item.strike) {
        currentPayout += (expStrike.strike - item.strike) * (item.call.oi || 0);
      }
      // Put buyers payout
      if (expStrike.strike < item.strike) {
        currentPayout += (item.strike - expStrike.strike) * (item.put.oi || 0);
      }
    }
    if (currentPayout < minTotalPayout) {
      minTotalPayout = currentPayout;
      maxPain = expStrike.strike;
    }
  }

  const pcr = totalCallOI > 0 ? +(totalPutOI / totalCallOI).toFixed(2) : 1.0;
  const atmIV = spec.defaultIV;

  // Expected Move = Spot * IV * sqrt(daysToExpiry / 365)
  const daysToExpiry = 3.5;
  const expectedMove = +(spotPrice * (atmIV / 100) * Math.sqrt(daysToExpiry / 365)).toFixed(1);
  const expectedMoveUpper = +(spotPrice + expectedMove).toFixed(1);
  const expectedMoveLower = +(spotPrice - expectedMove).toFixed(1);

  // Gamma Flip: Level where net gamma transitions from positive to negative (usually near ATM or between walls)
  const gammaFlip = calculateATMStrike(spotPrice, spec.strikeStep);

  // Central Pivot Range (CPR):
  const high = high24h || spotPrice * 1.008;
  const low = low24h || spotPrice * 0.992;
  const close = close24h || spotPrice;

  const pivot = +((high + low + close) / 3).toFixed(2);
  const bc = +((high + low) / 2).toFixed(2);
  const tc = +(pivot - bc + pivot).toFixed(2);

  return {
    callWall,
    putWall,
    maxPain,
    gammaFlip,
    pcr,
    totalCallOI,
    totalPutOI,
    expectedMove,
    expectedMoveUpper,
    expectedMoveLower,
    atmIV,
    cpr: {
      pivot,
      tc,
      bc,
    },
  };
}
