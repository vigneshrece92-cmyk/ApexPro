import { NextResponse } from "next/server";
import { INITIAL_NEWS } from "@/lib/defaultData";
import { NewsItem, AssetSymbol } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rssUrl =
      "https://news.google.com/rss/search?q=Nifty+BankNifty+Sensex+MCX+Crude+oil+Natural+Gas+India+share+market&hl=en-IN&gl=IN&ceid=IN:en";
    const res = await fetch(rssUrl, {
      next: { revalidate: 180 }, // cache 3 minutes
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const items: NewsItem[] = [];
      let match;
      let count = 0;

      while ((match = itemRegex.exec(xml)) !== null && count < 10) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
        const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);

        if (titleMatch) {
          let fullTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim();
          let source = "Dalal Street Wire";
          const dashIdx = fullTitle.lastIndexOf(" - ");
          if (dashIdx !== -1) {
            source = fullTitle.substring(dashIdx + 3).trim();
            fullTitle = fullTitle.substring(0, dashIdx).trim();
          }

          const link = linkMatch ? linkMatch[1] : undefined;
          const pubDateStr = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();
          const pubDate = new Date(pubDateStr);

          const diffMinutes = Math.max(1, Math.floor((Date.now() - pubDate.getTime()) / 60000));
          const timeAgo =
            diffMinutes < 60
              ? `${diffMinutes}m ago`
              : `${Math.floor(diffMinutes / 60)}h ago`;

          // Infer Sentiment
          const lower = fullTitle.toLowerCase();
          let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
          if (
            lower.includes("rally") ||
            lower.includes("jump") ||
            lower.includes("surge") ||
            lower.includes("bull") ||
            lower.includes("rise") ||
            lower.includes("gain") ||
            lower.includes("high") ||
            lower.includes("rebound") ||
            lower.includes("record")
          ) {
            sentiment = "bullish";
          } else if (
            lower.includes("fall") ||
            lower.includes("drop") ||
            lower.includes("slip") ||
            lower.includes("bear") ||
            lower.includes("tumble") ||
            lower.includes("plunge") ||
            lower.includes("lower") ||
            lower.includes("crash")
          ) {
            sentiment = "bearish";
          }

          // Affected Indian & MCX Assets
          const affected: AssetSymbol[] = [];
          if (lower.includes("bank nifty") || lower.includes("banknifty") || lower.includes("banking")) {
            affected.push("BANKNIFTY");
          }
          if (lower.includes("nifty") || lower.includes("nse")) {
            if (!affected.includes("NIFTY")) affected.push("NIFTY");
          }
          if (lower.includes("crude") || lower.includes("oil") || lower.includes("brent") || lower.includes("opec")) {
            affected.push("CRUDEOIL");
          }
          if (lower.includes("gas") || lower.includes("lng") || lower.includes("cng")) {
            affected.push("NATURALGAS");
          }
          if (lower.includes("sensex") || lower.includes("bse")) {
            affected.push("SENSEX");
          }
          if (lower.includes("vix") || lower.includes("volatility")) {
            affected.push("INDIAVIX");
          }
          if (lower.includes("rupee") || lower.includes("rbi") || lower.includes("usdinr")) {
            affected.push("USDINR");
          }
          if (affected.length === 0) {
            affected.push("NIFTY", "BANKNIFTY");
          }

          items.push({
            id: `real-news-${count}`,
            headline: fullTitle,
            source,
            timeAgo,
            sentiment,
            affectedAssets: affected,
            url: link,
          });

          count++;
        }
      }

      if (items.length > 0) {
        return NextResponse.json({
          success: true,
          source: "indian-financial-news-live",
          news: items,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live Indian news, using default Indian feed:", err);
  }

  return NextResponse.json({
    success: true,
    source: "cached-data",
    news: INITIAL_NEWS,
    timestamp: Date.now(),
  });
}
