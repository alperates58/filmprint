import React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminOverviewData } from "@/lib/admin/data";

export default async function AdminOverviewPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getAdminOverviewData();

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Sistem Genel Bakış
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            Filmprint operasyonel metrikleri ve servis durumları
          </p>
        </div>

        {data ? (
          <div className="space-y-6">
            {/* Top Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Users */}
              <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2">
                <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                  TOPLAM KULLANICI
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-text-primary">
                    {data.users.total}
                  </span>
                  <span className="text-xs text-success font-mono">
                    +{data.users.last24h} (24s)
                  </span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Son 7 günde: {data.users.last7d} yeni kullanıcı
                </p>
              </div>

              {/* Card 2: Interactions */}
              <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2">
                <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                  ETKİLEŞİM SAYISI
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-text-primary">
                    {data.calibration.totalInteractions}
                  </span>
                  <span className="text-xs text-text-secondary font-mono">
                    {data.users.completedCalibration} Tamamlayan
                  </span>
                </div>
                <p className="text-[11px] text-text-muted">
                  30+ film tamamlayan aktif profil
                </p>
              </div>

              {/* Card 3: Movies Cache */}
              <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2">
                <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                  DB FİLM VERİSİ
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-text-primary">
                    {data.movies.totalCached}
                  </span>
                  <span className="text-xs text-accent font-mono">Veritabanı</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  TMDB metadata önbelleğindeki film
                </p>
              </div>

              {/* Card 4: Database Status */}
              <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2">
                <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                  VERİTABANI DURUMU
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success animate-pulse" />
                  <span className="font-display text-xl font-bold text-text-primary">
                    PostgreSQL 16
                  </span>
                </div>
                <p className="text-[11px] text-text-muted font-mono">
                  Bağlantı Aktif & Sağlıklı
                </p>
              </div>
            </div>

            {/* Rank Distribution Card */}
            {data.rankDistribution && (
              <div className="p-6 rounded-2xl bg-surface border border-accent/30 space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-text-primary">
                      Kullanıcı Rütbe Dağılımı (Rank Progression)
                    </h2>
                    <p className="text-xs text-text-muted font-mono">
                      Filmprint kullanıcılarının mevcut rütbe milestone dağılımı
                    </p>
                  </div>
                  <span className="text-xs font-mono text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                    Phase 5.6
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {data.rankDistribution.map((r: any) => (
                    <div
                      key={r.key}
                      className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1 min-w-0"
                    >
                      <div className="text-xl select-none">{r.icon}</div>
                      <p
                        title={r.label}
                        className="text-xs font-mono font-bold text-text-primary line-clamp-2 leading-tight min-h-[2rem] flex items-center justify-center"
                      >
                        {r.label}
                      </p>
                      <p className="font-display text-lg font-bold text-accent">
                        {r.count}
                      </p>
                      <p className="text-[9px] font-mono text-text-muted">Kullanıcı</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interaction & Calibration Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interaction Breakdown */}
              <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-4">
                <h2 className="font-display text-lg font-bold text-text-primary">
                  Cevap Dağılımı (Interaction Status)
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">İZLEDİM</p>
                    <p className="font-display text-xl font-bold text-success">
                      {data.calibration.watched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">İZLEMEDİM</p>
                    <p className="font-display text-xl font-bold text-text-primary">
                      {data.calibration.notWatched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">EMİN DEĞİLİM</p>
                    <p className="font-display text-xl font-bold text-text-muted">
                      {data.calibration.unsure}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-text-secondary font-medium mb-2">Rating Dağılımı (Watched)</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-success">
                      Çok Sevdim: {data.calibration.ratings.love}
                    </div>
                    <div className="p-2 rounded-lg bg-surface-elevated border border-border text-text-primary">
                      Beğendim: {data.calibration.ratings.like}
                    </div>
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                      Ortalama: {data.calibration.ratings.neutral}
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                      Sevmedim: {data.calibration.ratings.dislike}
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations Summary */}
              <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-4">
                <h2 className="font-display text-lg font-bold text-text-primary">
                  Dış Servis Entegrasyon Durumları
                </h2>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">TMDB API Client</h3>
                      <p className="text-xs text-text-muted font-mono">
                        Kaynak: {data.system.tmdb.source.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                        data.system.tmdb.isConfigured
                          ? "bg-success/15 border border-success/30 text-success"
                          : "bg-warning/15 border border-warning/30 text-warning"
                      }`}
                    >
                      {data.system.tmdb.isConfigured ? "Yapılandırıldı" : "Dev Fallback"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">DeepSeek AI Provider</h3>
                      <p className="text-xs text-text-muted font-mono">
                        Kaynak: {data.system.deepseek.source.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                        data.system.deepseek.isConfigured
                          ? "bg-success/15 border border-success/30 text-success"
                          : "bg-surface border border-border text-text-muted"
                      }`}
                    >
                      {data.system.deepseek.isConfigured ? "Yapılandırıldı" : "Pasif"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            Metrikler yüklenirken bir sorun oluştu.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
