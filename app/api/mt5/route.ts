import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = "http://127.0.0.1:5001";

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/status`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        error: "MT5 Bridge responded with error",
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: "MT5 Bridge service offline. Start scripts/mt5_bridge.py",
      balance: 3000.0,
      equity: 3000.0,
      open_positions: [],
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actionType = body.actionType || "trade"; // "trade", "close", "modify", "auto-bot"

    let targetPath = "/api/trade";
    if (actionType === "close") targetPath = "/api/close";
    else if (actionType === "modify") targetPath = "/api/modify";
    else if (actionType === "auto-bot") targetPath = "/api/auto-bot";

    const res = await fetch(`${BRIDGE_URL}${targetPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to communicate with MT5 Bridge",
      },
      { status: 500 }
    );
  }
}
