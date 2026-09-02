"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { BottomNav } from "@/components/ui/BottomNav";
import { UserEntitlementSummary } from "@/lib/entitlements/types";
import { EffectiveBillingReadiness } from "@/lib/billing/types";
import { trackEvent } from "@/lib/analytics/client";

interface PremiumData {
  summary: UserEntitlementSummary;
  billingReadiness: EffectiveBillingReadiness;
  pricing: {
    premiumEnabled: boolean;
    monthlyPrice: string | null;
    annualPrice: string | null;
    annualDiscountLabel: string | null;
    currency: string;
    trialText: string | null;
  };
}

export default function PremiumPage() {
  const [data, setData] = useState<PremiumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [ctaNotice, setCtaNotice] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [legalConsentAccepted, setLegalConsentAccepted] = useState(false);

  useEffect(() => {
    trackEvent({ name: "premium_page_view", params: { source: "navigation" } });

    fetch("/api/entitlements/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleCtaClick = async (plan: "monthly" | "annual") => {
    trackEvent({
      name: "premium_cta_click",
      params: { plan, source: "premium_page_cta" },
    });

    if (data?.billingReadiness?.isReady) {
      if (!legalConsentAccepted) {
        setCtaNotice("Lütfen devam etmeden önce Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme koşullarını onaylayınız.");
        return;
      }
      setIsProcessingCheckout(true);
      setCtaNotice("Güvenli PayTR ödeme sayfasına yönlendiriliyorsunuz...");
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interval: plan === "monthly" ? "MONTHLY" : "YEARLY",
            legalConsentAccepted: true,
          }),
        });
        const json = await res.json();
        if (res.ok && json.checkoutUrl) {
          window.location.href = json.checkoutUrl;
        } else {
          setCtaNotice(json.error || "Ödeme oturumu başlatılamadı. Lütfen tekrar deneyin.");
        }
      } catch {
        setCtaNotice("Ödeme servisine bağlanırken bir sorun oluştu.");
      } finally {
        setIsProcessingCheckout(false);
      }
    } else {
      setCtaNotice("SINEAI Premium abonelikleri çok yakında kullanıma sunulacaktır. İlginiz için teşekkürler!");
    }
  };

  const isPremium = data?.summary?.isPremium === true;

  // Real discount calculation strictly from non-empty prices
  let calculatedDiscountLabel: string | null = null;
  const mPrice = data?.pricing?.monthlyPrice ? parseFloat(data.pricing.monthlyPrice) : null;
  const yPrice = data?.pricing?.annualPrice ? parseFloat(data.pricing.annualPrice) : null;
  if (mPrice && yPrice && mPrice > 0 && yPrice > 0 && yPrice < mPrice * 12) {
    const savePercent = Math.round(((mPrice * 12 - yPrice) / (mPrice * 12)) * 100);
    calculatedDiscountLabel = `%${savePercent} Tasarruf`;
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white font-sans">
      <Header />

      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl rounded-full" />
      </div>

      <main className="flex-1 relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-16 animate-fade-in">
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>SINEAI PREMIUM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight font-display">
            Daha fazla içerik değil, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-white bg-clip-text text-transparent">
              daha iyi kararlar.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            SINEAI'nin ücretsiz temel özellikleri her zaman yanınızda. Premium ile zevkinizi derinleştirin, yüksek limitli AI keşfi yapın ve ortak izleme kararlarını kusursuzlaştırın.
          </p>

          {/* Current Membership Status Badge */}
          {isPremium && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm">
                <span>👑</span>
                <span>Aktif Premium Üyeliğiniz Bulunuyor</span>
              </span>
            </div>
          )}
        </div>

        {/* Value Proposition Cards: Available Now */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              Şimdi Kullanılabilir Ayrıcalıklar
            </h2>
            <p className="text-xs text-zinc-400">
              Premium üyelerimize anında tanımlanan temel ayrıcalıklar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. AI Discover (Corrected Fair-Use Copy) */}
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-purple-500/30 shadow-xl space-y-4 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-2xl shadow-inner">
                ✨
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white font-display">
                  Yüksek Limitli AI ile Keşfet
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Genişletilmiş arama kotalarıyla ruh halinizi, aklınızdaki sahneyi veya aradığınız deneyimi doğal dille anlatın.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-purple-300">
                ✓ Yüksek günlük fair-use limiti • Derin analiz
              </div>
            </div>

            {/* 2. Movie Night+ */}
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-purple-500/30 shadow-xl space-y-4 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-2xl shadow-inner">
                🍿
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white font-display">
                  Movie Night+ Gelişmiş Grup Zekası
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Arkadaş grubunuzla izleyecek film ararken ruh hali filtreleri, 20'ye varan öneri havuzu ve ortak AI gerekçesiyle anlaşın.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-purple-300">
                ✓ Ev sahibi ayrıcalığı • Misafir katılımı
              </div>
            </div>

            {/* 3. Ad-Free Guarantee */}
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-purple-500/30 shadow-xl space-y-4 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-2xl shadow-inner">
                🛡️
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white font-display">
                  Reklamsız Deneyim Garantisi
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  SINEAI'de reklamlar yayınlandığında Premium hesabınız tamamen kesintisiz, saf ve dikkat dağıtıcı unsurlardan arındırılmış kalır.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-purple-300">
                ✓ %100 Temiz arayüz • Hızlı yükleme
              </div>
            </div>
          </div>
        </div>

        {/* Free vs Premium Comparison Table */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              Paket Karşılaştırması
            </h2>
            <p className="text-xs text-zinc-400">
              SINEAI Free ve Premium arasındaki şeffaf farklar
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase">
                  <th className="py-3 px-3">Özellik</th>
                  <th className="py-3 px-3 text-center">SINEAI Free</th>
                  <th className="py-3 px-3 text-center text-purple-300 font-bold">SINEAI Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-3.5 px-3 text-zinc-200 font-medium">Film & Dizi Kalibrasyonu</td>
                  <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">Sınırsız (Ücretsiz)</td>
                  <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">Sınırsız</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 text-zinc-200 font-medium">Temel Film DNA & Dizi DNA</td>
                  <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">Dahil</td>
                  <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">Dahil</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 text-zinc-200 font-medium">Kişisel Kütüphane & Favoriler</td>
                  <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">Dahil</td>
                  <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">Dahil</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 text-zinc-200 font-medium">AI ile Keşfet (Doğal Dil Arama)</td>
                  <td className="py-3.5 px-3 text-center text-zinc-400">Günlük 5 Arama</td>
                  <td className="py-3.5 px-3 text-center text-purple-300 font-bold">Yüksek Limit (Fair-Use)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 text-zinc-200 font-medium">Movie Night Grup Uyum Motoru</td>
                  <td className="py-3.5 px-3 text-center text-zinc-400">Temel Eşleşme (10 Film)</td>
                  <td className="py-3.5 px-3 text-center text-purple-300 font-bold">Movie Night+ (Ruh Hali, 20 Film, AI)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-3 text-zinc-200 font-medium">Reklamsız Deneyim</td>
                  <td className="py-3.5 px-3 text-center text-zinc-400">Standart</td>
                  <td className="py-3.5 px-3 text-center text-purple-300 font-bold">Kalıcı Reklamsız</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Coming Soon Roadmap */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono uppercase">
              <span>ROADMAP</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              Geliştirilmekte Olan Premium Özellikler
            </h2>
            <p className="text-xs text-zinc-400">
              Yakında Premium üyelerimizin kullanımına sunulacak olan derin zeka özellikleri
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
              <div className="text-lg">🧬</div>
              <h4 className="font-bold text-zinc-200">Tat Evrimi & Derin DNA</h4>
              <p className="text-zinc-500 leading-relaxed text-[11px]">Zaman içindeki zevk dönüşümünüzü ve yönetmen/yazar korelasyonlarını görselleştirin.</p>
              <span className="inline-block text-[10px] font-mono text-purple-400 pt-1">Yakında</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
              <div className="text-lg">👥</div>
              <h4 className="font-bold text-zinc-200">Profil Karşılaştırma</h4>
              <p className="text-zinc-500 leading-relaxed text-[11px]">İki Film DNA profilini yan yana koyup ortak zevk kesişimlerini inceleyin.</p>
              <span className="inline-block text-[10px] font-mono text-purple-400 pt-1">Yakında</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
              <div className="text-lg">📊</div>
              <h4 className="font-bold text-zinc-200">İzleme Listesi Zekası</h4>
              <p className="text-zinc-500 leading-relaxed text-[11px]">Kütüphanenizdeki filmleri ruh haline, süreye ve kalitesine göre akıllıca sıralayın.</p>
              <span className="inline-block text-[10px] font-mono text-purple-400 pt-1">Yakında</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
              <div className="text-lg">📤</div>
              <h4 className="font-bold text-zinc-200">İçe & Dışa Aktarma</h4>
              <p className="text-zinc-500 leading-relaxed text-[11px]">Letterboxd, IMDb ve CSV formatlarında zevk verilerinizi yedekleyin veya aktarın.</p>
              <span className="inline-block text-[10px] font-mono text-purple-400 pt-1">Yakında</span>
            </div>
          </div>
        </div>

        {/* Pricing & Subscription Section */}
        {isPremium ? (
          /* Active Premium User Card */
          <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-purple-950/40 via-zinc-900 to-zinc-950 border border-purple-500/40 shadow-2xl text-center space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                <span>👑 SINEAI Premium Aktif</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display">
                Ayrıcalıklarınızın Keyfini Çıkarın
              </h3>
              <p className="text-xs text-zinc-400">
                Premium üyeliğiniz Film ve Dizi deneyiminizin tamamında geçerlidir.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Üyelik Durumu:</span>
                <span className="text-emerald-400 font-semibold font-mono">Aktif (SINEAI Premium)</span>
              </div>
              {data?.summary?.validUntil && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Geçerlilik / Yenilenme:</span>
                  <span className="text-zinc-200 font-mono">
                    {new Date(data.summary.validUntil).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {data?.summary?.source && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Yetki Kaynağı:</span>
                  <span className="text-purple-300 font-mono">{data.summary.source}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                href="/account"
                className="inline-block w-full py-3.5 px-6 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-white font-bold text-xs transition-colors shadow-sm"
              >
                Hesap & Abonelik Yönetimi ⚙️
              </Link>
            </div>
          </div>
        ) : (
          /* Non-Premium Plan Selection & Checkout CTA */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
                Planını Seç
              </h3>
              <p className="text-xs text-zinc-400">
                Dilediğin zaman iptal edebilir veya planını değiştirebilirsin.
              </p>
            </div>

            {/* Plan Selector Grid (Always visible!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Monthly Card */}
              <div
                onClick={() => setSelectedPlan("monthly")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 relative flex flex-col justify-between ${
                  selectedPlan === "monthly"
                    ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-600/20 ring-1 ring-purple-500"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">Aylık Plan</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">Aylık</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Esnek, istediğin zaman iptal et</p>
                </div>

                <div className="py-2">
                  {data?.pricing?.monthlyPrice ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white font-display">
                        {data.pricing.monthlyPrice}
                      </span>
                      <span className="text-xs text-zinc-400">/ ay</span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-zinc-400 font-mono">Fiyat yakında</span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <span>✓</span>
                  <span>Tüm Premium özellikler dahil</span>
                </div>
              </div>

              {/* Annual Card */}
              <div
                onClick={() => setSelectedPlan("annual")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 relative flex flex-col justify-between ${
                  selectedPlan === "annual"
                    ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-600/20 ring-1 ring-purple-500"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                {calculatedDiscountLabel && (
                  <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wide shadow-sm">
                    {calculatedDiscountLabel}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">Yıllık Plan</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">En Popüler</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Yıllık faturalandırılır • Kesintisiz</p>
                </div>

                <div className="py-2">
                  {data?.pricing?.annualPrice ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white font-display">
                        {data.pricing.annualPrice}
                      </span>
                      <span className="text-xs text-zinc-400">/ yıl</span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-zinc-400 font-mono">Fiyat yakında</span>
                  )}
                </div>

                <div className="text-[11px] text-purple-300 flex items-center gap-1 font-medium">
                  <span>✓</span>
                  <span>Film + TV tek hesap avantajı</span>
                </div>
              </div>
            </div>

            {/* Controlled CTA Box */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-950/30 via-zinc-900 to-zinc-950 border border-purple-500/30 text-center space-y-4">
              {data?.billingReadiness?.isReady && (
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-left space-y-3 text-xs">
                  <div className="font-bold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
                    <span>Sipariş Özeti & Dijital Teslimat</span>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {selectedPlan === "annual" ? data?.pricing?.annualPrice : data?.pricing?.monthlyPrice} {data?.pricing?.currency || "TL"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px]">
                    <p>• <strong>Dijital İfa:</strong> Ödeme onayıyla birlikte Premium özellikler hesabınıza anında tanımlanır.</p>
                    <p>• <strong>Yenileme:</strong> {selectedPlan === "annual" ? "Yıllık periyotlarla" : "Aylık periyotlarla"} otomatik yenilenir, dilediğiniz an iptal edebilirsiniz.</p>
                    <p>• <strong>İptal:</strong> İptal durumunda dönem sonuna kadar erişiminiz kesintisiz sürer.</p>
                  </div>
                  <label className="flex items-start gap-2.5 pt-2 border-t border-zinc-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={legalConsentAccepted}
                      onChange={(e) => setLegalConsentAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-700 text-purple-600 focus:ring-purple-500 bg-zinc-800 cursor-pointer"
                    />
                    <span className="text-[11px] text-zinc-300 leading-snug">
                      <Link href="/mesafeli-satis-sozlesmesi" target="_blank" className="text-purple-400 hover:underline font-medium">Mesafeli Satış Sözleşmesi</Link> ve <Link href="/teslimat" target="_blank" className="text-purple-400 hover:underline font-medium">Ön Bilgilendirme / Dijital Teslimat</Link> koşullarını okudum ve kabul ediyorum.
                    </span>
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleCtaClick(selectedPlan)}
                disabled={isProcessingCheckout}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-98 ${
                  data?.billingReadiness?.isReady
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 cursor-pointer"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-pointer hover:bg-zinc-750"
                }`}
              >
                {data?.billingReadiness?.isReady
                  ? (selectedPlan === "annual" ? "Yıllık Premium'a Yükselt" : "Aylık Premium'a Yükselt")
                  : "✨ Premium Çok Yakında — Bilgi Al"}
              </button>

              {ctaNotice && (
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/30 text-xs text-purple-200 animate-fade-in">
                  {ctaNotice}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}