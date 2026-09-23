import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch("https://charting.nseindia.com/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
    });

    let html = await res.text();
    html = html.replace("<head>", '<head><base href="https://charting.nseindia.com/">');
    // Strip Akamai sensor script to prevent cross-domain sensor failure
    html = html.replace(/<script type="text\/javascript"\s+src="\/emglcmNJ0o[^"]*"><\/script>/gi, "");

    const response = new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "frame-ancestors *",
      },
    });

    response.headers.delete("x-frame-options");
    return response;
  } catch (e: any) {
    return new NextResponse("Failed to load NSE Charting: " + e.message, { status: 500 });
  }
}
