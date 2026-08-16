"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
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
  const [confirmAction, setConfirmAction] = useState<{ action: string; title: string; desc: string } | null>(null);

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
      if (!res.ok) throw new Error("Katalog motor durumu yüklenemedi.");
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
      setFeedbackMessage({ type: "success", text: data.message || "İşlem başarıyla tamamlandı." });
      if (data.status) {
        setStatus(data.status);
        syncFormState(data.status);
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Hata oluştu." });
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
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

      setFeedbackMessage({ type: "success", text: "Katalog motor ayarları başarıyla kaydedildi." });
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

    let statusKey = "RUNNING";
    let statusLabel = "Çalışıyor";

    if (!status?.masterEnabled) {
      statusKey = "PAUSED";
      statusLabel = "Master Kapalı";
    } else if (isCircuitOpen) {
      statusKey = "CIRCUIT_OPEN";
      statusLabel = "Devre Açık (Hata)";
    } else if (isPaused) {
      statusKey = "PAUSED";
      statusLabel = "Duraklatıldı";
    } else if (media.processedToday >= media.targetDailyItems) {
      statusKey = "DAILY_LIMIT";
      statusLabel = "Günlük Limit Doldu";
    }

    return (
      <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-5 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">{icon}</span>
              <div>
                <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                  <span>{title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-surface-2 border border-border text-text-secondary">
                    {media.mode}
                  </span>
                </h2>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {media.catalogTotal.toLocaleString("tr-TR")} kayıt / ~{media.eligibleTotal.toLocaleString("tr-TR")} uygun
                </p>
              </div>
            </div>
            <AdminStatusBadge status={statusKey} label={statusLabel} size="md" />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 font-sans">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Katalog Hedef İlerlemesi:</span>
              <span className="font-mono font-bold text-text-primary">
                {media.eligibleTotal.toLocaleString("tr-TR")} / {media.initialTarget.toLocaleString("tr-TR")} (%{media.progressPercent})
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-2 overflow-hidden border border-border">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 rounded-full"
                style={{ width: `${media.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Today's Counters */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-xl bg-surface-2 border border-border text-center font-sans">
            <div>
              <p className="text-[10px] text-text-muted font-medium">İşlenen</p>
              <p className="text-xs font-bold text-text-primary font-mono mt-0.5">{media.processedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-medium">Eklenen</p>
              <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{media.insertedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-medium">Güncellenen</p>
              <p className="text-xs font-bold text-text-secondary font-mono mt-0.5">{media.updatedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-medium">Reddedilen</p>
              <p className="text-xs font-bold text-amber-400 font-mono mt-0.5">{media.rejectedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-medium">429 Sınırı</p>
              <p className="text-xs font-bold text-amber-500 font-mono mt-0.5">{media.rateLimitedToday}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-medium">Hatalı</p>
              <p className="text-xs font-bold text-red-400 font-mono mt-0.5">{media.failedToday}</p>
            </div>
          </div>

          {/* Detailed Specs */}
          <div className="space-y-1.5 text-xs font-sans text-text-secondary pt-1">
            <div className="flex justify-between py-0.5 border-b border-border/60">
              <span className="text-text-muted">Hız / Eşzamanlılık:</span>
              <span className="text-text-primary font-mono font-medium">{media.requestsPerSecond} req/s • {media.concurrency} concurrent</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/60">
              <span className="text-text-muted">Günlük Limit:</span>
              <span className="text-text-primary font-mono">{media.targetDailyItems.toLocaleString("tr-TR")} / gün</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/60">
              <span className="text-text-muted">Kaynak / Cursor:</span>
              <span className="text-accent font-mono font-medium truncate max-w-[200px]">
                {media.sourceDate || "N/A"} • satır {media.sourceCursor.toLocaleString("tr-TR")}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-border/60">
              <span className="text-text-muted">Son Başarılı İşlem:</span>
              <span className="text-text-primary font-mono">
                {media.lastSuccessAt ? new Date(media.lastSuccessAt).toLocaleTimeString("tr-TR") : "Henüz yok"}
              </span>
            </div>
            {media.lastError && (
              <div className="flex justify-between py-0.5 text-red-400 font-mono text-[11px]">
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
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
            >
              ▶ Başlat
            </button>
          ) : (
            <button
              onClick={() => handleAction(mediaKey === "FILM" ? "PAUSE_MOVIE" : "PAUSE_TV")}
              disabled={actionLoading !== null}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary text-xs font-semibold transition-all"
            >
              ⏸ Duraklat
            </button>
          )}

          <button
            onClick={() => handleAction("RUN_BATCH", { mediaType: mediaKey, batchSize: 25 })}
            disabled={actionLoading !== null}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-semibold transition-all"
          >
            ⚡ Test Batch (25)
          </button>

          <button
            onClick={() => {
              setCursorModalMedia(mediaKey);
              setNewCursorValue(media.sourceCursor);
            }}
            disabled={actionLoading !== null}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text-muted hover:text-text-primary text-xs font-mono transition-all"
            title="Cursor Sıfırla / Düzenle"
          >
            📍 Cursor
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <span>📦 TMDB INGESTION</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Katalog İçe Aktarma Motoru
            </h1>
            <p className="text-xs text-text-secondary font-sans">
              Film ve Dizi kataloglarını TMDB Daily ID Export üzerinden arka planda, güvenli ve sürekli büyüten altyapı motoru
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
            >
              <span>🔄</span> {loading ? "Yenileniyor..." : "Yenile"}
            </button>
            <button
              onClick={() => setConfigModalOpen(true)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold shadow-sm hover:bg-accent-hover transition-all flex items-center gap-1.5"
            >
              <span>⚙️</span> Ayarları Düzenle
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-sans flex items-center justify-between animate-fadeIn ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-red-500/10 border-red-500/25 text-red-400"
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="ml-4 font-bold opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Master Control Banner */}
        <div className="p-5 md:p-6 rounded-2xl bg-surface-1 border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold font-mono border ${
                status?.masterEnabled
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border-red-500/30"
              }`}
            >
              {status?.masterEnabled ? "ON" : "OFF"}
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-2">
                <span>Ana Sistem Şalteri (Master Switch):</span>
                <span className={status?.masterEnabled ? "text-emerald-400" : "text-red-400"}>
                  {status?.masterEnabled ? "AÇIK (AKTİF)" : "KAPALI (DEVRE DIŞI)"}
                </span>
              </h2>
              <p className="text-xs text-text-muted font-sans mt-0.5">
                Master switch kapalıyken Film ve TV arka plan işleyicileri hiçbir TMDB isteği göndermez.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleToggleMaster}
              disabled={actionLoading !== null}
              className={`min-h-[40px] px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                status?.masterEnabled
                  ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
              }`}
            >
              {status?.masterEnabled ? "⏹ Master Durdur" : "▶ Master Başlat"}
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  action: "RESET_DAILY_COUNTERS",
                  title: "Günlük Sayaçları Sıfırla",
                  desc: "Bugün işlenen, eklenen ve reddedilen sayaçları sıfırlamak istediğinize emin misiniz?",
                })
              }
              disabled={actionLoading !== null}
              className="min-h-[40px] px-3.5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-all"
            >
              Sayaçları Sıfırla
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  action: "RESET_CIRCUIT_BREAKER",
                  title: "Circuit Breaker Kilidini Kaldır",
                  desc: "Açık olan devre kesici kilidini hemen sıfırlamak ve istekleri yeniden başlatmak istiyor musunuz?",
                })
              }
              disabled={actionLoading !== null}
              className="min-h-[40px] px-3.5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-amber-400 hover:text-amber-300 text-xs font-medium transition-all"
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
          <div className="p-12 text-center text-text-muted font-sans text-xs bg-surface-1 border border-border rounded-2xl">
            Katalog durumu yükleniyor...
          </div>
        )}

        {/* Global Architecture Guardrails Info */}
        <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-3 text-xs shadow-sm font-sans">
          <h3 className="font-display font-bold text-text-primary uppercase tracking-wider text-xs">
            🛡️ Altyapı ve Güvenlik Kuralları (Guardrails)
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-secondary list-disc list-inside leading-relaxed">
            <li>Kullanıcı calibration ve recommendation endpoint&apos;leri ingestion beklemez (DB-first decoupled).</li>
            <li>Global Hard Cap: En fazla <strong className="text-text-primary font-mono">{status?.globalMaxRps || 4.0} req/s</strong> token-bucket sınırı korunur.</li>
            <li>TMDB 429 yanıtlarında <code className="text-accent bg-surface-2 px-1.5 py-0.5 rounded font-mono">Retry-After</code> başlığına ve üstel geri çekilmeye uyulur.</li>
            <li>10 ardışık bağlantı hatasında <strong>Circuit Breaker</strong> açılarak TMDB 5 dakika süreyle korunur.</li>
            <li>Özet bilgisi bulunmayan placeholder metinler veritabanına yazılmaz.</li>
            <li>Sayısal başlıklar (<code className="text-accent bg-surface-2 px-1.5 py-0.5 rounded font-mono">1917</code>, <code className="text-accent bg-surface-2 px-1.5 py-0.5 rounded font-mono">2012</code>) geçerlidir; Latin karşılığı olmayanlar filtrelenir.</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal for Dangerous Actions */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-surface-1 border border-border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-base font-bold text-text-primary">{confirmAction.title}</h3>
            <p className="text-xs text-text-secondary font-sans leading-relaxed">{confirmAction.desc}</p>
            <div className="flex gap-2 justify-end pt-2 font-sans text-xs">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleAction(confirmAction.action)}
                className="px-4 py-2.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cursor Modal */}
      {cursorModalMedia && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-surface-1 border border-border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl font-sans">
            <h3 className="font-display text-base font-bold text-text-primary">
              📍 {cursorModalMedia === "FILM" ? "Film" : "Dizi"} Cursor Konumu
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted">Export Dosyasındaki Satır Numarası</label>
              <input
                type="number"
                min="0"
                value={newCursorValue}
                onChange={(e) => setNewCursorValue(parseInt(e.target.value, 10) || 0)}
                className="w-full p-3 rounded-xl bg-surface-2 border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2 text-xs">
              <button
                onClick={() => setCursorModalMedia(null)}
                className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  handleAction(cursorModalMedia === "FILM" ? "SET_MOVIE_CURSOR" : "SET_TV_CURSOR", {
                    cursor: newCursorValue,
                  });
                  setCursorModalMedia(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Edit Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-surface-1 border border-border rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                <span>⚙️</span> Katalog İçe Aktarma Ayarları
              </h2>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Global Settings */}
              <div className="space-y-3 p-4 rounded-2xl bg-surface-2 border border-border">
                <h3 className="font-bold text-accent uppercase tracking-wider text-[11px]">Global Ayarlar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Master Switch</label>
                    <select
                      value={formMasterEnabled ? "true" : "false"}
                      onChange={(e) => setFormMasterEnabled(e.target.value === "true")}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="true">AÇIK (Enabled)</option>
                      <option value="false">KAPALI (Disabled)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Global Max RPS</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10.0"
                      value={formGlobalMaxRps}
                      onChange={(e) => setFormGlobalMaxRps(parseFloat(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Stale Metadata (Gün)</label>
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={formStaleDays}
                      onChange={(e) => setFormStaleDays(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Film Settings */}
              <div className="space-y-3 p-4 rounded-2xl bg-surface-2 border border-border">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-[11px] uppercase tracking-wider">
                  <span>🎬</span> Film Ingestion Ayarları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Mod</label>
                    <select
                      value={formFilmMode}
                      onChange={(e) => setFormFilmMode(e.target.value as CatalogIngestionMode)}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="INITIAL_FILL">INITIAL_FILL</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="PAUSED">PAUSED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Günlük Hedef (Items)</label>
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      value={formFilmDailyTarget}
                      onChange={(e) => setFormFilmDailyTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">RPS (req/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={formGlobalMaxRps}
                      value={formFilmRps}
                      onChange={(e) => setFormFilmRps(parseFloat(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Eşzamanlılık (1-4)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formFilmConcurrency}
                      onChange={(e) => setFormFilmConcurrency(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Başlangıç Hedefi</label>
                    <input
                      type="number"
                      min="1000"
                      max="300000"
                      value={formFilmInitialTarget}
                      onChange={(e) => setFormFilmInitialTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* TV Settings */}
              <div className="space-y-3 p-4 rounded-2xl bg-surface-2 border border-border">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-[11px] uppercase tracking-wider">
                  <span>📺</span> Dizi Ingestion Ayarları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Mod</label>
                    <select
                      value={formTvMode}
                      onChange={(e) => setFormTvMode(e.target.value as CatalogIngestionMode)}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="INITIAL_FILL">INITIAL_FILL</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="PAUSED">PAUSED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Günlük Hedef (Items)</label>
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      value={formTvDailyTarget}
                      onChange={(e) => setFormTvDailyTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">RPS (req/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={formGlobalMaxRps}
                      value={formTvRps}
                      onChange={(e) => setFormTvRps(parseFloat(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Eşzamanlılık (1-4)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formTvConcurrency}
                      onChange={(e) => setFormTvConcurrency(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted mb-1 font-medium">Başlangıç Hedefi</label>
                    <input
                      type="number"
                      min="1000"
                      max="300000"
                      value={formTvInitialTarget}
                      onChange={(e) => setFormTvInitialTarget(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 rounded-xl bg-surface-1 border border-border text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover shadow-sm"
                >
                  {actionLoading === "save_config" ? "Kaydediliyor..." : "Ayarları Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
