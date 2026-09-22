import { NextResponse } from "next/server";
import { INITIAL_CALENDAR } from "@/lib/defaultData";
import { CalendarEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 300 }, // cache 5 min
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const rawEvents: any[] = await res.json();
      // Only keep events that directly impact Indian Markets (INR) or MCX Commodities (EIA Crude Oil & Gas)
      const commodityKeywords = ["crude", "oil", "natural gas", "gas storage", "petroleum", "energy"];

      const mcxCommodityEvents: CalendarEvent[] = rawEvents
        .filter((e) => {
          if (e.country === "INR") return true;
          if (e.country === "USD") {
            const titleLower = (e.title || "").toLowerCase();
            return commodityKeywords.some((kw) => titleLower.includes(kw));
          }
          return false;
        })
        .map((e, idx) => {
          const dateObj = new Date(e.date);
          const timeStr = dateObj.toTimeString().slice(0, 5);
          const dateStr = dateObj.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

          let impact: "high" | "medium" | "low" = "low";
          if (e.impact === "High") impact = "high";
          else if (e.impact === "Medium") impact = "medium";

          return {
            id: `ff-mcx-${idx}`,
            time: timeStr,
            date: dateStr,
            currency: e.country,
            event: e.country === "USD" ? `${e.title} (MCX Driver)` : e.title,
            impact,
            actual: e.actual || undefined,
            forecast: e.forecast || "-",
            previous: e.previous || "-",
            timestamp: dateObj.getTime(),
          };
        });

      if (mcxCommodityEvents.length > 0) {
        // Merge with our official RBI & Indian macro schedule
        const merged = [...INITIAL_CALENDAR, ...mcxCommodityEvents];
        // Deduplicate by event name
        const seen = new Set<string>();
        const unique = merged.filter((item) => {
          const key = item.event.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return NextResponse.json({
          success: true,
          source: "indian-mcx-calendar",
          calendar: unique,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live MCX calendar, using default Indian schedule:", err);
  }

  return NextResponse.json({
    success: true,
    source: "cached-indian-schedule",
    calendar: INITIAL_CALENDAR,
    timestamp: Date.now(),
  });
}
