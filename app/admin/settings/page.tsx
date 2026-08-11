"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminSettingsPage() {
  const [calibrationTarget, setCalibrationTarget] = useState(30);
  const [queuePreloadCount, setQueuePreloadCount] = useState(5);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [activeLearningEnabled, setActiveLearningEnabled] = useState(true);
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
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Sistem Ayarları & Strateji
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            Kalibrasyon hedefi, akıllı seçim stratejisi ve sistem parametreleri
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            Ayarlar yükleniyor...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-surface border border-border/80 space-y-6 shadow-md">
            {statusMsg && (
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs font-mono text-text-primary">
                {statusMsg}
              </div>
            )}

            {/* Calibration Target Setting */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">
                Kalibrasyon Eşik Hedefi (Initial Calibration Target)
              </label>
              <p className="text-xs text-text-muted">
                Kullanıcıya Film DNA sinyali toplandığını bildiren tamamlanma eşiğidir. Kullanıcı bu sayıdan sonra da film değerlendirmeye kesintisiz devam edebilir.
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
                Kullanıcıya gösterilecek sıradaki filmleri deterministik bilgi kazancı (Information Gain) skorlamasına göre seçer. Devre dışı bırakılırsa standart dengeli seçim stratejisine geçer.
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
                  Yapay Zeka Servislerini Aktif Et
                </label>
              </div>
              <p className="text-xs text-text-muted">
                İlerideki fazlarda çalışacak Film DNA öneri algoritmaları için AI provider erişim yetkisini kontrol eder.
              </p>
            </div>

            <div className="pt-4 border-t border-border/60">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all disabled:opacity-50 shadow-md"
              >
                {isSaving ? "Kaydediliyor..." : "Sistem Ayarlarını Kaydet"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
