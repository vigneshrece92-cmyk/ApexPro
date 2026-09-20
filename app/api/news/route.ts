import { NextResponse } from "next/server";
import { INITIAL_NEWS } from "@/lib/defaultData";
import { NewsItem, AssetSymbol } from "@/lib/types";

export async function GET() {
  try {
    const rssUrl = "https://news.google.com/rss/search?q=gold+price+XAUUSD+forex+fed+dollar&hl=en-US&gl=US&ceid=US:en";
    const res = await fetch(rssUrl, {
      next: { revalidate: 180 }, // cache 3 minutes
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
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
          // Extract source if title is like "Headline - Source Name"
          let source = "Financial News";
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
          if (lower.includes("rally") || lower.includes("jump") || lower.includes("surge") || lower.includes("bull") || lower.includes("rise") || lower.includes("gain") || lower.includes("high") || lower.includes("rebound")) {
            sentiment = "bullish";
          } else if (lower.includes("fall") || lower.includes("drop") || lower.includes("slip") || lower.includes("bear") || lower.includes("tumble") || lower.includes("plunge") || lower.includes("lower")) {
            sentiment = "bearish";
          }

          // Affected Assets
          const affected: AssetSymbol[] = [];
          if (lower.includes("gold") || lower.includes("xau")) affected.push("XAUUSD");
          if (lower.includes("silver") || lower.includes("xag")) affected.push("XAGUSD");
          if (lower.includes("dollar") || lower.includes("fed") || lower.includes("rate") || lower.includes("dxy")) affected.push("DXY");
          if (lower.includes("euro") || lower.includes("ecb")) affected.push("EURUSD");
          if (lower.includes("yen") || lower.includes("boj") || lower.includes("jpy")) affected.push("USDJPY");
          if (lower.includes("pound") || lower.includes("boe") || lower.includes("gbp")) affected.push("GBPUSD");
          if (affected.length === 0) affected.push("XAUUSD", "DXY");

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
          source: "google-news-live",
          news: items,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live RSS news, using fallback:", err);
  }

  return NextResponse.json({
    success: true,
    source: "cached-data",
    news: INITIAL_NEWS,
    timestamp: Date.now(),
  });
}
