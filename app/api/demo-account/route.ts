import { NextRequest, NextResponse } from "next/server";
import { getServerDemoAccount, clearServerDemoPositions } from "@/lib/serverDemoStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const account = getServerDemoAccount();
  return NextResponse.json({ success: true, ...account });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.clear) {
      clearServerDemoPositions();
      return NextResponse.json({ success: true, message: "Server demo positions cleared." });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
