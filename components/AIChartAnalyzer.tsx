"use client";

import React, { useState, useRef, useEffect } from "react";
import { AIAnalysisResult } from "@/lib/types";
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HelpCircle,
} from "lucide-react";

interface AIChartAnalyzerProps {
  onAnalysisComplete: (result: AIAnalysisResult) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (loading: boolean) => void;
  externalResult?: AIAnalysisResult | null;
  geminiApiKey?: string;
}

export const AIChartAnalyzer: React.FC<AIChartAnalyzerProps> = ({
  onAnalysisComplete,
  isAnalyzing,
  setIsAnalyzing,
  externalResult,
  geminiApiKey,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showMarkups, setShowMarkups] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"upload" | "samples">("upload");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(externalResult || null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external result (e.g. from 1-click terminal scan)
  useEffect(() => {
    if (externalResult) {
      setAnalysisResult(externalResult);
    }
  }, [externalResult]);

  // Support pasting screenshot from clipboard (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageSrc(base64);
      triggerAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const triggerAnalysis = async (base64Image: string, preferredAsset = "XAUUSD") => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          symbol: preferredAsset,
          apiKey: geminiApiKey,
        }),
      });

      const data = await response.json();
      if (data.success && data.result) {
        setAnalysisResult(data.result);
        onAnalysisComplete(data.result);
      } else {
        setErrorMsg(data.error || "Failed to analyze chart.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error analyzing chart.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sample Charts for quick testing
  const loadSampleChart = (type: "gold" | "silver" | "eurusd") => {
    // Generate an illustrative canvas chart screenshot on the fly
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 420;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark terminal background
    ctx.fillStyle = "#0B0E14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#1A2234";
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 30; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw sample candlesticks
    // Draw sample chart with authentic price levels
    const assetName = type === "gold" ? "XAU/USD H1" : type === "silver" ? "XAG/USD H4" : "EUR/USD 15M";
    const currentPriceText = type === "gold" ? "4,363.80" : type === "silver" ? "66.85" : "1.1480";

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${assetName} • Live Broker Benchmark: ${currentPriceText}`, 20, 28);

    // Render realistic sequence of candlesticks
    let prevClose = 230;
    const pricePattern = [1, -1, 1, 1, -1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1, 1, 1, -1, 1];
    for (let i = 0; i < pricePattern.length; i++) {
      const x = 40 + i * 23;
      const isGreen = pricePattern[i] > 0;
      const height = ((i * 7) % 18) + 10;
      const top = isGreen ? prevClose - height : prevClose;
      const wickTop = top - (((i * 5) % 8) + 2);
      const wickBottom = top + height + (((i * 3) % 8) + 2);

      ctx.strokeStyle = isGreen ? "#00E676" : "#FF3B30";
      ctx.fillStyle = isGreen ? "#00E676" : "#FF3B30";
      ctx.lineWidth = 1.5;

      // wick
      ctx.beginPath();
      ctx.moveTo(x + 5, wickTop);
      ctx.lineTo(x + 5, wickBottom);
      ctx.stroke();

      // body
      ctx.fillRect(x, top, 10, height);
      prevClose = isGreen ? top - 2 : top + height + 2;
    }

    const sampleBase64 = canvas.toDataURL("image/png");
    setImageSrc(sampleBase64);
    triggerAnalysis(sampleBase64, type === "gold" ? "XAUUSD" : type === "silver" ? "XAGUSD" : "EURUSD");
  };

  return (
    <div className="flex flex-col bg-terminal-card border border-terminal-border rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#0D121D] border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500/20 text-cyan-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              AI Chart Vision Analyzer
              <span className="px-1.5 py-0.2 text-[9px] bg-bull-glow text-bull rounded border border-bull/30">
                AUTO S/R & RECOM
              </span>
            </h2>
            <p className="text-[10px] text-terminal-muted">
              Upload or paste (Ctrl+V) any screenshot from MT4, MT5, TradingView
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {imageSrc && (
            <button
              onClick={() => setShowMarkups(!showMarkups)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-terminal-bg hover:bg-terminal-hover text-terminal-muted hover:text-white border border-terminal-border transition-all"
              title="Toggle S/R visual overlay"
            >
              {showMarkups ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{showMarkups ? "Hide Markups" : "Show Markups"}</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 border border-cyan-500/30 transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Chart</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Main Dropzone / Preview Area */}
      <div className="p-3">
        {!imageSrc ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-terminal-border hover:border-cyan-500/60 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-[#090D15] transition-all cursor-pointer group min-h-[220px]"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-white mb-1">
              Drag & Drop your chart screenshot here, or{" "}
              <span className="text-cyan-400 underline">Browse</span>
            </p>
            <p className="text-[11px] text-terminal-muted mb-4 max-w-sm">
              Supports MT4, MT5, TradingView, or phone screenshots. You can also press{" "}
              <kbd className="px-1.5 py-0.5 bg-terminal-card border border-terminal-border rounded text-[10px] text-gray-300 font-mono">
                Ctrl + V
              </kbd>{" "}
              to paste.
            </p>

            {/* Quick Demo Test Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-terminal-border/50 w-full max-w-md">
              <span className="text-[10px] text-terminal-muted uppercase tracking-wider">Try Demo Chart:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleChart("gold");
                }}
                className="px-2 py-1 text-[11px] rounded bg-gold/10 text-gold hover:bg-gold/20 border border-gold/30 transition-all"
              >
                XAU/USD Gold Breakout
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleChart("silver");
                }}
                className="px-2 py-1 text-[11px] rounded bg-silver/10 text-gray-300 hover:bg-silver/20 border border-silver/30 transition-all"
              >
                XAG/USD Silver Setup
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleChart("eurusd");
                }}
                className="px-2 py-1 text-[11px] rounded bg-blue-500/10 text-cyan-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
              >
                EUR/USD Liquidity
              </button>
            </div>
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden border border-terminal-border bg-black group">
            {/* Chart Image */}
            <img
              src={imageSrc}
              alt="Uploaded Chart"
              className="w-full max-h-[360px] object-contain mx-auto select-none"
            />

            {/* Visual Markups Overlay (Drawn directly across the chart screenshot) */}
            {showMarkups && analysisResult && analysisResult.visualLevels && (
              <div className="absolute inset-0 pointer-events-none">
                {analysisResult.visualLevels.map((lvl, idx) => {
                  const isSupport = lvl.type === "support";
                  const isResistance = lvl.type === "resistance";
                  const isEntry = lvl.type === "entry";
                  const isSL = lvl.type === "stoploss";
                  const isTP = lvl.type === "takeprofit";

                  const lineColor = isSupport || isTP ? "#00E676" : isResistance || isSL ? "#FF3B30" : "#38BDF8";
                  const topPercent = lvl.yPercent || 20 + idx * 15;

                  return (
                    <div
                      key={idx}
                      className="absolute left-0 right-0 flex items-center transition-all"
                      style={{ top: `${topPercent}%` }}
                    >
                      {/* Left Badge */}
                      <span
                        className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-r shadow-md"
                        style={{
                          backgroundColor: lineColor,
                          color: "#000000",
                        }}
                      >
                        {lvl.label}
                      </span>

                      {/* Glowing Line */}
                      <div
                        className="flex-1 h-[1.5px] border-b"
                        style={{
                          borderColor: lineColor,
                          borderStyle: isEntry ? "solid" : "dashed",
                          boxShadow: `0 0 8px ${lineColor}`,
                        }}
                      />

                      {/* Right Price Label */}
                      <span
                        className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-l bg-terminal-bg/90 border"
                        style={{
                          borderColor: lineColor,
                          color: lineColor,
                        }}
                      >
                        {lvl.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Analyzing Indicator Spinner */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-terminal-bg/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold text-white">AI Vision Model Analyzing Candlestick Structure...</p>
                <p className="text-[10px] text-terminal-muted mt-1">
                  Scanning for Fair Value Gaps, Liquidity Sweeps, Support & Resistance levels
                </p>
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setImageSrc(null);
                  setAnalysisResult(null);
                }}
                className="px-2 py-1 text-[10px] rounded bg-black/70 hover:bg-black text-gray-300 hover:text-white border border-terminal-border backdrop-blur"
              >
                Clear Image
              </button>
              <button
                onClick={() => imageSrc && triggerAnalysis(imageSrc)}
                disabled={isAnalyzing}
                className="px-2 py-1 text-[10px] rounded bg-cyan-600/80 hover:bg-cyan-500 text-white border border-cyan-400/40 backdrop-blur flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? "animate-spin" : ""}`} />
                Re-Analyze
              </button>
            </div>
          </div>
        )}

        {/* Error message if any */}
        {errorMsg && (
          <div className="mt-2 p-2 rounded bg-bear-glow border border-bear/40 text-bear text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
