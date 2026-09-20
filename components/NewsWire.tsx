"use client";

import React, { useState } from "react";
import { NewsItem, AssetSymbol } from "@/lib/types";
import { INITIAL_NEWS } from "@/lib/defaultData";
import { Radio, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface NewsWireProps {
  activeSymbol: AssetSymbol;
}

export const NewsWire: React.FC<NewsWireProps> = ({ activeSymbol }) => {
  const [newsList, setNewsList] = useState<NewsItem[]>(INITIAL_NEWS);
  const [filterAssetOnly, setFilterAssetOnly] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  // Fetch real live news on mount
  React.useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.news && data.news.length > 0) {
          setNewsList(data.news);
          setIsLive(true);
        }
      })
      .catch((err) => console.warn("Using baseline news items", err));
  }, []);

  const displayedNews = filterAssetOnly
    ? newsList.filter((n) => n.affectedAssets.includes(activeSymbol))
    : newsList;

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-[#0D121D] border-b border-terminal-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-bull animate-pulse" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Breaking Wire</h3>
        </div>
        <button
          onClick={() => setFilterAssetOnly(!filterAssetOnly)}
          className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
            filterAssetOnly
              ? "bg-accent/20 text-accent border-accent/40"
              : "bg-terminal-bg text-terminal-muted border-terminal-border hover:text-white"
          }`}
        >
          {filterAssetOnly ? `Filtered: ${activeSymbol}` : "Show All"}
        </button>
      </div>

      {/* News Feed */}
      <div className="divide-y divide-terminal-border/60 overflow-y-auto max-h-[280px]">
        {displayedNews.map((item) => {
          const isBull = item.sentiment === "bullish";
          const isBear = item.sentiment === "bearish";

          return (
            <div
              key={item.id}
              className="p-2.5 hover:bg-terminal-hover/60 transition-colors flex flex-col gap-1.5"
            >
              {/* Top metadata */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-400">{item.source}</span>
                  <span className="text-gray-500">• {item.timeAgo}</span>
                </div>

                {/* Sentiment Pill */}
                <div className="flex items-center gap-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase flex items-center gap-0.5 ${
                      isBull
                        ? "bg-bull-glow text-bull"
                        : isBear
                        ? "bg-bear-glow text-bear"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {isBull ? (
                      <TrendingUp className="w-2.5 h-2.5" />
                    ) : isBear ? (
                      <TrendingDown className="w-2.5 h-2.5" />
                    ) : (
                      <Minus className="w-2.5 h-2.5" />
                    )}
                    {item.sentiment}
                  </span>
                </div>
              </div>

              {/* Headline */}
              <p className="text-xs text-gray-200 leading-snug font-sans font-medium hover:text-cyan-300 transition-colors cursor-pointer">
                {item.headline}
              </p>

              {/* Ticker tags */}
              <div className="flex items-center gap-1 mt-0.5">
                {item.affectedAssets.map((asset) => (
                  <span
                    key={asset}
                    className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-terminal-bg text-terminal-muted border border-terminal-border"
                  >
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
