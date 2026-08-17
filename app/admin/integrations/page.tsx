"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TMDB State
  const [tmdbKey, setTmdbKey] = useState("");
  const [tmdbStatusMsg, setTmdbStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingTmdb, setIsSavingTmdb] = useState(false);
  const [isTestingTmdb, setIsTestingTmdb] = useState(false);

  // DeepSeek State
  const [deepseekKey, setDeepseekKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("https://api.deepseek.com");
  const [deepseekModelId, setDeepseekModelId] = useState("deepseek-v4-flash");
  const [deepseekEnabled, setDeepseekEnabled] = useState(true);
  const [deepseekStatusMsg, setDeepseekStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingDeepseek, setIsSavingDeepseek] = useState(false);
  const [isTestingDeepseek, setIsTestingDeepseek] = useState(false);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/admin/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);

        if (data.integrations?.deepseek?.metadata) {
          const m = data.integrations.deepseek.metadata;
          if (m.baseUrl) setDeepseekBaseUrl(m.baseUrl);
          if (m.modelId) setDeepseekModelId(m.modelId);
          if (typeof m.enabled === "boolean") setDeepseekEnabled(m.enabled);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleSaveTmdb = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTmdb(true);
    setTmdbStatusMsg(null);

    try {
      const res = await fetch("/api/admin/integrations/tmdb", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: tmdbKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setTmdbStatusMsg({ type: "success", text: data.message || "TMDB API anahtarı başarıyla güncellendi." });
        setTmdbKey("");
        fetchIntegrations();
      } else {
        setTmdbStatusMsg({ type: "error", text: data.error || "Kayıt sırasında hata oluştu." });
      }
    } catch {
      setTmdbStatusMsg({ type: "error", text: "Kayıt sırasında bağlantı hatası oluştu." });
    } finally {
      setIsSavingTmdb(false);
    }
  };

  const handleTestTmdb = async () => {
    setIsTestingTmdb(true);
    setTmdbStatusMsg(null);

    try {
      const res = await fetch("/api/admin/integrations/tmdb/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTmdbStatusMsg({ type: "success", text: data.message || "TMDB bağlantısı başarılı." });
      } else {
        setTmdbStatusMsg({ type: "error", text: data.error || data.message || "Test başarısız." });
      }
    } catch {
      setTmdbStatusMsg({ type: "error", text: "Test sırasında bağlantı hatası oluştu." });
    } finally {
      setIsTestingTmdb(false);
    }
  };

  const handleSaveDeepseek = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDeepseek(true);
    setDeepseekStatusMsg(null);

    try {
      const res = await fetch("/api/admin/integrations/deepseek", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: deepseekKey || undefined,
          baseUrl: deepseekBaseUrl,
          modelId: deepseekModelId,
          enabled: deepseekEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeepseekStatusMsg({ type: "success", text: data.message || "DeepSeek ayarları güncellendi." });
        setDeepseekKey("");
        fetchIntegrations();
      } else {
        setDeepseekStatusMsg({ type: "error", text: data.error || "Kayıt sırasında hata oluştu." });
      }
    } catch {
      setDeepseekStatusMsg({ type: "error", text: "Kayıt sırasında bağlantı hatası oluştu." });
    } finally {
      setIsSavingDeepseek(false);
    }
  };

  const handleTestDeepseek = async () => {
    setIsTestingDeepseek(true);
    setDeepseekStatusMsg(null);

    try {
      const res = await fetch("/api/admin/integrations/deepseek/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDeepseekStatusMsg({ type: "success", text: data.message || "DeepSeek bağlantısı başarılı." });
      } else {
        setDeepseekStatusMsg({ type: "error", text: data.error || data.message || "Test başarısız." });
      }
    } catch {
      setDeepseekStatusMsg({ type: "error", text: "Test sırasında bağlantı hatası oluştu." });
    } finally {
      setIsTestingDeepseek(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <span>🔌 SERVİS BAĞLANTILARI</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Dış Servis Entegrasyonları
            </h1>
            <p className="text-xs text-text-secondary">
              Katalog API ve Yapay Zeka (AI) kimlik bilgisi yönetimi (AES-256-GCM şifrelenmiş depolama)
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-text-muted text-xs bg-surface-1 border border-border rounded-2xl">
            Entegrasyonlar yükleniyor...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Catalog Data Provider Card */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                    <span>🎬</span> Katalog API Sağlayıcı (TMDB)
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Film & dizi metadata ve afiş sunucusu entegrasyonu
                  </p>
                </div>
                <AdminStatusBadge
                  status={integrations?.tmdb?.isConfigured ? "ACTIVE" : "PAUSED"}
                  label={
                    integrations?.tmdb?.isConfigured
                      ? `Aktif (••••${integrations.tmdb.lastFour})`
                      : "Dev Fallback"
                  }
                />
              </div>

              {tmdbStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    tmdbStatusMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-red-500/10 border-red-500/25 text-red-400"
                  }`}
                >
                  <span>{tmdbStatusMsg.text}</span>
                  <button type="button" onClick={() => setTmdbStatusMsg(null)} className="ml-2 font-bold opacity-70">
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveTmdb} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary font-medium">
                    TMDB API Anahtarı (API Key)
                  </label>
                  <input
                    type="password"
                    value={tmdbKey}
                    onChange={(e) => setTmdbKey(e.target.value)}
                    placeholder={
                      integrations?.tmdb?.isConfigured
                        ? `••••••••••••${integrations.tmdb.lastFour} (Değiştirmek için yazın)`
                        : "API Anahtarını yapıştırın"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono transition-colors min-h-[40px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingTmdb || !tmdbKey.trim()}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSavingTmdb ? "Kaydediliyor..." : "Anahtarı Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTmdb}
                    disabled={isTestingTmdb || !integrations?.tmdb?.isConfigured}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-2 border border-border text-text-primary font-medium text-xs hover:bg-surface-3 transition-all disabled:opacity-50"
                  >
                    {isTestingTmdb ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
                  </button>
                </div>
              </form>
            </div>

            {/* AI Provider Integration Card */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                    <span>🤖</span> Yapay Zeka (AI) Sağlayıcı
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Film/Dizi DNA ve hibrit öneri yapay zeka servisi (DeepSeek)
                  </p>
                </div>
                <AdminStatusBadge
                  status={integrations?.deepseek?.isConfigured ? "ACTIVE" : "PAUSED"}
                  label={
                    integrations?.deepseek?.isConfigured
                      ? `Aktif (••••${integrations.deepseek.lastFour})`
                      : "Yapılandırılmadı"
                  }
                />
              </div>

              {deepseekStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    deepseekStatusMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-red-500/10 border-red-500/25 text-red-400"
                  }`}
                >
                  <span>{deepseekStatusMsg.text}</span>
                  <button type="button" onClick={() => setDeepseekStatusMsg(null)} className="ml-2 font-bold opacity-70">
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveDeepseek} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary font-medium">AI API Anahtarı (API Key)</label>
                  <input
                    type="password"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    placeholder={
                      integrations?.deepseek?.isConfigured
                        ? `••••••••••••${integrations.deepseek.lastFour} (Değiştirmek için yazın)`
                        : "AI API Anahtarını yapıştırın"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono transition-colors min-h-[40px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Base URL</label>
                    <input
                      type="text"
                      value={deepseekBaseUrl}
                      onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent min-h-[40px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Model ID</label>
                    <input
                      type="text"
                      value={deepseekModelId}
                      onChange={(e) => setDeepseekModelId(e.target.value)}
                      placeholder="deepseek-v4-flash"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent min-h-[40px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-surface-2 border border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="deepseekEnabled"
                      checked={deepseekEnabled}
                      onChange={(e) => setDeepseekEnabled(e.target.checked)}
                      className="w-4 h-4 rounded bg-surface-1 border-border text-accent focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-text-primary">
                      AI Provider Servisi Aktif Olsun
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingDeepseek}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSavingDeepseek ? "Kaydediliyor..." : "Ayarları Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestDeepseek}
                    disabled={isTestingDeepseek || !integrations?.deepseek?.isConfigured}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-2 border border-border text-text-primary font-medium text-xs hover:bg-surface-3 transition-all disabled:opacity-50"
                  >
                    {isTestingDeepseek ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
