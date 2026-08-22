"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SafePlacementConfig,
  AdSenseInventoryUnitSummary,
  MonetizationReadinessGateResult,
  AdSensePerformanceReportSummary,
  AdSensePolicyCenterSummary,
} from "@/lib/monetization/types";
import { AdsTxtHealth } from "@/lib/monetization/ads-txt";

export function AdminMonetizationControlPlane() {
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Core Data
  const [settings, setSettings] = useState<any>(null);
  const [readiness, setReadiness] = useState<MonetizationReadinessGateResult | null>(null);
  const [policy, setPolicy] = useState<AdSensePolicyCenterSummary | null>(null);
  const [placements, setPlacements] = useState<SafePlacementConfig[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<AdSenseInventoryUnitSummary[]>([]);
  const [adsTxtHealth, setAdsTxtHealth] = useState<AdsTxtHealth | null>(null);

  // Performance Report State
  const [reportPeriod, setReportPeriod] = useState<"today" | "yesterday" | "7d" | "28d">("7d");
  const [report, setReport] = useState<AdSensePerformanceReportSummary | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Action Loading States
  const [isSyncingInventory, setIsSyncingInventory] = useState(false);
  const [isTogglingMaster, setIsTogglingMaster] = useState(false);
  const [isEmergencyKilling, setIsEmergencyKilling] = useState(false);
  const [savingPlacementKey, setSavingPlacementKey] = useState<string | null>(null);
  const [isSavingAdsTxt, setIsSavingAdsTxt] = useState(false);

  // Editable Form States
  const [publisherIdInput, setPublisherIdInput] = useState("");
  const [customAdsTxtInput, setCustomAdsTxtInput] = useState("");
  const [previewPlacement, setPreviewPlacement] = useState<SafePlacementConfig | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const fetchMainData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/growth/monetization");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setReadiness(data.readiness);
        setPolicy(data.policy);
        setPlacements(data.placements || []);
        setInventoryUnits(data.inventoryUnits || []);
        setAdsTxtHealth(data.adsTxtHealth);
        setPublisherIdInput(data.settings?.publisherId || "");
        setCustomAdsTxtInput(data.settings?.adsTxtCustom || "");
      }
    } catch (e: any) {
      showToast("error", "Monetization verileri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (period: "today" | "yesterday" | "7d" | "28d") => {
    try {
      setIsLoadingReport(true);
      const res = await fetch(`/api/admin/growth/monetization/reports?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    fetchMainData();
    fetchReport(reportPeriod);
  }, [fetchMainData, fetchReport, reportPeriod]);

  // Sync Inventory Handler
  const handleSyncInventory = async () => {
    try {
      setIsSyncingInventory(true);
      const res = await fetch("/api/admin/growth/monetization/inventory/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || "Envanter senkronize edildi.");
        fetchMainData();
      } else {
        showToast("error", data.error || "Envanter senkronize edilemedi.");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Senkronizasyon hatası.");
    } finally {
      setIsSyncingInventory(false);
    }
  };

  // Toggle Master Ads Switch
  const handleToggleMasterAds = async () => {
    const nextState = !settings?.adsMasterEnabled;
    try {
      setIsTogglingMaster(true);
      const res = await fetch("/api/admin/growth/monetization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adsMasterEnabled: nextState }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message);
        fetchMainData();
      } else {
        showToast("error", data.error || "Master reklam anahtarı güncellenemedi.");
      }
    } catch (e: any) {
      showToast("error", e?.message || "İşlem sırasında hata oluştu.");
    } finally {
      setIsTogglingMaster(false);
    }
  };

  // Emergency Kill Switch
  const handleEmergencyKill = async () => {
    if (!window.confirm("DİKKAT: SINEAI üzerindeki tüm canlı reklamlar derhal durdurulacaktır. Onaylıyor musunuz?")) {
      return;
    }
    try {
      setIsEmergencyKilling(true);
      const res = await fetch("/api/admin/growth/monetization/emergency-kill", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message);
        fetchMainData();
      } else {
        showToast("error", data.error || "Acil durdurma başarısız.");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Acil durdurma hatası.");
    } finally {
      setIsEmergencyKilling(false);
    }
  };

  // Update Single Placement
  const handleSavePlacement = async (placement: SafePlacementConfig) => {
    try {
      setSavingPlacementKey(placement.key);
      const res = await fetch("/api/admin/growth/monetization/placements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: placement.key,
          enabled: placement.enabled,
          adUnitId: placement.adUnitId,
          deviceTarget: placement.deviceTarget,
          audience: placement.audience,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `${placement.name} güncellendi.`);
        fetchMainData();
      } else {
        showToast("error", data.error || "Yerleşim kaydedilemedi.");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Kaydetme hatası.");
    } finally {
      setSavingPlacementKey(null);
    }
  };

  // Toggle CMP Configured
  const handleToggleCmpConfigured = async () => {
    const nextState = !settings?.cmpConfigured;
    try {
      const res = await fetch("/api/admin/growth/monetization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmpConfigured: nextState }),
      });
      if (res.ok) {
        showToast("success", `CMP durumu: ${nextState ? "Yapılandırıldı" : "Beklemede"}`);
        fetchMainData();
      }
    } catch {
      // Non-fatal
    }
  };

  // Save ads.txt & Publisher ID
  const handleSaveAdsTxt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAdsTxt(true);
      const res = await fetch("/api/admin/growth/monetization/ads-txt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherId: publisherIdInput,
          customContent: customAdsTxtInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || "ads.txt ayarları kaydedildi.");
        fetchMainData();
      } else {
        showToast("error", data.error || "ads.txt kaydedilemedi.");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Kaydetme hatası.");
    } finally {
      setIsSavingAdsTxt(false);
    }
  };

  // Active (non-archived) inventory units for assignment
  const activeInventoryUnits = inventoryUnits.filter((u) => u.state !== "ARCHIVED");

  return (
    <div className="space-y-8">
      {/* Status Toast */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
            statusMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : statusMsg.type === "error"
              ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
              : "bg-amber-950/80 border-amber-500/40 text-amber-300"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-zinc-400 hover:text-white ml-3">
            ✕
          </button>
        </div>
      )}

      {/* Emergency Kill Banner */}
      {settings?.adsMasterEnabled && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-600 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <h4 className="text-sm font-bold text-rose-100">CANLI REKLAMLAR AKTİF (ADS MASTER ON)</h4>
              <p className="text-xs text-rose-300">
                Sistem genelinde tanımlı ve aktif reklam slotları ziyaretçilere gösterilmektedir.
              </p>
            </div>
          </div>
          <button
            onClick={handleEmergencyKill}
            disabled={isEmergencyKilling}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
          >
            {isEmergencyKilling ? "Durduruluyor..." : "EMERGENCY DISABLE ALL ADS (ACİL KAPAT)"}
          </button>
        </div>
      )}

      {/* Section 1: Ads Master & 8-Item Readiness Gate */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-zinc-100">AdSense & Monetization Control Plane</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase ${
                  readiness?.isReady
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-950 text-rose-400 border border-rose-500/30"
                }`}
              >
                {readiness?.isReady ? "Tüm Koşullar Geçti (READY)" : "KİLİTLİ (Gereksinimler Var)"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              AdSense onayından sonra deploy yapmadan reklamları açıp kapatabilir, slotları ve kitle hedeflemelerini yönetebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMasterAds}
              disabled={isTogglingMaster || (!readiness?.isReady && !settings?.adsMasterEnabled)}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2 ${
                settings?.adsMasterEnabled
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : readiness?.isReady
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
              }`}
            >
              <span>{settings?.adsMasterEnabled ? "⏸️ REKLAMLARI DURDUR" : "🚀 ENABLE ADS (CANLIYA AL)"}</span>
            </button>
          </div>
        </div>

        {/* 8-Item Readiness Checklist Grid */}
        <div className="space-y-3">
          <span className="text-xs font-semibold font-mono text-zinc-300 uppercase tracking-wider block">
            8-Nokta Readiness Gate Denetimi (Canlıya Alma Ön Koşulları):
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Account */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">1. AdSense Hesabı</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${readiness?.gates.adsenseAccountConnected ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                  {readiness?.gates.adsenseAccountConnected ? "BAĞLI ✓" : "EKSİK ✕"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {publisherIdInput ? `ID: ${publisherIdInput}` : "Google OAuth veya Manuel ID"}
              </p>
            </div>

            {/* 2. Site Ready */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">2. Site Onayı</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${readiness?.gates.adsenseSiteReady ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                  {readiness?.gates.adsenseSiteReady ? "READY ✓" : "BEKLEMEDE"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Domain: <span className="font-mono text-zinc-300">sineai.com.tr</span>
              </p>
            </div>

            {/* 2b. Auto Ads Hard Block */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Auto Ads Durumu</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${readiness?.gates.autoAdsDisabled ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                  {readiness?.gates.autoAdsDisabled ? "KAPALI ✓" : "AÇIK (ENGEL) ✕"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {readiness?.gates.autoAdsDisabled ? "AdSense Auto Ads Kapalı" : "AdSense panelinden kapatılmalı"}
              </p>
            </div>

            {/* 3. Ad Client */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">3. Ad Client ID</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${readiness?.gates.adClientReady ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                  {readiness?.gates.adClientReady ? "HAZIR ✓" : "EKSİK ✕"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                {settings?.adClientId || (publisherIdInput ? `ca-${publisherIdInput}` : "ca-pub-...")}
              </p>
            </div>

            {/* 4. ads.txt */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">4. ads.txt Durumu</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${readiness?.gates.adsTxtHealthy ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                  {readiness?.gates.adsTxtHealthy ? "HEALTHY ✓" : "UYUMSUZ ✕"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {adsTxtHealth?.status || "NOT_CONFIGURED"}
              </p>
            </div>

            {/* 5. Google CMP */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">5. Google CMP</span>
                <button
                  onClick={handleToggleCmpConfigured}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    settings?.cmpConfigured
                      ? "bg-emerald-950 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {settings?.cmpConfigured ? "CONFIGURED ✓" : "Onayla"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">Avrupa Düzenlemeleri Mesajı</p>
            </div>

            {/* 6. Consent Mode */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">6. Consent Mode v2</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">
                  AKTİF ✓
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Google Consent Mode Entegre</p>
            </div>

            {/* 7. TMDB License */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">7. TMDB Lisansı</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${readiness?.gates.tmdbCommercialLicenseVerified ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                  {readiness?.gates.tmdbCommercialLicenseVerified ? "VERIFIED ✓" : "MANUAL CHECK"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Ticari Kullanım Onayı</p>
            </div>

            {/* 8. Policy Issues */}
            <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">8. Policy Center</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${policy?.criticalCount === 0 ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                  {policy?.criticalCount === 0 ? "0 İHLAL ✓" : `${policy?.criticalCount} KRİTİK ✕`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Google Politika İhlalleri</p>
            </div>
          </div>

          {/* Blocked Reasons if any */}
          {readiness && !readiness.isReady && readiness.blockedReasons.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs space-y-1 text-rose-300">
              <span className="font-bold block font-mono">⚠️ Canlıya Alma Engelleri:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {readiness.blockedReasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: AdSense Inventory & Sync */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>📦</span>
              <span>AdSense Reklam Envanteri (Synced Ad Units)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Google AdSense panelinde oluşturulan ad unitler API üzerinden çekilerek DB cache'e kaydedilir.
            </p>
          </div>
          <button
            onClick={handleSyncInventory}
            disabled={isSyncingInventory}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-xl text-xs font-semibold transition-all border border-zinc-700 flex items-center gap-2"
          >
            <span>{isSyncingInventory ? "🔄 Senkronize Ediliyor..." : "🔄 AdSense Envanterini Senkronize Et"}</span>
          </button>
        </div>

        {inventoryUnits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Birim Adı</th>
                  <th className="py-2.5 px-3">Reporting ID</th>
                  <th className="py-2.5 px-3">Format / Tip</th>
                  <th className="py-2.5 px-3">Boyut</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3">Son Senkronizasyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {inventoryUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-3 font-semibold text-zinc-200">{unit.displayName}</td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{unit.reportingDimensionId || "—"}</td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{unit.type || "DISPLAY"}</td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{unit.size || "RESPONSIVE"}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          unit.state === "ACTIVE"
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-amber-950 text-amber-400"
                        }`}
                      >
                        {unit.state}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-500">
                      {new Date(unit.lastSyncedAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-black/30 rounded-xl border border-zinc-800 space-y-2">
            <p className="text-xs text-zinc-400 font-mono">Henüz senkronize edilmiş AdSense ad unit bulunmuyor.</p>
            <p className="text-[11px] text-zinc-500">
              AdSense hesabınızdaki reklam birimlerini çekmek için yukarıdaki butona tıklayın.
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Interactive Placement Manager */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-zinc-800/80 pb-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>🎯</span>
            <span>SINEAI Reklam Yerleşimleri Yöneticisi (Placement Manager)</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            SINEAI'nin güvenli predefined slotlarını AdSense birimleriyle eşleştirin. Değişiklikler deploy gerektirmeden anında aktif olur.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {placements.map((p) => {
            const isSaving = savingPlacementKey === p.key;
            return (
              <div
                key={p.key}
                className={`p-5 rounded-2xl border transition-all ${
                  p.enabled
                    ? "bg-zinc-900 border-zinc-700/80 shadow-md"
                    : "bg-zinc-950/60 border-zinc-800/60 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100">{p.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {p.surface}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{p.description}</p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => {
                        const updated = { ...p, enabled: e.target.checked };
                        setPlacements((prev) => prev.map((item) => (item.key === p.key ? updated : item)));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-800/70 text-xs">
                  {/* Select Ad Unit */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400 font-mono">
                      Bağlı AdSense Birimi:
                    </label>
                    <select
                      value={p.adUnitId || ""}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        const matched = inventoryUnits.find((u) => u.id === val);
                        const updated = {
                          ...p,
                          adUnitId: val,
                          reportingDimensionId: matched?.reportingDimensionId || null,
                        };
                        setPlacements((prev) => prev.map((item) => (item.key === p.key ? updated : item)));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-sans text-zinc-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- AdSense Birimi Seçilmedi --</option>
                      {activeInventoryUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.reportingDimensionId || "ID yok"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Device & Audience Targets */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 font-mono">Cihaz Hedefleme:</label>
                      <select
                        value={p.deviceTarget}
                        onChange={(e) => {
                          const updated = { ...p, deviceTarget: e.target.value as any };
                          setPlacements((prev) => prev.map((item) => (item.key === p.key ? updated : item)));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="ALL">Mobil + Masaüstü</option>
                        <option value="MOBILE">Yalnızca Mobil</option>
                        <option value="DESKTOP">Yalnızca Masaüstü</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 font-mono">Kullanıcı Kitlesi:</label>
                      <select
                        value={p.audience}
                        onChange={(e) => {
                          const updated = { ...p, audience: e.target.value as any };
                          setPlacements((prev) => prev.map((item) => (item.key === p.key ? updated : item)));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="ANONYMOUS_ONLY">Yalnızca Anonim (Önerilen)</option>
                        <option value="ALL">Tüm Kullanıcılar</option>
                        <option value="AUTHENTICATED_ONLY">Giriş Yapmış Kullanıcılar</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPlacement(p)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors"
                    >
                      👁️ Önizle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePlacement(p)}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-lg text-xs transition-colors"
                    >
                      {isSaving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Revenue & Placement Performance Reporting */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>📊</span>
              <span>AdSense Gelir & Yerleşim Performansı Raporu</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              AdSense Management API v2 ile senkronize gerçek gelir, gösterim ve RPM metrikleri.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {(["today", "yesterday", "7d", "28d"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setReportPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  reportPeriod === period
                    ? "bg-amber-500 text-black font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {period === "today" ? "Bugün" : period === "yesterday" ? "Dün" : period === "7d" ? "7 Gün" : "28 Gün"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[11px] font-mono text-zinc-400">Tahmini Gelir</span>
            <p className="text-xl font-extrabold text-emerald-400 font-mono">
              {report?.metrics.estimatedEarnings ?? 0} {report?.currency || "TRY"}
            </p>
          </div>
          <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[11px] font-mono text-zinc-400">Gösterimler</span>
            <p className="text-xl font-extrabold text-zinc-100 font-mono">
              {report?.metrics.impressions?.toLocaleString("tr-TR") ?? 0}
            </p>
          </div>
          <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[11px] font-mono text-zinc-400">Sayfa RPM</span>
            <p className="text-xl font-extrabold text-amber-400 font-mono">
              {report?.metrics.pageViewsRpm ?? 0} {report?.currency || "TRY"}
            </p>
          </div>
          <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[11px] font-mono text-zinc-400">Tıklamalar / CTR</span>
            <p className="text-xl font-extrabold text-zinc-100 font-mono">
              {report?.metrics.clicks ?? 0} ({report?.metrics.ctr ?? 0}%)
            </p>
          </div>
        </div>

        {/* Placement Breakdown Table */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
            Yerleşim Bazında Gelir Dağılımı:
          </h4>

          {report?.placements && report.placements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Yerleşim</th>
                    <th className="py-2.5 px-3">Yüzey</th>
                    <th className="py-2.5 px-3">Gelir</th>
                    <th className="py-2.5 px-3">Gösterim</th>
                    <th className="py-2.5 px-3">RPM</th>
                    <th className="py-2.5 px-3">Tıklama</th>
                    <th className="py-2.5 px-3">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {report.placements.map((p, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-3 font-semibold text-zinc-200">{p.name}</td>
                      <td className="py-3 px-3 font-mono text-zinc-400">{p.surface}</td>
                      <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{p.revenue} TRY</td>
                      <td className="py-3 px-3 font-mono text-zinc-300">{p.impressions.toLocaleString("tr-TR")}</td>
                      <td className="py-3 px-3 font-mono text-amber-400">{p.rpm} TRY</td>
                      <td className="py-3 px-3 font-mono text-zinc-300">{p.clicks}</td>
                      <td className="py-3 px-3 font-mono text-zinc-300">%{p.ctr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-black/30 rounded-xl border border-zinc-800 text-xs text-zinc-400 font-mono">
              Bu periyotta henüz yerleşim bazlı veri bulunmuyor.
            </div>
          )}
        </div>
      </div>

      {/* Section 5: ads.txt Health & Editor */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>📄</span>
              <span>ads.txt Yönetimi ve Sağlık Denetimi</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Google AdSense onay ve doğrulama kaydı <code>/ads.txt</code> üzerinden dinamik ve önbellek dostu sunulur.
            </p>
          </div>
          <a
            href="/ads.txt"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded-xl border border-zinc-700 transition-colors"
          >
            ↗️ /ads.txt Sayfasını Aç
          </a>
        </div>

        <form onSubmit={handleSaveAdsTxt} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 flex items-center justify-between">
              <span>AdSense Publisher ID:</span>
              <span className={`text-[11px] font-mono ${adsTxtHealth?.status === "HEALTHY" ? "text-emerald-400" : "text-amber-400"}`}>
                Durum: {adsTxtHealth?.status || "NOT_CONFIGURED"}
              </span>
            </label>
            <input
              type="text"
              value={publisherIdInput}
              onChange={(e) => setPublisherIdInput(e.target.value)}
              placeholder="pub-1234567890123456"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-zinc-500">
              Google AdSense Publisher ID'niz (Yalnızca <code>pub-</code> formatında girilmelidir).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300">Özel ads.txt İçeriği (İsteğe Bağlı):</label>
              <button
                type="button"
                onClick={() => {
                  const clean = publisherIdInput.replace(/^pub-/, "");
                  setCustomAdsTxtInput(`google.com, pub-${clean}, DIRECT, f08c47fec0942fa0`);
                }}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                + Standart Şablon Ekle
              </button>
            </div>
            <textarea
              rows={3}
              value={customAdsTxtInput}
              onChange={(e) => setCustomAdsTxtInput(e.target.value)}
              placeholder="google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingAdsTxt}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition-colors"
            >
              {isSavingAdsTxt ? "Kaydediliyor..." : "ads.txt Kaydet"}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {previewPlacement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-zinc-100">Yerleşim Önizleme (Placement Preview)</h3>
                <p className="text-xs text-zinc-400">{previewPlacement.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    previewDevice === "desktop" ? "bg-amber-500 text-black font-bold" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Masaüstü
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    previewDevice === "mobile" ? "bg-amber-500 text-black font-bold" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Mobil
                </button>
                <button
                  onClick={() => setPreviewPlacement(null)}
                  className="p-1.5 text-zinc-400 hover:text-white text-lg ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Synthetic Layout Shell */}
            <div
              className={`mx-auto bg-black/60 rounded-2xl border border-zinc-800 p-4 transition-all ${
                previewDevice === "mobile" ? "max-w-xs" : "w-full"
              }`}
            >
              <div className="h-6 bg-zinc-800/60 rounded-md mb-3 w-1/3 animate-pulse" />
              <div className="h-20 bg-zinc-800/40 rounded-xl mb-4" />

              {/* Hatched Preview Box */}
              <div
                className="w-full my-4 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-500/10 p-5 flex flex-col items-center justify-center text-center select-none"
                style={{ minHeight: "120px" }}
              >
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold mb-1">
                  📢 REKLAM ALANI ({previewPlacement.key})
                </span>
                <p className="text-xs font-bold text-zinc-200">{previewPlacement.name}</p>
                <p className="text-[10px] font-mono text-zinc-400 mt-1">
                  Hedef Cihaz: {previewPlacement.deviceTarget} | Kitle: {previewPlacement.audience}
                </p>
              </div>

              <div className="h-24 bg-zinc-800/40 rounded-xl" />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewPlacement(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
