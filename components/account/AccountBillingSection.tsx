"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface BillingData {
  billingReadiness: {
    isReady: boolean;
    adminEnabled: boolean;
    providerReady: boolean;
  };
  subscription: {
    id: string;
    planKey: string;
    interval: "MONTHLY" | "YEARLY";
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    gracePeriodEnd: string | null;
  } | null;
  hasSavedCard: boolean;
  entitlementSource: string;
  payments: Array<{
    id: string;
    merchantOid: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export function AccountBillingSection() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBilling = async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // safe fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Aboneliğiniz mevcut fatura döneminizin sonunda sonlandırılacaktır. Bu süre boyunca Premium haklarınız devam edecektir. Onaylıyor musunuz?"
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setMsg(null);

    try {
      const res = await fetch("/api/billing/subscription/cancel", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: json.message || "Abonelik iptali başarıyla planlandı." });
        fetchBilling();
      } else {
        setMsg({ type: "error", text: json.error || "İptal işlemi başarısız oldu." });
      }
    } catch {
      setMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-surface-1 border border-border text-center text-xs text-text-muted">
        Abonelik ve fatura bilgileri yükleniyor...
      </div>
    );
  }

  const sub = data?.subscription;
  const isSubActive = sub && (sub.status === "ACTIVE" || sub.status === "CANCEL_AT_PERIOD_END");

  return (
    <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
            <span>👑</span> Üyelik & Faturalandırma
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            SINEAI Premium tek hesap üyeliği hem Film hem Dizi deneyiminizi kapsar.
          </p>
        </div>

        <div>
          {isSubActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SINEAI Premium {sub?.cancelAtPeriodEnd ? "(Dönem Sonunda İptal)" : "Aktif"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-text-muted text-xs font-semibold">
              <span>Ücretsiz Plan</span>
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-red-500/10 border-red-500/25 text-red-400"
          }`}
        >
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} className="ml-2 font-bold opacity-70">
            ✕
          </button>
        </div>
      )}

      {/* Subscription Card Details */}
      {isSubActive && sub ? (
        <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-text-muted block text-[11px]">Üyelik & Plan</span>
              <span className="text-text-primary font-semibold">
                SINEAI Premium ({sub.interval === "YEARLY" ? "Yıllık" : "Aylık"})
              </span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">
                {sub.cancelAtPeriodEnd ? "Dönem Bitiş Tarihi" : "Yenilenme Tarihi"}
              </span>
              <span className="text-text-primary font-semibold">
                {new Date(sub.currentPeriodEnd).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">Durum & Kart</span>
              <span className="text-text-primary font-semibold">
                {sub.cancelAtPeriodEnd ? "Dönem Sonunda İptal" : (data?.hasSavedCard ? "✓ PayTR Kayıtlı Kart" : "Aktif")}
              </span>
            </div>
          </div>

          {!sub.cancelAtPeriodEnd && (
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isCancelling ? "İşleniyor..." : "Dönem Sonunda İptal Et"}
              </button>
            </div>
          )}
        </div>
      ) : data?.entitlementSource === "MANUAL" || data?.entitlementSource === "PROMOTIONAL" ? (
        <div className="p-4 rounded-xl bg-surface-2 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span>👑</span>
              <span>SINEAI Premium (Özel Yetki)</span>
            </h4>
            <p className="text-[11px] text-text-muted">
              Hesabınıza yönetici tarafından özel Premium yetkisi tanımlanmıştır. Tüm Film & Dizi ayrıcalıklarından yararlanabilirsiniz.
            </p>
          </div>
          <Link
            href="/premium"
            className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-text-primary font-semibold text-xs transition-colors whitespace-nowrap shadow-sm border border-border"
          >
            Ayrıcalıkları Gör
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-surface-2 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-bold text-text-primary">Üyelik: SINEAI Free</h4>
            <p className="text-[11px] text-text-muted">
              Yüksek limitli AI keşfi, gelişmiş Movie Night ve reklamsız deneyim için Premium'a geçebilirsiniz.
            </p>
          </div>
          <Link
            href="/premium"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors whitespace-nowrap shadow-sm"
          >
            Premium'u İncele
          </Link>
        </div>
      )}

      {/* Payment History */}
      {data?.payments && data.payments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-text-primary">Ödeme Geçmişi</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-text-muted border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">İşlem No</th>
                  <th className="py-2.5 px-3">Tutar</th>
                  <th className="py-2.5 px-3 text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="py-2.5 px-3 text-text-secondary">
                      {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                      {p.merchantOid}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-primary">
                      {p.amount.toFixed(2)} {p.currency}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.status === "SUCCEEDED" ? (
                        <span className="text-emerald-400 font-semibold">Başarılı</span>
                      ) : p.status === "FAILED" ? (
                        <span className="text-red-400 font-semibold">Başarısız</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">{p.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}