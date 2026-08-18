import React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminSystemData } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getAdminSystemData();

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6 max-w-4xl font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <span>🖥️ OBSERVABILITY & ALTYAPI</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Sistem ve Altyapı Durumu
            </h1>
            <p className="text-xs text-text-secondary">
              Çalışma zamanı, veritabanı bağlantısı, film & dizi katalog metrikleri ve servis versiyonları
            </p>
          </div>
        </div>

        {data && data.system ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Application Info */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider text-text-muted font-mono">
                    Uygulama Çalışma Zamanı
                  </h2>
                  <AdminStatusBadge status="ACTIVE" label="Çalışıyor" size="sm" />
                </div>
                <div className="space-y-2.5 text-xs font-sans">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-text-muted">Versiyon:</span>
                    <span className="font-bold text-text-primary font-mono">{data.system.applicationVersion}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-text-muted">Ortam (NODE_ENV):</span>
                    <span className="font-bold text-accent font-mono uppercase">{data.system.environment}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-text-muted">Node.js Runtime:</span>
                    <span className="text-text-primary font-mono">{data.system.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-muted">Uptime (Çalışma Süresi):</span>
                    <span className="text-text-primary font-mono">{data.system.uptimeSeconds} saniye</span>
                  </div>
                </div>
              </div>

              {/* Database & Catalog Info */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider text-text-muted font-mono">
                    Veritabanı & Medya Kataloğu
                  </h2>
                  <AdminStatusBadge status="CONNECTED" label="Bağlı (Sağlıklı)" size="sm" />
                </div>
                <div className="space-y-2.5 text-xs font-sans">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-text-muted">Motor:</span>
                    <span className="font-bold text-text-primary">PostgreSQL 16 (Prisma ORM)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-text-muted">Önbellekteki Film:</span>
                    <span className="font-bold text-text-primary font-mono">{data.system.database.cachedMovies}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-text-muted">Önbellekteki Dizi:</span>
                    <span className="font-bold text-accent font-mono">{data.system.database.cachedTvShows}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-muted">Toplam Medya Öğesi:</span>
                    <span className="font-bold text-emerald-400 font-mono">{data.system.database.totalMediaCached}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation & Engine Details */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-4 shadow-sm">
              <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider text-text-muted font-mono">
                Öneri Motorları & Yapay Zeka Altyapısı
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2.5 p-4 rounded-xl bg-surface-2 border border-border">
                  <span className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                    <span>🎬</span> Film Öneri Motoru
                  </span>
                  <div className="space-y-1.5 text-text-secondary text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Eşleşme Motoru:</span>
                      <span className="font-semibold text-text-primary font-mono">v3.2 + Hybrid AI</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Açıklama Önbelleği:</span>
                      <span className="font-mono">{data.system.recommendationEngine.explanationCacheCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Kayıtlı Geri Bildirim:</span>
                      <span className="font-mono">{data.system.recommendationEngine.totalFeedbacks}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 p-4 rounded-xl bg-surface-2 border border-border">
                  <span className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                    <span>📺</span> Dizi Öneri Motoru
                  </span>
                  <div className="space-y-1.5 text-text-secondary text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Eşleşme Motoru:</span>
                      <span className="font-semibold text-text-primary font-mono">TV v1.0 + TV Hybrid AI</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Açıklama Önbelleği:</span>
                      <span className="font-mono">{data.system.recommendationEngine.tvExplanationCacheCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Kayıtlı Geri Bildirim:</span>
                      <span className="font-mono">{data.system.recommendationEngine.totalTvFeedbacks}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Privacy */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-4 shadow-sm">
              <h2 className="font-display text-base font-bold text-text-primary">
                Güvenlik ve Gizlilik İncelemesi
              </h2>
              <ul className="space-y-2 text-xs text-text-secondary list-disc list-inside leading-relaxed">
                <li>Tüm harici servis API anahtarları veritabanında AES-256-GCM ile şifrelenmektedir.</li>
                <li>Sunucu tarafı encryption master key (<code className="text-accent bg-surface-2 px-1.5 py-0.5 rounded font-mono">MASTER_ENCRYPTION_KEY</code>) asla istemciye iletilmez.</li>
                <li>Admin oturumu özel <code className="text-accent bg-surface-2 px-1.5 py-0.5 rounded font-mono">filmprint_admin_session</code> HttpOnly çerezi üzerinden yürütülmektedir.</li>
                <li>Parolalar Node.js scrypt kriptografik algoritması ile tuzlanarak saklanmaktadır.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted text-xs bg-surface-1 border border-border rounded-2xl">
            Sistem verileri yüklenemedi.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
