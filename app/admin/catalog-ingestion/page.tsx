"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import type {
  CatalogIngestionOverviewStatus,
  CatalogMediaStatusView,
  CatalogIngestionMode,
} from "@/lib/catalog-ingestion/types";

export default function AdminCatalogIngestionPage() {
  const [status, setStatus] = useState<CatalogIngestionOverviewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [cursorModalMedia, setCursorModalMedia] = useState<"FILM" | "TV" | null>(null);
  const [newCursorValue, setNewCursorValue] = useState<number>(0);

  // Editable config form state
  const [formMasterEnabled, setFormMasterEnabled] = useState(true);
  const [formGlobalMaxRps, setFormGlobalMaxRps] = useState(4.0);
  const [formStaleDays, setFormStaleDays] = useState(180);
  const [formFilmEnabled, setFormFilmEnabled] = useState(true);
  const [formFilmMode, setFormFilmMode] = useState<CatalogIngestionMode>("INITIAL_FILL");
  const [formFilmDailyTarget, setFormFilmDailyTarget] = useState(10000);
  const [formFilmRps, setFormFilmRps] = useState(1.0);
  const [formFilmConcurrency, setFormFilmConcurrency] = useState(2);
  const [formFilmInitialTarget, setFormFilmInitialTarget] = useState(100000);

  const [formTvEnabled, setFormTvEnabled] = useState(true);
  const [formTvMode, setFormTvMode] = useState<CatalogIngestionMode>("INITIAL_FILL");
  const [formTvDailyTarget, setFormTvDailyTarget] = useState(3000);
  const [formTvRps, setFormTvRps] = useState(1.0);
  const [formTvConcurrency, setFormTvConcurrency] = useState(2);
  const [formTvInitialTarget, setFormTvInitialTarget] = useState(30000);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/catalog-ingestion");
      if (!res.ok) throw new Error("Failed to load catalog ingestion status");
      const data = await res.json();
      if (data.status) {
        setStatus(data.status);
        syncFormState(data.status);
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Veri alınamadı." });
    } finally {
      setLoading(false);
    }
  };

  const syncFormState = (s: CatalogIngestionOverviewStatus) => {
    setFormMasterEnabled(s.masterEnabled);
    setFormGlobalMaxRps(s.globalMaxRps);
    setFormStaleDays(s.staleDays);

    setFormFilmEnabled(s.film.enabled);
    setFormFilmMode(s.film.mode);
    setFormFilmDailyTarget(s.film.targetDailyItems);
    setFormFilmRps(s.film.requestsPerSecond);
    setFormFilmConcurrency(s.film.concurrency);
    setFormFilmInitialTarget(s.film.initialTarget);

    setFormTvEnabled(s.tv.enabled);
    setFormTvMode(s.tv.mode);
    setFormTvDailyTarget(s.tv.targetDailyItems);
    setFormTvRps(s.tv.requestsPerSecond);
    setFormTvConcurrency(s.tv.concurrency);
    setFormTvInitialTarget(s.tv.initialTarget);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAction = async (action: string, payload: Record<string, any> = {}) => {
    setActionLoading(action);
    setFeedbackMessage(null);
    try {
      const res = await fetch("/api/admin/catalog-ingestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "İşlem başarısız.");
      }
      setFeedbackMessage({ type: "success", text: data.message || "İşlem tamamlandı." });
      if (data.status) {
        setStatus(data.status);
        syncFormState(data.status);
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Hata oluştu." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("save_config");
    setFeedbackMessage(null);
    try {
      const payload = {
        masterEnabled: formMasterEnabled,
        globalMaxRps: formGlobalMaxRps,
        staleDays: formStaleDays,
        film: {
          enabled: formFilmEnabled,
          mode: formFilmMode,
          targetDailyItems: formFilmDailyTarget,
          requestsPerSecond: formFilmRps,
          concurrency: formFilmConcurrency,
          initialTarget: formFilmInitialTarget,
        },
        tv: {
          enabled: formTvEnabled,
          mode: formTvMode,
          targetDailyItems: formTvDailyTarget,
          requestsPerSecond: formTvRps,
          concurrency: formTvConcurrency,
          initialTarget: formTvInitialTarget,
        },
      };

      const res = await fetch("/api/admin/catalog-ingestion/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ayarlar kaydedilemedi.");
      }

      setFeedbackMessage({ type: "success", text: "Katalog altyapı ayarları başarıyla güncellendi." });
      setConfigModalOpen(false);
      if (data.status) {
        setStatus(data.status);
        syncFormState(data.status);
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Ayarlar kaydedilemedi." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMaster = async () => {
    if (!status) return;
    const nextMaster = !status.masterEnabled;
    setActionLoading("toggle_master");
    try {
      const res = await fetch("/api/admin/catalog-ingestion/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterEnabled: nextMaster }),
      });
      const data = await res.json();
      if (data.status) {
        setStatus(data.status);
        syncFormState(data.status);
      }
      setFeedbackMessage({
        type: "success",
        text: nextMaster ? "Master switch AÇILDI." : "Master switch KAPATILDI. Tüm ingestion durduruldu.",
      });
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "Master switch değiştirilemedi." });
    } finally {
      setActionLoading(null);
    }
  };

  const renderMediaCard = (title: string, icon: string, media: CatalogMediaStatusView, mediaKey: "FILM" | "TV") => {
    const isCircuitOpen = media.circuitState === "OPEN";
    const isPaused = media.mode === "PAUSED" || !media.enabled || !status?.masterEnabled;

    let statusBadgeColor = "bg-success/20 text-success border-success/30";
    let statusText = "ÇALIŞIYOR (RUNNING)";

    if (!status?.masterEnabled) {
      statusBadgeColor = "bg-destructive/20 text-destructive border-destructive/30";
      statusText = "MASTER KAPALI";
    } else if (isCircuitOpen) {
      statusBadgeColor = "bg-warning/20 text-warning border-warning/30";
      statusText = "DEVRE AÇIK (CIRCUIT OPEN)";
    } else if (!media.enabled || media.mode === "PAUSED") {
      statusBadgeColor = "bg-surface-elevated text-text-muted border-border";
      statusText = "DURAKLATILDI (PAUSED)";
    } else if (media.processedToday >= media.targetDailyItems) {
      statusBadgeColor = "bg-accent/20 text-accent border-accent/30";
      statusText = "GÜNLÜK HEDEF DOLDU";
    }

    return (
      <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-5 shadow-lg flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                  <span>{title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-surface-elevated border border-border text-text-secondary">
                    {media.mode}
                  </span>
                </h2>
                <p className="text-[11px] text-text-muted font-mono">
                  {media.catalogTotal.toLocaleString("tr-TR")} kayıt / ~{media.eligibleTotal.toLocaleString("tr-TR")} usable
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${statusBadgeColor}`}>
              {statusText}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-text-muted">Hedef İlerlemesi:</span>
              <span className="font-bold text-text-primary">
                {media.eligibleTotal.toLocaleString("tr-TR")} / {media.initialTarget.toLocaleString("tr-TR")} (%{media.progressPercent})
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-elevated overflow-hidden border border-border/60">
              <div
                className="h-full bg-accent transition-all duration-500 rounded-full"
                style={{ width: `${media.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Today's Counters */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-xl bg-surface-elevated border border-border/60 text-center font-mono">
            <div>
              <p className="text-[10px] text-text-muted">İşlenen</p>
              <p className="text-xs font-bold text-text-primary mt-0.5">{media.processedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Eklenen</p>
              <p className="text-xs font-bold text-success mt-0.5">{media.insertedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Güncellenen</p>
              <p className="text-xs font-bold text-text-secondary mt-0.5">{media.updatedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Reddedilen</p>
              <p className="text-xs font-bold text-warning mt-0.5">{media.rejectedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">429 Sınırı</p>
              <p className="text-xs font-bold text-amber-500 mt-0.5">{media.rateLimitedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Hatalı</p>
              <p className="text-xs font-bold text-destructive mt-0.5">{media.failedToday}</p>
            </div>
          </div>

          {/* Detailed Specs */}
          <div className="space-y-1.5 text-[11px] font-mono text-text-secondary pt-1">
            <div className="flex justify-between py-0.5 border-b border-border/30">
              <span className="text-text-muted">Hız / Eşzamanlılık:</span>
              <span className="text-text-primary font-bold">{media.requestsPerSecond} req/s • {media.concurrency} concurrent</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/30">
              <span className="text-text-muted">Günlük Limit:</span>
              <span className="text-text-primary">{media.targetDailyItems.toLocaleString("tr-TR")} / gün</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/30">
              <span className="text-text-muted">Kaynak / Cursor:</span>
              <span className="text-accent font-bold truncate max-w-[200px]">
                {media.sourceDate || "N/A"} • satır {media.sourceCursor.toLocaleString("tr-TR")}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/30">
              <span className="text-text-muted">Son Başarılı İşlem:</span>
              <span className="text-text-primary">
                {media.lastSuccessAt ? new Date(media.lastSuccessAt).toLocaleTimeString("tr-TR") : "Henüz yok"}
              </span>
            </div>
            {media.lastError && (
              <div className="flex justify-between py-0.5 text-destructive">
                <span>Son Hata:</span>
                <span className="truncate max-w-[220px]">{media.lastError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-border/60 flex flex-wrap gap-2">
          {media.mode === "PAUSED" ? (
            <button
              onClick={() => handleAction(mediaKey === "FILM" ? "START_MOVIE" : "START_TV")}
              disabled={actionLoading !== null}
              className="flex-1 px-3 py-2 rounded-xl bg-success/20 hover:bg-success/30 border border-success/40 text-success text-xs font-mono font-bold transition-all"
            >
              ▶ Başlat
            </button>
          ) : (
            <button
              onClick={() => handleAction(mediaKey === "FILM" ? "PAUSE_MOVIE" : "PAUSE_TV")}
              disabled={actionLoading !== null}
              className="flex-1 px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs font-mono font-bold transition-all"
            >
              ⏸ Duraklat
            </button>
          )}

          <button
            onClick={() => handleAction("RUN_BATCH", { mediaType: mediaKey, batchSize: 25 })}
            disabled={actionLoading !== null}
            className="px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-mono font-bold transition-all"
          >
            ⚡ Test Batch (25)
          </button>

          <button
            onClick={() => {
              setCursorModalMedia(mediaKey);
              setNewCursorValue(media.sourceCursor);
            }}
            disabled={actionLoading !== null}
            className="px-2.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-text-muted hover:text-text-primary text-xs font-mono transition-all"
            title="Cursor Sıfırla / Düzenle"
          >
            📍
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
              <span>📦</span> TMDB Katalog İçe Aktarma Motoru
            </h1>
            <p className="text-xs text-text-secondary font-mono mt-0.5">
              Film ve Dizi kataloglarını TMDB Daily ID Export üzerinden arka planda, güvenli ve sürekli büyüten altyapı motoru
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
            >
              <span>🔄</span> {loading ? "Yenileniyor..." : "Yenile"}
            </button>
            <button
              onClick={() => setConfigModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-mono font-bold shadow-md hover:bg-accent/90 transition-all flex items-center gap-1.5"
            >
              <span>⚙️</span> Ayarları Düzenle
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
              feedbackMessage.type === "success"
                ? "bg-success/15 border-success/30 text-success"
                : "bg-destructive/15 border-destructive/30 text-destructive"
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="ml-4 font-bold opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Master Control Banner */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold font-mono border ${
                status?.masterEnabled
                  ? "bg-success/20 text-success border-success/40"
                  : "bg-destructive/20 text-destructive border-destructive/40"
              }`}
            >
              {status?.masterEnabled ? "ON" : "OFF"}
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Ana Sistem Şalteri (Master Switch):</span>
                <span className={status?.masterEnabled ? "text-success" : "text-destructive"}>
                  {status?.masterEnabled ? "AÇIK (AKTİF)" : "KAPALI (DEVRE DIŞI)"}
                </span>
              </h2>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                Master switch kapalıyken Film ve TV arka plan işleyicileri hiçbir TMDB isteği göndermez.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleToggleMaster}
              disabled={actionLoading !== null}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                status?.masterEnabled
                  ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25"
                  : "bg-success/20 border-success/40 text-success hover:bg-success/30"
              }`}
            >
              {status?.masterEnabled ? "⏹ Master Durdur" : "▶ Master Başlat"}
            </button>
            <button
              onClick={() => handleAction("RESET_DAILY_COUNTERS")}
              disabled={actionLoading !== null}
              className="px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-secondary hover:text-text-primary text-xs font-mono transition-all"
              title="Tüm günlük sayaçları sıfırla"
            >
              Sayaçları Sıfırla
            </button>
            <button
              onClick={() => handleAction("RESET_CIRCUIT_BREAKER")}
              disabled={actionLoading !== null}
              className="px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-warning hover:bg-warning/10 text-xs font-mono transition-all"
              title="Circuit breaker kilidini kaldır"
            >
              Circuit Reset
            </button>
          </div>
        </div>

        {/* Media Ingestion Cards Grid */}
        {status ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderMediaCard("Film Katalog İçe Aktarımı", "🎬", status.film, "FILM")}
            {renderMediaCard("Dizi Katalog İçe Aktarımı", "📺", status.tv, "TV")}
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted font-mono text-xs">
            Katalog durumu yükleniyor...
          </div>
        )}

        {/* Global Architecture Guardrails Info */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3 text-xs font-mono shadow-sm">
          <h3 className="font-display font-bold text-text-primary uppercase tracking-wider text-text-muted">
            🛡️ Altyapı ve Güvenlik Kuralları (Guardrails)
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-secondary list-disc list-inside">
            <li>Kullanıcı calibration ve recommendation endpoint'leri ingestion beklemez (DB-first decoupled).</li>
            <li>Global Hard Cap: En fazla <strong>{status?.globalMaxRps || 4.0} req/s</strong> token-bucket sınırı korunur.</li>
            <li>TMDB 429 yanıtlarında <code className="text-accent">Retry-After</code> başlığına ve üstel geri çekilmeye uyulur.</li>
            <li>10 ardışık bağlantı hatasında <strong>Circuit Breaker</strong> açılarak TMDB 5 dakika süreyle korunur.</li>
            <li>Özet bilgisi bulunmayan placeholder metinler (<code className="text-accent">film hakkında özet bilgi...</code>) veritabanına yazılmaz.</li>
            <li>Sayısal başlıklar (<code className="text-accent">1917</code>, <code className="text-accent">2012</code>) geçerlidir; Latin alfabesi karşılığı olmayan başlıklar reddedilir.</li>
          </ul>
        </div>
      </div>

      {/* Configuration Edit Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="font-display text-base font-bold text-text-primary">
                ⚙️ Katalog İçe Aktarma Ayarları
              </h2>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Global Settings */}
              <div className="space-y-3 p-4 rounded-xl bg-surface-elevated border border-border/60">
                <h3 className="font-bold text-accent uppercase tracking-wider">Global Ayarlar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-muted mb-1">Master Switch</label>
                    <select
                      value={formMasterEnabled ? "true" : "false"}
                      onChange={(e) => setFormMasterEnabled(e.target.value === "true")}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    >
                      <option value="true">AÇIK (Enabled)</option>
                      <option value="false">KAPALI (Disabled)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Global Max RPS</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10.0"
                      value={formGlobalMaxRps}
                      onChange={(e) => setFormGlobalMaxRps(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Stale Metadata (Gün)</label>
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={formStaleDays}
                      onChange={(e) => setFormStaleDays(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Film Settings */}
              <div className="space-y-3 p-4 rounded-xl bg-surface-elevated border border-border/60">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <span>🎬</span> Film Ingestion Ayarları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-muted mb-1">Mod</label>
                    <select
                      value={formFilmMode}
                      onChange={(e) => setFormFilmMode(e.target.value as CatalogIngestionMode)}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    >
                      <option value="INITIAL_FILL">INITIAL_FILL</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="PAUSED">PAUSED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Hedef (Daily Items)</label>
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      value={formFilmDailyTarget}
                      onChange={(e) => setFormFilmDailyTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">RPS (req/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={formGlobalMaxRps}
                      value={formFilmRps}
                      onChange={(e) => setFormFilmRps(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Eşzamanlılık (1-4)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formFilmConcurrency}
                      onChange={(e) => setFormFilmConcurrency(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Başlangıç Hedefi</label>
                    <input
                      type="number"
                      min="1000"
                      max="300000"
                      value={formFilmInitialTarget}
                      onChange={(e) => setFormFilmInitialTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* TV Settings */}
              <div className="space-y-3 p-4 rounded-xl bg-surface-elevated border border-border/60">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <span>📺</span> Dizi Ingestion Ayarları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-muted mb-1">Mod</label>
                    <select
                      value={formTvMode}
                      onChange={(e) => setFormTvMode(e.target.value as CatalogIngestionMode)}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    >
                      <option value="INITIAL_FILL">INITIAL_FILL</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="PAUSED">PAUSED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Hedef (Daily Items)</label>
                    <input
                      type="number"
                      min="100"
                      max="20000"
                      value={formTvDailyTarget}
                      onChange={(e) => setFormTvDailyTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">RPS (req/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={formGlobalMaxRps}
                      value={formTvRps}
                      onChange={(e) => setFormTvRps(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Eşzamanlılık (1-4)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formTvConcurrency}
                      onChange={(e) => setFormTvConcurrency(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1">Başlangıç Hedefi</label>
                    <input
                      type="number"
                      min="1000"
                      max="100000"
                      value={formTvInitialTarget}
                      onChange={(e) => setFormTvInitialTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg bg-surface border border-border text-text-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-text-secondary hover:text-text-primary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-5 py-2 rounded-xl bg-accent text-white font-bold hover:bg-accent/90 shadow-md"
                >
                  {actionLoading === "save_config" ? "Kaydediliyor..." : "Kaydet ve Uygula"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cursor Reset Modal */}
      {cursorModalMedia && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h2 className="font-display text-sm font-bold text-text-primary">
              📍 {cursorModalMedia} Cursor Sıfırla / Değiştir
            </h2>
            <p className="text-text-muted">
              Discovery dosyasındaki satır indeksini değiştirir. 0 değeri dosyanın en başına döner.
            </p>
            <div>
              <label className="block text-text-muted mb-1">Yeni Cursor Değeri (Satır İndeksi):</label>
              <input
                type="number"
                min="0"
                value={newCursorValue}
                onChange={(e) => setNewCursorValue(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 rounded-lg bg-surface-elevated border border-border text-text-primary text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                onClick={() => setCursorModalMedia(null)}
                className="px-3 py-2 rounded-xl bg-surface-elevated text-text-secondary"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  await handleAction("RESET_CURSOR", {
                    mediaType: cursorModalMedia,
                    resetCursorValue: newCursorValue,
                  });
                  setCursorModalMedia(null);
                }}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-xl bg-accent text-white font-bold"
              >
                Cursorı Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
