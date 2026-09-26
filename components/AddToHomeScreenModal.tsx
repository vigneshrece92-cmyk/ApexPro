"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstalled?: () => void;
}

export const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}) => {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("android");
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect standalone mode (already installed & opened from home screen)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect user agent
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === "accepted") {
        setInstallSuccess(true);
        if (onInstalled) onInstalled();
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.warn("PWA install error:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0a0a16] border border-[#20223f] rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1b1c34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Smartphone className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Add to Home Screen</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  PWA APP
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Install Apex Pro for instant full-screen access without browser bars
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#14142b] hover:bg-[#1f2042] text-slate-400 hover:text-white transition-colors border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center p-2 bg-[#06060f] border-b border-[#1b1c34] text-xs font-semibold gap-1.5">
          <button
            onClick={() => setPlatform("ios")}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              platform === "ios"
                ? "bg-[#161833] text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-sm">🍎</span>
            <span>Apple (iOS Safari)</span>
          </button>

          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              platform === "android"
                ? "bg-[#161833] text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-sm">🤖</span>
            <span>Android (Chrome)</span>
          </button>

          <button
            onClick={() => setPlatform("desktop")}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              platform === "desktop"
                ? "bg-[#161833] text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-sm">💻</span>
            <span>Desktop</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* App Preview Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0e0f24] border border-[#232547]">
            <img
              src="/icon-192.png"
              alt="Apex Pro"
              className="w-12 h-12 rounded-xl border border-cyan-500/30 shadow-md shrink-0"
              onError={(e) => {
                // Fallback to SVG if png not yet cached
                (e.target as HTMLImageElement).src = "/icon.svg";
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Apex Pro Terminal</span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Verified PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Real-Time F&O Option Chain, Signals & Charts
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-mono">
                <span>Fast 0.05s Load</span>
                <span>•</span>
                <span>Offline Cache</span>
                <span>•</span>
                <span>Full Screen</span>
              </div>
            </div>
          </div>

          {/* Already Installed Notice */}
          {isStandalone && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Apex Pro is already running in <b>Standalone App Mode</b> from your Home Screen!
              </span>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {installSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 animate-bounce" />
              <div>
                <b className="text-sm">Added Successfully!</b>
                <p className="text-slate-300 mt-0.5">
                  Apex Pro icon is now placed on your Home Screen.
                </p>
              </div>
            </div>
          )}

          {/* 1. APPLE (iOS SAFARI) INSTRUCTIONS */}
          {platform === "ios" && !installSuccess && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-blue-950/25 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Apple iOS allows installing web apps directly through <b>Safari</b> in 3 quick steps:
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/25 text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-500/30 text-xs">
                    1
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>Tap the Safari Share button</span>
                      <Share className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <p className="text-slate-400">
                      Located in the bottom navigation bar of Safari (the square box with an arrow pointing up).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/25 text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-500/30 text-xs">
                    2
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>Scroll down & tap "Add to Home Screen"</span>
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-slate-400">
                      Look for the icon marked with a plus sign (<b>[+] Add to Home Screen</b>).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/25 text-blue-400 font-bold flex items-center justify-center shrink-0 border border-blue-500/30 text-xs">
                    3
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">Tap "Add" in top-right corner</div>
                    <p className="text-slate-400">
                      Confirm by tapping <b>Add</b>. Apex Pro will instantly appear on your iPhone/iPad Home Screen like a native AppStore app!
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono text-center pt-1">
                Note: In Chrome on iOS, tap the Share icon at the top URL bar to find "Add to Home Screen".
              </div>
            </div>
          )}

          {/* 2. ANDROID (CHROME) INSTRUCTIONS */}
          {platform === "android" && !installSuccess && (
            <div className="space-y-3">
              {deferredPrompt ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/40 text-xs text-slate-300">
                    <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>1-Click Fast Android Installation Ready</span>
                    </div>
                    <span>
                      Tap the button below to prompt Android to install Apex Pro directly to your app drawer and home screen.
                    </span>
                  </div>

                  <button
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/40 disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${isInstalling ? "animate-bounce" : ""}`} />
                    <span>{isInstalling ? "Installing App..." : "Install to Home Screen Now"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/30 text-xs text-emerald-200">
                    Follow these 2 simple steps in Google Chrome or Samsung Internet:
                  </div>

                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/25 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs">
                      1
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-white">Tap the 3 dots menu (⋮)</div>
                      <p className="text-slate-400">
                        Located at the top-right corner of Google Chrome or Samsung Internet.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/25 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs">
                      2
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>Tap "Install app" or "Add to Home screen"</span>
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-slate-400">
                        Tap <b>Install</b> on the confirmation prompt. The app will be installed to your device with full offline caching and no browser address bar!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. DESKTOP (CHROME / EDGE / BRAVE) INSTRUCTIONS */}
          {platform === "desktop" && !installSuccess && (
            <div className="space-y-3">
              {deferredPrompt ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200">
                    <b>Desktop App Ready:</b> Tap below to install Apex Pro as a dedicated Windows/Mac desktop application.
                  </div>

                  <button
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/40"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Apex Pro Desktop App</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                    <div className="w-7 h-7 rounded-lg bg-amber-600/25 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30 text-xs">
                      1
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>Look for the Install icon in your browser URL address bar</span>
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-slate-400">
                        In Chrome/Edge/Brave, an install computer icon appears on the right side of the address bar: <b>"Install Apex Pro Terminal"</b>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0d21] border border-[#1e2040]">
                    <div className="w-7 h-7 rounded-lg bg-amber-600/25 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30 text-xs">
                      2
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-white">Click "Install"</div>
                      <p className="text-slate-400">
                        Apex Pro opens in a clean standalone window with dedicated taskbar pin icon and faster rendering.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Benefits Feature Checklist */}
          <div className="pt-2 border-t border-[#1b1c34] grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100% Free & No AppStore</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Full Screen TradingView</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Instant Launch From Home</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>No Browser Tabs / Clutter</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#070712] border-t border-[#1b1c34] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            apexpro-vaio.vercel.app
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#14152e] hover:bg-[#1f2042] text-slate-300 hover:text-white transition-colors border border-white/5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Smart Floating Mobile Install Banner
 * Automatically prompts mobile visitors with a non-intrusive 1-tap install bar
 */
export const FloatingInstallBanner: React.FC<{
  onOpenModal: () => void;
  deferredPrompt?: any;
}> = ({ onOpenModal, deferredPrompt }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(true); // default true to avoid flash

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check localStorage dismissal
    const wasDismissed = localStorage.getItem("apex_install_banner_dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  if (isStandalone || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("apex_install_banner_dismissed", Date.now().toString());
    } catch {}
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-sm bg-[#0b0c1e]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-2xl shadow-cyan-950/40 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
      <img
        src="/icon-192.png"
        alt="Apex Pro"
        className="w-10 h-10 rounded-lg border border-cyan-500/30 shrink-0 shadow-md"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/icon.svg";
        }}
      />
      <div className="flex-1 min-w-0 text-xs">
        <div className="font-bold text-white flex items-center gap-1.5">
          <span>Install Apex Pro</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">
          Add to Home Screen for full-screen mode
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenModal}
          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};