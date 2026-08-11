"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TMDB State
  const [tmdbKey, setTmdbKey] = useState("");
  const [tmdbStatusMsg, setTmdbStatusMsg] = useState<string | null>(null);
  const [isSavingTmdb, setIsSavingTmdb] = useState(false);
  const [isTestingTmdb, setIsTestingTmdb] = useState(false);

  // DeepSeek State
  const [deepseekKey, setDeepseekKey] = useState("");
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("https://api.deepseek.com");
  const [deepseekModelId, setDeepseekModelId] = useState("deepseek-chat");
  const [deepseekEnabled, setDeepseekEnabled] = useState(true);
  const [deepseekStatusMsg, setDeepseekStatusMsg] = useState<string | null>(null);
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
      setTmdbStatusMsg(data.message || data.error);
      if (res.ok) {
        setTmdbKey("");
        fetchIntegrations();
      }
    } catch {
      setTmdbStatusMsg("Kayıt sırasında hata oluştu.");
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
      setTmdbStatusMsg(data.message);
    } catch {
      setTmdbStatusMsg("Test sırasında hata oluştu.");
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
      setDeepseekStatusMsg(data.message || data.error);
      if (res.ok) {
        setDeepseekKey("");
        fetchIntegrations();
      }
    } catch {
      setDeepseekStatusMsg("Kayıt sırasında hata oluştu.");
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
      setDeepseekStatusMsg(data.message);
    } catch {
      setDeepseekStatusMsg("Test sırasında hata oluştu.");
    } finally {
      setIsTestingDeepseek(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Dış Servis Entegrasyonları
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            TMDB API ve DeepSeek AI credential yönetimi (AES-256-GCM şifrelenmiş depolama)
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            Entegrasyonlar yükleniyor...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TMDB Integration Card */}
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-5 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-text-primary">
                    TMDB API Configuration
                  </h2>
                  <p className="text-xs text-text-muted font-mono">
                    Film metadata ve afiş sunucusu entegrasyonu
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                    integrations?.tmdb?.isConfigured
                      ? "bg-success/15 border border-success/30 text-success"
                      : "bg-warning/15 border border-warning/30 text-warning"
                  }`}
                >
                  {integrations?.tmdb?.isConfigured
                    ? `Aktif (••••${integrations.tmdb.lastFour})`
                    : "Dev Fallback"}
                </span>
              </div>

              {tmdbStatusMsg && (
                <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono">
                  {tmdbStatusMsg}
                </div>
              )}

              <form onSubmit={handleSaveTmdb} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary font-medium">
                    TMDB API Key (v3 auth)
                  </label>
                  <input
                    type="password"
                    value={tmdbKey}
                    onChange={(e) => setTmdbKey(e.target.value)}
                    placeholder={
                      integrations?.tmdb?.isConfigured
                        ? `••••••••••••${integrations.tmdb.lastFour} (Değiştirmek için yazın)`
                        : "TMDB API Anahtarını yapıştırın"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent font-mono transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingTmdb || !tmdbKey.trim()}
                    className="px-4 py-2.5 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all disabled:opacity-50"
                  >
                    {isSavingTmdb ? "Kaydediliyor..." : "Anahtarı Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTmdb}
                    disabled={isTestingTmdb || !integrations?.tmdb?.isConfigured}
                    className="px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary font-medium text-xs hover:bg-border/60 transition-all disabled:opacity-50"
                  >
                    {isTestingTmdb ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
                  </button>
                </div>
              </form>
            </div>

            {/* DeepSeek AI Provider Integration Card */}
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-5 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-text-primary">
                    DeepSeek AI Provider
                  </h2>
                  <p className="text-xs text-text-muted font-mono">
                    Film DNA ve recommendation yapay zeka servisi
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                    integrations?.deepseek?.isConfigured
                      ? "bg-success/15 border border-success/30 text-success"
                      : "bg-surface border border-border text-text-muted"
                  }`}
                >
                  {integrations?.deepseek?.isConfigured
                    ? `Aktif (••••${integrations.deepseek.lastFour})`
                    : "Yapılandırılmadı"}
                </span>
              </div>

              {deepseekStatusMsg && (
                <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono">
                  {deepseekStatusMsg}
                </div>
              )}

              <form onSubmit={handleSaveDeepseek} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary font-medium">API Key</label>
                  <input
                    type="password"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    placeholder={
                      integrations?.deepseek?.isConfigured
                        ? `••••••••••••${integrations.deepseek.lastFour} (Değiştirmek için yazın)`
                        : "sk-..."
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent font-mono transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Base URL</label>
                    <input
                      type="text"
                      value={deepseekBaseUrl}
                      onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Model ID</label>
                    <input
                      type="text"
                      value={deepseekModelId}
                      onChange={(e) => setDeepseekModelId(e.target.value)}
                      placeholder="deepseek-chat"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="deepseekEnabled"
                    checked={deepseekEnabled}
                    onChange={(e) => setDeepseekEnabled(e.target.checked)}
                    className="rounded bg-surface-elevated border-border text-accent focus:ring-0"
                  />
                  <label htmlFor="deepseekEnabled" className="text-xs text-text-secondary font-mono">
                    Provider Servisi Aktif Olsun
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingDeepseek}
                    className="px-4 py-2.5 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all disabled:opacity-50"
                  >
                    {isSavingDeepseek ? "Kaydediliyor..." : "Ayarları Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestDeepseek}
                    disabled={isTestingDeepseek || !integrations?.deepseek?.isConfigured}
                    className="px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary font-medium text-xs hover:bg-border/60 transition-all disabled:opacity-50"
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
