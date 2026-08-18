import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminRankDistribution } from "@/components/admin/AdminRankDistribution";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminOverviewData } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getAdminOverviewData();

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <span>📊 OPERASYON MERKEZİ</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Sistem Genel Bakış
            </h1>
            <p className="text-xs text-text-secondary font-sans">
              SineAI canlı operasyonel metrikleri, film & dizi katalog verileri ve motor durumları
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/catalog-ingestion"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-hover transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>📦</span>
              <span>Katalog Motoru</span>
            </Link>
            <Link
              href="/admin/users"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-text-primary font-sans text-xs font-medium hover:bg-surface-3 transition-all flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>Kullanıcılar</span>
            </Link>
          </div>
        </div>

        {data ? (
          <div className="space-y-6">
            {/* Top KPI Cards - 5 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Users */}
              <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold">
                    TOPLAM KULLANICI
                  </span>
                  <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    +{data.users.last24h} (24s)
                  </span>
                </div>
                <div className="font-display text-3xl font-bold tracking-tight text-text-primary">
                  {data.users.total}
                </div>
                <div className="space-y-1 text-xs font-sans text-text-secondary pt-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Film DNA:</span>
                    <span className="font-semibold text-text-primary">{data.users.completedCalibration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Dizi DNA:</span>
                    <span className="font-semibold text-text-primary">{data.users.completedTvCalibration}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Interactions */}
              <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold">
                    TOPLAM ETKİLEŞİM
                  </span>
                  <span className="text-xs text-accent font-mono font-medium">
                    Tüm Medya
                  </span>
                </div>
                <div className="font-display text-3xl font-bold tracking-tight text-text-primary">
                  {data.totalAllInteractions}
                </div>
                <div className="space-y-1 text-xs font-sans text-text-secondary pt-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Film Cevapları:</span>
                    <span className="font-semibold text-text-primary">{data.calibration.totalInteractions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Dizi Cevapları:</span>
                    <span className="font-semibold text-text-primary">{data.tvCalibration.totalInteractions}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Movies Cache */}
              <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold">
                    DB FİLM KATALOĞU
                  </span>
                  <span className="text-xs text-text-muted font-mono">Film</span>
                </div>
                <div className="font-display text-3xl font-bold tracking-tight text-text-primary">
                  {data.movies.totalCached}
                </div>
                <p className="text-xs text-text-muted font-sans pt-1 border-t border-border/60">
                  Aktif film kataloğu önbelleği
                </p>
              </div>

              {/* Card 4: TV Shows Cache */}
              <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold">
                    DB DİZİ KATALOĞU
                  </span>
                  <span className="text-xs text-text-muted font-mono">Dizi</span>
                </div>
                <div className="font-display text-3xl font-bold tracking-tight text-text-primary">
                  {data.tvShows.totalCached}
                </div>
                <p className="text-xs text-text-muted font-sans pt-1 border-t border-border/60">
                  Aktif dizi kataloğu önbelleği
                </p>
              </div>

              {/* Card 5: Database Status */}
              <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider font-semibold">
                    VERİTABANI DURUMU
                  </span>
                  <AdminStatusBadge status="CONNECTED" label="Sağlıklı" size="sm" />
                </div>
                <div className="font-display text-2xl font-bold tracking-tight text-text-primary">
                  PostgreSQL 16
                </div>
                <p className="text-xs text-text-muted font-mono pt-1 border-t border-border/60">
                  {data.totalMediaCached} Toplam Medya Kaydı
                </p>
              </div>
            </div>

            {/* Rank Distribution Visual Component */}
            {data.rankDistribution && (
              <AdminRankDistribution
                rankDistribution={data.rankDistribution}
                tvRankDistribution={data.tvRankDistribution}
              />
            )}

            {/* Interaction & Calibration Breakdown for Film and TV */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Film Interaction Breakdown */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                    <span>🎬</span> Film Kalibrasyon Dağılımı
                  </h2>
                  <span className="text-xs font-mono text-text-muted">
                    {data.calibration.totalInteractions} Etkileşim
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">İZLEDİM</p>
                    <p className="font-display text-xl font-bold text-emerald-400">
                      {data.calibration.watched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">İZLEMEDİM</p>
                    <p className="font-display text-xl font-bold text-text-primary">
                      {data.calibration.notWatched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">EMİN DEĞİLİM</p>
                    <p className="font-display text-xl font-bold text-text-muted">
                      {data.calibration.unsure}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-text-secondary font-medium mb-2">Film Rating Dağılımı (İzlediklerim)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold">
                      ❤️ Çok Sevdim: {data.calibration.ratings.love}
                    </div>
                    <div className="p-2 rounded-xl bg-surface-2 border border-border text-text-primary font-semibold">
                      👍 Beğendim: {data.calibration.ratings.like}
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold">
                      😐 Ortalama: {data.calibration.ratings.neutral}
                    </div>
                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-semibold">
                      👎 Sevmedim: {data.calibration.ratings.dislike}
                    </div>
                  </div>
                </div>
              </div>

              {/* TV Series Interaction Breakdown */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                    <span>📺</span> Dizi Kalibrasyon Dağılımı
                  </h2>
                  <span className="text-xs font-mono text-text-muted">
                    {data.tvCalibration.totalInteractions} Etkileşim
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">İZLEDİM</p>
                    <p className="font-display text-xl font-bold text-emerald-400">
                      {data.tvCalibration.watched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">KISMEN</p>
                    <p className="font-display text-xl font-bold text-accent">
                      {data.tvCalibration.partiallyWatched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">İZLEMEDİM</p>
                    <p className="font-display text-xl font-bold text-text-primary">
                      {data.tvCalibration.notWatched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase font-semibold">EMİN DEĞİLİM</p>
                    <p className="font-display text-xl font-bold text-text-muted">
                      {data.tvCalibration.unsure}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-text-secondary font-medium mb-2">Dizi Rating Dağılımı (İzlediklerim & Kısmen)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold">
                      ❤️ Çok Sevdim: {data.tvCalibration.ratings.love}
                    </div>
                    <div className="p-2 rounded-xl bg-surface-2 border border-border text-text-primary font-semibold">
                      👍 Beğendim: {data.tvCalibration.ratings.like}
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold">
                      😐 Ortalama: {data.tvCalibration.ratings.neutral}
                    </div>
                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-semibold">
                      👎 Sevmedim: {data.tvCalibration.ratings.dislike}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations & Integrations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recommendation Feedback Performance */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-4">
                <h2 className="font-display text-base font-bold text-text-primary">
                  Öneri Motoru Geri Bildirim Performansı
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Film Rec Metrics */}
                  <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>🎬</span> Film Önerileri
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/25">
                        %{data.feedbackMetrics.conversionRate} Dönüşüm
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs font-sans text-text-secondary">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Toplam Geri Bildirim:</span>
                        <span className="font-semibold text-text-primary font-mono">{data.feedbackMetrics.totalRecommendationFeedbacks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İzleme Listesi:</span>
                        <span className="font-semibold text-emerald-400 font-mono">{data.feedbackMetrics.watchLaterCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İlgilenmiyorum:</span>
                        <span className="font-semibold text-red-400 font-mono">{data.feedbackMetrics.notInterestedCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* TV Rec Metrics */}
                  <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>📺</span> Dizi Önerileri
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/25">
                        %{data.tvFeedbackMetrics.conversionRate} Dönüşüm
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs font-sans text-text-secondary">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Toplam Geri Bildirim:</span>
                        <span className="font-semibold text-text-primary font-mono">{data.tvFeedbackMetrics.totalRecommendationFeedbacks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İzleme Listesi:</span>
                        <span className="font-semibold text-emerald-400 font-mono">{data.tvFeedbackMetrics.watchLaterCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İlgilenmiyorum:</span>
                        <span className="font-semibold text-red-400 font-mono">{data.tvFeedbackMetrics.notInterestedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations Summary */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-4">
                <h2 className="font-display text-base font-bold text-text-primary">
                  Dış Servis Entegrasyon Durumları
                </h2>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-text-primary">Katalog API İstemcisi (TMDB)</h3>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">
                        Kaynak: {data.system.tmdb.source.toUpperCase()}
                      </p>
                    </div>
                    <AdminStatusBadge
                      status={data.system.tmdb.isConfigured ? "ACTIVE" : "PAUSED"}
                      label={data.system.tmdb.isConfigured ? "Yapılandırıldı" : "Dev Fallback"}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-text-primary">Yapay Zeka Sağlayıcısı (DeepSeek)</h3>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">
                        Kaynak: {data.system.deepseek.source.toUpperCase()}
                      </p>
                    </div>
                    <AdminStatusBadge
                      status={data.system.deepseek.isConfigured ? "ACTIVE" : "PAUSED"}
                      label={data.system.deepseek.isConfigured ? "Yapılandırıldı" : "Pasif"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted font-sans text-xs bg-surface-1 border border-border rounded-2xl">
            Metrikler yüklenirken bir sorun oluştu.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
