"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export default function BillingSuccessPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/entitlements/me");
        if (res.ok) {
          const json = await res.json();
          if (json.summary?.isPremium) {
            setIsActivated(true);
            setIsVerifying(false);
            clearInterval(interval);
            return;
          }
        }
      } catch {
        // Retry
      }

      if (attempts >= 5) {
        setIsVerifying(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white font-sans">
      <Header />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
          👑
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {isActivated
              ? "SINEAI Premium'a Hoş Geldiniz!"
              : "Ödeme İşleminiz Alındı"}
          </h1>
          <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            {isActivated
              ? "Ödemeniz doğrulandı ve Premium üyeliğiniz hem Film hem Dizi deneyiminiz için anında aktive edildi."
              : isVerifying
              ? "Ödeme sağlayıcısından onay bekleniyor, üyeliğiniz birkaç saniye içinde açılacaktır..."
              : "Ödemeniz alındı. Sistem arka planda aboneliğinizi güncelliyor. Hesabınızdan durumu takip edebilirsiniz."}
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/kesfet"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            AI ile Keşfet'e Başla
          </Link>
          <Link
            href="/account"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-2 border border-border text-text-primary font-semibold text-xs hover:bg-surface-3 transition-all"
          >
            Hesap Detayları
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}