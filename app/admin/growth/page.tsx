"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

type GrowthTab = "overview" | "seo" | "google" | "bing" | "yandex" | "indexnow" | "verification";

export default function AdminGrowthPage() {
  const [activeTab, setActiveTab] = useState<GrowthTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Overview Data & Monetization Readiness
  const [overview, setOverview] = useState<any>(null);
  const [monetization, setMonetization] = useState<any>(null);

  // SEO Config & Metrics
  const [seoConfig, setSeoConfig] = useState<any>(null);
  const [seoMetrics, setSeoMetrics] = useState<any>(null);
  const [isSavingSeo, setIsSavingSeo] = useState(false);

  // SEO Search / Inspection
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // SEO Diagnostics
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // Google State
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [selectedGaProperty, setSelectedGaProperty] = useState("");
  const [gaMeasurementId, setGaMeasurementId] = useState("");
  const [gaTrackingEnabled, setGaTrackingEnabled] = useState(false);
  const [isSavingGa, setIsSavingGa] = useState(false);

  const [gscSites, setGscSites] = useState<any[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState("");
  const [gscAnalytics, setGscAnalytics] = useState<any>(null);
  const [isSubmittingGscSitemap, setIsSubmittingGscSitemap] = useState(false);

  const [inspectUrl, setInspectUrl] = useState("");
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [isInspectingUrl, setIsInspectingUrl] = useState(false);

  const [adsenseHealth, setAdsenseHealth] = useState<any>(null);

  // Bing State
  const [bingData, setBingData] = useState<any>(null);
  const [isSubmittingBingSitemap, setIsSubmittingBingSitemap] = useState(false);

  // Yandex State
  const [yandexData, setYandexData] = useState<any>(null);

  // IndexNow State
  const [indexNowConfig, setIndexNowConfig] = useState<any>(null);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);

  // Verification Tags
  const [googleMetaTag, setGoogleMetaTag] = useState("");
  const [bingMetaTag, setBingMetaTag] = useState("");
  const [yandexMetaTag, setYandexMetaTag] = useState("");
  const [isSavingMetaTags, setIsSavingMetaTags] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/growth/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setSeoMetrics(data.metrics);
        setMonetization(data.monetizationReadiness);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchSeoSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/growth/seo");
      if (res.ok) {
        const data = await res.json();
        setSeoConfig(data.config);
        setSeoMetrics(data.metrics);
        setGoogleMetaTag(data.config?.googleVerificationMeta || "");
        setBingMetaTag(data.config?.bingVerificationMeta || "");
        setYandexMetaTag(data.config?.yandexVerificationMeta || "");
        setGaMeasurementId(data.config?.gaMeasurementId || "");
        setGaTrackingEnabled(data.config?.gaTrackingEnabled === true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchGoogleDetails = useCallback(async () => {
    try {
      const [gaRes, gscRes, adsenseRes] = await Promise.all([
        fetch("/api/admin/growth/google/analytics"),
        fetch("/api/admin/growth/google/search-console"),
        fetch("/api/admin/growth/google/adsense"),
      ]);

      if (gaRes.ok) {
        const gaData = await gaRes.json();
        setGoogleAccounts(gaData.accounts || []);
      }
      if (gscRes.ok) {
        const gscData = await gscRes.json();
        setGscSites(gscData.sites || []);
      }
      if (adsenseRes.ok) {
        const adsData = await adsenseRes.json();
        setAdsenseHealth(adsData);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchBingDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/growth/bing");
      if (res.ok) {
        const data = await res.json();
        setBingData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchYandexDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/growth/yandex");
      if (res.ok) {
        const data = await res.json();
        setYandexData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchIndexNowDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/growth/indexnow");
      if (res.ok) {
        const data = await res.json();
        setIndexNowConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchSeoSettings(),
      fetchGoogleDetails(),
      fetchBingDetails(),
      fetchYandexDetails(),
      fetchIndexNowDetails(),
    ]);
    setIsLoading(false);
  }, [
    fetchOverview,
    fetchSeoSettings,
    fetchGoogleDetails,
    fetchBingDetails,
    fetchYandexDetails,
    fetchIndexNowDetails,
  ]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle OAuth Connect
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch("/api/admin/growth/google/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setStatusMsg({ type: "error", text: data.error || "Yetkilendirme URL'si alınamadı" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Google bağlantısı başlatılamadı." });
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Google Growth entegrasyonu bağlantısını kesmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/growth/google/disconnect", { method: "POST" });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Google bağlantısı kesildi." });
        loadAllData();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı kesilemedi." });
    }
  };

  const handleConnectBing = async () => {
    try {
      const res = await fetch("/api/admin/growth/bing/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setStatusMsg({ type: "error", text: data.error || "Bing yetkilendirme başlatılamadı." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bing bağlantısı başlatılamadı." });
    }
  };

  const handleDisconnectBing = async () => {
    if (!confirm("Bing bağlantısını kesmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/growth/bing/disconnect", { method: "POST" });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Bing bağlantısı kesildi." });
        loadAllData();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı kesilemedi." });
    }
  };

  const handleConnectYandex = async () => {
    try {
      const res = await fetch("/api/admin/growth/yandex/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setStatusMsg({ type: "error", text: data.error || "Yandex yetkilendirme başlatılamadı." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Yandex bağlantısı başlatılamadı." });
    }
  };

  const handleDisconnectYandex = async () => {
    if (!confirm("Yandex bağlantısını kesmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/growth/yandex/disconnect", { method: "POST" });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Yandex bağlantısı kesildi." });
        loadAllData();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı kesilemedi." });
    }
  };

  // Save SEO Settings
  const handleSaveSeoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSeo(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seoMasterEnabled: seoConfig.seoMasterEnabled,
          movieIndexingEnabled: seoConfig.movieIndexingEnabled,
          tvIndexingEnabled: seoConfig.tvIndexingEnabled,
          movieMaxIndexed: parseInt(seoConfig.movieMaxIndexed, 10),
          tvMaxIndexed: parseInt(seoConfig.tvMaxIndexed, 10),
          tmdbCommercialLicenseVerified: seoConfig.tmdbCommercialLicenseVerified,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "SEO ayarları kaydedildi." });
        setSeoConfig(data.config);
        fetchOverview();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Kayıt başarısız" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası oluştu" });
    } finally {
      setIsSavingSeo(false);
    }
  };

  // Search / Inspect Content
  const handleSearchSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/seo/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.results || []);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Arama başarısız" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Arama sırasında bağlantı hatası" });
    } finally {
      setIsSearching(false);
    }
  };

  // Set Manual Override
  const handleSetOverride = async (mediaType: "FILM" | "TV", tmdbId: number, override: string) => {
    try {
      const res = await fetch("/api/admin/growth/seo/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_OVERRIDE", mediaType, tmdbId, override }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: `SEO Durumu (${override}) olarak güncellendi.` });
        handleSearchSeo({ preventDefault: () => {} } as any);
        fetchOverview();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Override kaydedilemedi." });
    }
  };

  // Run SEO Diagnostics
  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/seo/diagnostics", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDiagnosticsReport(data);
        setStatusMsg({ type: "success", text: "SEO Teşhisi tamamlandı." });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Teşhis çalıştırılamadı." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Teşhis sırasında hata oluştu." });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Save GA4 Selection
  const handleSaveGaSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGa(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/google/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedGaProperty,
          measurementId: gaMeasurementId,
          trackingEnabled: gaTrackingEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "GA4 ayarları kaydedildi." });
        loadAllData();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Kayıt başarısız" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      setIsSavingGa(false);
    }
  };

  // Select Search Console Site & Load Sitemaps/Analytics
  const handleSelectGscSite = async (siteUrl: string) => {
    setSelectedGscSite(siteUrl);
    try {
      const res = await fetch(`/api/admin/growth/google/search-console?siteUrl=${encodeURIComponent(siteUrl)}`);
      if (res.ok) {
        const data = await res.json();
        setGscAnalytics(data.analytics || null);
      }

      await fetch("/api/admin/growth/google/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SELECT_PROPERTY", siteUrl }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Submit GSC Sitemap
  const handleSubmitGscSitemap = async () => {
    if (!selectedGscSite) {
      setStatusMsg({ type: "error", text: "Lütfen önce Search Console sitesi seçin." });
      return;
    }
    setIsSubmittingGscSitemap(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/google/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_SITEMAP", siteUrl: selectedGscSite }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "Sitemap gönderildi." });
        handleSelectGscSite(selectedGscSite);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Sitemap gönderilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası." });
    } finally {
      setIsSubmittingGscSitemap(false);
    }
  };

  // Inspect URL in Search Console
  const handleInspectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGscSite || !inspectUrl.trim()) {
      setStatusMsg({ type: "error", text: "Lütfen Search Console mülkü ve denetlenecek URL girin." });
      return;
    }
    setIsInspectingUrl(true);
    setStatusMsg(null);
    setInspectResult(null);

    try {
      const res = await fetch("/api/admin/growth/google/search-console/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: selectedGscSite, inspectionUrl: inspectUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setInspectResult(data);
      } else {
        setStatusMsg({ type: "error", text: data.error || "URL denetimi başarısız" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Denetim sırasında hata oluştu." });
    } finally {
      setIsInspectingUrl(false);
    }
  };

  // Rotate IndexNow Key
  const handleRotateIndexNowKey = async () => {
    if (!confirm("IndexNow anahtarını yenilemek istediğinize emin misiniz?")) return;
    setIsRotatingKey(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ROTATE_KEY" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "Anahtar yenilendi." });
        setIndexNowConfig(data.config);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Anahtar yenilenemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası." });
    } finally {
      setIsRotatingKey(false);
    }
  };

  // Test IndexNow Ping
  const handleTestIndexNowPing = async () => {
    setIsTestingPing(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_PING" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: "success", text: `IndexNow test ping başarılı (${data.count} URL).` });
        fetchIndexNowDetails();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Test ping başarısız." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası." });
    } finally {
      setIsTestingPing(false);
    }
  };

  // Save Verification Meta Tags
  const handleSaveMetaTags = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMetaTags(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/growth/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleVerificationMeta: googleMetaTag,
          bingVerificationMeta: bingMetaTag,
          yandexVerificationMeta: yandexMetaTag,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Doğrulama etiketleri kaydedildi." });
        fetchSeoSettings();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Kayıt başarısız" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası." });
    } finally {
      setIsSavingMetaTags(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl font-sans pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary tracking-tight">
              Growth & SEO Yönetim Merkezi
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Organik arama görünürlüğü, dizin yönetimi ve büyüme entegrasyonları platformu.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
            >
              ↻ Yenile
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between animate-fadeIn ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-xs font-mono opacity-80 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto">
          {[
            { id: "overview", label: "📊 Genel Bakış & Monetization" },
            { id: "seo", label: "🎯 SEO & İndeksleme" },
            { id: "google", label: "🌐 Google (GA4, GSC, AdSense)" },
            { id: "bing", label: "🔷 Bing Webmaster" },
            { id: "yandex", label: "🔴 Yandex Webmaster" },
            { id: "indexnow", label: "⚡ IndexNow" },
            { id: "verification", label: "🏷️ Doğrulama Kodları" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as GrowthTab);
                setStatusMsg(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-accent text-white font-semibold shadow-sm"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary border border-border/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & MONETIZATION READINESS */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Monetization Readiness Master Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-accent/30 space-y-5 shadow-cinematic">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent mb-1">
                    💰 MONETIZATION READINESS CHECKLIST
                  </div>
                  <h2 className="text-lg font-display font-bold text-text-primary">
                    Gelir Modeli & Reklam Hazırlık Durumu
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge status="WARNING" label="REKLAMLAR KAPALI (PHASE I-A/I-B)" />
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                AdSense entegrasyonu bu fazda salt-okunur (read-only) bağlanır. Reklam yerleşimleri açılmadan önce aşağıdaki tüm maddelerin onaylanması zorunludur.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">AdSense Hesabı</p>
                  <p className={`text-xs font-bold font-mono ${monetization?.adsenseConnected ? "text-emerald-400" : "text-amber-400"}`}>
                    {monetization?.adsenseConnected ? "✓ Bağlandı" : "Beklemede"}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">Site Durumu</p>
                  <p className="text-xs font-bold font-mono text-text-primary">
                    {monetization?.adsenseSiteStatus || "NOT_DETECTED"}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">TMDB Ticari Lisans</p>
                  <p className={`text-xs font-bold font-mono ${seoConfig?.tmdbCommercialLicenseVerified ? "text-emerald-400" : "text-red-400"}`}>
                    {seoConfig?.tmdbCommercialLicenseVerified ? "✓ ONAYLANDI" : "MANUAL CHECK REQUIRED"}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">Gizlilik Politikası</p>
                  <p className="text-xs font-bold font-mono text-emerald-400">✓ /legal/privacy</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">ads.txt Durumu</p>
                  <p className="text-xs font-bold font-mono text-text-muted">Phase I-D (Beklemede)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">CMP (Consent Manager)</p>
                  <p className="text-xs font-bold font-mono text-text-muted">Phase I-D (Beklemede)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">Consent Mode</p>
                  <p className="text-xs font-bold font-mono text-emerald-400">✓ Safe Default (Active)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-1">
                  <p className="text-[11px] font-mono text-text-muted">Ads Master Switch</p>
                  <p className="text-xs font-bold font-mono text-red-400">FALSE (Devre Dışı)</p>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-surface-1 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>SEO UYGUN FİLMLER</span>
                  <span>🎬</span>
                </div>
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {seoMetrics?.eligibleMovies?.toLocaleString("tr-TR") || 0}
                  <span className="text-xs text-text-muted font-sans ml-1.5">
                    / {seoMetrics?.totalMovies?.toLocaleString("tr-TR") || 0}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Dizin Limiti: {seoMetrics?.indexedMoviesCount?.toLocaleString("tr-TR") || 0} (Maks: {seoMetrics?.movieRolloutLimit || 0})
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-1 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>SEO UYGUN DİZİLER</span>
                  <span>📺</span>
                </div>
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {seoMetrics?.eligibleTvShows?.toLocaleString("tr-TR") || 0}
                  <span className="text-xs text-text-muted font-sans ml-1.5">
                    / {seoMetrics?.totalTvShows?.toLocaleString("tr-TR") || 0}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Dizin Limiti: {seoMetrics?.indexedTvShowsCount?.toLocaleString("tr-TR") || 0} (Maks: {seoMetrics?.tvRolloutLimit || 0})
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-1 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>SITEMAP TOPLAM URL</span>
                  <span>🗺️</span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {seoMetrics?.totalSitemapUrls?.toLocaleString("tr-TR") || 0}
                </div>
                <p className="text-[11px] text-text-secondary">
                  Durum: {seoConfig?.seoMasterEnabled ? "İndeksleme Aktif" : "İndeksleme Kapalı (Güvenli)"}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-1 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                  <span>INDEXNOW GÖNDERİM</span>
                  <span>⚡</span>
                </div>
                <div className="text-2xl font-bold font-mono text-accent">
                  {overview?.providers?.indexnow?.totalSubmissions || 0}
                </div>
                <p className="text-[11px] text-text-secondary">
                  Durum: {overview?.providers?.indexnow?.enabled ? "Etkin" : "Devre Dışı"}
                </p>
              </div>
            </div>

            {/* Provider Connection Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Google Hub Card */}
              <div className="p-6 rounded-3xl bg-surface-1 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-lg">
                      🌐
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-sm text-text-primary">Google Entegrasyonu</h2>
                      <p className="text-xs text-text-muted">GA4, Search Console, AdSense (Salt Okunur)</p>
                    </div>
                  </div>
                  <AdminStatusBadge
                    status={overview?.providers?.google?.connected ? "OK" : "WARNING"}
                    label={overview?.providers?.google?.connected ? "BAĞLI" : "BAĞLANTI YOK"}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-2/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Bağlı Hesap:</span>
                    <span className="text-text-primary">{overview?.providers?.google?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">GA4 Mülkü:</span>
                    <span className="text-text-primary">{overview?.providers?.google?.gaProperty || "Seçilmedi"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Search Console:</span>
                    <span className="text-text-primary">{overview?.providers?.google?.gscProperty || "Seçilmedi"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">AdSense Durumu:</span>
                    <span className="text-text-primary">
                      {overview?.providers?.google?.adsenseConnected ? "Algılandı (Read-Only)" : "Yok / Beklemede"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("google")}
                    className="flex-1 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"
                  >
                    Google Yönetimi →
                  </button>
                </div>
              </div>

              {/* Bing Hub Card */}
              <div className="p-6 rounded-3xl bg-surface-1 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg">
                      🔷
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-sm text-text-primary">Bing Webmaster</h2>
                      <p className="text-xs text-text-muted">Microsoft OAuth 2.0 & Sitemap Entegrasyonu</p>
                    </div>
                  </div>
                  <AdminStatusBadge
                    status={overview?.providers?.bing?.connected ? "OK" : "WARNING"}
                    label={overview?.providers?.bing?.connected ? "BAĞLI" : "BAĞLANTI YOK"}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-2/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Site URL:</span>
                    <span className="text-text-primary">{overview?.providers?.bing?.siteUrl || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Son Eşitleme:</span>
                    <span className="text-text-primary">{overview?.providers?.bing?.lastSyncAt ? new Date(overview.providers.bing.lastSyncAt).toLocaleString("tr-TR") : "—"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("bing")}
                    className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-text-primary transition-colors"
                  >
                    Bing Yönetimi →
                  </button>
                </div>
              </div>

              {/* Yandex Hub Card */}
              <div className="p-6 rounded-3xl bg-surface-1 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-lg">
                      🔴
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-sm text-text-primary">Yandex Webmaster</h2>
                      <p className="text-xs text-text-muted">Yandex API v4 & Dizin Takibi</p>
                    </div>
                  </div>
                  <AdminStatusBadge
                    status={overview?.providers?.yandex?.connected ? "OK" : "WARNING"}
                    label={overview?.providers?.yandex?.connected ? "BAĞLI" : "BAĞLANTI YOK"}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-2/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Kullanıcı:</span>
                    <span className="text-text-primary">{overview?.providers?.yandex?.login || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Seçili Host:</span>
                    <span className="text-text-primary">{overview?.providers?.yandex?.hostUrl || "—"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("yandex")}
                    className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-text-primary transition-colors"
                  >
                    Yandex Yönetimi →
                  </button>
                </div>
              </div>

              {/* IndexNow Hub Card */}
              <div className="p-6 rounded-3xl bg-surface-1 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg">
                      ⚡
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-sm text-text-primary">IndexNow Protokolü</h2>
                      <p className="text-xs text-text-muted">Anlık Canonical URL Bildirim Motoru</p>
                    </div>
                  </div>
                  <AdminStatusBadge
                    status={indexNowConfig?.enabled ? "OK" : "WARNING"}
                    label={indexNowConfig?.enabled ? "AKTİF" : "KAPALI"}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-2/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Toplam Gönderim:</span>
                    <span className="text-text-primary">{indexNowConfig?.totalSubmissions || 0} URL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Key Endpoint:</span>
                    <span className="text-accent truncate max-w-xs">{indexNowConfig?.keyLocation || "—"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("indexnow")}
                    className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-text-primary transition-colors"
                  >
                    IndexNow Yönetimi →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEO & INDEXING */}
        {activeTab === "seo" && (
          <div className="space-y-8">
            {/* Pre-Enable Indexing Health Checklist Banner */}
            <div className="p-6 rounded-3xl bg-surface-1 border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-text-primary">
                    İndeksleme Öncesi Sağlık Kontrol Listesi (Pre-Enable Checklist)
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    İndeksleme açılmadan önce sistemin arama motorlarına hazır olduğundan emin olun.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunDiagnostics}
                  disabled={isRunningDiagnostics}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-mono text-text-primary transition-colors disabled:opacity-50"
                >
                  {isRunningDiagnostics ? "Taranıyor..." : "🔍 Teşhis Çalıştır"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-emerald-400 font-bold">✓</span> Kanonik Rotalar
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-emerald-400 font-bold">✓</span> Robots.txt
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-emerald-400 font-bold">✓</span> Sitemap Sharding
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-emerald-400 font-bold">✓</span> JSON-LD XSS Koruması
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className={diagnosticsReport?.summary?.criticalCount > 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                    {diagnosticsReport?.summary?.criticalCount > 0 ? "✕ Kritik Hata Var" : "✓ Kritik Hata Yok"}
                  </span>
                </div>
              </div>
            </div>

            {/* Staged Rollout Form */}
            <form onSubmit={handleSaveSeoConfig} className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary">Kademeli Yayın & İndeksleme Ayarları</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Arama motorlarına sunulacak canonical URL sınırlarını ve indeksleme anahtarlarını kontrol edin.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">SEO Master Aktif</p>
                    <p className="text-[11px] text-text-muted">Tüm arama motoru dizinleme</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={seoConfig?.seoMasterEnabled || false}
                    onChange={(e) => setSeoConfig({ ...seoConfig, seoMasterEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-accent focus:ring-0"
                  />
                </label>

                <label className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Film İndeksleme</p>
                    <p className="text-[11px] text-text-muted">/film/[slug] sayfaları</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={seoConfig?.movieIndexingEnabled || false}
                    onChange={(e) => setSeoConfig({ ...seoConfig, movieIndexingEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-accent focus:ring-0"
                  />
                </label>

                <label className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Dizi İndeksleme</p>
                    <p className="text-[11px] text-text-muted">/dizi/[slug] sayfaları</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={seoConfig?.tvIndexingEnabled || false}
                    onChange={(e) => setSeoConfig({ ...seoConfig, tvIndexingEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-accent focus:ring-0"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-muted">Film Maksimum İndekslenecek Sayfa Sayısı</label>
                  <input
                    type="number"
                    value={seoConfig?.movieMaxIndexed || 5000}
                    onChange={(e) => setSeoConfig({ ...seoConfig, movieMaxIndexed: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-muted">Dizi Maksimum İndekslenecek Sayfa Sayısı</label>
                  <input
                    type="number"
                    value={seoConfig?.tvMaxIndexed || 2000}
                    onChange={(e) => setSeoConfig({ ...seoConfig, tvMaxIndexed: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-primary"
                  />
                </div>
              </div>

              {/* TMDB Commercial License Verification Field */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-primary">TMDB Ticari Kullanım Lisansı Doğrulaması</p>
                  <p className="text-[11px] text-text-muted">
                    İleride AdSense reklam aktivasyonundan önce TMDB lisansının ticari kullanıma uygun olduğu manuel olarak doğrulanmalıdır.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                  <input
                    type="checkbox"
                    checked={seoConfig?.tmdbCommercialLicenseVerified || false}
                    onChange={(e) => setSeoConfig({ ...seoConfig, tmdbCommercialLicenseVerified: e.target.checked })}
                    className="w-4 h-4 rounded text-accent focus:ring-0"
                  />
                  <span className={seoConfig?.tmdbCommercialLicenseVerified ? "text-emerald-400 font-bold" : "text-amber-400"}>
                    {seoConfig?.tmdbCommercialLicenseVerified ? "DOĞRULANDI" : "DOĞRULANMADI"}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
                <button
                  type="submit"
                  disabled={isSavingSeo}
                  className="px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {isSavingSeo ? "Kaydediliyor..." : "Ayarları Kaydet"}
                </button>
              </div>
            </form>

            {/* Content SEO Search & Inspect Tool */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary">İçerik SEO Uygunluk ve Canonical Denetleyici</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Herhangi bir film veya dizinin TMDB ID veya başlığı ile SEO durumunu ve canonical bağlantısını inceleyin.
                </p>
              </div>

              <form onSubmit={handleSearchSeo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="TMDB ID veya Başlık ara (örn: 157336 veya Interstellar)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary font-mono"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {isSearching ? "Aranıyor..." : "Denetle"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-4">
                  {searchResults.map((item) => (
                    <div key={item.id} className="p-5 rounded-2xl bg-surface-2 border border-border space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-3 border border-border text-accent">
                              {item.mediaType} • TMDB {item.tmdbId}
                            </span>
                            <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                          </div>
                          <p className="text-xs font-mono text-text-muted mt-1 truncate max-w-xl">
                            Canonical: <a href={item.canonicalPath} target="_blank" className="text-accent hover:underline">{item.canonicalUrl}</a>
                          </p>
                        </div>

                        <AdminStatusBadge
                          status={item.eligibility.isEligible ? "OK" : "WARNING"}
                          label={item.eligibility.status}
                        />
                      </div>

                      {item.eligibility.reasons?.length > 0 && (
                        <div className="p-3 rounded-xl bg-surface-3/80 text-[11px] font-mono text-text-secondary space-y-1">
                          <p className="text-text-muted font-bold">Kalite Geçidi Değerlendirmesi:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {item.eligibility.reasons.map((r: string) => (
                              <li key={r} className="text-amber-400">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <span className="font-mono text-text-muted">Manuel Override:</span>
                        <div className="flex gap-2">
                          {["AUTO", "FORCE_INDEX", "FORCE_NOINDEX"].map((ov) => (
                            <button
                              key={ov}
                              onClick={() => handleSetOverride(item.mediaType, item.tmdbId, ov)}
                              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                                item.manualOverride === ov
                                  ? "bg-accent text-white font-bold"
                                  : "bg-surface-3 text-text-secondary hover:text-text-primary border border-border"
                              }`}
                            >
                              {ov}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE UNIFIED */}
        {activeTab === "google" && (
          <div className="space-y-8">
            {/* Google Connection Wizard Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div>
                  <h2 className="text-lg font-display font-bold text-text-primary">Google Hizmetleri Entegrasyonu</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Google Analytics 4, Search Console ve AdSense (Salt Okunur) yetkilendirmesi.
                  </p>
                </div>

                <div>
                  {overview?.providers?.google?.connected ? (
                    <button
                      onClick={handleDisconnectGoogle}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      Google Bağlantısını Kes
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                      <span>🌐</span>
                      <span>Google ile Bağlan</span>
                    </button>
                  )}
                </div>
              </div>

              {overview?.providers?.google?.connected && (
                <div className="space-y-6">
                  {/* GA4 Setup */}
                  <form onSubmit={handleSaveGaSelection} className="p-5 rounded-2xl bg-surface-2 border border-border space-y-4">
                    <h3 className="text-sm font-bold font-display text-text-primary">1. Google Analytics 4 Mülk & Veri Akışı</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-text-muted">Erişilebilir Mülk Seçin</label>
                        <select
                          value={selectedGaProperty}
                          onChange={(e) => setSelectedGaProperty(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-surface-1 border border-border text-xs font-mono text-text-primary"
                        >
                          <option value="">-- GA4 Mülkü Seçin --</option>
                          {googleAccounts.flatMap((acc) =>
                            (acc.propertySummaries || []).map((p: any) => (
                              <option key={p.property} value={p.property}>
                                {p.displayName} ({p.property})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-text-muted">Measurement ID (Örn: G-XXXXXXXXXX)</label>
                        <input
                          type="text"
                          value={gaMeasurementId}
                          onChange={(e) => setGaMeasurementId(e.target.value)}
                          placeholder="G-..."
                          className="w-full px-4 py-2.5 rounded-xl bg-surface-1 border border-border text-xs font-mono text-text-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-sans text-text-secondary">
                        <input
                          type="checkbox"
                          checked={gaTrackingEnabled}
                          onChange={(e) => setGaTrackingEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-accent focus:ring-0"
                        />
                        <span>Kullanıcı İzleme Etkin (Consent-Aware Default)</span>
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingGa}
                        className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {isSavingGa ? "Kaydediliyor..." : "GA4 Kaydet"}
                      </button>
                    </div>
                  </form>

                  {/* Search Console Setup */}
                  <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-4">
                    <h3 className="text-sm font-bold font-display text-text-primary">2. Google Search Console & Sitemap</h3>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedGscSite}
                        onChange={(e) => handleSelectGscSite(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-surface-1 border border-border text-xs font-mono text-text-primary"
                      >
                        <option value="">-- Search Console Mülkü Seçin --</option>
                        {gscSites.map((s) => (
                          <option key={s.siteUrl} value={s.siteUrl}>
                            {s.siteUrl} ({s.permissionLevel})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleSubmitGscSitemap}
                        disabled={isSubmittingGscSitemap || !selectedGscSite}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isSubmittingGscSitemap ? "Gönderiliyor..." : "🗺️ Sitemap Gönder"}
                      </button>
                    </div>

                    {gscAnalytics && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-surface-1 text-center">
                          <p className="text-[10px] font-mono text-text-muted uppercase">Tıklamalar</p>
                          <p className="text-lg font-bold font-mono text-accent">{gscAnalytics.clicks}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-1 text-center">
                          <p className="text-[10px] font-mono text-text-muted uppercase">Gösterimler</p>
                          <p className="text-lg font-bold font-mono text-text-primary">{gscAnalytics.impressions}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-1 text-center">
                          <p className="text-[10px] font-mono text-text-muted uppercase">Ortalama CTR</p>
                          <p className="text-lg font-bold font-mono text-emerald-400">%{gscAnalytics.ctr}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-1 text-center">
                          <p className="text-[10px] font-mono text-text-muted uppercase">Ortalama Sıra</p>
                          <p className="text-lg font-bold font-mono text-text-primary">{gscAnalytics.position}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* URL Inspection Tool */}
                  <form onSubmit={handleInspectUrl} className="p-5 rounded-2xl bg-surface-2 border border-border space-y-4">
                    <h3 className="text-sm font-bold font-display text-text-primary">3. Canlı URL Denetimi (Search Console)</h3>
                    <p className="text-xs text-text-muted">
                      Yalnızca SINEAI alan adına ait canonical bir URL girin (Örn: https://sineai.com.tr/film/interstellar-157336).
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://sineai.com.tr/film/..."
                        value={inspectUrl}
                        onChange={(e) => setInspectUrl(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-surface-1 border border-border text-xs font-mono text-text-primary"
                      />
                      <button
                        type="submit"
                        disabled={isInspectingUrl || !selectedGscSite}
                        className="px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {isInspectingUrl ? "Denetleniyor..." : "Denetle"}
                      </button>
                    </div>

                    {inspectResult && (
                      <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Genel Karar:</span>
                          <span className="font-bold text-emerald-400">{inspectResult.verdict}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Kapsam Durumu:</span>
                          <span className="text-text-primary">{inspectResult.coverageState}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">İndeksleme Durumu:</span>
                          <span className="text-text-primary">{inspectResult.indexingState}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Robots.txt Durumu:</span>
                          <span className="text-text-primary">{inspectResult.robotsTxtState}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Son Tarama:</span>
                          <span className="text-text-primary">{inspectResult.lastCrawlTime || "—"}</span>
                        </div>
                      </div>
                    )}
                  </form>

                  {/* AdSense Health (Read-Only) */}
                  <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold font-display text-text-primary">4. AdSense Sağlık & Hazırlık Durumu</h3>
                        <p className="text-xs text-text-muted">Bu fazda reklam yerleşimi kapalıdır (Salt-Okunur).</p>
                      </div>
                      <AdminStatusBadge
                        status={adsenseHealth?.isAvailable ? "OK" : "INFO"}
                        label={adsenseHealth?.isAvailable ? "HAZIR" : "BEKLEMEDE"}
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-surface-1 text-xs font-mono space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Yayıncı ID:</span>
                        <span className="text-text-primary">{adsenseHealth?.account?.publisherId || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Site Onayı:</span>
                        <span className="text-text-primary">{adsenseHealth?.matchingSite?.state || "Algılanmadı"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Politika Sorunları:</span>
                        <span className="text-text-primary">{adsenseHealth?.policyIssuesCount || 0} adet</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BING */}
        {activeTab === "bing" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary">Bing Webmaster Entegrasyonu</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Microsoft Webmaster API ile site doğrulama ve sitemap yönetimi.
                </p>
              </div>

              <div>
                {bingData?.status?.isConnected ? (
                  <button
                    onClick={handleDisconnectBing}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Bing Bağlantısını Kes
                  </button>
                ) : (
                  <button
                    onClick={handleConnectBing}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                  >
                    <span>🔷</span>
                    <span>Bing ile Bağlan</span>
                  </button>
                )}
              </div>
            </div>

            {bingData?.status?.isConnected && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-surface-2 text-xs font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Bağlı Site:</span>
                    <span className="text-text-primary">{bingData.status.siteUrl || "https://sineai.com.tr"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Son Eşitleme:</span>
                    <span className="text-text-primary">{bingData.status.lastSyncAt ? new Date(bingData.status.lastSyncAt).toLocaleString("tr-TR") : "—"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmittingBingSitemap(true);
                    setStatusMsg(null);
                    try {
                      const res = await fetch("/api/admin/growth/bing", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ siteUrl: bingData.status.siteUrl || "https://sineai.com.tr" }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setStatusMsg({ type: "success", text: data.message || "Bing sitemap gönderildi." });
                      } else {
                        setStatusMsg({ type: "error", text: data.error || "Gönderim başarısız." });
                      }
                    } catch {
                      setStatusMsg({ type: "error", text: "Bağlantı hatası." });
                    } finally {
                      setIsSubmittingBingSitemap(false);
                    }
                  }}
                  disabled={isSubmittingBingSitemap}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmittingBingSitemap ? "Gönderiliyor..." : "Bing Sitemap'i Şimdi Gönder"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: YANDEX */}
        {activeTab === "yandex" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary">Yandex Webmaster Entegrasyonu</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Yandex API v4 ile site doğrulama ve dizin takibi.
                </p>
              </div>

              <div>
                {yandexData?.status?.isConnected ? (
                  <button
                    onClick={handleDisconnectYandex}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Yandex Bağlantısını Kes
                  </button>
                ) : (
                  <button
                    onClick={handleConnectYandex}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                  >
                    <span>🔴</span>
                    <span>Yandex ile Bağlan</span>
                  </button>
                )}
              </div>
            </div>

            {yandexData?.status?.isConnected && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-surface-2 text-xs font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Kullanıcı Girişi:</span>
                    <span className="text-text-primary">{yandexData.status.connectedLogin || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Erişilebilir Siteler:</span>
                    <span className="text-text-primary">{yandexData.hosts?.length || 0} adet</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: INDEXNOW */}
        {activeTab === "indexnow" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-text-primary">IndexNow Anlık Bildirim Yönetimi</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Arama motorlarına yeni veya güncellenen canonical URL&apos;leri anında bildirin.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-4 text-xs font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-text-muted">Aktif Anahtar:</span>
                <span className="text-accent font-bold select-all">{indexNowConfig?.key || "—"}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-text-muted">Dedicated Endpoint URL:</span>
                <a
                  href={indexNowConfig?.keyLocation}
                  target="_blank"
                  className="text-text-primary hover:underline truncate max-w-md"
                >
                  {indexNowConfig?.keyLocation || "—"}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Bekleyen DB Kuyruğu:</span>
                <span className="text-amber-400 font-bold">{indexNowConfig?.queuedUrlsCount || 0} URL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Toplam Başarılı Gönderim:</span>
                <span className="text-emerald-400 font-bold">{indexNowConfig?.totalSubmissions || 0} URL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Son Gönderim Zamanı:</span>
                <span className="text-text-primary">
                  {indexNowConfig?.lastSubmittedAt ? new Date(indexNowConfig.lastSubmittedAt).toLocaleString("tr-TR") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Son Durum:</span>
                <span className={indexNowConfig?.lastStatus === "SUCCESS" ? "text-emerald-400 font-bold" : indexNowConfig?.lastStatus === "FAILED" ? "text-red-400 font-bold" : "text-text-muted"}>
                  {indexNowConfig?.lastStatus || "IDLE"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRotateIndexNowKey}
                disabled={isRotatingKey}
                className="px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-text-primary transition-colors disabled:opacity-50"
              >
                {isRotatingKey ? "Yenileniyor..." : "🔑 Anahtarı Yenile (Rotate)"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setStatusMsg(null);
                  try {
                    const res = await fetch("/api/admin/growth/indexnow", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "PROCESS_QUEUE" }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setStatusMsg({ type: "success", text: data.message || "Kuyruk işlendi." });
                      fetchIndexNowDetails();
                    } else {
                      setStatusMsg({ type: "error", text: data.error || "Kuyruk işlenemedi." });
                    }
                  } catch {
                    setStatusMsg({ type: "error", text: "Bağlantı hatası." });
                  }
                }}
                disabled={!indexNowConfig?.queuedUrlsCount}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                ⚡ DB Kuyruğunu Şimdi İşle ({indexNowConfig?.queuedUrlsCount || 0})
              </button>

              <button
                type="button"
                onClick={handleTestIndexNowPing}
                disabled={isTestingPing}
                className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {isTestingPing ? "Gönderiliyor..." : "⚡ Test Ping Gönder"}
              </button>
            </div>

            {/* Persistent Recent Submissions History */}
            {indexNowConfig?.recentHistory?.length > 0 && (
              <div className="p-5 rounded-2xl bg-surface-2 border border-border space-y-3">
                <h3 className="text-xs font-bold font-mono text-text-primary uppercase tracking-wider">
                  Son Gönderim Geçmişi (PostgreSQL Kalıcı Kayıt)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="pb-2">URL</th>
                        <th className="pb-2">Durum</th>
                        <th className="pb-2">Zaman</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {indexNowConfig.recentHistory.slice(0, 10).map((h: any, i: number) => (
                        <tr key={i} className="text-text-secondary">
                          <td className="py-2 truncate max-w-xs text-text-primary">{h.url}</td>
                          <td className="py-2">
                            <span className={h.status === "SUCCESS" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-2 text-text-muted">{new Date(h.submittedAt).toLocaleTimeString("tr-TR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: VERIFICATION TAGS */}
        {activeTab === "verification" && (
          <form onSubmit={handleSaveMetaTags} className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-text-primary">Arama Motoru Doğrulama Meta Etiketleri</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Google, Bing ve Yandex için webmaster doğrulama kodlarını girin (Root layout head kısmına güvenli olarak basılır).
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-muted">Google Site Verification Token / Meta</label>
                <input
                  type="text"
                  placeholder="google-site-verification=... veya token"
                  value={googleMetaTag}
                  onChange={(e) => setGoogleMetaTag(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-muted">Bing Site Verification Token / Meta</label>
                <input
                  type="text"
                  placeholder="msvalidate.01=... veya token"
                  value={bingMetaTag}
                  onChange={(e) => setBingMetaTag(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-muted">Yandex Site Verification Token / Meta</label>
                <input
                  type="text"
                  placeholder="yandex-verification=... veya token"
                  value={yandexMetaTag}
                  onChange={(e) => setYandexMetaTag(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <button
                type="submit"
                disabled={isSavingMetaTags}
                className="px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {isSavingMetaTags ? "Kaydediliyor..." : "Doğrulama Etiketlerini Kaydet"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
