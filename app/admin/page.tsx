import React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminRankDistribution } from "@/components/admin/AdminRankDistribution";
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
            SineAI operasyonel metrikleri, film & dizi katalog verileri ve servis durumları
          </p>
        </div>

        {data ? (
          <div className="space-y-6">
            {/* Top Metrics Cards Grid - 5 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <div className="space-y-0.5 text-[11px] font-mono text-text-muted">
                  <p>🎬 {data.users.completedCalibration} Film DNA</p>
                  <p>📺 {data.users.completedTvCalibration} Dizi DNA</p>
                </div>
              </div>

              {/* Card 2: Interactions */}
              <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2">
                <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                  TOPLAM ETKİLEŞİM
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-text-primary">
                    {data.totalAllInteractions}
                  </span>
                  <span className="text-xs text-accent font-mono">
                    Tüm Medya
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono text-text-secondary">
                  <p>🎬 {data.calibration.totalInteractions} Film</p>
                  <p>📺 {data.tvCalibration.totalInteractions} Dizi</p>
                </div>
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
                  <span className="text-xs text-accent font-mono">Film</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Katalog önbelleğindeki film
                </p>
              </div>

              {/* Card 4: TV Shows Cache */}
              <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2">
                <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
                  DB DİZİ VERİSİ
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold text-text-primary">
                    {data.tvShows.totalCached}
                  </span>
                  <span className="text-xs text-accent font-mono">Dizi</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Katalog önbelleğindeki dizi
                </p>
              </div>

              {/* Card 5: Database Status */}
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
                  {data.totalMediaCached} Toplam Medya
                </p>
              </div>
            </div>

            {/* Rank Distribution Card */}
            {data.rankDistribution && (
              <AdminRankDistribution
                rankDistribution={data.rankDistribution}
                tvRankDistribution={data.tvRankDistribution}
              />
            )}

            {/* Interaction & Calibration Breakdown for Film and TV */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Film Interaction Breakdown */}
              <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
                    <span>🎬</span> Film Cevap Dağılımı
                  </h2>
                  <span className="text-xs font-mono text-text-muted">
                    {data.calibration.totalInteractions} Etkileşim
                  </span>
                </div>

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
                  <p className="text-xs text-text-secondary font-medium mb-2">Film Rating Dağılımı (Watched)</p>
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

              {/* TV Series Interaction Breakdown */}
              <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
                    <span>📺</span> Dizi Cevap Dağılımı
                  </h2>
                  <span className="text-xs font-mono text-text-muted">
                    {data.tvCalibration.totalInteractions} Etkileşim
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">İZLEDİM</p>
                    <p className="font-display text-xl font-bold text-success">
                      {data.tvCalibration.watched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">KISMEN</p>
                    <p className="font-display text-xl font-bold text-accent">
                      {data.tvCalibration.partiallyWatched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">İZLEMEDİM</p>
                    <p className="font-display text-xl font-bold text-text-primary">
                      {data.tvCalibration.notWatched}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-center space-y-1">
                    <p className="text-[10px] text-text-muted font-mono uppercase">EMİN DEĞİLİM</p>
                    <p className="font-display text-xl font-bold text-text-muted">
                      {data.tvCalibration.unsure}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-text-secondary font-medium mb-2">Dizi Rating Dağılımı (Watched / Partial)</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-success">
                      Çok Sevdim: {data.tvCalibration.ratings.love}
                    </div>
                    <div className="p-2 rounded-lg bg-surface-elevated border border-border text-text-primary">
                      Beğendim: {data.tvCalibration.ratings.like}
                    </div>
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                      Ortalama: {data.tvCalibration.ratings.neutral}
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                      Sevmedim: {data.tvCalibration.ratings.dislike}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations & Integrations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recommendation Feedback Performance */}
              <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-4">
                <h2 className="font-display text-lg font-bold text-text-primary">
                  Öneri Motoru Geri Bildirim Performansı
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Film Rec Metrics */}
                  <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>🎬</span> Film Önerileri
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/15 text-accent">
                        %{data.feedbackMetrics.conversionRate} Dönüşüm
                      </span>
                    </div>
                    <div className="space-y-1 text-xs font-mono text-text-secondary">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Toplam Geri Bildirim:</span>
                        <span>{data.feedbackMetrics.totalRecommendationFeedbacks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İzleme Listesi:</span>
                        <span>{data.feedbackMetrics.watchLaterCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İlgilenmiyorum:</span>
                        <span>{data.feedbackMetrics.notInterestedCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* TV Rec Metrics */}
                  <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>📺</span> Dizi Önerileri
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/15 text-accent">
                        %{data.tvFeedbackMetrics.conversionRate} Dönüşüm
                      </span>
                    </div>
                    <div className="space-y-1 text-xs font-mono text-text-secondary">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Toplam Geri Bildirim:</span>
                        <span>{data.tvFeedbackMetrics.totalRecommendationFeedbacks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İzleme Listesi:</span>
                        <span>{data.tvFeedbackMetrics.watchLaterCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">İlgilenmiyorum:</span>
                        <span>{data.tvFeedbackMetrics.notInterestedCount}</span>
                      </div>
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
                      <h3 className="text-sm font-bold text-text-primary">Katalog API İstemcisi (Film & Dizi)</h3>
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
                      <h3 className="text-sm font-bold text-text-primary">Yapay Zeka (AI) Sağlayıcı</h3>
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
