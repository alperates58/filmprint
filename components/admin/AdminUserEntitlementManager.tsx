"use client";

import React, { useState } from "react";
import { UserEntitlementSummary } from "@/lib/entitlements/types";

interface AdminUserEntitlementManagerProps {
  userId: string;
  initialSummary?: UserEntitlementSummary | null;
}

export function AdminUserEntitlementManager({
  userId,
  initialSummary,
}: AdminUserEntitlementManagerProps) {
  const [summary, setSummary] = useState<UserEntitlementSummary | null>(initialSummary || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [validUntilInput, setValidUntilInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGrantPremium = async () => {
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/entitlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "PREMIUM",
          validUntil: validUntilInput ? new Date(validUntilInput).toISOString() : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Yetki tanımlanamadı.");
      }

      setSummary(json.summary);
      setStatusMessage({ type: "success", text: "Kullanıcıya başarıyla Premium yetkisi tanımlandı." });
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "İşlem sırasında hata oluştu." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevokePremium = async () => {
    if (!confirm("Kullanıcının Premium yetkisi iptal edilip ÜCRETSİZ plana çekilecek. Emin misiniz?")) {
      return;
    }

    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/entitlement`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Yetki iptal edilemedi.");
      }

      setSummary(json.summary);
      setStatusMessage({ type: "success", text: "Kullanıcının Premium yetkisi iptal edildi (FREE)." });
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "İşlem sırasında hata oluştu." });
    } finally {
      setIsUpdating(false);
    }
  };

  const isPremium = summary?.isPremium === true;

  return (
    <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">👑</span>
          <div>
            <h2 className="font-display text-sm font-bold text-text-primary">
              Yetkilendirme & Abonelik Katmanı (Entitlements)
            </h2>
            <p className="text-[11px] text-text-muted">
              Kullanıcının SINEAI Premium yetkisi ve AI arama kotası
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start sm:self-auto ${
            isPremium
              ? "bg-purple-950/80 border border-purple-500/40 text-purple-300"
              : "bg-surface-2 border border-border text-text-muted"
          }`}
        >
          {isPremium ? "✨ PREMIUM" : "ÜCRETSİZ PLAN"}
        </span>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
          <span className="text-text-muted block text-[10px] uppercase font-mono">AKTİF KATMAN</span>
          <span className="font-bold text-text-primary text-sm font-mono">{summary?.tier || "FREE"}</span>
          <span className="text-[10px] text-text-muted block">
            {isPremium ? "Tüm Premium motorlar açık" : "Standart kotalı"}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
          <span className="text-text-muted block text-[10px] uppercase font-mono">GEÇERLİLİK TARİHİ</span>
          <span className="font-bold text-text-primary text-sm font-mono">
            {summary?.validUntil ? new Date(summary.validUntil).toLocaleDateString("tr-TR") : "Süresiz"}
          </span>
          <span className="text-[10px] text-text-muted block">
            {summary?.validUntil ? "Belirli süreli yetki" : "Bitiş süresi atanmamış"}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
          <span className="text-text-muted block text-[10px] uppercase font-mono">GÜNLÜK AI KOTA KULLANIMI</span>
          <span className="font-bold text-text-primary text-sm font-mono">
            {summary?.aiDiscoverQuota?.consumed ?? 0} / {summary?.aiDiscoverQuota?.limit ?? 5}
          </span>
          <span className="text-[10px] text-text-muted block">
            Kalan: {summary?.aiDiscoverQuota?.remaining ?? 5} arama
          </span>
        </div>
      </div>

      {/* Admin Action Controls */}
      <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {!isPremium ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              value={validUntilInput}
              onChange={(e) => setValidUntilInput(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
              title="Opsiyonel Bitiş Tarihi"
            />
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleGrantPremium}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>👑</span>
              <span>{isUpdating ? "Yetkilendiriliyor..." : "Premium Yetkisi Ver"}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleRevokePremium}
              className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>⚠️</span>
              <span>{isUpdating ? "İptal Ediliyor..." : "Premium Yetkisini İptal Et (Free Yap)"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}