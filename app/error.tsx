"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ApexFX Terminal caught client exception:", error);
  }, [error]);

  const handleClearAndReload = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("apexfx_demo_broker_v2");
        sessionStorage.clear();
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0D121D] border border-terminal-border rounded-xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            Terminal State Recovery
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            An unexpected client exception was intercepted. Your session data has been preserved.
          </p>
          {error?.message && (
            <div className="mt-2 p-2 rounded bg-black/50 border border-gray-800 text-[11px] font-mono text-rose-300 break-words text-left max-h-24 overflow-y-auto">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Rendering</span>
          </button>

          <button
            onClick={handleClearAndReload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all"
          >
            <Home className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset State &amp; Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
