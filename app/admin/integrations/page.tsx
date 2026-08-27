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

  // PayTR State
  const [paytrMerchantId, setPaytrMerchantId] = useState("");
  const [paytrMerchantKey, setPaytrMerchantKey] = useState("");
  const [paytrMerchantSalt, setPaytrMerchantSalt] = useState("");
  const [paytrTestMode, setPaytrTestMode] = useState(true);
  const [paytrEnabled, setPaytrEnabled] = useState(false);
  const [paytrBillingEnabled, setPaytrBillingEnabled] = useState(false);
  const [paytrMonthlyPrice, setPaytrMonthlyPrice] = useState("99.00");
  const [paytrYearlyPrice, setPaytrYearlyPrice] = useState("990.00");
  const [paytrCurrency, setPaytrCurrency] = useState("TRY");
  const [paytrGracePeriodDays, setPaytrGracePeriodDays] = useState(3);
  const [paytrRecurringEnabled, setPaytrRecurringEnabled] = useState(false);
  const [paytrNon3dEnabled, setPaytrNon3dEnabled] = useState(false);
  const [paytrStatusMsg, setPaytrStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingPaytr, setIsSavingPaytr] = useState(false);
  const [isTestingPaytr, setIsTestingPaytr] = useState(false);

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

        if (data.integrations?.paytr) {
          const p = data.integrations.paytr;
          if (p.merchantId) setPaytrMerchantId(p.merchantId);
          if (typeof p.testMode === "boolean") setPaytrTestMode(p.testMode);
          if (typeof p.enabled === "boolean") setPaytrEnabled(p.enabled);
          if (typeof p.billingEnabled === "boolean") setPaytrBillingEnabled(p.billingEnabled);
          if (typeof p.monthlyPrice === "number") {
            setPaytrMonthlyPrice(p.monthlyPrice.toString());
          } else {
            setPaytrMonthlyPrice("");
          }
          if (typeof p.yearlyPrice === "number") {
            setPaytrYearlyPrice(p.yearlyPrice.toString());
          } else {
            setPaytrYearlyPrice("");
          }
          if (p.currency) setPaytrCurrency(p.currency);
          if (typeof p.gracePeriodDays === "number") setPaytrGracePeriodDays(p.gracePeriodDays);
          if (typeof p.recurringEnabled === "boolean") setPaytrRecurringEnabled(p.recurringEnabled);
          if (typeof p.non3dEnabled === "boolean") setPaytrNon3dEnabled(p.non3dEnabled);
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

  const handleSavePaytr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPaytr(true);
    setPaytrStatusMsg(null);

    const parsedMonthly = paytrMonthlyPrice.trim() ? parseFloat(paytrMonthlyPrice.trim()) : null;
    const parsedYearly = paytrYearlyPrice.trim() ? parseFloat(paytrYearlyPrice.trim()) : null;

    if (parsedMonthly !== null && (isNaN(parsedMonthly) || parsedMonthly <= 0)) {
      setPaytrStatusMsg({ type: "error", text: "Aylık fiyat 0'dan büyük bir sayı olmalıdır veya boş bırakılmalıdır." });
      setIsSavingPaytr(false);
      return;
    }
    if (parsedYearly !== null && (isNaN(parsedYearly) || parsedYearly <= 0)) {
      setPaytrStatusMsg({ type: "error", text: "Yıllık fiyat 0'dan büyük bir sayı olmalıdır veya boş bırakılmalıdır." });
      setIsSavingPaytr(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/integrations/paytr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: paytrMerchantId || undefined,
          merchantKey: paytrMerchantKey || undefined,
          merchantSalt: paytrMerchantSalt || undefined,
          testMode: paytrTestMode,
          enabled: paytrEnabled,
          billingEnabled: paytrBillingEnabled,
          monthlyPrice: parsedMonthly,
          yearlyPrice: parsedYearly,
          currency: paytrCurrency,
          gracePeriodDays: paytrGracePeriodDays,
          recurringEnabled: paytrRecurringEnabled,
          non3dEnabled: paytrNon3dEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaytrStatusMsg({ type: "success", text: data.message || "PayTR ayarları başarıyla güncellendi." });
        setPaytrMerchantKey("");
        setPaytrMerchantSalt("");
        fetchIntegrations();
      } else {
        setPaytrStatusMsg({ type: "error", text: data.error || "Kayıt sırasında hata oluştu." });
      }
    } catch {
      setPaytrStatusMsg({ type: "error", text: "Kayıt sırasında bağlantı hatası oluştu." });
    } finally {
      setIsSavingPaytr(false);
    }
  };

  const handleTestPaytr = async () => {
    setIsTestingPaytr(true);
    setPaytrStatusMsg(null);

    try {
      const res = await fetch("/api/admin/integrations/paytr/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPaytrStatusMsg({ type: "success", text: data.message || "PayTR yapılandırma doğrulaması başarılı." });
        fetchIntegrations();
      } else {
        setPaytrStatusMsg({ type: "error", text: data.error || data.message || "Doğrulama başarısız." });
      }
    } catch {
      setPaytrStatusMsg({ type: "error", text: "Doğrulama sırasında bağlantı hatası oluştu." });
    } finally {
      setIsTestingPaytr(false);
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
              Katalog API, Yapay Zeka (AI) ve PayTR Ödeme/Abonelik kimlik bilgisi yönetimi (AES-256-GCM şifrelenmiş depolama)
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-text-muted text-xs bg-surface-1 border border-border rounded-2xl">
            Entegrasyonlar yükleniyor...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TMDB Integration Card */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                  <div>
                    <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                      <span>🎬</span> TMDB Katalog API
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Film ve Dizi metaveri, afiş ve kadro veri sağlayıcısı
                    </p>
                  </div>
                  <AdminStatusBadge
                    status={integrations?.tmdb?.isConfigured ? "ACTIVE" : "PAUSED"}
                    label={
                      integrations?.tmdb?.isConfigured
                        ? `Aktif (••••${integrations.tmdb.lastFour})`
                        : "Yapılandırılmadı"
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

            {/* PayTR Payment & Billing Integration Card */}
            <div className="p-6 rounded-2xl bg-surface-1 border border-border space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
                    <span>💳</span> PayTR Ödeme & Abonelik Entegrasyonu
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    SINEAI Premium tek hesap abonelikleri, sanal POS ve webhook altyapısı (AES-256-GCM şifreli)
                  </p>
                </div>
                <AdminStatusBadge
                  status={
                    integrations?.paytr?.status === "ACTIVE"
                      ? "ACTIVE"
                      : integrations?.paytr?.status === "DISABLED"
                      ? "DISABLED"
                      : integrations?.paytr?.status === "ERROR"
                      ? "ERROR"
                      : "PAUSED"
                  }
                  label={
                    integrations?.paytr?.status === "ACTIVE"
                      ? "Aktif & Satış Açık"
                      : integrations?.paytr?.status === "TESTED"
                      ? "Yapılandırma Doğrulandı"
                      : integrations?.paytr?.status === "CONFIGURED"
                      ? "Yapılandırıldı"
                      : integrations?.paytr?.status === "DISABLED"
                      ? "Devre Dışı"
                      : integrations?.paytr?.status === "ERROR"
                      ? "Hata Durumu"
                      : "Yapılandırılmadı"
                  }
                />
              </div>

              {paytrStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    paytrStatusMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-red-500/10 border-red-500/25 text-red-400"
                  }`}
                >
                  <span>{paytrStatusMsg.text}</span>
                  <button type="button" onClick={() => setPaytrStatusMsg(null)} className="ml-2 font-bold opacity-70">
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSavePaytr} className="space-y-4">
                {/* Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Merchant ID</label>
                    <input
                      type="text"
                      value={paytrMerchantId}
                      onChange={(e) => setPaytrMerchantId(e.target.value)}
                      placeholder="Örn: 123456"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono transition-colors min-h-[40px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Merchant Key</label>
                    <input
                      type="password"
                      value={paytrMerchantKey}
                      onChange={(e) => setPaytrMerchantKey(e.target.value)}
                      placeholder={
                        integrations?.paytr?.merchantKeyMasked
                          ? `${integrations.paytr.merchantKeyMasked} (Değiştirmek için yazın)`
                          : "Merchant Key yapıştırın"
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono transition-colors min-h-[40px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Merchant Salt</label>
                    <input
                      type="password"
                      value={paytrMerchantSalt}
                      onChange={(e) => setPaytrMerchantSalt(e.target.value)}
                      placeholder={
                        integrations?.paytr?.merchantSaltMasked
                          ? `${integrations.paytr.merchantSaltMasked} (Değiştirmek için yazın)`
                          : "Merchant Salt yapıştırın"
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono transition-colors min-h-[40px]"
                    />
                  </div>
                </div>

                {/* Pricing & Grace Period */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Aylık Fiyat</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paytrMonthlyPrice}
                      onChange={(e) => setPaytrMonthlyPrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent min-h-[40px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Yıllık Fiyat</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paytrYearlyPrice}
                      onChange={(e) => setPaytrYearlyPrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent min-h-[40px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Para Birimi</label>
                    <input
                      type="text"
                      value={paytrCurrency}
                      onChange={(e) => setPaytrCurrency(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent min-h-[40px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-secondary font-medium">Grace Period (Gün)</label>
                    <input
                      type="number"
                      value={paytrGracePeriodDays}
                      onChange={(e) => setPaytrGracePeriodDays(parseInt(e.target.value, 10) || 3)}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent min-h-[40px]"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-surface-2 border border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paytrEnabled}
                        onChange={(e) => setPaytrEnabled(e.target.checked)}
                        className="w-4 h-4 rounded bg-surface-1 border-border text-accent focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-text-primary">PayTR Provider Açık</span>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-2 border border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paytrBillingEnabled}
                        onChange={(e) => setPaytrBillingEnabled(e.target.checked)}
                        className="w-4 h-4 rounded bg-surface-1 border-border text-accent focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-text-primary">Canlı Satış Açık</span>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-2 border border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paytrTestMode}
                        onChange={(e) => setPaytrTestMode(e.target.checked)}
                        className="w-4 h-4 rounded bg-surface-1 border-border text-accent focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-text-primary">PayTR Test Modu</span>
                    </label>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-2 border border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paytrRecurringEnabled}
                        onChange={(e) => setPaytrRecurringEnabled(e.target.checked)}
                        className="w-4 h-4 rounded bg-surface-1 border-border text-accent focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-text-primary">Tekrarlayan (Recurring)</span>
                    </label>
                  </div>
                </div>

                {/* Diagnostics Status Metadata */}
                <div className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1.5 text-xs text-text-secondary">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px]">Webhook Callback URL:</span>
                    <span className="font-mono text-accent font-semibold text-[11px] select-all">
                      {integrations?.paytr?.callbackUrl || "https://sineai.com.tr/api/billing/paytr/callback"}
                    </span>
                  </div>
                  {integrations?.paytr?.lastTestedAt && (
                    <div className="flex justify-between">
                       <span>Son Yapılandırma Doğrulaması:</span>
                      <span className="text-text-primary font-mono">{new Date(integrations.paytr.lastTestedAt).toLocaleString("tr-TR")}</span>
                    </div>
                  )}
                  {integrations?.paytr?.lastSuccessfulCallback && (
                    <div className="flex justify-between">
                      <span>Son Başarılı Callback:</span>
                      <span className="text-emerald-400 font-mono">{new Date(integrations.paytr.lastSuccessfulCallback).toLocaleString("tr-TR")}</span>
                    </div>
                  )}
                  {integrations?.paytr?.lastCallbackError && (
                    <div className="flex justify-between">
                      <span>Son Callback Hatası:</span>
                      <span className="text-red-400 font-mono">{integrations.paytr.lastCallbackError}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPaytr}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-hover transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSavingPaytr ? "Kaydediliyor..." : "PayTR Ayarlarını Kaydet"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPaytr}
                    disabled={isTestingPaytr || !integrations?.paytr?.merchantId}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-2 border border-border text-text-primary font-medium text-xs hover:bg-surface-3 transition-all disabled:opacity-50"
                  >
                    {isTestingPaytr ? "Doğrulanıyor..." : "Yapılandırmayı Doğrula"}
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
