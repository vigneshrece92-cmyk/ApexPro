# ⚡ ApexFX Pro Terminal | AI Forex & Metals Trading Web App

An institutional-grade trading dashboard and AI vision chart analyzer built with **Next.js 14, Tailwind CSS, TradingView Lightweight Charts, and Google Gemini AI**. 

Tailored specifically for **XAU/USD (Gold), XAG/USD (Silver), USD/JPY, GBP/USD, and EUR/USD**.

---

## 🌟 Key Features

### 1. 🤖 AI Chart Vision Analyzer (Upload or Paste Any Screenshot)
- **Multi-modal AI Vision**: Upload or press `Ctrl + V` to paste screenshots from **MT4, MT5, TradingView, or mobile trading apps**.
- **Visual S/R Canvas Overlay**: Automatically draws horizontal **Support (Green dashed)**, **Resistance (Red dashed)**, **Entry (Cyan)**, **Stop Loss (Red)**, and **Take Profit (Green)** lines directly over the uploaded chart image.
- **Institutional Trade Recommendations**:
  - Action: `STRONG BUY`, `BUY`, `NEUTRAL`, `SELL`, `STRONG SELL`
  - Exact Suggested Entry Price
  - Stop Loss (SL) & Take Profit targets (`TP1`, `TP2`, `TP3`)
  - Calculated Risk-to-Reward Ratio (e.g. `1:2.8`)
  - Confluence checklist (EMA alignment, RSI divergence, Liquidity sweeps)
  - Copy setup button for instant pasting into MetaTrader, Telegram, or Discord.

### 2. 📈 Interactive TradingView Live Terminal
- Smooth 60fps canvas charting using **TradingView Lightweight Charts**.
- Multi-timeframe switcher: `1M`, `5M`, `15M`, `1H`, `4H`, `1D`.
- Built-in technical overlays: **EMA 20, EMA 50, EMA 200**, **RSI (14)**, **MACD**, and **Floor/Camarilla Pivot Points**.
- **⚡ 1-Click "Analyze Live Chart"**: Instantly runs the AI analyzer on the active terminal chart without needing to take a manual screenshot.

### 3. 🌐 Macro Barometer (Dollar & Yield Radar)
- **DXY (US Dollar Index)** live tracker — the single biggest macro catalyst for Gold and FX.
- **US 10-Year Treasury Yield (`US10Y`)** — critical inverse driver for Gold and direct correlation for `USD/JPY`.
- **Gold/Silver Ratio (`XAU/XAG`)** live tracker.

### 4. 📅 Forex Factory-Style Economic Calendar
- Real-time countdown timer to the next upcoming high-impact release (e.g. CPI, NFP, FOMC).
- High-impact filter badges (🔴 High, 🟡 Medium, ⚪ Low).
- Currency filters (USD, EUR, GBP, JPY) with Actual vs. Forecast vs. Previous metrics.

### 5. 📰 Live Breaking Financial News Wire
- Real-time financial headlines with automated Bullish / Bearish sentiment tags.
- Filter news by active asset.

### 6. 🧮 Precision Gold & FX Lot Size Risk Calculator
- Specifically handles Gold contract sizing (1 standard lot = 100 Troy Oz, $1 move = $100) vs Forex pairs (100,000 units, 1 pip = $10).
- Calculates exact lot sizes based on Account Balance, Risk % (e.g., 1%), and Stop Loss distance.

### 7. 🕒 Global Market Sessions Clock
- 24-hour visual clock for Sydney, Tokyo, London, and New York.
- Automatically highlights the high-volatility **London / New York overlap window (13:00 - 17:00 UTC)**.

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
