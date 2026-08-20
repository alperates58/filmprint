"use client";

import React, { useState, useCallback } from "react";
import { ShareCardCanvas, ShareCardData, ShareFormatMode } from "./ShareCardCanvas";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareCardData;
}

export function ShareModal({ isOpen, onClose, data }: ShareModalProps) {
  const [mode, setMode] = useState<ShareFormatMode>("STORY");
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDuel, setCopiedDuel] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://sineai.com.tr";
  const publicProfileUrl = `${baseUrl}/p/${data.userId || "profile"}`;
  const duelUrl = `${baseUrl}/compare/${data.userId || "guest"}`;

  const handleBlobReady = useCallback((blob: Blob) => {
    setCurrentBlob(blob);
  }, []);

  if (!isOpen) return null;

  const handleNativeShare = async () => {
    if (!currentBlob) return;
    setIsSharing(true);

    try {
      const fileName = `sineai-dna-${data.userName.toLowerCase().replace(/\s+/g, "-")}.png`;
      const file = new File([currentBlob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${data.userName} SineAI Film DNA Kimliği`,
          text: `Film zevkimi analiz ettirdim! Benim Film DNA'm: %${data.confidencePercent} Güven. Senin Film DNA'n ne söylüyor?`,
          url: publicProfileUrl,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `${data.userName} SineAI Film DNA Kimliği`,
          text: `Film zevkimi analiz ettirdim! Benim Film DNA'm: %${data.confidencePercent} Güven. Senin Film DNA'n ne söylüyor?`,
          url: publicProfileUrl,
        });
      } else {
        handleDownload();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = () => {
    if (!currentBlob) return;
    const url = URL.createObjectURL(currentBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sineai-dna-${mode.toLowerCase()}-${data.userName.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleCopyDuelLink = async () => {
    try {
      await navigator.clipboard.writeText(duelUrl);
      setCopiedDuel(true);
      setTimeout(() => setCopiedDuel(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl bg-surface-1 border border-border/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <span>📸</span>
              <span>Sinematik DNA Kartını Paylaş</span>
            </h2>
            <p className="text-xs text-text-muted">
              Film zevkini Instagram Story, X veya WhatsApp'ta yüksek kalitede paylaş.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary flex items-center justify-center transition-all cursor-pointer"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-surface-2 border border-border">
          <button
            onClick={() => setMode("STORY")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "STORY"
                ? "bg-accent text-white shadow-md"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>📱</span>
            <span>Instagram Story (9:16)</span>
          </button>

          <button
            onClick={() => setMode("POST")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "POST"
                ? "bg-accent text-white shadow-md"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>🖼️</span>
            <span>Kare Post (1:1)</span>
          </button>

          <button
            onClick={() => setMode("PASSPORT")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "PASSPORT"
                ? "bg-accent text-white shadow-md"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>🪪</span>
            <span>Sinefil Pasaportu</span>
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="flex justify-center p-2 rounded-2xl bg-surface-2/60 border border-border/50 overflow-hidden">
          <ShareCardCanvas
            data={data}
            mode={mode}
            onBlobReady={handleBlobReady}
          />
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Main Action: Native Share */}
          <button
            onClick={handleNativeShare}
            disabled={!currentBlob || isSharing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>🚀</span>
            <span>{isSharing ? "Hazırlanıyor..." : "Instagram / Hikayede Paylaş"}</span>
          </button>

          {/* Secondary Action: Direct PNG Download */}
          <button
            onClick={handleDownload}
            disabled={!currentBlob}
            className="w-full py-3.5 px-4 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent text-text-primary font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>💾</span>
            <span>Görseli İndir (Yüksek Kalite PNG)</span>
          </button>
        </div>

        {/* Link Copy Bar */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-muted truncate">
              <span className="text-accent">🔗</span>
              <span className="truncate">{publicProfileUrl}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent text-text-primary text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>{copiedLink ? "✓" : "📋"}</span>
                <span>{copiedLink ? "Kopyalandı!" : "Linki Kopyala"}</span>
              </button>

              <button
                onClick={handleCopyDuelLink}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Arkadaşınla zevkini karşılaştırma linki"
              >
                <span>{copiedDuel ? "✓" : "⚔️"}</span>
                <span>{copiedDuel ? "Kopyalandı!" : "Düello Linki"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
