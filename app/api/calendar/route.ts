import { NextResponse } from "next/server";
import { INITIAL_CALENDAR } from "@/lib/defaultData";
import { CalendarEvent } from "@/lib/types";

export async function GET() {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 300 }, // cache 5 min
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (res.ok) {
      const rawEvents: any[] = await res.json();
      const relevantCurrencies = ["USD", "EUR", "GBP", "JPY"];

      const mapped: CalendarEvent[] = rawEvents
        .filter((e) => relevantCurrencies.includes(e.country))
        .map((e, idx) => {
          const dateObj = new Date(e.date);
          const timeStr = dateObj.toTimeString().slice(0, 5);
          const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

          let impact: "high" | "medium" | "low" = "low";
          if (e.impact === "High") impact = "high";
          else if (e.impact === "Medium") impact = "medium";

          return {
            id: `ff-${idx}`,
            time: timeStr,
            date: dateStr,
            currency: e.country as "USD" | "EUR" | "GBP" | "JPY",
            event: e.title,
            impact,
            actual: e.actual || undefined,
            forecast: e.forecast || "-",
            previous: e.previous || "-",
            timestamp: dateObj.getTime(),
          };
        });

      if (mapped.length > 0) {
        return NextResponse.json({
          success: true,
          source: "forex-factory-live",
          calendar: mapped,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live Forex Factory calendar, using fallback:", err);
  }

  return NextResponse.json({
    success: true,
    source: "cached-data",
    calendar: INITIAL_CALENDAR,
    timestamp: Date.now(),
  });
}
