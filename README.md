# ⚡ Apex Pro Terminal | Indian Options & MCX Commodities Trading Intelligence

An institutional-grade trading terminal, automated Pivot-Anchored Volume Profile (PAVP) engine, and AI vision chart analyzer built with **Next.js 14, Tailwind CSS, TradingView Lightweight Charts, and Google Gemini AI**. 

Tailored specifically for **NIFTY 50**, **BANK NIFTY**, **CRUDE OIL MCX**, **NATURAL GAS MCX**, **SENSEX**, and **FIN NIFTY** in **₹ INR**.

---

## 🌟 Key Features

### 1. 📊 Institutional Pivot-Anchored Volume Profile (PAVP)
- **VAH (Value Area High), VAL (Value Area Low), and POC (Point of Control)** computed dynamically using zig-zag swing pivot anchors.
- **Strictly Volume Profile Signals**: Real-time `BUY CE` / `BUY PE` execution triggers based on Value Area Low sweeps, Point of Control retests, and Value Area High mean reversions.
- **VWCB Spikes**: Volume Weighted Colored Bars flagging institutional volume nodes where bar volume exceeds 89 SMA * 1.618.
- **Session Liquidity Overlays**: Previous Day High/Low (PDH/PDL), Opening Range Breakout (ORB 15M), and Daily Open baselines.

### 2. 🤖 AI Chart Vision Analyzer (TradingView, Zerodha Kite, Groww, Angel One)
- **Multi-modal AI Vision**: Upload or press `Ctrl + V` to paste screenshots from **TradingView, Zerodha Kite, Groww, Angel One, Upstox, Dhan, or mobile trading apps**.
- **Visual S/R Canvas Overlay**: Automatically draws horizontal **Support (Green dashed)**, **Resistance (Red dashed)**, **Entry (Cyan)**, **Stop Loss (Red)**, and **Take Profit (Green)** lines directly over the uploaded chart image.
- **Institutional Trade Recommendations**:
  - Action: `STRONG BUY (CE)`, `BUY (CE)`, `NEUTRAL`, `SELL (PE)`, `STRONG SELL (PE)`
  - Exact Suggested Entry Price
  - Stop Loss (SL) & Take Profit targets (`TP1`, `TP2`, `TP3`)
  - Calculated Risk-to-Reward Ratio (e.g. `1:3.0`)
  - Confluence checklist (PAVP Value Area, Option Chain PCR Skew, Volume Profile node)

### 3. 💼 Internal Virtual Options Broker (₹1,00,000 Starting Capital)
- **100% In-Browser & Vercel Ready**: No external broker login or MT5 installation required to test.
- **True Indian Exchange Multipliers**:
  - NIFTY 50: 25 Qty / lot
  - BANK NIFTY: 15 Qty / lot
  - CRUDE OIL MCX: 100 Qty / lot
  - NATURAL GAS MCX: 1250 Qty / lot
  - SENSEX: 10 Qty / lot
  - FIN NIFTY: 25 Qty / lot
- Real-time P&L tracking, 1-click breakeven stop loss adjustments, and automated trailing stops.

### 4. 📈 Interactive TradingView Live Terminal
- Smooth 60fps canvas charting using **TradingView Lightweight Charts**.
- Multi-timeframe switcher: `1M`, `5M`, `15M`, `1H`, `4H`, `1D`.
- Built-in technical overlays: **EMA 20, EMA 50, EMA 200**, **PAVP Histogram HUD**, and **Floor/Camarilla Pivot Points**.
- **⚡ 1-Click "Analyze Live Chart"**: Instantly runs the AI analyzer on the active terminal chart without needing to take a manual screenshot.

### 5. 🌐 Indian Market Barometer
- **INDIA VIX** live volatility skew tracker.
- **USD/INR (RBI Reference Rate)** tracking foreign capital flow sentiment.
- **MCX Crude / Gas Ratio** tracking domestic energy basket spreads.

### 6. 📅 Indian & MCX Economic Calendar
- Real-time tracking of RBI MPC rate decisions, India CPI/WPI, and US EIA Crude Oil & Natural Gas inventory releases (critical for MCX evening volatility).

### 7. 📰 Dalal Street & MCX Live Breaking Wire
- Real-time financial headlines with automated Bullish / Bearish sentiment tags.
- Filter news by active Indian asset.

### 8. 🧮 Indian F&O & MCX Lot Calculator & Drawdown Guardian
- Calculates exact lot sizes based on Account Balance in ₹ INR, Risk % (e.g. 1.5%), and Stop Loss distance.
- Pre-configured capital tiers (₹1,00,000 to ₹25,00,000) with daily drawdown limits.

### 9. 🕒 NSE & MCX Market Timings Clock
- Visual clock tracking:
  - **NSE/BSE Pre-Open**: 09:00 AM – 09:15 AM IST
  - **NSE/BSE Regular F&O**: 09:15 AM – 03:30 PM IST
  - **MCX Day Session**: 09:00 AM – 05:00 PM IST
  - **MCX Evening Session (Peak US Overlap)**: 05:00 PM – 11:30 PM IST

---

## 🚀 1-Click Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvigneshrece92-cmyk%2FApexPro)

This project is **100% cloud-ready** and built with Next.js 14 App Router, requiring **no MT5 software or local Python background servers**. All simulated trading, automated trailing, 4H PO3, and ICT Silver Bullet calculations run in-browser and on Vercel serverless functions.

### Direct 1-Click Import to Vercel:
1. Open this direct import link: **[Deploy vigneshrece92-cmyk/ApexPro on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvigneshrece92-cmyk%2FApexPro)**
2. Click **Deploy**.
3. (Optional) In **Environment Variables**, add `GEMINI_API_KEY` for AI vision chart scanning.
4. Your live institutional trading dashboard is ready in ~60 seconds!

---

## 💻 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

---

## 🔑 AI Vision API Configuration

- **Built-in Mode**: ApexFX includes an institutional technical heuristic pattern engine that works out-of-the-box with **zero API keys required**.
- **Gemini Vision Mode**: To use Google Gemini Vision for deep multi-modal chart recognition, click the ⚙️ **Settings** icon on the top right and enter your Gemini API Key, or set `GEMINI_API_KEY` in your `.env.local` or Vercel Environment Variables.
