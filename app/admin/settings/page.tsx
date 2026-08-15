"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminSettingsPage() {
  const [calibrationTarget, setCalibrationTarget] = useState(30);
  const [queuePreloadCount, setQueuePreloadCount] = useState(5);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [activeLearningEnabled, setActiveLearningEnabled] = useState(true);

  // Phase 9.5 Film Hybrid Recommendation Settings
  const [hybridRerankEnabled, setHybridRerankEnabled] = useState(false);
  const [hybridMatchWeight, setHybridMatchWeight] = useState(60);
  const [hybridAiWeight, setHybridAiWeight] = useState(40);
  const [aiTasteRefreshEvidenceCount, setAiTasteRefreshEvidenceCount] = useState(25);
  const [aiRerankShortlistSize, setAiRerankShortlistSize] = useState(50);

  // TV Phase 3.5 TV Hybrid Recommendation Settings
  const [tvHybridRerankEnabled, setTvHybridRerankEnabled] = useState(false);
  const [tvHybridMatchWeight, setTvHybridMatchWeight] = useState(60);
  const [tvHybridAiWeight, setTvHybridAiWeight] = useState(40);
  const [tvAiTasteRefreshEvidenceCount, setTvAiTasteRefreshEvidenceCount] = useState(25);
  const [tvAiRerankShortlistSize, setTvAiRerankShortlistSize] = useState(50);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setCalibrationTarget(data.settings.calibrationTarget || 30);
            setQueuePreloadCount(data.settings.queuePreloadCount || 5);
            setAiEnabled(data.settings.aiEnabled !== false);
            setActiveLearningEnabled(data.settings.activeLearningEnabled !== false);
            // Film
            setHybridRerankEnabled(data.settings.hybridRerankEnabled === true);
            setHybridMatchWeight(data.settings.hybridMatchWeight ?? 60);
            setHybridAiWeight(data.settings.hybridAiWeight ?? 40);
            setAiTasteRefreshEvidenceCount(data.settings.aiTasteRefreshEvidenceCount || 25);
            setAiRerankShortlistSize(data.settings.aiRerankShortlistSize || 50);
            // TV
            setTvHybridRerankEnabled(data.settings.tvHybridRerankEnabled === true);
            setTvHybridMatchWeight(data.settings.tvHybridMatchWeight ?? 60);
            setTvHybridAiWeight(data.settings.tvHybridAiWeight ?? 40);
            setTvAiTasteRefreshEvidenceCount(data.settings.tvAiTasteRefreshEvidenceCount || 25);
            setTvAiRerankShortlistSize(data.settings.tvAiRerankShortlistSize || 50);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleAiWeightChange = (newAiWeight: number) => {
    const clampedAi = Math.max(0, Math.min(50, Math.round(newAiWeight)));
    const clampedMatch = 100 - clampedAi;
    setHybridAiWeight(clampedAi);
    setHybridMatchWeight(clampedMatch);
  };

  const handleMatchWeightChange = (newMatchWeight: number) => {
    const clampedMatch = Math.max(50, Math.min(100, Math.round(newMatchWeight)));
    const clampedAi = 100 - clampedMatch;
    setHybridMatchWeight(clampedMatch);
    setHybridAiWeight(clampedAi);
  };

  const applyPreset = (match: number, ai: number) => {
    setHybridMatchWeight(match);
    setHybridAiWeight(ai);
  };

  const handleTvAiWeightChange = (newAiWeight: number) => {
    const clampedAi = Math.max(0, Math.min(50, Math.round(newAiWeight)));
    const clampedMatch = 100 - clampedAi;
    setTvAiWeight(clampedAi);
    setTvMatchWeight(clampedMatch);
  };

  const handleTvMatchWeightChange = (newMatchWeight: number) => {
    const clampedMatch = Math.max(50, Math.min(100, Math.round(newMatchWeight)));
    const clampedAi = 100 - clampedMatch;
    setTvMatchWeight(clampedMatch);
    setTvAiWeight(clampedAi);
  };

  const setTvMatchWeight = (val: number) => setTvHybridMatchWeight(val);
  const setTvAiWeight = (val: number) => setTvHybridAiWeight(val);

  const applyTvPreset = (match: number, ai: number) => {
    setTvHybridMatchWeight(match);
    setTvHybridAiWeight(ai);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calibrationTarget,
          queuePreloadCount,
          aiEnabled,
          activeLearningEnabled,
          // Film
          hybridRerankEnabled,
          hybridMatchWeight,
          hybridAiWeight,
          aiTasteRefreshEvidenceCount,
          aiRerankShortlistSize,
          // TV
          tvHybridRerankEnabled,
          tvHybridMatchWeight,
          tvHybridAiWeight,
          tvAiTasteRefreshEvidenceCount,
          tvAiRerankShortlistSize,
        }),
      });

      const data = await res.json();
      setStatusMsg(data.message || data.error);
    } catch {
      setStatusMsg("Ayarlar kaydedilirken hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Sistem & Öneri Motoru Ayarları
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            Kalibrasyon hedefi, Match Engine v3.2 ve Hibrit AI Semantic Reranker parametreleri
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            Ayarlar yükleniyor...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {statusMsg && (
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-text-primary">
                {statusMsg}
              </div>
            )}

            {/* Section 1: Recommendation Engine & Hybrid AI Settings */}
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-6 shadow-md">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-text-primary">
                    Recommendation Engine — Hybrid AI Settings
                  </h2>
                  <p className="text-xs text-text-muted font-mono">
                    Deterministic-First + DeepSeek İkinci Aşama Semantik Sıralayıcı (Phase 9.5)
                  </p>
                </div>
                <span
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-full font-bold ${
                    !aiEnabled
                      ? "bg-warning/15 border border-warning/30 text-warning"
                      : hybridRerankEnabled
                      ? "bg-success/15 border border-success/30 text-success"
                      : "bg-surface-elevated border border-border text-text-muted"
                  }`}
                >
                  {!aiEnabled
                    ? "AI Global Kapalı"
                    : hybridRerankEnabled
                    ? `Film Hibrit AI Aktif (%${hybridMatchWeight} / %${hybridAiWeight})`
                    : "Tam Deterministik (v3.2)"}
                </span>
              </div>

              {/* Hybrid Reranker Toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hybridRerankToggle"
                    checked={hybridRerankEnabled}
                    onChange={(e) => setHybridRerankEnabled(e.target.checked)}
                    className="rounded bg-surface-elevated border-border text-accent focus:ring-0"
                  />
                  <label htmlFor="hybridRerankToggle" className="text-sm font-bold text-text-primary">
                    Hibrit AI Semantik Reranker'ı Aktif Et
                  </label>
                </div>
                <p className="text-xs text-text-muted">
                  Açık olduğunda: Match Engine v3.2 tarafından filtrelenmiş güvenli adaylar (≥65 eşleşme) DeepSeek AI Taste Profile ile semantik olarak yeniden sıralanır. Kapalıyken exact v3.2 deterministik çıktısı korunur.
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono">
                  Hızlı Ağırlık Şablonları (Presets)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => applyPreset(100, 0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      hybridMatchWeight === 100 && hybridAiWeight === 0
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Deterministic (100 / 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(75, 25)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      hybridMatchWeight === 75 && hybridAiWeight === 25
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Conservative (75 / 25)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(60, 40)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      hybridMatchWeight === 60 && hybridAiWeight === 40
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Balanced (60 / 40)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(55, 45)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      hybridMatchWeight === 55 && hybridAiWeight === 45
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Recommended (55 / 45) [Önerilen]
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(50, 50)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      hybridMatchWeight === 50 && hybridAiWeight === 50
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    AI-Forward Test (50 / 50)
                  </button>
                </div>
              </div>

              {/* Weight Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-border/60">
                {/* Match Engine Weight */}
                <div className="space-y-2 p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary">
                      Match Engine v3.2 Ağırlığı
                    </label>
                    <span className="text-sm font-bold font-mono text-accent">
                      %{hybridMatchWeight}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Film DNA, kalite, dönem, tür, geri bildirim ve deterministik eşleşme motorunun final sıralamadaki ağırlığı.
                  </p>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={hybridMatchWeight}
                    onChange={(e) => handleMatchWeightChange(parseInt(e.target.value, 10))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>Min %50</span>
                    <span>Max %100</span>
                  </div>
                </div>

                {/* AI Semantic Weight */}
                <div className="space-y-2 p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary">
                      AI Semantic Reranker Ağırlığı
                    </label>
                    <span className="text-sm font-bold font-mono text-accent">
                      %{hybridAiWeight}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    AI Taste Profile'ın hikâye, tema, anlatım biçimi ve semantik zevk yakınlığı değerlendirmesinin etkisi (Güvenlik tavanı: Max %50).
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={hybridAiWeight}
                    onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>Min %0</span>
                    <span>Tavan %50</span>
                  </div>
                </div>
              </div>

              {/* Refresh Threshold & Shortlist Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-border/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    AI Taste Profile Yenileme Eşiği (Refresh Threshold)
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Son profil oluşturulduktan sonra gereken yeni puanlanan film sayısı (Taste-bearing interactions: LOVE/LIKE/NEUTRAL/DISLIKE).
                  </p>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={aiTasteRefreshEvidenceCount}
                    onChange={(e) => setAiTasteRefreshEvidenceCount(parseInt(e.target.value, 10) || 25)}
                    className="w-36 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    AI Aday Kısa Liste Boyutu (Shortlist Size)
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Deterministik motorun DeepSeek tekli batch çağrısına gönderdiği güvenli aday sayısı (40–60 arası).
                  </p>
                  <input
                    type="number"
                    min="40"
                    max="60"
                    value={aiRerankShortlistSize}
                    onChange={(e) => setAiRerankShortlistSize(parseInt(e.target.value, 10) || 50)}
                    className="w-36 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Section 1.5: TV Series Hybrid AI Recommendation Engine */}
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-6 shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h2 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
                    <span>📺</span> Dizi Hibrit AI Öneri Motoru (TV Hybrid AI)
                  </h2>
                  <span
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-full font-bold ${
                      !aiEnabled
                        ? "bg-warning/15 border border-warning/30 text-warning"
                        : tvHybridRerankEnabled
                        ? "bg-success/15 border border-success/30 text-success"
                        : "bg-surface-elevated border border-border text-text-muted"
                    }`}
                  >
                    {!aiEnabled
                      ? "AI Global Kapalı"
                      : tvHybridRerankEnabled
                      ? `TV Hibrit AI Aktif (%${tvHybridMatchWeight} / %${tvHybridAiWeight})`
                      : "Tam Deterministik (TV v1)"}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  TV Match Engine v1 ve DeepSeek TV AI Taste Profile arasındaki bağımsız ağırlık dağılımı.
                </p>
              </div>

              {/* TV Hybrid Enable Toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="tvHybridRerankToggle"
                    checked={tvHybridRerankEnabled}
                    onChange={(e) => setTvHybridRerankEnabled(e.target.checked)}
                    className="rounded bg-surface-elevated border-border text-accent focus:ring-0"
                  />
                  <label htmlFor="tvHybridRerankToggle" className="text-sm font-bold text-text-primary">
                    TV Hibrit AI Semantik Reranker'ı Aktif Et
                  </label>
                </div>
                <p className="text-xs text-text-muted">
                  Açık olduğunda: TV Match Engine v1 adayları (≥65 eşleşme) DeepSeek TV AI Taste Profile ile semantik olarak yeniden sıralanır. Kapalıyken exact v1 deterministik çıktısı korunur.
                </p>
              </div>

              {/* TV Presets */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono">
                  TV Hızlı Ağırlık Şablonları (Presets)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => applyTvPreset(100, 0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      tvHybridMatchWeight === 100 && tvHybridAiWeight === 0
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Deterministic (100 / 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTvPreset(75, 25)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      tvHybridMatchWeight === 75 && tvHybridAiWeight === 25
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Conservative (75 / 25)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTvPreset(60, 40)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      tvHybridMatchWeight === 60 && tvHybridAiWeight === 40
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Recommended (60 / 40) [Önerilen]
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTvPreset(55, 45)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      tvHybridMatchWeight === 55 && tvHybridAiWeight === 45
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    AI-Emphasized (55 / 45)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTvPreset(50, 50)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      tvHybridMatchWeight === 50 && tvHybridAiWeight === 50
                        ? "bg-accent/20 border-accent text-accent font-bold"
                        : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    AI-Forward Test (50 / 50)
                  </button>
                </div>
              </div>

              {/* TV Weight Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-border/60">
                {/* TV Match Engine Weight */}
                <div className="space-y-2 p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary">
                      TV Match Engine v1 Ağırlığı
                    </label>
                    <span className="text-sm font-bold font-mono text-accent">
                      %{tvHybridMatchWeight}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Dizi DNA, Bayesian kalite, format, sezon uzunluğu, bölüm süresi, dönem ve dil uyumunun ağırlığı.
                  </p>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={tvHybridMatchWeight}
                    onChange={(e) => handleTvMatchWeightChange(parseInt(e.target.value, 10))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>Min %50</span>
                    <span>Max %100</span>
                  </div>
                </div>

                {/* TV AI Semantic Weight */}
                <div className="space-y-2 p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary">
                      TV AI Semantic Reranker Ağırlığı
                    </label>
                    <span className="text-sm font-bold font-mono text-accent">
                      %{tvHybridAiWeight}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Dizi AI Taste Profile'ın hikâyeleme, anlatı karmaşıklığı ve karakter derinliği değerlendirmesi (Güvenlik tavanı: Max %50).
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={tvHybridAiWeight}
                    onChange={(e) => handleTvAiWeightChange(parseInt(e.target.value, 10))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>Min %0</span>
                    <span>Tavan %50</span>
                  </div>
                </div>
              </div>

              {/* TV Refresh Threshold & Shortlist Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-border/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    TV AI Taste Profile Yenileme Eşiği (Refresh Threshold)
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Son profilden sonra gereken yeni taste-bearing TV etkileşimi (WATCHED/PARTIAL ile puanlama).
                  </p>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={tvAiTasteRefreshEvidenceCount}
                    onChange={(e) => setTvAiTasteRefreshEvidenceCount(parseInt(e.target.value, 10) || 25)}
                    className="w-36 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    TV AI Aday Kısa Liste Boyutu (Shortlist Size)
                  </label>
                  <p className="text-[11px] text-text-muted">
                    DeepSeek tekli batch çağrısına gönderilen güvenli TV aday sayısı (40–60 arası).
                  </p>
                  <input
                    type="number"
                    min="40"
                    max="60"
                    value={tvAiRerankShortlistSize}
                    onChange={(e) => setTvAiRerankShortlistSize(parseInt(e.target.value, 10) || 50)}
                    className="w-36 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Calibration & General Settings */}
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-6 shadow-md">
              <h2 className="font-display text-lg font-bold text-text-primary border-b border-border/60 pb-3">
                Genel Kalibrasyon & Kuyruk Parametreleri
              </h2>

              {/* Calibration Target Setting */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-primary">
                  Kalibrasyon Eşik Hedefi (Initial Calibration Target)
                </label>
                <p className="text-xs text-text-muted">
                  Kullanıcıya Film DNA sinyali toplandığını bildiren tamamlanma eşiğidir.
                </p>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={calibrationTarget}
                  onChange={(e) => setCalibrationTarget(parseInt(e.target.value, 10) || 30)}
                  className="w-48 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              {/* Active Learning Strategy Toggle */}
              <div className="space-y-2 pt-4 border-t border-border/60">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="activeLearningToggle"
                    checked={activeLearningEnabled}
                    onChange={(e) => setActiveLearningEnabled(e.target.checked)}
                    className="rounded bg-surface-elevated border-border text-accent focus:ring-0"
                  />
                  <label htmlFor="activeLearningToggle" className="text-sm font-bold text-text-primary">
                    Intelligent Calibration / Active Learning (v1.0) Aktif
                  </label>
                </div>
                <p className="text-xs text-text-muted">
                  Kullanıcıya gösterilecek sıradaki filmleri deterministik bilgi kazancı (Information Gain) skorlamasına göre seçer.
                </p>
              </div>

              {/* Queue Preload Count */}
              <div className="space-y-2 pt-4 border-t border-border/60">
                <label className="text-sm font-bold text-text-primary">
                  Film Kuyruğu Ön Bellekleme Sayısı (Queue Preload Count)
                </label>
                <p className="text-xs text-text-muted">
                  İstemci tarafında tek seferde sunucudan çekilip önbelleğe alınan film adayı miktarı.
                </p>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={queuePreloadCount}
                  onChange={(e) => setQueuePreloadCount(parseInt(e.target.value, 10) || 5)}
                  className="w-48 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                />
              </div>

              {/* AI Global Toggle */}
              <div className="space-y-2 pt-4 border-t border-border/60">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="globalAiToggle"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="rounded bg-surface-elevated border-border text-accent focus:ring-0"
                  />
                  <label htmlFor="globalAiToggle" className="text-sm font-bold text-text-primary">
                    Yapay Zeka Servislerini Global Olarak Aktif Et
                  </label>
                </div>
                <p className="text-xs text-text-muted">
                  DeepSeek provider erişim yetkisini global olarak kontrol eder.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all disabled:opacity-50 shadow-md"
              >
                {isSaving ? "Kaydediliyor..." : "Sistem & Hibrit Motor Ayarlarını Kaydet"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
