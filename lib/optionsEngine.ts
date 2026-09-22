import { AssetSymbol, OptionContract, OptionChainItem, OptionType } from "./types";

export interface SymbolOptionSpec {
  lotSize: number;
  strikeStep: number;
  defaultIV: number;
  currency: "₹" | "$";
}

export const SYMBOL_OPTION_SPECS: Record<string, SymbolOptionSpec> = {
  NIFTY: { lotSize: 25, strikeStep: 50, defaultIV: 13.2, currency: "₹" },
  BANKNIFTY: { lotSize: 15, strikeStep: 100, defaultIV: 15.8, currency: "₹" },
  FINNIFTY: { lotSize: 25, strikeStep: 50, defaultIV: 14.0, currency: "₹" },
  SENSEX: { lotSize: 10, strikeStep: 100, defaultIV: 13.0, currency: "₹" },
  CRUDEOIL: { lotSize: 100, strikeStep: 50, defaultIV: 28.5, currency: "₹" },
  NATURALGAS: { lotSize: 1250, strikeStep: 5, defaultIV: 45.0, currency: "₹" },
  XAUUSD: { lotSize: 100, strikeStep: 10, defaultIV: 18.0, currency: "$" },
  EURUSD: { lotSize: 100000, strikeStep: 0.005, defaultIV: 6.5, currency: "$" },
};

export function getOptionSpec(symbol: AssetSymbol | string): SymbolOptionSpec {
  return SYMBOL_OPTION_SPECS[symbol] || { lotSize: 25, strikeStep: 50, defaultIV: 15.0, currency: "₹" };
}

export function calculateATMStrike(spotPrice: number, strikeStep: number): number {
  if (strikeStep <= 0) return Math.round(spotPrice);
  return Math.round(spotPrice / strikeStep) * strikeStep;
}

export function estimateOptionPremium(
  spot: number,
  strike: number,
  type: OptionType,
  symbol: AssetSymbol | string,
  daysToExpiry = 3.5
): { premium: number; delta: number; theta: number; iv: number } {
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

  const nd1 = cdf(d1);
  const nd2 = cdf(d2);

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

  const minPremium = spec.strikeStep * 0.05;
  const premium = +Math.max(minPremium, theoretical).toFixed(2);
  const theta = -+(premium * 0.12).toFixed(2);

  return { premium, delta, theta, iv: spec.defaultIV };
}

export function generateOptionChain(
  symbol: AssetSymbol | string,
  spotPrice: number
): OptionChainItem[] {
  const spec = getOptionSpec(symbol);
  const atmStrike = calculateATMStrike(spotPrice, spec.strikeStep);
  const chain: OptionChainItem[] = [];

  const halfStrikes = 5;
  for (let i = -halfStrikes; i <= halfStrikes; i++) {
    const strike = +(atmStrike + i * spec.strikeStep).toFixed(2);
    const isATM = strike === atmStrike;

    const callCalc = estimateOptionPremium(spotPrice, strike, "CE", symbol);
    const putCalc = estimateOptionPremium(spotPrice, strike, "PE", symbol);

    const callContract: OptionContract = {
      symbol: symbol as AssetSymbol,
      strike,
      type: "CE",
      expiry: "Weekly Active",
      spotPrice,
      premiumBid: +Math.max(0.5, callCalc.premium - 0.5).toFixed(2),
      premiumAsk: +(callCalc.premium + 0.5).toFixed(2),
      lotSize: spec.lotSize,
      delta: callCalc.delta,
      theta: callCalc.theta,
      iv: callCalc.iv,
    };

    const putContract: OptionContract = {
      symbol: symbol as AssetSymbol,
      strike,
      type: "PE",
      expiry: "Weekly Active",
      spotPrice,
      premiumBid: +Math.max(0.5, putCalc.premium - 0.5).toFixed(2),
      premiumAsk: +(putCalc.premium + 0.5).toFixed(2),
      lotSize: spec.lotSize,
      delta: putCalc.delta,
      theta: putCalc.theta,
      iv: putCalc.iv,
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

  return {
    symbol: symbol as AssetSymbol,
    strike: atmStrike,
    type,
    expiry: "Current Weekly",
    spotPrice,
    premiumBid: +Math.max(0.5, est.premium - 0.4).toFixed(2),
    premiumAsk: +(est.premium + 0.4).toFixed(2),
    lotSize: spec.lotSize,
    delta: est.delta,
    theta: est.theta,
    iv: est.iv,
  };
}
