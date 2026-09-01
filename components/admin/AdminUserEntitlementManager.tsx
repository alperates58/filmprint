"use client";

import React, { useState } from "react";
import { UserEntitlementSummary } from "@/lib/entitlements/types";

interface AdminUserEntitlementManagerProps {
  userId: string;
  initialSummary?: UserEntitlementSummary | null;
  subscription?: {
    id: string;
    status: string;
    interval: string;
    currentPeriodStart: string | Date;
    currentPeriodEnd: string | Date;
    cancelAtPeriodEnd: boolean;
  } | null;
  payments?: Array<{
    id: string;
    merchantOid: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string | Date;
  }>;
}

export function AdminUserEntitlementManager({
  userId,
  initialSummary,
  subscription,
  payments,
}: AdminUserEntitlementManagerProps) {
  const [summary, setSummary] = useState<UserEntitlementSummary | null>(initialSummary || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [validUntilInput, setValidUntilInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGrant = async (days: number | null) => {
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      let targetDate: Date | null = null;
      if (days !== null) {
        targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      } else if (validUntilInput) {
        targetDate = new Date(validUntilInput);
      }

      const res = await fetch(`/api/admin/users/${userId}/entitlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "PREMIUM",
          validUntil: targetDate ? targetDate.toISOString() : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Yetki tanımlanamadı.");
      }

      setSummary(json.summary);
      setStatusMessage({
        type: "success",
        text: `Kullanıcıya başarıyla Premium yetkisi tanımlandı (${days ? days + " gün" : targetDate ? targetDate.toLocaleDateString("tr-TR") : "Süresiz"}).`,
      });
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "İşlem sırasında hata oluştu." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Kullanıcının manuel Premium yetkisi kaldırılacak. (Eğer aktif bir PayTR aboneliği varsa abonelik korunacaktır). Onaylıyor musunuz?")) {
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
      setStatusMessage({ type: "success", text: "Kullanıcı yetki durumu güncellendi." });
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
              Kullanıcının SINEAI Premium yetkisi, abonelik durumu ve AI arama kotası
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
          <span className="text-text-muted block text-[10px] uppercase font-mono">AKTİF KATMAN</span>
          <span className="font-bold text-text-primary text-sm font-mono">{summary?.tier || "FREE"}</span>
          <span className="text-[10px] text-text-muted block">
            {isPremium ? "Tüm Premium motorlar açık" : "Standart kotalı"}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
          <span className="text-text-muted block text-[10px] uppercase font-mono">YETKİ KAYNAĞI</span>
          <span className="font-bold text-text-primary text-sm font-mono">
            {summary?.source || (subscription ? "BILLING" : "SYSTEM")}
          </span>
          <span className="text-[10px] text-text-muted block">
            {summary?.source === "BILLING" || subscription ? "PayTR Aboneliği" : summary?.source === "MANUAL" ? "Yönetici Tanımlı" : "Varsayılan"}
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

      {/* Subscription Card if exists */}
      {subscription && (
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>💳</span>
              <span>PayTR Abonelik Kaydı</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[10px] font-mono font-semibold">
              {subscription.status}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-text-secondary">
            <div>
              <span className="text-text-muted block">Plan Aralığı:</span>
              <span className="font-mono text-text-primary">{subscription.interval === "YEARLY" ? "Yıllık" : "Aylık"}</span>
            </div>
            <div>
              <span className="text-text-muted block">Dönem Sonu / Yenilenme:</span>
              <span className="font-mono text-text-primary">{new Date(subscription.currentPeriodEnd).toLocaleDateString("tr-TR")}</span>
            </div>
            <div>
              <span className="text-text-muted block">Dönem Sonu İptal:</span>
              <span className="font-mono text-text-primary">{subscription.cancelAtPeriodEnd ? "Evet" : "Hayır"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Action Controls */}
      <div className="pt-2 border-t border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-text-primary block">Hızlı Premium Tanımla:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleGrant(7)}
                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-purple-950/60 border border-border hover:border-purple-500/40 text-text-primary hover:text-purple-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                +7 Gün
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleGrant(30)}
                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-purple-950/60 border border-border hover:border-purple-500/40 text-text-primary hover:text-purple-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                +30 Gün
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleGrant(90)}
                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-purple-950/60 border border-border hover:border-purple-500/40 text-text-primary hover:text-purple-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                +90 Gün
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleGrant(null)}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                Süresiz Premium Ver
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isPremium && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleRevoke}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>⚠️</span>
                <span>Yetkiyi İptal Et / Free</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Expiry Input */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-text-muted">Özel Bitiş Tarihi:</span>
          <input
            type="date"
            value={validUntilInput}
            onChange={(e) => setValidUntilInput(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
          />
          {validUntilInput && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleGrant(0)}
              className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              Tarihi Uygula
            </button>
          )}
        </div>
      </div>
    </div>
  );
}