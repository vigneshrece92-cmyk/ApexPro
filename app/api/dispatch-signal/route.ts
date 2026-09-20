import { NextRequest, NextResponse } from "next/server";
import { AIAnalysisResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, webhookUrl, botToken, chatId, signal } = body as {
      platform: "discord" | "telegram";
      webhookUrl?: string;
      botToken?: string;
      chatId?: string;
      signal: AIAnalysisResult;
    };

    if (!signal) {
      return NextResponse.json({ success: false, error: "No signal provided" }, { status: 400 });
    }

    const isBuy = signal.action.includes("BUY");
    const colorInt = isBuy ? 0x10b981 : 0xef4444;

    if (platform === "discord") {
      if (!webhookUrl || !webhookUrl.startsWith("http")) {
        return NextResponse.json(
          { success: false, error: "Valid Discord Webhook URL required" },
          { status: 400 }
        );
      }

      const discordPayload = {
        username: "ApexFX Pro Terminal",
        avatar_url: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/flame.png",
        embeds: [
          {
            title: `🎯 APEXFX PRO SIGNAL: ${signal.action} ${signal.assetDetected}`,
            description: `**Market Structure**: ${signal.marketStructure}\n**Pattern**: ${signal.patternDetected}`,
            color: colorInt,
            fields: [
              { name: "⚡ Entry", value: `\`${signal.suggestedEntry}\``, inline: true },
              { name: "🛑 Stop Loss", value: `\`${signal.stopLoss}\``, inline: true },
              { name: "⚖️ Risk : Reward", value: `\`${signal.riskRewardRatio}\``, inline: true },
              { name: "🎯 Take Profit 1", value: `\`${signal.takeProfit1}\``, inline: true },
              { name: "🚀 Take Profit 2", value: `\`${signal.takeProfit2}\``, inline: true },
              { name: "💎 Take Profit 3", value: `\`${signal.takeProfit3}\``, inline: true },
              {
                name: "🏛️ SMC Market Zone",
                value: signal.smc ? `${signal.smc.zone.toUpperCase()} (Eq: ${signal.smc.equilibriumPrice})` : "SMC Validated",
                inline: true,
              },
              { name: "📊 Confidence", value: `${signal.confidenceScore}%`, inline: true },
              { name: "⏱️ Timeframe", value: signal.timeframeDetected, inline: true },
              { name: "💡 Institutional Rationale", value: signal.reasoning },
              { name: "⚠️ Invalidation Rule", value: signal.invalidationCriteria },
            ],
            footer: {
              text: "ApexFX Institutional Trading Terminal • Educational & Signal Intelligence",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordPayload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return NextResponse.json(
          { success: false, error: `Discord rejected: ${errText}` },
          { status: resp.status }
        );
      }

      return NextResponse.json({ success: true, message: "Signal dispatched to Discord!" });
    }

    if (platform === "telegram") {
      if (!botToken || !chatId) {
        return NextResponse.json(
          { success: false, error: "Telegram Bot Token and Chat ID are required" },
          { status: 400 }
        );
      }

      const tgText = `
🎯 <b>APEXFX PRO SIGNAL ALERT</b>
━━━━━━━━━━━━━━━━━━━━
<b>Asset:</b> ${signal.assetDetected} (${signal.timeframeDetected})
<b>Signal:</b> ${isBuy ? "🟢" : "🔴"} <b>${signal.action}</b>
<b>Confidence:</b> ${signal.confidenceScore}%

⚡ <b>Suggested Entry:</b> <code>${signal.suggestedEntry}</code>
🛑 <b>Stop Loss:</b> <code>${signal.stopLoss}</code>
🎯 <b>TP1 (Safe):</b> <code>${signal.takeProfit1}</code>
🚀 <b>TP2 (Runner):</b> <code>${signal.takeProfit2}</code>
💎 <b>TP3 (Moonshot):</b> <code>${signal.takeProfit3}</code>
⚖️ <b>Risk:Reward:</b> ${signal.riskRewardRatio}

📐 <b>Structure:</b> ${signal.marketStructure}
🏛️ <b>Pattern:</b> ${signal.patternDetected}
${signal.smc ? `📍 <b>SMC Zone:</b> ${signal.smc.zone} (0.618 Fib: ${signal.smc.fibonacci.fib618})` : ""}

💡 <b>Analysis:</b> ${signal.reasoning}
⚠️ <b>Invalidation:</b> ${signal.invalidationCriteria}
━━━━━━━━━━━━━━━━━━━━
<i>ApexFX Institutional Intelligence</i>
      `.trim();

      const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const resp = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgText,
          parse_mode: "HTML",
        }),
      });

      const tgData = await resp.json();
      if (!tgData.ok) {
        return NextResponse.json(
          { success: false, error: `Telegram error: ${tgData.description}` },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: "Signal dispatched to Telegram!" });
    }

    return NextResponse.json({ success: false, error: "Unsupported platform" }, { status: 400 });
  } catch (error) {
    console.error("Signal dispatch error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
