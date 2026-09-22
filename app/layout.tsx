import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex Pro Terminal | Indian Options & MCX Commodities Intelligence",
  description:
    "Institutional Indian Options & MCX Commodities Terminal featuring Pivot-Anchored Volume Profile (PAVP - VAH, VAL, POC), AI Chart Vision, Option Chain Radar, and Risk Sizing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-terminal-bg text-terminal-text antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
