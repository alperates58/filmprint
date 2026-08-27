"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export default function BillingFailedPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white font-sans">
      <Header />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Ödeme Tamamlanamadı
          </h1>
          <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            Ödeme işlemi bankanız veya sağlayıcı tarafından onaylanmadı veya işlem iptal edildi. Kartınızdan herhangi bir çekim yapılmamıştır.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/premium"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Tekrar Dene
          </Link>
          <Link
            href="/account"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-2 border border-border text-text-primary font-semibold text-xs hover:bg-surface-3 transition-all"
          >
            Hesaba Dön
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}