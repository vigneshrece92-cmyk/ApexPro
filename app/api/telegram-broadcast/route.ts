import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, botToken, chatId } = body;

    const resolvedBotToken =
      botToken || process.env.TG_BOT_TOKEN || "8418044614:AAEp4LY018UyKt4_v0Qj-7ux1eEZg8APAd0";
    const resolvedChatId = chatId || process.env.TG_CHAT_ID || "-5005740750";

    if (!message) {
      return NextResponse.json({ success: false, error: "No message provided" }, { status: 400 });
    }

    const tgUrl = `https://api.telegram.org/bot${resolvedBotToken}/sendMessage`;
    const resp = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: resolvedChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await resp.json();
    if (!data.ok) {
      return NextResponse.json(
        { success: false, error: `Telegram error: ${data.description}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Broadcast sent to Telegram!" });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
