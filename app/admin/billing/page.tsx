import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminBillingDashboardData } from "@/lib/admin/billing-data";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getAdminBillingDashboardData();

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <span>💳 ABONELİK & ÖDEME MERKEZİ</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Premium & Faturalandırma Yönetimi
            </h1>
            <p className="text-xs text-text-secondary font-sans">
              PayTR Sanal POS altyapısı, abonelik yaşam döngüsü metrikleri ve tahsilat raporları
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/integrations"
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>PayTR Ayarlarına Git</span>
            </Link>
          </div>
        </div>

        {/* 1. PayTR Provider Status Card */}
        <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-4 shadow-sm font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔌</span>
              <div>
                <h2 className="font-display text-base font-bold text-text-primary">
                  PayTR Ödeme Sağlayıcı Durumu
                </h2>
                <p className="text-xs text-text-muted">
                  Entegrasyon yapılandırma ve canlı satış hazır olma durumu
                </p>
              </div>
            </div>

            <AdminStatusBadge
              status={
                data.paytr.status === "ACTIVE"
                  ? "ACTIVE"
                  : data.paytr.status === "DISABLED"
                  ? "DISABLED"
                  : data.paytr.status === "ERROR"
                  ? "ERROR"
                  : "PAUSED"
              }
              label={
                data.paytr.status === "ACTIVE"
                  ? "Aktif & Satış Açık"
                  : data.paytr.status === "TESTED"
                  ? "Yapılandırma Doğrulandı"
                  : data.paytr.status === "CONFIGURED"
                  ? "Yapılandırıldı"
                  : data.paytr.status === "DISABLED"
                  ? "Devre Dışı"
                  : data.paytr.status === "ERROR"
                  ? "Hata Durumu"
                  : "Yapılandırılmadı"
              }
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
              <span className="text-text-muted text-[10px] uppercase font-mono">CANLI SATIŞ</span>
              <p className="font-bold font-mono text-sm">
                {data.paytr.billingEnabled ? (
                  <span className="text-emerald-400">AÇIK (Enabled)</span>
                ) : (
                  <span className="text-amber-400">KAPALI</span>
                )}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
              <span className="text-text-muted text-[10px] uppercase font-mono">ÇALIŞMA MODU</span>
              <p className="font-bold font-mono text-sm">
                {data.paytr.testMode ? (
                  <span className="text-amber-400">Test / Sandbox Modu</span>
                ) : (
                  <span className="text-emerald-400">Canlı (Production)</span>
                )}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
              <span className="text-text-muted text-[10px] uppercase font-mono">AYLIK FİYAT</span>
              <p className="font-bold font-mono text-sm text-text-primary">
                {data.paytr.monthlyPrice ? `${data.paytr.monthlyPrice.toFixed(2)} ${data.paytr.currency}` : "Yapılandırılmamış"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
              <span className="text-text-muted text-[10px] uppercase font-mono">YILLIK FİYAT</span>
              <p className="font-bold font-mono text-sm text-text-primary">
                {data.paytr.yearlyPrice ? `${data.paytr.yearlyPrice.toFixed(2)} ${data.paytr.currency}` : "Yapılandırılmamış"}
              </p>
            </div>
          </div>

          {/* Diagnostics Details */}
          <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1.5 text-xs text-text-secondary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px]">Webhook Callback URL:</span>
              <span className="font-mono text-accent font-semibold text-[11px] select-all">
                {data.paytr.callbackUrl}
              </span>
            </div>
            {data.paytr.lastTestedAt && (
              <div className="flex justify-between">
                <span>Son Yapılandırma Doğrulaması:</span>
                <span className="text-text-primary font-mono">{new Date(data.paytr.lastTestedAt).toLocaleString("tr-TR")}</span>
              </div>
            )}
            {data.paytr.lastSuccessfulCallback && (
              <div className="flex justify-between">
                <span>Son Başarılı Callback:</span>
                <span className="text-emerald-400 font-mono">{new Date(data.paytr.lastSuccessfulCallback).toLocaleString("tr-TR")}</span>
              </div>
            )}
            {data.paytr.lastCallbackError && (
              <div className="flex justify-between">
                <span>Son Callback Hatası:</span>
                <span className="text-red-400 font-mono">{data.paytr.lastCallbackError}</span>
              </div>
            )}
            {data.paytr.lastProviderError && (
              <div className="flex justify-between">
                <span>Son Sağlayıcı Hatası:</span>
                <span className="text-red-400 font-mono">{data.paytr.lastProviderError}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Subscription Metrics */}
        <div className="space-y-3 font-sans">
          <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <span>👥</span> Abonelik & Üye Metrikleri
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-4 rounded-2xl bg-surface-1 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-purple-300 font-mono uppercase font-semibold">TOPLAM PREMIUM</span>
              <p className="font-display text-2xl font-bold text-white">{data.subscriptions.totalEffectivePremiumUsers}</p>
              <span className="text-[10px] text-text-muted block">Geçerli Hak Sahibi</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-emerald-400 font-mono uppercase font-semibold">AKTİF ABONELİK</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.subscriptions.active}</p>
              <span className="text-[10px] text-text-muted block">Düzenli Ödeyen</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-amber-400 font-mono uppercase font-semibold">GECİKMİŞ (PAST DUE)</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.subscriptions.pastDue}</p>
              <span className="text-[10px] text-text-muted block">Grace Period'da</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-blue-400 font-mono uppercase font-semibold">DÖNEM SONU İPTAL</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.subscriptions.cancelAtPeriodEnd}</p>
              <span className="text-[10px] text-text-muted block">İptal Planlanmış</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-rose-400 font-mono uppercase font-semibold">SONLANMIŞ</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.subscriptions.expiredOrCancelled}</p>
              <span className="text-[10px] text-text-muted block">Expired / Cancelled</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-text-muted font-mono uppercase font-semibold">MANUEL YETKİ</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.subscriptions.activeManualGrants}</p>
              <span className="text-[10px] text-text-muted block">Admin Tanımlı</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-text-muted font-mono uppercase font-semibold">BILLING KULLANICI</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.subscriptions.activeBillingUsers}</p>
              <span className="text-[10px] text-text-muted block">PayTR Bağlantılı</span>
            </div>
          </div>
        </div>

        {/* 3. Payment Metrics */}
        <div className="space-y-3 font-sans">
          <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <span>💰</span> Tahsilat & Ödeme Metrikleri
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-surface-1 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] text-emerald-400 font-mono uppercase font-semibold">BAŞARILI TAHSİLAT</span>
              <p className="font-display text-2xl font-bold text-emerald-400">{data.payments.totalSucceeded}</p>
              <span className="text-[10px] text-text-muted block">İşlem Sayısı</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-rose-500/30 space-y-1">
              <span className="text-[10px] text-rose-400 font-mono uppercase font-semibold">BAŞARISIZ ÖDEME</span>
              <p className="font-display text-2xl font-bold text-rose-400">{data.payments.totalFailed}</p>
              <span className="text-[10px] text-text-muted block">Toplam Hata</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-amber-400 font-mono uppercase font-semibold">SON 24 SAAT HATA</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.payments.failedLast24h}</p>
              <span className="text-[10px] text-text-muted block">Son 24h Başarısız</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-border space-y-1">
              <span className="text-[10px] text-text-muted font-mono uppercase font-semibold">SON 7 GÜN HATA</span>
              <p className="font-display text-2xl font-bold text-text-primary">{data.payments.failedLast7d}</p>
              <span className="text-[10px] text-text-muted block">Son 7d Başarısız</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-1 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-purple-300 font-mono uppercase font-semibold">NET CİRO (BAŞARILI)</span>
              <div className="space-y-0.5">
                {Object.keys(data.payments.revenueByCurrency).length === 0 ? (
                  <p className="font-display text-2xl font-bold text-white">₺0.00</p>
                ) : (
                  Object.entries(data.payments.revenueByCurrency).map(([curr, rev]) => (
                    <p key={curr} className="font-display text-2xl font-bold text-white">
                      {curr === "TRY" ? "₺" : curr + " "}{rev.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  ))
                )}
              </div>
              <span className="text-[10px] text-text-muted block">Yalnız Succeeded</span>
            </div>
          </div>
        </div>

        {/* 4. Recent Payments Table */}
        <div className="rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-sm font-sans space-y-0">
          <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-text-primary flex items-center gap-2">
              <span>📋</span> Son Ödeme İşlemleri
            </h3>
            <span className="text-xs text-text-muted font-mono">Son {data.recentPayments.length} Kayıt</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-border bg-surface-2/60 text-[11px] font-mono text-text-muted uppercase">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Kullanıcı</th>
                  <th className="py-2.5 px-3 font-semibold">Sipariş No (OID)</th>
                  <th className="py-2.5 px-3 font-semibold">Tutar</th>
                  <th className="py-2.5 px-3 font-semibold">Tarih</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                      Henüz kaydedilmiş ödeme işlemi bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  data.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <Link href={`/admin/users/${p.user.id}`} className="hover:text-accent font-semibold transition-colors">
                          {p.user.name || p.user.email || p.user.id.slice(0, 10)}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                        {p.merchantOid}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-text-primary font-mono">
                        {p.amount.toFixed(2)} {p.currency}
                      </td>
                      <td className="py-2.5 px-3 text-text-muted font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {p.status === "SUCCEEDED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold text-[11px]">
                            Başarılı
                          </span>
                        ) : p.status === "FAILED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 font-semibold text-[11px]" title={p.failureMessage || undefined}>
                            Başarısız
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold text-[11px]">
                            {p.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}