"use client";

import React, { useState, useEffect } from "react";
import { Settings, X, Key, CheckCircle, Shield, ExternalLink } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [localKey, setLocalKey] = useState(apiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(localKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-terminal-card border border-terminal-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-[#0D121D] border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Vision & Engine Settings</h3>
              <p className="text-[10px] text-terminal-muted">Configure Gemini API or use built-in engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-terminal-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs font-mono">
          <div>
            <label className="text-[11px] text-terminal-muted block mb-1">
              Google Gemini API Key (Optional)
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-[10px] text-terminal-muted mt-1.5 leading-relaxed">
              If left blank, ApexFX automatically uses our built-in <strong>Institutional Heuristic & Technical Vision Engine</strong> which works instantly without any external API calls or costs.
            </p>
          </div>

          {/* Security & Vercel Tip */}
          <div className="p-3 rounded-lg bg-terminal-bg border border-terminal-border space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Vercel Hosting Tip</span>
            </div>
            <p className="text-gray-400 leading-normal">
              When hosting on Vercel, you can also add <code className="text-white bg-[#1A2234] px-1 py-0.5 rounded">GEMINI_API_KEY</code> as an Environment Variable in your Vercel Project Settings for seamless team deployment.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-2 rounded bg-bull-glow border border-bull/40 text-bull text-xs flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0D121D] border-t border-terminal-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-terminal-bg hover:bg-terminal-hover text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
