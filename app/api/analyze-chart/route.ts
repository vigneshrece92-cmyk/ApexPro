import { NextRequest, NextResponse } from "next/server";
import { AIAnalysisResult, Candle, AssetSymbol } from "@/lib/types";
import { generateTradeSignalFromData } from "@/lib/technicals";
import { generateRealisticCandles, INITIAL_QUOTES } from "@/lib/defaultData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, symbol, timeframe, apiKey: clientApiKey } = body;

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // If API key is present and image is provided, call Gemini Vision
    if (apiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        
        const prompt = `You are an elite Indian Options & MCX Commodities technical analyst and Volume Profile (PAVP) specialist.
Analyze this trading chart image in extreme detail. Focus on Indian Index Options (NIFTY 50, BANK NIFTY, SENSEX, FIN NIFTY) and MCX Commodities (CRUDE OIL, NATURAL GAS).
Identify:
1. Asset / Ticker pair and Timeframe (e.g., NIFTY, BANKNIFTY, CRUDEOIL, NATURALGAS, SENSEX, FINNIFTY). If unsure, infer or default to NIFTY 5m.
2. Market Structure: Bullish Trend, Bearish Trend, Consolidation / Range, Liquidity Sweep Breakout, or Reversal Zone.
3. Chart Patterns & Volume Profile: (e.g. Pivot-Anchored Volume Profile, Value Area High VAH rejection, Value Area Low VAL sweep, Point of Control POC bounce, Opening Range Breakout ORB, PDH/PDL sweep).
4. Exact Numerical Key Levels (in ₹ INR):
   - Current Price estimate
   - Support levels (S1, S2, S3 or VAL/POC)
   - Resistance levels (R1, R2, R3 or VAH)
   - Suggested Trade Recommendation: ACTION ("BUY CE", "BUY PE", "STRONG BUY", "STRONG SELL", "BUY", "SELL", or "NEUTRAL")
   - Suggested Entry Price
   - Invalidation / Stop Loss (SL)
   - Take Profit Targets: TP1, TP2, TP3
   - Risk to Reward Ratio (e.g., "1:2.5")
5. Confluences: List 3 to 4 specific technical factors (e.g. VAL Sweep & Rejection, POC Retest Bounce, VWAP Confluence, Call/Put Unwinding).
6. Visual Markups: Provide 3 to 5 horizontal coordinate lines to draw over the chart image, where yPercent is the vertical percentage from top (0 = top of image, 100 = bottom of image).

RESPOND STRICTLY IN VALID JSON matching this exact schema:
{
  "assetDetected": "NIFTY",
  "timeframeDetected": "5M",
  "trendBias": "BUY",
  "confidenceScore": 92,
  "marketStructure": "Bullish Trend",
  "patternDetected": "Value Area Low (VAL) Sweep & POC Expansion",
  "currentPrice": 23320.00,
  "action": "BUY",
  "suggestedEntry": 23320.00,
  "stopLoss": 23285.00,
  "takeProfit1": 23360.00,
  "takeProfit2": 23410.00,
  "takeProfit3": 23450.00,
  "riskRewardRatio": "1:2.8",
  "supportLevels": [23285.00, 23250.00],
  "resistanceLevels": [23360.00, 23410.00],
  "visualLevels": [
    { "label": "VAH Resistance", "price": 23360.00, "type": "resistance", "confidence": 90, "yPercent": 25 },
    { "label": "Entry (POC Bounce)", "price": 23320.00, "type": "entry", "confidence": 95, "yPercent": 48 },
    { "label": "VAL Support", "price": 23285.00, "type": "support", "confidence": 92, "yPercent": 65 },
    { "label": "Stop Loss", "price": 23275.00, "type": "stoploss", "confidence": 95, "yPercent": 75 }
  ],
  "confluences": [
    { "factor": "Value Area Low (VAL) Liquidity Sweep", "status": "bullish" },
    { "factor": "POC Volume Migration Support", "status": "bullish" },
    { "factor": "Opening Range High (ORB) Hold", "status": "bullish" }
  ],
  "reasoning": "NIFTY successfully swept the morning Value Area Low and rejected with heavy delta, targeting the developing Point of Control magnet.",
  "invalidationCriteria": "Setup invalidates if 5m candle closes decisively below VAL support.",
  "timestamp": "Current time"
}
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            try {
              const parsed: AIAnalysisResult = JSON.parse(rawText);
              return NextResponse.json({
                success: true,
                source: "gemini-1.5-flash-vision",
                result: parsed,
              });
            } catch (err) {
              console.warn("Failed to parse Gemini JSON output, falling back to algorithmic analysis", err);
            }
          }
        }
      } catch (err) {
        console.warn("Gemini Vision request failed, falling back to algorithmic analysis", err);
      }
    }

    // Fallback Algorithmic Analysis Engine (Pure Mathematics & Volume Profile)
    const activeSymbol: AssetSymbol = (symbol && (symbol in INITIAL_QUOTES)) ? (symbol as AssetSymbol) : "NIFTY";
    const activeTf = (timeframe || "5m") as any;
    const quote = INITIAL_QUOTES[activeSymbol];

    // Fetch candles from live market endpoint or generate realistic series
    let candles: Candle[] = [];
    try {
      const yMap: Record<string, string> = {
        NIFTY: "^NSEI",
        BANKNIFTY: "^NSEBANK",
        CRUDEOIL: "CL=F",
        NATURALGAS: "NG=F",
        SENSEX: "^BSESN",
        FINNIFTY: "NIFTY_FIN_SERVICE.NS",
      };
      const ySym = yMap[activeSymbol];
      if (ySym) {
        const mult = activeSymbol === "CRUDEOIL" || activeSymbol === "NATURALGAS" ? 83.8 : 1.0;
        const yRes = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=5m&range=5d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 30 },
            signal: AbortSignal.timeout(3500),
          }
        );
        if (yRes.ok) {
          const yData = await yRes.json();
          const res0 = yData?.chart?.result?.[0];
          const times = res0?.timestamp || [];
          const q = res0?.indicators?.quote?.[0] || {};
          for (let i = 0; i < times.length; i++) {
            if (q.open?.[i] != null && q.close?.[i] != null && q.high?.[i] != null && q.low?.[i] != null) {
              candles.push({
                time: times[i],
                open: +(q.open[i] * mult).toFixed(quote.pipPrecision),
                high: +(q.high[i] * mult).toFixed(quote.pipPrecision),
                low: +(q.low[i] * mult).toFixed(quote.pipPrecision),
                close: +(q.close[i] * mult).toFixed(quote.pipPrecision),
                volume: q.volume?.[i] || 0,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live candles for analyze-chart:", e);
    }

    if (candles.length === 0) {
      candles = generateRealisticCandles(activeSymbol, activeTf, 100, quote.bid);
    }
    
    const analysis = generateTradeSignalFromData(activeSymbol, candles, quote.pipPrecision);

    // Add visual coordinates for image markup overlay
    const current = analysis.currentPrice || quote.bid;
    const s1 = analysis.supportLevels[0] || current * 0.994;
    const r1 = analysis.resistanceLevels[0] || current * 1.006;
    
    analysis.visualLevels = [
      { label: `Take Profit 2 (₹${analysis.takeProfit2})`, price: analysis.takeProfit2, type: "takeprofit", confidence: 85, yPercent: 20 },
      { label: `VAH / Resistance (₹${r1})`, price: r1, type: "resistance", confidence: 92, yPercent: 32 },
      { label: `Entry (₹${analysis.suggestedEntry})`, price: analysis.suggestedEntry, type: "entry", confidence: 96, yPercent: 48 },
      { label: `VAL / Support (₹${s1})`, price: s1, type: "support", confidence: 90, yPercent: 68 },
      { label: `Stop Loss (₹${analysis.stopLoss})`, price: analysis.stopLoss, type: "stoploss", confidence: 95, yPercent: 82 },
    ];

    return NextResponse.json({
      success: true,
      source: "algorithmic-volume-profile-engine",
      result: analysis,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze chart" },
      { status: 500 }
    );
  }
}
