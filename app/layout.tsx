import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApexFX Pro Terminal | AI Forex & Metals Trading Intelligence",
  description:
    "Institutional Forex & Gold Trading Terminal featuring AI Chart Vision Analyzer, Automated Support & Resistance markup, Economic News Calendar, and Risk Calculators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-terminal-bg text-terminal-text antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
