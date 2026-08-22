"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminMonetizationControlPlane } from "@/components/admin/growth/AdminMonetizationControlPlane";

type GrowthTab =
  | "overview"
  | "seo"
  | "google"
  | "bing"
  | "yandex"
  | "indexnow"
  | "adsense"
  | "verification";

export default function AdminGrowthPage() {
  const [activeTab, setActiveTab] = useState<GrowthTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<{ code?: string; message?: string } | null>(null);

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

  // Google State & Independent Capabilities
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [selectedGaProperty, setSelectedGaProperty] = useState("");
  const [selectedGaPropertyName, setSelectedGaPropertyName] = useState("");
  const [gaMeasurementId, setGaMeasurementId] = useState("");
  const [gaTrackingEnabled, setGaTrackingEnabled] = useState(false);
  const [isSavingGa, setIsSavingGa] = useState(false);
  const [gaStatus, setGaStatus] = useState<"IDLE" | "LOADING" | "READY" | "EMPTY" | "API_DISABLED" | "ERROR">("IDLE");
  const [gaError, setGaError] = useState<string | null>(null);
  const [gaActivationUrl, setGaActivationUrl] = useState<string>("https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com");

  const [gscSites, setGscSites] = useState<any[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState("");
  const [gscAnalytics, setGscAnalytics] = useState<any>(null);
  const [isSubmittingGscSitemap, setIsSubmittingGscSitemap] = useState(false);
  const [gscStatus, setGscStatus] = useState<"IDLE" | "LOADING" | "READY" | "EMPTY" | "API_DISABLED" | "ERROR">("IDLE");
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscActivationUrl, setGscActivationUrl] = useState<string>("https://console.cloud.google.com/apis/library/searchconsole.googleapis.com");

  const [inspectUrl, setInspectUrl] = useState("");
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [isInspectingUrl, setIsInspectingUrl] = useState(false);

  const [adsenseHealth, setAdsenseHealth] = useState<any>(null);
  const [adsenseStatus, setAdsenseStatus] = useState<"IDLE" | "LOADING" | "READY" | "EMPTY" | "ERROR">("IDLE");
  const [adsenseError, setAdsenseError] = useState<string | null>(null);

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

  // Provider Credentials Management State
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [isSavingGoogleCreds, setIsSavingGoogleCreds] = useState(false);

  const [bingClientId, setBingClientId] = useState("");
  const [bingClientSecret, setBingClientSecret] = useState("");
  const [showBingSecret, setShowBingSecret] = useState(false);
  const [isSavingBingCreds, setIsSavingBingCreds] = useState(false);

  const [yandexClientId, setYandexClientId] = useState("");
  const [yandexClientSecret, setYandexClientSecret] = useState("");
  const [showYandexSecret, setShowYandexSecret] = useState(false);
  const [isSavingYandexCreds, setIsSavingYandexCreds] = useState(false);

  // AdSense Manual Settings State
  const [adsensePublisherId, setAdsensePublisherId] = useState("");
  const [adsenseAdsTxt, setAdsenseAdsTxt] = useState("");
  const [adsenseAutoAds, setAdsenseAutoAds] = useState(false);
  const [isSavingAdsenseSettings, setIsSavingAdsenseSettings] = useState(false);

  // IndexNow Custom Key State
  const [indexNowCustomKey, setIndexNowCustomKey] = useState("");
  const [isSavingIndexNowKey, setIsSavingIndexNowKey] = useState(false);

  // Helper: Copy to Clipboard
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/growth/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setSeoMetrics(data.metrics);
        setMonetization(data.monetizationReadiness);

        if (data.diagnostics?.adsense) {
          if (data.diagnostics.adsense.publisherId) setAdsensePublisherId(data.diagnostics.adsense.publisherId);
          if (data.diagnostics.adsense.adsTxt) setAdsenseAdsTxt(data.diagnostics.adsense.adsTxt);
          if (typeof data.diagnostics.adsense.autoAdsEnabled === "boolean") setAdsenseAutoAds(data.diagnostics.adsense.autoAdsEnabled);
        }
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

  const refreshGa = useCallback(async () => {
    setGaStatus("LOADING");
    setGaError(null);
    try {
      const res = await fetch("/api/admin/growth/google/analytics");
      const data = await res.json();
      if (data.accounts) {
        setGoogleAccounts(data.accounts || []);
        setGaStatus(data.status || (data.accounts.length > 0 ? "READY" : "EMPTY"));
        setGaError(data.error || null);
        if (data.activationUrl) setGaActivationUrl(data.activationUrl);
      } else {
        setGaStatus(data.status || "ERROR");
        setGaError(data.error || "GA4 hesapları alınamadı");
        if (data.activationUrl) setGaActivationUrl(data.activationUrl);
      }
    } catch (err: any) {
      setGaStatus("ERROR");
      setGaError(err?.message || "GA4 bağlantı hatası");
    }
  }, []);

  const refreshGsc = useCallback(async () => {
    setGscStatus("LOADING");
    setGscError(null);
    try {
      const res = await fetch("/api/admin/growth/google/search-console");
      const data = await res.json();
      if (data.sites) {
        setGscSites(data.sites || []);
        setGscStatus(data.status || (data.sites.length > 0 ? "READY" : "EMPTY"));
        setGscError(data.error || null);
        if (data.activationUrl) setGscActivationUrl(data.activationUrl);

        if (data.selectedSite) {
          setSelectedGscSite(data.selectedSite);
        } else if (data.sites.length > 0) {
          // Auto-select exact sineai domain property
          const exactSineai = data.sites.find(
            (s: any) => s.siteUrl === "sc-domain:sineai.com.tr" || s.siteUrl.includes("sineai.com.tr")
          );
          if (exactSineai) {
            setSelectedGscSite(exactSineai.siteUrl);
          }
        }
      } else {
        setGscStatus(data.status || "ERROR");
        setGscError(data.error || "Search Console mülkleri alınamadı");
        if (data.activationUrl) setGscActivationUrl(data.activationUrl);
      }
    } catch (err: any) {
      setGscStatus("ERROR");
      setGscError(err?.message || "Search Console bağlantı hatası");
    }
  }, []);

  const refreshAdsense = useCallback(async () => {
    setAdsenseStatus("LOADING");
    setAdsenseError(null);
    try {
      const res = await fetch("/api/admin/growth/google/adsense");
      const data = await res.json();
      if (res.ok) {
        setAdsenseHealth(data);
        setAdsenseStatus(data.isAvailable ? "READY" : "EMPTY");
        setAdsenseError(data.message || null);
      } else {
        setAdsenseStatus("ERROR");
        setAdsenseError(data.error || "AdSense verileri alınamadı");
      }
    } catch (err: any) {
      setAdsenseStatus("ERROR");
      setAdsenseError(err?.message || "AdSense bağlantı hatası");
    }
  }, []);

  const fetchGoogleDetails = useCallback(async () => {
    await Promise.all([refreshGa(), refreshGsc(), refreshAdsense()]);
  }, [refreshGa, refreshGsc, refreshAdsense]);

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

  // Tab change handler that updates state, localStorage, and URL parameter
  const handleTabChange = useCallback((newTab: GrowthTab) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sineai_growth_active_tab", newTab);
      } catch {}
      window.history.replaceState({}, document.title, window.location.pathname + `?tab=${newTab}`);
    }
  }, []);

  // Check URL parameters & localStorage for active tab on mount and clean address bar
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get("tab") as GrowthTab | null;
    let savedTab: GrowthTab | null = null;
    try {
      savedTab = localStorage.getItem("sineai_growth_active_tab") as GrowthTab | null;
    } catch {}
    const validTabs: GrowthTab[] = ["overview", "seo", "google", "bing", "yandex", "indexnow", "adsense", "verification"];

    const initialTab = (urlTab && validTabs.includes(urlTab))
      ? urlTab
      : (savedTab && validTabs.includes(savedTab))
      ? savedTab
      : "overview";

    setActiveTab(initialTab);

    const status = urlParams.get("status");
    const error = urlParams.get("error");
    const errorCode = urlParams.get("error_code");

    if (status === "connected") {
      setStatusMsg({ type: "success", text: "Google entegrasyon bağlantısı başarıyla kuruldu." });
    }

    if (error || errorCode) {
      setOauthError({
        code: errorCode || undefined,
        message: error || undefined,
      });
      setStatusMsg({
        type: "error",
        text: error || "Yetkilendirme sırasında bir hata oluştu.",
      });
    }

    // Clean query parameters so page refreshes do not repeatedly trigger status notifications, but retain ?tab=
    const cleanUrl = window.location.pathname + `?tab=${initialTab}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  // Handle OAuth Connect
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch("/api/admin/growth/google/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Google OAuth yapılandırılmamış. Lütfen ortam değişkenlerini (Client ID / Secret) kontrol edin.",
        });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Google yetkilendirme akışı başlatılamadı." });
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Google Growth entegrasyonu bağlantısını kesmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/growth/google/disconnect", { method: "POST" });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Google bağlantısı başarıyla kesildi." });
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
        setStatusMsg({
          type: "error",
          text: data.error || "Bing OAuth yapılandırılmamış (Client ID / Secret eksik).",
        });
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
        setStatusMsg({
          type: "error",
          text: data.error || "Yandex OAuth yapılandırılmamış (Client ID / Secret eksik).",
        });
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

  // Provider Credentials Management Handler
  const handleSaveCredentials = async (
    provider: "google" | "bing" | "yandex",
    clientId: string,
    clientSecret: string
  ) => {
    if (provider === "google") setIsSavingGoogleCreds(true);
    if (provider === "bing") setIsSavingBingCreds(true);
    if (provider === "yandex") setIsSavingYandexCreds(true);

    try {
      const res = await fetch("/api/admin/growth/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: data.message || `${provider.toUpperCase()} API kimlik bilgileri başarıyla kaydedildi.`,
        });
        if (provider === "google") setGoogleClientSecret("");
        if (provider === "bing") setBingClientSecret("");
        if (provider === "yandex") setYandexClientSecret("");
        await fetchOverview();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Kayıt sırasında hata oluştu." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      if (provider === "google") setIsSavingGoogleCreds(false);
      if (provider === "bing") setIsSavingBingCreds(false);
      if (provider === "yandex") setIsSavingYandexCreds(false);
    }
  };

  // AdSense Manual Settings Handler
  const handleSaveAdsenseSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAdsenseSettings(true);
    try {
      const res = await fetch("/api/admin/growth/google/adsense", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherId: adsensePublisherId.trim(),
          adsTxt: adsenseAdsTxt,
          autoAdsEnabled: adsenseAutoAds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "AdSense ayarları başarıyla kaydedildi." });
        await fetchOverview();
        await refreshAdsense();
      } else {
        setStatusMsg({ type: "error", text: data.error || "AdSense ayarları kaydedilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      setIsSavingAdsenseSettings(false);
    }
  };

  // IndexNow Custom Key Handler
  const handleSaveIndexNowCustomKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexNowCustomKey.trim()) return;
    setIsSavingIndexNowKey(true);
    try {
      const res = await fetch("/api/admin/growth/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_CUSTOM_KEY", key: indexNowCustomKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "Özel IndexNow anahtarı kaydedildi." });
        setIndexNowConfig(data.config);
        setIndexNowCustomKey("");
        await fetchOverview();
      } else {
        setStatusMsg({ type: "error", text: data.error || "IndexNow anahtarı kaydedilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      setIsSavingIndexNowKey(false);
    }
  };

  // Google Analytics Actions
  const handleSaveGa = async () => {
    setIsSavingGa(true);
    try {
      const res = await fetch("/api/admin/growth/google/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedGaProperty || undefined,
          propertyName: selectedGaPropertyName || selectedGaProperty || undefined,
          measurementId: gaMeasurementId.trim() || undefined,
          trackingEnabled: gaTrackingEnabled,
        }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Google Analytics 4 ayarları kaydedildi." });
        fetchSeoSettings();
        fetchOverview();
      } else {
        const d = await res.json();
        setStatusMsg({ type: "error", text: d.error || "Analytics kaydedilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "İşlem sırasında hata oluştu." });
    } finally {
      setIsSavingGa(false);
    }
  };

  // Search Console Actions
  const handleSelectGscSite = async (siteUrl: string) => {
    setSelectedGscSite(siteUrl);
    try {
      const res = await fetch("/api/admin/growth/google/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SELECT_PROPERTY", siteUrl }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: `Search Console mülkü seçildi: ${siteUrl}` });
        const detailsRes = await fetch(`/api/admin/growth/google/search-console?siteUrl=${encodeURIComponent(siteUrl)}`);
        if (detailsRes.ok) {
          const d = await detailsRes.json();
          setGscAnalytics(d.analytics);
        }
        fetchOverview();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Search Console mülkü kaydedilemedi." });
    }
  };

  const handleSubmitGscSitemap = async () => {
    if (!selectedGscSite && !overview?.providers?.google?.gscProperty) {
      setStatusMsg({ type: "error", text: "Lütfen önce bir Search Console mülkü seçin." });
      return;
    }
    const siteUrl = selectedGscSite || overview?.providers?.google?.gscProperty;
    setIsSubmittingGscSitemap(true);
    try {
      const res = await fetch("/api/admin/growth/google/search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_SITEMAP",
          siteUrl,
          sitemapUrl: "https://sineai.com.tr/sitemap.xml",
        }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "sitemap.xml başarıyla Google Search Console'a iletildi." });
      } else {
        const d = await res.json();
        setStatusMsg({ type: "error", text: d.error || "Sitemap iletilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Sitemap gönderimi başarısız." });
    } finally {
      setIsSubmittingGscSitemap(false);
    }
  };

  const handleInspectUrl = async () => {
    if (!inspectUrl.trim()) return;
    setIsInspectingUrl(true);
    setInspectResult(null);
    try {
      const res = await fetch("/api/admin/growth/google/search-console/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inspectUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInspectResult(data.result);
      } else {
        setStatusMsg({ type: "error", text: data.error || "URL denetimi başarısız oldu." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "URL denetim isteği gönderilemedi." });
    } finally {
      setIsInspectingUrl(false);
    }
  };

  // Bing Sitemap Action
  const handleSubmitBingSitemap = async () => {
    setIsSubmittingBingSitemap(true);
    try {
      const res = await fetch("/api/admin/growth/bing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT_SITEMAP", sitemapUrl: "https://sineai.com.tr/sitemap.xml" }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "sitemap.xml Bing Webmaster Tools'a iletildi." });
        fetchBingDetails();
      } else {
        const d = await res.json();
        setStatusMsg({ type: "error", text: d.error || "Bing sitemap gönderilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Bing sitemap gönderimi başarısız." });
    } finally {
      setIsSubmittingBingSitemap(false);
    }
  };

  // IndexNow Actions
  const handleToggleIndexNow = async () => {
    if (!indexNowConfig) return;
    try {
      const res = await fetch("/api/admin/growth/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_ENABLED", enabled: !indexNowConfig.enabled }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: `IndexNow ${!indexNowConfig.enabled ? "etkinleştirildi" : "devre dışı bırakıldı"}.` });
        fetchIndexNowDetails();
        fetchOverview();
      }
    } catch {
      setStatusMsg({ type: "error", text: "IndexNow durumu güncellenemedi." });
    }
  };

  const handleRotateIndexNowKey = async () => {
    if (!confirm("IndexNow API anahtarını yenilemek istediğinize emin misiniz?")) return;
    setIsRotatingKey(true);
    try {
      const res = await fetch("/api/admin/growth/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ROTATE_KEY" }),
      });
      if (res.ok) {
        const d = await res.json();
        setStatusMsg({ type: "success", text: `Yeni IndexNow anahtarı oluşturuldu: ${d.key}` });
        fetchIndexNowDetails();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Anahtar yenilenemedi." });
    } finally {
      setIsRotatingKey(false);
    }
  };

  const handleTestIndexNowPing = async () => {
    setIsTestingPing(true);
    try {
      const res = await fetch("/api/admin/growth/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_PING", testUrl: "https://sineai.com.tr/" }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setStatusMsg({ type: "success", text: "IndexNow test bildirimi başarıyla Bing / Yandex uç noktalarına iletildi." });
        fetchIndexNowDetails();
      } else {
        setStatusMsg({ type: "error", text: d.error || "Test ping başarısız oldu." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Test ping isteği gönderilemedi." });
    } finally {
      setIsTestingPing(false);
    }
  };

  // SEO Settings Save
  const handleSaveSeoConfig = async (newConfig: Partial<any>) => {
    setIsSavingSeo(true);
    try {
      const merged = { ...(seoConfig || {}), ...newConfig };
      const res = await fetch("/api/admin/growth/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: merged }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "SEO yapılandırması başarıyla kaydedildi." });
        fetchSeoSettings();
        fetchOverview();
      } else {
        const d = await res.json();
        setStatusMsg({ type: "error", text: d.error || "SEO ayarları kaydedilemedi." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "SEO ayarları kaydedilirken hata oluştu." });
    } finally {
      setIsSavingSeo(false);
    }
  };

  // SEO Diagnostics
  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticsReport(null);
    try {
      const res = await fetch("/api/admin/growth/seo/diagnostics");
      const d = await res.json();
      if (res.ok) {
        setDiagnosticsReport(d);
      } else {
        setStatusMsg({ type: "error", text: d.error || "Teşhis raporu alınamadı." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Teşhis çalıştırılamadı." });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // SEO Search
  const handleSearchSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/growth/seo/inspect?q=${encodeURIComponent(searchQuery.trim())}`);
      const d = await res.json();
      if (res.ok) {
        setSearchResults(d.results || []);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Arama başarısız oldu." });
    } finally {
      setIsSearching(false);
    }
  };

  // Save Meta Verification Tags
  const handleSaveMetaTags = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMetaTags(true);
    try {
      const merged = {
        ...(seoConfig || {}),
        googleVerificationMeta: googleMetaTag.trim() || undefined,
        bingVerificationMeta: bingMetaTag.trim() || undefined,
        yandexVerificationMeta: yandexMetaTag.trim() || undefined,
      };
      const res = await fetch("/api/admin/growth/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: merged }),
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Site doğrulama meta etiketleri kaydedildi." });
        fetchSeoSettings();
      }
    } catch {
      setStatusMsg({ type: "error", text: "Doğrulama etiketleri kaydedilemedi." });
    } finally {
      setIsSavingMetaTags(false);
    }
  };

  // Helper status badge mapper
  const renderProviderStatus = (status: "CONNECTED" | "READY" | "SETUP_REQUIRED" | "ERROR", isConnected: boolean) => {
    if (isConnected || status === "CONNECTED") {
      return <AdminStatusBadge status="ACTIVE" label="Bağlandı" />;
    }
    if (status === "READY") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">Kuruluma Hazır</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-500/30">Kurulum Gerekli</span>;
  };

  // Navigation Items
  const navItems: { id: GrowthTab; label: string; group?: string; badge?: string }[] = [
    { id: "overview", label: "Genel Bakış", group: "GENEL" },
    { id: "seo", label: "SEO & İndeksleme", group: "DISCOVERY" },
    { id: "google", label: "Google Entegrasyonu", group: "ENTEGRASYONLAR", badge: overview?.providers?.google?.connected ? "Aktif" : undefined },
    { id: "bing", label: "Bing Webmaster", group: "ENTEGRASYONLAR", badge: overview?.providers?.bing?.connected ? "Aktif" : undefined },
    { id: "yandex", label: "Yandex Webmaster", group: "ENTEGRASYONLAR", badge: overview?.providers?.yandex?.connected ? "Aktif" : undefined },
    { id: "indexnow", label: "IndexNow Kuyruk", group: "ENTEGRASYONLAR", badge: overview?.providers?.indexnow?.enabled ? "Aktif" : undefined },
    { id: "adsense", label: "Monetization & AdSense", group: "GELİR MODELİ" },
    { id: "verification", label: "Site Doğrulama", group: "DOĞRULAMA" },
  ];

  const googleRedirectUri = overview?.diagnostics?.google?.redirectUri || "https://sineai.com.tr/api/admin/growth/google/callback";
  const bingRedirectUri = overview?.diagnostics?.bing?.redirectUri || "https://sineai.com.tr/api/admin/growth/bing/callback";
  const yandexRedirectUri = overview?.diagnostics?.yandex?.redirectUri || "https://sineai.com.tr/api/admin/growth/yandex/callback";

  // Check if GSC has a domain property or is connected
  const hasDomainGscProperty =
    selectedGscSite?.startsWith("sc-domain:") ||
    overview?.providers?.google?.gscProperty?.startsWith("sc-domain:");

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Growth & SEO Platform Hub</h1>
              <span className="px-2 py-0.5 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                Phase I-B.1
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Organik arama motoru optimizasyonu, sitemap indeksleme, arama motoru webmaster entegrasyonları ve monetization readiness yönetimi.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (activeTab === "google") {
                  fetchGoogleDetails();
                  fetchOverview();
                } else if (activeTab === "seo") {
                  fetchSeoSettings();
                  fetchOverview();
                } else if (activeTab === "bing") {
                  fetchBingDetails();
                } else if (activeTab === "yandex") {
                  fetchYandexDetails();
                } else if (activeTab === "indexnow") {
                  fetchIndexNowDetails();
                } else {
                  loadAllData();
                }
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Yenile
            </button>
          </div>
        </div>

        {/* Global Toast / Alert Notifications */}
        {statusMsg && (
          <div
            className={`p-4 rounded-lg text-sm flex items-start justify-between gap-3 border transition-all ${
              statusMsg.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                : statusMsg.type === "info"
                ? "bg-blue-950/40 border-blue-800/60 text-blue-200"
                : "bg-rose-950/40 border-rose-800/60 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMsg.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : statusMsg.type === "info" ? (
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-zinc-400 hover:text-zinc-200 text-xs font-mono">
              ✕
            </button>
          </div>
        )}

        {/* Actionable OAuth Error Card for redirect_uri_mismatch or other error codes */}
        {oauthError && (
          <div className="p-5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-rose-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300 font-semibold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  {oauthError.code === "redirect_uri_mismatch"
                    ? "Google Yetkilendirme Hatası: Redirect URI Eşleşmiyor (redirect_uri_mismatch)"
                    : "Yetkilendirme Başarısız Oldu"}
                </span>
              </div>
              <button onClick={() => setOauthError(null)} className="text-rose-400 hover:text-rose-200 text-xs">
                Kapat
              </button>
            </div>

            <p className="text-xs text-rose-200/90 leading-relaxed">
              {oauthError.code === "redirect_uri_mismatch"
                ? "Google Cloud Console'da tanımlı OAuth Client içindeki 'Authorized redirect URIs' listesi ile uygulamanın gönderdiği geri dönüş adresi uyuşmuyor. Aşağıdaki adresi Google Cloud Console'a birebir ekleyin:"
                : oauthError.message || "Google OAuth geri dönüş isteği doğrulanırken bir sorun oluştu."}
            </p>

            <div className="p-3 bg-black/50 rounded border border-rose-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-zinc-200">
              <span className="break-all">{googleRedirectUri}</span>
              <button
                onClick={() => handleCopy(googleRedirectUri, "oauth_err_uri")}
                className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded border border-rose-700/50 text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                {copiedKey === "oauth_err_uri" ? "✓ Kopyalandı" : "Kopyala"}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleConnectGoogle}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-medium transition-colors"
              >
                Bağlantıyı Tekrar Dene
              </button>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-300 hover:underline flex items-center gap-1"
              >
                Google Cloud Console Credentials ↗
              </a>
            </div>
          </div>
        )}

        {/* Mobile Navigation Dropdown (< 1024px) */}
        <div className="block lg:hidden">
          <label htmlFor="mobile-tab-select" className="text-xs font-medium text-zinc-400 mb-1.5 block">
            Görüntülenecek Modülü Seçin:
          </label>
          <select
            id="mobile-tab-select"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value as GrowthTab)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-medium focus:outline-none focus:border-amber-500"
          >
            {navItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} {item.badge ? `(${item.badge})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Main Grid Layout: Sidebar Navigation + Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Left Navigation (lg:col-span-3) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-6">
            <nav className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 space-y-1">
              {navItems.map((item, idx) => {
                const isActive = activeTab === item.id;
                const showGroupHeader = idx === 0 || navItems[idx - 1].group !== item.group;

                return (
                  <React.Fragment key={item.id}>
                    {showGroupHeader && item.group && (
                      <div className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                        {item.group}
                      </div>
                    )}
                    <button
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Quick Environment Diagnostics Widget */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span>Ortam Durumu</span>
                <span className={`w-2 h-2 rounded-full ${overview?.diagnostics?.encryptionKeyConfigured ? "bg-emerald-500" : "bg-rose-500"}`} />
              </div>
              <div className="space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Origin:</span>
                  <span className="font-mono text-zinc-300 truncate max-w-[140px]">{overview?.diagnostics?.urls?.appBaseUrl || "https://sineai.com.tr"}</span>
                </div>
                <div className="flex justify-between">
                  <span>HTTPS:</span>
                  <span className="text-zinc-300">{overview?.diagnostics?.urls?.isHttps ? "Aktif ✓" : "HTTP (Geliştirme)"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Master Key:</span>
                  <span className="text-zinc-300">{overview?.diagnostics?.encryptionKeyConfigured ? "AES-256 ✓" : "Eksik ✗"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Area (lg:col-span-9) */}
          <div className="lg:col-span-9 space-y-6">
            {/* ========================================================================= */}
            {/* TAB 1: OVERVIEW */}
            {/* ========================================================================= */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <span className="text-xs text-zinc-400 font-medium">Toplam Film (SEO Uygun)</span>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">
                      {seoMetrics?.eligibleMovies ?? 0}
                      <span className="text-xs text-zinc-500 font-normal ml-1">/ {seoMetrics?.totalMovies ?? 0}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">Sitemap Limiti: {seoConfig?.movieRolloutLimit ?? 500}</div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <span className="text-xs text-zinc-400 font-medium">Toplam Dizi (SEO Uygun)</span>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">
                      {seoMetrics?.eligibleTvShows ?? 0}
                      <span className="text-xs text-zinc-500 font-normal ml-1">/ {seoMetrics?.totalTvShows ?? 0}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">Sitemap Limiti: {seoConfig?.tvRolloutLimit ?? 500}</div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <span className="text-xs text-zinc-400 font-medium">Arama Entegrasyonları</span>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">
                      {[overview?.providers?.google?.connected, overview?.providers?.bing?.connected, overview?.providers?.yandex?.connected].filter(Boolean).length}
                      <span className="text-xs text-zinc-500 font-normal ml-1">/ 3</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-1">Google, Bing, Yandex</div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <span className="text-xs text-zinc-400 font-medium">IndexNow Kalıcı Kuyruk</span>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">
                      {indexNowConfig?.queueStats?.pending ?? 0}
                      <span className="text-xs text-zinc-500 font-normal ml-1">bekleyen</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">Toplam İletilen: {indexNowConfig?.queueStats?.submitted ?? 0}</div>
                  </div>
                </div>

                {/* Service Status Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google Card */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                          G
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100">Google Hizmetleri</h3>
                          <p className="text-[11px] text-zinc-400">Search Console, GA4 & AdSense</p>
                        </div>
                      </div>
                      {renderProviderStatus(overview?.providers?.google?.status, overview?.providers?.google?.connected)}
                    </div>

                    <div className="space-y-2 text-xs border-t border-zinc-800/80 pt-3">
                      <div className="flex justify-between text-zinc-400">
                        <span>Bağlı Hesap:</span>
                        <span className="font-mono text-zinc-200">{overview?.providers?.google?.email || "—"}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Search Console Mülkü:</span>
                        <span className="text-zinc-200">{overview?.providers?.google?.gscProperty || "Bağlı Değil"}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>GA4 Mülkü / İzleme:</span>
                        <span className="text-zinc-200">{seoConfig?.gaTrackingEnabled ? "Aktif ✓" : "Kapalı"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("google")}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors"
                    >
                      {overview?.providers?.google?.connected ? "Google Ayarlarını Yönet" : "Google Kurulum Sihirbazını Aç"}
                    </button>
                  </div>

                  {/* Bing Card */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                          B
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100">Bing Webmaster Tools</h3>
                          <p className="text-[11px] text-zinc-400">Microsoft Bing Arama & İndeksleme</p>
                        </div>
                      </div>
                      {renderProviderStatus(overview?.providers?.bing?.status, overview?.providers?.bing?.connected)}
                    </div>

                    <div className="space-y-2 text-xs border-t border-zinc-800/80 pt-3">
                      <div className="flex justify-between text-zinc-400">
                        <span>Bağlı Site:</span>
                        <span className="text-zinc-200">{overview?.providers?.bing?.siteUrl || "—"}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>OAuth Uç Noktaları:</span>
                        <span className="text-zinc-300 font-mono text-[11px]">bing.com/webmasters ✓</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("bing")}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors"
                    >
                      {overview?.providers?.bing?.connected ? "Bing Ayarlarını Yönet" : "Bing Kurulum Sihirbazını Aç"}
                    </button>
                  </div>

                  {/* Yandex Card */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-xs">
                          Y
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100">Yandex Webmaster</h3>
                          <p className="text-[11px] text-zinc-400">Yandex Arama & Host Yönetimi</p>
                        </div>
                      </div>
                      {renderProviderStatus(overview?.providers?.yandex?.status, overview?.providers?.yandex?.connected)}
                    </div>

                    <div className="space-y-2 text-xs border-t border-zinc-800/80 pt-3">
                      <div className="flex justify-between text-zinc-400">
                        <span>Kullanıcı:</span>
                        <span className="text-zinc-200">{overview?.providers?.yandex?.login || "—"}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Host URL:</span>
                        <span className="text-zinc-200">{overview?.providers?.yandex?.hostUrl || "—"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("yandex")}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors"
                    >
                      {overview?.providers?.yandex?.connected ? "Yandex Ayarlarını Yönet" : "Yandex Kurulum Sihirbazını Aç"}
                    </button>
                  </div>

                  {/* IndexNow Card */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          ⚡
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100">IndexNow Protokolü</h3>
                          <p className="text-[11px] text-zinc-400">Anlık URL İndeks Bildirimi</p>
                        </div>
                      </div>
                      {indexNowConfig?.enabled ? (
                        <AdminStatusBadge status="ACTIVE" label="Aktif" />
                      ) : (
                        <AdminStatusBadge status="INACTIVE" label="Kapalı" />
                      )}
                    </div>

                    <div className="space-y-2 text-xs border-t border-zinc-800/80 pt-3">
                      <div className="flex justify-between text-zinc-400">
                        <span>Durable DB Modeli:</span>
                        <span className="text-emerald-400 font-mono text-[11px]">IndexNowSubmission ✓</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Son Bildirim:</span>
                        <span className="text-zinc-300">
                          {indexNowConfig?.lastSubmittedAt
                            ? new Date(indexNowConfig.lastSubmittedAt).toLocaleString("tr-TR")
                            : "Henüz yapılmadı"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("indexnow")}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors"
                    >
                      IndexNow Kuyruğunu Yönet
                    </button>
                  </div>
                </div>

                {/* Monetization Readiness Strip */}
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <span>Monetization Readiness (AdSense & TMDB Lisans Kontrolü)</span>
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Reklamlar: KAPALI (Phase I-D)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-3 bg-black/40 rounded-lg border border-zinc-800/60">
                      <span className="text-zinc-400 block text-[11px]">TMDB Commercial Status</span>
                      <span className="text-amber-300 font-medium mt-1 block">
                        {monetization?.tmdbCommercialLicenseVerified ? "DOĞRULANDI ✓" : "MANUAL CHECK REQUIRED"}
                      </span>
                    </div>
                    <div className="p-3 bg-black/40 rounded-lg border border-zinc-800/60">
                      <span className="text-zinc-400 block text-[11px]">AdSense Bağlantısı</span>
                      <span className="text-zinc-300 font-medium mt-1 block">
                        {monetization?.adsenseConnected ? "Bağlandı ✓" : "Hesap Yok / Beklemede"}
                      </span>
                    </div>
                    <div className="p-3 bg-black/40 rounded-lg border border-zinc-800/60">
                      <span className="text-zinc-400 block text-[11px]">Ads Master Lock</span>
                      <span className="text-zinc-300 font-medium mt-1 block">KİLİTLİ (0 Reklam Yüklenir)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: SEO & INDEXING */}
            {/* ========================================================================= */}
            {activeTab === "seo" && (
              <div className="space-y-6">
                {/* Master Switch & Rollout Card */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">İndeksleme & Staged Rollout Yönetimi</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Sitemap generation, robots.txt izinleri ve kademeli indeksleme limitlerini yönetin.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">Genel İndeksleme (Master)</span>
                        <input
                          type="checkbox"
                          checked={seoConfig?.indexingMasterEnabled === true}
                          onChange={(e) => handleSaveSeoConfig({ indexingMasterEnabled: e.target.checked })}
                          disabled={isSavingSeo}
                          className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">Kapalıyken tüm public discovery sayfalarına noindex basılır.</p>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">Film İndeksleme</span>
                        <input
                          type="checkbox"
                          checked={seoConfig?.movieIndexingEnabled === true}
                          onChange={(e) => handleSaveSeoConfig({ movieIndexingEnabled: e.target.checked })}
                          disabled={isSavingSeo}
                          className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">/film/[slug] sayfalarının sitemap ve meta indeksini açar.</p>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">Dizi İndeksleme</span>
                        <input
                          type="checkbox"
                          checked={seoConfig?.tvIndexingEnabled === true}
                          onChange={(e) => handleSaveSeoConfig({ tvIndexingEnabled: e.target.checked })}
                          disabled={isSavingSeo}
                          className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">/dizi/[slug] sayfalarının sitemap ve meta indeksini açar.</p>
                    </div>
                  </div>

                  {/* Rollout Limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Film Rollout Limiti (Sitemap)</label>
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={seoConfig?.movieRolloutLimit ?? 500}
                        onChange={(e) => setSeoConfig({ ...seoConfig, movieRolloutLimit: parseInt(e.target.value, 10) || 0 })}
                        onBlur={() => handleSaveSeoConfig({ movieRolloutLimit: seoConfig.movieRolloutLimit })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                      />
                      <span className="text-[11px] text-zinc-500">SEO Quality Gate'i geçen en popüler filmlerden seçilir.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Dizi Rollout Limiti (Sitemap)</label>
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={seoConfig?.tvRolloutLimit ?? 500}
                        onChange={(e) => setSeoConfig({ ...seoConfig, tvRolloutLimit: parseInt(e.target.value, 10) || 0 })}
                        onBlur={() => handleSaveSeoConfig({ tvRolloutLimit: seoConfig.tvRolloutLimit })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                      />
                      <span className="text-[11px] text-zinc-500">SEO Quality Gate'i geçen en popüler dizilerden seçilir.</span>
                    </div>
                  </div>
                </div>

                {/* URL Search & Inspection */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">Katalog SEO Arama & Slug Denetimi</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Veritabanındaki filmlerin SEO slug, canonical path ve indekslenebilirlik durumunu sorgulayın.
                    </p>
                  </div>

                  <form onSubmit={handleSearchSeo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Film veya dizi adı girin (Örn: Inception, Fight Club)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isSearching ? "Aranıyor..." : "Sorgula"}
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-medium text-zinc-400">{searchResults.length} sonuç bulundu:</div>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {searchResults.map((item, i) => (
                          <div key={i} className="p-3 bg-black/40 border border-zinc-800 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-zinc-200">
                                {item.title} <span className="text-zinc-500 font-mono text-[11px]">({item.releaseYear || "—"})</span>
                              </div>
                              <div className="text-zinc-400 font-mono text-[11px] mt-0.5">{item.canonicalUrl}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.isIndexable ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                                  Indexable ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/60 text-rose-300 border border-rose-500/30">
                                  {item.rejectionReason || "Noindex"}
                                </span>
                              )}
                              <a
                                href={item.canonicalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition-colors"
                              >
                                Görüntüle ↗
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SEO Diagnostics Action */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">Kapsamlı SEO Teşhis & Sağlık Raporu</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Robots.txt, sitemap index, canonical yönlendirmeler ve JSON-LD şemalarını otomatik analiz edin.
                      </p>
                    </div>
                    <button
                      onClick={handleRunDiagnostics}
                      disabled={isRunningDiagnostics}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isRunningDiagnostics ? "Analiz Ediliyor..." : "Teşhisi Çalıştır"}
                    </button>
                  </div>

                  {diagnosticsReport && (
                    <div className="p-4 bg-black/50 border border-zinc-800 rounded-lg space-y-3 font-mono text-xs">
                      <div className="flex justify-between border-b border-zinc-800 pb-2">
                        <span className="text-zinc-400">Genel Sağlık:</span>
                        <span className={diagnosticsReport.healthy ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                          {diagnosticsReport.healthy ? "SAĞLIKLI (0 Kritik Sorun) ✓" : "SORUN TESPİT EDİLDİ ✗"}
                        </span>
                      </div>
                      <div className="space-y-1 text-zinc-300 text-[11px]">
                        <div>Sitemap Toplam URL: {diagnosticsReport.totalSitemapUrls ?? "—"}</div>
                        <div>Robots.txt Durumu: {diagnosticsReport.robotsTxtStatus ?? "OK"}</div>
                        <div>Canonical Uyuşmazlığı: {diagnosticsReport.canonicalIssuesCount ?? 0}</div>
                        <div>JSON-LD Şema Hataları: {diagnosticsReport.schemaErrorsCount ?? 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: GOOGLE INTEGRATION WIZARD */}
            {/* ========================================================================= */}
            {activeTab === "google" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
                  {/* Wizard Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                        <span>Google Hizmetleri Entegrasyon Sihirbazı</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Google Search Console, Google Analytics 4 ve Google AdSense hesaplarınızı tek OAuth akışıyla yönetin.
                      </p>
                    </div>
                    {renderProviderStatus(overview?.providers?.google?.status, overview?.providers?.google?.connected)}
                  </div>

                  {/* STEP 1: OAuth Credentials & Redirect URI */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Adım 1: Google Cloud Console OAuth 2.0 Tanımlaması</span>
                    </div>

                    <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-lg space-y-4">
                      {/* Authorized Redirect URI Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                          <span>Google Cloud Console — Authorized Redirect URI:</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Birebir Eşleşme Zorunludur</span>
                        </div>
                        <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-zinc-200">
                          <span className="break-all text-amber-300/90">{googleRedirectUri}</span>
                          <button
                            onClick={() => handleCopy(googleRedirectUri, "google_redirect_uri")}
                            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto flex-shrink-0"
                          >
                            {copiedKey === "google_redirect_uri" ? "✓ Kopyalandı" : "URI'yi Kopyala"}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Google Cloud Console → <i>APIs & Services</i> → <i>Credentials</i> → <i>OAuth 2.0 Client ID (Web Application)</i> ekranındaki <b>Authorized redirect URIs</b> alanına yukarıdaki adresi ekleyin.
                        </p>
                      </div>

                      {/* Required APIs Checklist */}
                      <div className="border-t border-zinc-800/80 pt-3 space-y-2 text-xs">
                        <span className="font-medium text-zinc-300 block">Google Cloud Projesinde Etkinleştirilmesi Gereken API'ler:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>Google Search Console API</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>Google Analytics Admin & Data API</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>Google Site Verification API</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-bold">○</span>
                            <span>AdSense Management API (Opsiyonel)</span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Credentials Entry Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveCredentials("google", googleClientId, googleClientSecret);
                        }}
                        className="border-t border-zinc-800/80 pt-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                            <span>🔑</span> Google OAuth Kimlik Bilgilerini Düzenle
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            AES-256-GCM ile Veritabanında Şifrelenir
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>Client ID:</span>
                              {overview?.diagnostics?.google?.clientIdConfigured ? (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  {overview?.diagnostics?.google?.source === "database" ? "✓ DB'de Tanımlı" : "✓ .env'de Tanımlı"}
                                  {overview?.diagnostics?.google?.clientIdMasked ? ` (${overview.diagnostics.google.clientIdMasked})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-mono">Eksik</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={googleClientId}
                              onChange={(e) => setGoogleClientId(e.target.value)}
                              placeholder={overview?.diagnostics?.google?.clientIdMasked || "xxxx.apps.googleusercontent.com"}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>Client Secret:</span>
                              {overview?.diagnostics?.google?.clientSecretConfigured ? (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  {overview?.diagnostics?.google?.source === "database" ? "✓ DB'de Tanımlı" : "✓ .env'de Tanımlı"}
                                  {overview?.diagnostics?.google?.clientSecretMasked ? ` (${overview.diagnostics.google.clientSecretMasked})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-mono">Eksik</span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                type={showGoogleSecret ? "text" : "password"}
                                value={googleClientSecret}
                                onChange={(e) => setGoogleClientSecret(e.target.value)}
                                placeholder={overview?.diagnostics?.google?.clientSecretConfigured ? "Değiştirmek için yeni secret girin..." : "GOCSPX-..."}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-14 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[11px] font-medium"
                              >
                                {showGoogleSecret ? "Gizle" : "Göster"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-zinc-500">
                            Öncelik: <b className="text-zinc-400">Admin Paneli (DB) &gt; .env &gt; Varsayılan</b>
                          </span>
                          <button
                            type="submit"
                            disabled={isSavingGoogleCreds || (!googleClientId.trim() && !googleClientSecret.trim())}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg text-xs transition-colors"
                          >
                            {isSavingGoogleCreds ? "Kaydediliyor..." : "Kimlik Bilgilerini Kaydet"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* STEP 2: Connect Account */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Adım 2: Google Hesabını Bağla</span>
                    </div>

                    <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {overview?.providers?.google?.connected ? (
                          <div>
                            <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Google Hesabı Bağlı: {overview?.providers?.google?.email}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Tüm izinler ve offline refresh token güvenle saklanmaktadır.</p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-medium text-zinc-200">Google OAuth Bağlantısı Bekleniyor</span>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Yetkilendirme sonrasında Search Console ve GA4 verileri otomatik okunacaktır.</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {overview?.providers?.google?.connected ? (
                          <>
                            <button
                              onClick={handleConnectGoogle}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                            >
                              Yeniden Yetkilendir
                            </button>
                            <button
                              onClick={handleDisconnectGoogle}
                              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-medium border border-rose-800/50 transition-colors"
                            >
                              Bağlantıyı Kes
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleConnectGoogle}
                            disabled={!overview?.diagnostics?.google?.clientIdConfigured}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                          >
                            {overview?.diagnostics?.google?.clientIdConfigured ? "Google Hizmetlerini Bağla" : "Kurulumu Tamamla"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: Service Discovery & Management */}
                  {overview?.providers?.google?.connected && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                          3
                        </span>
                        <span>Adım 3: Servis Keşfi & Mülk Yönetimi</span>
                      </div>

                      {/* Google Capability Preflight / Health Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-300">Search Console API</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${gscStatus === "READY" ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" : gscStatus === "API_DISABLED" ? "bg-amber-950/60 text-amber-300 border border-amber-500/30" : gscStatus === "LOADING" ? "bg-blue-950/60 text-blue-300" : "bg-zinc-800 text-zinc-400"}`}>
                              {gscStatus === "READY" ? "HAZIR ✓" : gscStatus === "API_DISABLED" ? "API KAPALI" : gscStatus === "LOADING" ? "YÜKLENİYOR" : "BEKLEMEDE"}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {selectedGscSite || overview?.providers?.google?.gscProperty ? `Mülk: ${selectedGscSite || overview?.providers?.google?.gscProperty}` : "Mülk seçimi bekleniyor"}
                          </p>
                        </div>

                        <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-300">Analytics Admin API</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${gaStatus === "READY" ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30" : gaStatus === "API_DISABLED" ? "bg-amber-950/60 text-amber-300 border border-amber-500/30" : gaStatus === "LOADING" ? "bg-blue-950/60 text-blue-300" : "bg-zinc-800 text-zinc-400"}`}>
                              {gaStatus === "READY" ? "HAZIR ✓" : gaStatus === "API_DISABLED" ? "API KAPALI" : gaStatus === "LOADING" ? "YÜKLENİYOR" : "YAPILANDIRILMAMIŞ"}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {gaMeasurementId || seoConfig?.gaMeasurementId ? `ID: ${gaMeasurementId || seoConfig?.gaMeasurementId}` : "Measurement ID tanımlanmadı"}
                          </p>
                        </div>

                        <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-300">AdSense API</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {adsenseHealth?.account ? "HESAP BAĞLI" : "HESAP YOK (OPSİYONEL)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            Reklamlar Kilitli (Phase I-D)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Search Console Card */}
                        <div className="bg-black/40 border border-zinc-800 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Search Console Mülkü</h4>
                            {hasDomainGscProperty ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                                DNS Domain Property ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                {overview?.providers?.google?.gscProperty ? "Bağlı Mülk" : "Mülk Seçilmedi"}
                              </span>
                            )}
                          </div>

                          {gscStatus === "API_DISABLED" && (
                            <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-2.5">
                              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Google Search Console API Etkinleştirilmemiş</span>
                              </div>
                              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                                Google Cloud Console projenizde <b>Google Search Console API</b> servisini tek tıkla açabilirsiniz:
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <a
                                  href={gscActivationUrl || "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <span>Google Cloud'da API'yi Etkinleştir ↗</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={refreshGsc}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1"
                                >
                                  <span>Kontrol Et / Yenile ↻</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {gscStatus === "ERROR" && gscError && (
                            <div className="p-3 rounded bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs">
                              {gscError}
                            </div>
                          )}

                          {gscStatus === "EMPTY" && (
                            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs space-y-1.5">
                              <div>Bu Google hesabında erişilebilir Search Console mülkü bulunamadı.</div>
                              <a
                                href="https://search.google.com/search-console"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                Search Console'da Mülk Ekle / Doğrula ↗
                              </a>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-zinc-400">Doğrulanmış Mülk:</label>
                              <div className="flex items-center gap-2">
                                <a
                                  href="https://search.google.com/search-console"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-400 hover:underline"
                                >
                                  GSC Paneli ↗
                                </a>
                                <button
                                  type="button"
                                  onClick={refreshGsc}
                                  className="text-[11px] text-amber-400 hover:underline font-mono"
                                >
                                  Yenile ↻
                                </button>
                              </div>
                            </div>
                            <select
                              value={selectedGscSite || overview?.providers?.google?.gscProperty || ""}
                              onChange={(e) => handleSelectGscSite(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- Search Console Mülkü Seçin --</option>
                              {gscSites.map((site, i) => (
                                <option key={i} value={site.siteUrl}>
                                  {site.siteUrl} ({site.permissionLevel || "Erişim Var"})
                                </option>
                              ))}
                              {!gscSites.some((s) => s.siteUrl === "sc-domain:sineai.com.tr") && (
                                <option value="sc-domain:sineai.com.tr">sc-domain:sineai.com.tr (Domain Mülkü)</option>
                              )}
                              {!gscSites.some((s) => s.siteUrl === "https://sineai.com.tr/" || s.siteUrl === "https://sineai.com.tr") && (
                                <option value="https://sineai.com.tr/">https://sineai.com.tr/ (URL Mülkü)</option>
                              )}
                            </select>

                            {/* Quick Select Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-zinc-500">Hızlı Ata:</span>
                              <button
                                type="button"
                                onClick={() => handleSelectGscSite("sc-domain:sineai.com.tr")}
                                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-mono border border-zinc-700 transition-colors"
                              >
                                sc-domain:sineai.com.tr
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectGscSite("https://sineai.com.tr/")}
                                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-mono border border-zinc-700 transition-colors"
                              >
                                https://sineai.com.tr/
                              </button>
                            </div>
                          </div>

                          {hasDomainGscProperty && (
                            <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300">
                              Bu domain Search Console'da DNS üzerinden doğrulanmış. Ek HTML meta doğrulaması gerekmez.
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={handleSubmitGscSitemap}
                              disabled={isSubmittingGscSitemap}
                              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium border border-zinc-700 transition-colors disabled:opacity-50"
                            >
                              {isSubmittingGscSitemap ? "Gönderiliyor..." : "Sitemap Gönder (sitemap.xml)"}
                            </button>
                          </div>

                          {/* URL Inspection Tool */}
                          <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                            <label className="text-xs font-medium text-zinc-300">Canlı URL Denetimi (Search Console API):</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="https://sineai.com.tr/film/..."
                                value={inspectUrl}
                                onChange={(e) => setInspectUrl(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                              />
                              <button
                                onClick={handleInspectUrl}
                                disabled={isInspectingUrl}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium disabled:opacity-50"
                              >
                                {isInspectingUrl ? "..." : "Denetle"}
                              </button>
                            </div>

                            {inspectResult && (
                              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-[11px] space-y-1 font-mono">
                                <div className="text-emerald-400 font-semibold">Sonuç: {inspectResult.verdict}</div>
                                <div className="text-zinc-400">Coverage: {inspectResult.coverageState}</div>
                                <div className="text-zinc-400">Robots: {inspectResult.robotsTxtState}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Google Analytics 4 Card */}
                        <div className="bg-black/40 border border-zinc-800 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Google Analytics 4</h4>
                            {seoConfig?.gaTrackingEnabled ? (
                              <AdminStatusBadge status="ACTIVE" label="İzleme Aktif" />
                            ) : (
                              <AdminStatusBadge status="INACTIVE" label="İzleme Kapalı" />
                            )}
                          </div>

                          {gaStatus === "API_DISABLED" && (
                            <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-2.5">
                              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Google Analytics Admin API Etkinleştirilmemiş</span>
                              </div>
                              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                                Otomatik mülk listeleme için API'yi açabilir veya API olmadan aşağıya <b>Measurement ID (G-XXXXXXXXXX)</b> girerek doğrudan kaydedebilirsiniz.
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <a
                                  href={gaActivationUrl || "https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <span>Google Cloud'da API'yi Etkinleştir ↗</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={refreshGa}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1"
                                >
                                  <span>Kontrol Et / Yenile ↻</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {gaStatus === "ERROR" && gaError && (
                            <div className="p-3 rounded bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs">
                              {gaError}
                            </div>
                          )}

                          {gaStatus === "EMPTY" && (
                            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
                              Bu hesapta GA4 mülkü bulunamadı. Measurement ID'yi doğrudan girebilirsiniz.
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-zinc-400">GA4 Hesabı / Mülkü (Opsiyonel):</label>
                              <button
                                type="button"
                                onClick={refreshGa}
                                className="text-[11px] text-amber-400 hover:underline font-mono"
                              >
                                Yenile ↻
                              </button>
                            </div>
                            <select
                              value={selectedGaProperty}
                              onChange={(e) => {
                                setSelectedGaProperty(e.target.value);
                                const selectedOpt = e.target.options[e.target.selectedIndex];
                                if (selectedOpt) {
                                  setSelectedGaPropertyName(selectedOpt.text);
                                }
                              }}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- GA4 Mülkü Seçin (Opsiyonel) --</option>
                              {googleAccounts.map((acc, i) => (
                                <optgroup key={i} label={acc.displayName || acc.name}>
                                  {(acc.propertySummaries || acc.properties || []).map((prop: any, j: number) => (
                                    <option key={j} value={prop.property || prop.name}>
                                      {prop.displayName} ({prop.property || prop.name})
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400">GA4 Measurement ID:</label>
                            <input
                              type="text"
                              placeholder="G-XXXXXXXXXX"
                              value={gaMeasurementId}
                              onChange={(e) => setGaMeasurementId(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                            <div>
                              <span className="text-xs font-medium text-zinc-200">İstemci Tarafı İzleme</span>
                              <p className="text-[10px] text-zinc-500">Kullanıcı rızası (Consent Mode) ve PII sanitization korunur.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={gaTrackingEnabled}
                              onChange={(e) => setGaTrackingEnabled(e.target.checked)}
                              className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                            />
                          </div>

                          <button
                            onClick={handleSaveGa}
                            disabled={isSavingGa}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {isSavingGa ? "Kaydediliyor..." : "Analytics Ayarlarını Kaydet"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: BING WEBMASTER WIZARD */}
            {/* ========================================================================= */}
            {activeTab === "bing" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">Bing Webmaster Tools Entegrasyonu</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Microsoft Bing Arama Motoru resmi API erişimi, sitemap bildirimi ve indeksleme yönetimi.
                      </p>
                    </div>
                    {renderProviderStatus(overview?.providers?.bing?.status, overview?.providers?.bing?.connected)}
                  </div>

                  {/* Step 1: Credentials & URI */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Adım 1: Bing Webmaster Tools API Access Tanımlaması</span>
                    </div>

                    <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-lg space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                          <span>Bing Webmaster — Authorized Redirect URI:</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Birebir Eşleşme</span>
                        </div>
                        <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-zinc-200">
                          <span className="break-all text-amber-300/90">{bingRedirectUri}</span>
                          <button
                            onClick={() => handleCopy(bingRedirectUri, "bing_redirect_uri")}
                            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto flex-shrink-0"
                          >
                            {copiedKey === "bing_redirect_uri" ? "✓ Kopyalandı" : "URI'yi Kopyala"}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Bing Webmaster Tools → <i>Settings</i> → <i>API Access</i> → <i>OAuth</i> alanından oluşturduğunuz Client ID ve Secret değerlerini sunucu ortamına tanımlayın.
                        </p>
                      </div>

                      {/* Direct Credentials Entry Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveCredentials("bing", bingClientId, bingClientSecret);
                        }}
                        className="border-t border-zinc-800/80 pt-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                            <span>🔑</span> Bing OAuth Kimlik Bilgilerini Düzenle
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            AES-256-GCM ile Veritabanında Şifrelenir
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>Client ID:</span>
                              {overview?.diagnostics?.bing?.clientIdConfigured ? (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  {overview?.diagnostics?.bing?.source === "database" ? "✓ DB'de Tanımlı" : "✓ .env'de Tanımlı"}
                                  {overview?.diagnostics?.bing?.clientIdMasked ? ` (${overview.diagnostics.bing.clientIdMasked})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-mono">Eksik</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={bingClientId}
                              onChange={(e) => setBingClientId(e.target.value)}
                              placeholder={overview?.diagnostics?.bing?.clientIdMasked || "Bing Application Client ID..."}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>Client Secret:</span>
                              {overview?.diagnostics?.bing?.clientSecretConfigured ? (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  {overview?.diagnostics?.bing?.source === "database" ? "✓ DB'de Tanımlı" : "✓ .env'de Tanımlı"}
                                  {overview?.diagnostics?.bing?.clientSecretMasked ? ` (${overview.diagnostics.bing.clientSecretMasked})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-mono">Eksik</span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                type={showBingSecret ? "text" : "password"}
                                value={bingClientSecret}
                                onChange={(e) => setBingClientSecret(e.target.value)}
                                placeholder={overview?.diagnostics?.bing?.clientSecretConfigured ? "Değiştirmek için yeni secret girin..." : "Bing Client Secret..."}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-14 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowBingSecret(!showBingSecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[11px] font-medium"
                              >
                                {showBingSecret ? "Gizle" : "Göster"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-zinc-500">
                            Öncelik: <b className="text-zinc-400">Admin Paneli (DB) &gt; .env &gt; Varsayılan</b>
                          </span>
                          <button
                            type="submit"
                            disabled={isSavingBingCreds || (!bingClientId.trim() && !bingClientSecret.trim())}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg text-xs transition-colors"
                          >
                            {isSavingBingCreds ? "Kaydediliyor..." : "Kimlik Bilgilerini Kaydet"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Step 2: Connect Button */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Adım 2: Bing Hesabını Bağla</span>
                    </div>

                    <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {overview?.providers?.bing?.connected ? (
                          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Bing Webmaster Bağlı</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-medium text-zinc-200">Bing OAuth Bağlantısı Bekleniyor</span>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Resmi bing.com/webmasters OAuth akışı üzerinden yetkilendirilir.</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {overview?.providers?.bing?.connected ? (
                          <>
                            <button
                              onClick={handleSubmitBingSitemap}
                              disabled={isSubmittingBingSitemap}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {isSubmittingBingSitemap ? "Gönderiliyor..." : "Sitemap Gönder"}
                            </button>
                            <button
                              onClick={handleDisconnectBing}
                              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-medium border border-rose-800/50 transition-colors"
                            >
                              Bağlantıyı Kes
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleConnectBing}
                            disabled={!overview?.diagnostics?.bing?.clientIdConfigured}
                            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                          >
                            {overview?.diagnostics?.bing?.clientIdConfigured ? "Bing ile Bağlan" : "Kurulumu Tamamla"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: YANDEX WEBMASTER WIZARD */}
            {/* ========================================================================= */}
            {activeTab === "yandex" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">Yandex Webmaster Entegrasyonu</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Yandex Webmaster OAuth 2.0 bağlantısı, host doğrulama ve sitemap yönetimi.
                      </p>
                    </div>
                    {renderProviderStatus(overview?.providers?.yandex?.status, overview?.providers?.yandex?.connected)}
                  </div>

                  {/* Step 1: Credentials & URI */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Adım 1: Yandex OAuth Uygulaması Tanımlaması</span>
                    </div>

                    <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-lg space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                          <span>Yandex OAuth — Authorized Callback URI:</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Birebir Eşleşme</span>
                        </div>
                        <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-zinc-200">
                          <span className="break-all text-amber-300/90">{yandexRedirectUri}</span>
                          <button
                            onClick={() => handleCopy(yandexRedirectUri, "yandex_redirect_uri")}
                            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto flex-shrink-0"
                          >
                            {copiedKey === "yandex_redirect_uri" ? "✓ Kopyalandı" : "URI'yi Kopyala"}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          oauth.yandex.com adresinden oluşturduğunuz uygulamanın <i>Redirect URI</i> alanına yukarıdaki adresi ekleyin.
                        </p>
                      </div>

                      {/* Direct Credentials Entry Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveCredentials("yandex", yandexClientId, yandexClientSecret);
                        }}
                        className="border-t border-zinc-800/80 pt-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                            <span>🔑</span> Yandex OAuth Kimlik Bilgilerini Düzenle
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            AES-256-GCM ile Veritabanında Şifrelenir
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>Client ID:</span>
                              {overview?.diagnostics?.yandex?.clientIdConfigured ? (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  {overview?.diagnostics?.yandex?.source === "database" ? "✓ DB'de Tanımlı" : "✓ .env'de Tanımlı"}
                                  {overview?.diagnostics?.yandex?.clientIdMasked ? ` (${overview.diagnostics.yandex.clientIdMasked})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-mono">Eksik</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={yandexClientId}
                              onChange={(e) => setYandexClientId(e.target.value)}
                              placeholder={overview?.diagnostics?.yandex?.clientIdMasked || "Yandex Client ID..."}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                              <span>Client Secret:</span>
                              {overview?.diagnostics?.yandex?.clientSecretConfigured ? (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  {overview?.diagnostics?.yandex?.source === "database" ? "✓ DB'de Tanımlı" : "✓ .env'de Tanımlı"}
                                  {overview?.diagnostics?.yandex?.clientSecretMasked ? ` (${overview.diagnostics.yandex.clientSecretMasked})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-mono">Eksik</span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                type={showYandexSecret ? "text" : "password"}
                                value={yandexClientSecret}
                                onChange={(e) => setYandexClientSecret(e.target.value)}
                                placeholder={overview?.diagnostics?.yandex?.clientSecretConfigured ? "Değiştirmek için yeni secret girin..." : "Yandex Client Secret..."}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-14 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowYandexSecret(!showYandexSecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[11px] font-medium"
                              >
                                {showYandexSecret ? "Gizle" : "Göster"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-zinc-500">
                            Öncelik: <b className="text-zinc-400">Admin Paneli (DB) &gt; .env &gt; Varsayılan</b>
                          </span>
                          <button
                            type="submit"
                            disabled={isSavingYandexCreds || (!yandexClientId.trim() && !yandexClientSecret.trim())}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg text-xs transition-colors"
                          >
                            {isSavingYandexCreds ? "Kaydediliyor..." : "Kimlik Bilgilerini Kaydet"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Step 2: Connect Button */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Adım 2: Yandex Hesabını Bağla</span>
                    </div>

                    <div className="p-4 bg-black/40 border border-zinc-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {overview?.providers?.yandex?.connected ? (
                          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Yandex Webmaster Bağlı: {overview?.providers?.yandex?.login || overview?.providers?.yandex?.hostUrl}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-medium text-zinc-200">Yandex OAuth Bağlantısı Bekleniyor</span>
                            <p className="text-[11px] text-zinc-400 mt-0.5">oauth.yandex.com akışı ile yetkilendirilir.</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {overview?.providers?.yandex?.connected ? (
                          <button
                            onClick={handleDisconnectYandex}
                            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-medium border border-rose-800/50 transition-colors"
                          >
                            Bağlantıyı Kes
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectYandex}
                            disabled={!overview?.diagnostics?.yandex?.clientIdConfigured}
                            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                          >
                            {overview?.diagnostics?.yandex?.clientIdConfigured ? "Yandex ile Bağlan" : "Kurulumu Tamamla"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: INDEXNOW DURABLE QUEUE */}
            {/* ========================================================================= */}
            {activeTab === "indexnow" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">IndexNow Anlık Bildirim Kuyruğu</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Yayınlanan veya güncellenen film/dizi sayfalarının Bing ve Yandex arama motorlarına anlık iletimi.
                      </p>
                    </div>
                    {indexNowConfig?.enabled ? (
                      <AdminStatusBadge status="ACTIVE" label="Aktif" />
                    ) : (
                      <AdminStatusBadge status="INACTIVE" label="Kapalı" />
                    )}
                  </div>

                  {/* Queue KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded-lg">
                      <span className="text-[11px] text-zinc-400 font-medium">Bekleyen (Pending)</span>
                      <div className="text-xl font-bold text-amber-400 mt-1">{indexNowConfig?.queueStats?.pending ?? 0}</div>
                    </div>
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded-lg">
                      <span className="text-[11px] text-zinc-400 font-medium">İşleniyor (Processing)</span>
                      <div className="text-xl font-bold text-blue-400 mt-1">{indexNowConfig?.queueStats?.processing ?? 0}</div>
                    </div>
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded-lg">
                      <span className="text-[11px] text-zinc-400 font-medium">Başarılı (Submitted)</span>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{indexNowConfig?.queueStats?.submitted ?? 0}</div>
                    </div>
                    <div className="p-3 bg-black/40 border border-zinc-800 rounded-lg">
                      <span className="text-[11px] text-zinc-400 font-medium">Hatalı (Failed)</span>
                      <div className="text-xl font-bold text-rose-400 mt-1">{indexNowConfig?.queueStats?.failed ?? 0}</div>
                    </div>
                  </div>

                  {/* Key & Custom Key Form */}
                  <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <div>
                        <span className="font-medium text-zinc-300">Aktif IndexNow Anahtarı:</span>
                        <div className="font-mono text-amber-300/90 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 mt-1 break-all">
                          {indexNowConfig?.key || "Oluşturulmamış"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                        {indexNowConfig?.key && (
                          <button
                            type="button"
                            onClick={() => handleCopy(indexNowConfig.key, "indexnow_key")}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-xs"
                          >
                            {copiedKey === "indexnow_key" ? "✓ Kopyalandı" : "Anahtarı Kopyala"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRotateIndexNowKey}
                          disabled={isRotatingKey}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 text-xs disabled:opacity-50"
                        >
                          {isRotatingKey ? "Yenileniyor..." : "Rastgele Yeni Üret"}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-zinc-400">Key Doğrulama URL'si (TXT):</span>
                      <a
                        href={indexNowConfig?.keyLocation || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline font-mono"
                      >
                        {indexNowConfig?.keyLocation || "—"} ↗
                      </a>
                    </div>

                    {/* Custom Key Input Form */}
                    <form onSubmit={handleSaveIndexNowCustomKey} className="border-t border-zinc-800/80 pt-3 space-y-2">
                      <label className="text-[11px] text-zinc-400 font-medium block">
                        Özel IndexNow Anahtarı Tanımla:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={indexNowCustomKey}
                          onChange={(e) => setIndexNowCustomKey(e.target.value)}
                          placeholder="Örn: 32 karakterlik özel alfanümerik anahtar..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="submit"
                          disabled={isSavingIndexNowKey || !indexNowCustomKey.trim()}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg text-xs transition-colors"
                        >
                          {isSavingIndexNowKey ? "Kaydediliyor..." : "Özel Anahtarı Kaydet"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleToggleIndexNow}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        indexNowConfig?.enabled
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      {indexNowConfig?.enabled ? "Protokolü Devre Dışı Bırak" : "IndexNow'ı Etkinleştir"}
                    </button>
                    <button
                      onClick={handleTestIndexNowPing}
                      disabled={isTestingPing || !indexNowConfig?.enabled}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isTestingPing ? "İletiliyor..." : "Test Ping Gönder"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: MONETIZATION & ADSENSE */}
            {/* ========================================================================= */}
            {activeTab === "adsense" && (
              <AdminMonetizationControlPlane />
            )}

            {/* ========================================================================= */}
            {/* TAB 8: SITE VERIFICATION */}
            {/* ========================================================================= */}
            {activeTab === "verification" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
                  <div className="border-b border-zinc-800/80 pb-4">
                    <h3 className="text-base font-semibold text-zinc-100">Arama Motoru Site Doğrulama</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Domain ve URL-prefix mülkleri için DNS, OAuth veya HTML meta etiket doğrulama durumları.
                    </p>
                  </div>

                  {/* Provider Status Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Google */}
                    <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">Google</span>
                        {hasDomainGscProperty ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                            DNS ✓
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Meta / OAuth
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {hasDomainGscProperty
                          ? "DNS üzerinden doğrulandı. Ek HTML meta doğrulaması gerekmez."
                          : "Google Search Console veya HTML meta etiketi ile doğrulanabilir."}
                      </p>
                    </div>

                    {/* Bing */}
                    <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">Bing</span>
                        {overview?.providers?.bing?.connected ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                            OAuth ✓
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Manuel / Meta
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {overview?.providers?.bing?.connected
                          ? "Bing Webmaster API ile otomatik doğrulandı."
                          : "Bing Webmaster Tools veya XML/Meta ile doğrulanabilir."}
                      </p>
                    </div>

                    {/* Yandex */}
                    <div className="p-4 bg-black/40 border border-zinc-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">Yandex</span>
                        {overview?.providers?.yandex?.connected ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                            OAuth ✓
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Manuel / Meta
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {overview?.providers?.yandex?.connected
                          ? "Yandex Webmaster OAuth ile bağlandı."
                          : "Yandex Webmaster veya HTML meta etiketi ile doğrulanabilir."}
                      </p>
                    </div>
                  </div>

                  {/* Collapsible Manual HTML Meta Fallback Accordion */}
                  <details className="group border border-zinc-800 rounded-lg bg-black/20 overflow-hidden">
                    <summary className="p-4 text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer flex items-center justify-between select-none">
                      <span>Alternatif / Manuel HTML Meta Doğrulama Kodları (URL-prefix fallback)</span>
                      <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                    </summary>

                    <form onSubmit={handleSaveMetaTags} className="p-4 border-t border-zinc-800/80 space-y-4">
                      <p className="text-[11px] text-zinc-400">
                        Aşağıdaki alanlar yalnızca DNS doğrulaması yapılamayan özel durumlarda <code>&lt;head&gt;</code> etiketine meta token eklemek için kullanılır.
                      </p>

                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-300 font-medium">Google Site Verification Token (content değeri)</label>
                        <input
                          type="text"
                          placeholder="Örn: 4yN... (Sadece content değeri)"
                          value={googleMetaTag}
                          onChange={(e) => setGoogleMetaTag(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-300 font-medium">Bing / msvalidate.01 Token</label>
                        <input
                          type="text"
                          placeholder="Örn: 9F8E7D..."
                          value={bingMetaTag}
                          onChange={(e) => setBingMetaTag(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-300 font-medium">Yandex Verification Token (yandex-verification)</label>
                        <input
                          type="text"
                          placeholder="Örn: 5a4b3c..."
                          value={yandexMetaTag}
                          onChange={(e) => setYandexMetaTag(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingMetaTags}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {isSavingMetaTags ? "Kaydediliyor..." : "Meta Etiketlerini Kaydet"}
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
