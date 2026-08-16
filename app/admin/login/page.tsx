"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Bağlantı hatası oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4 selection:bg-accent selection:text-white font-sans">
      <div className="w-full max-w-md space-y-6 bg-surface-1 border border-border rounded-3xl p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-sm font-mono font-bold shadow-sm">
            ADM
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
            SINEAI Console
          </h1>
          <p className="text-xs text-text-secondary">
            Yönetim ve Operasyon Portalı
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary font-medium">E-posta Adresi</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sineai.com.tr"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary font-medium">Parola</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? "Giriş Yapılıyor..." : "Konsola Giriş Yap"}
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-xs text-text-muted hover:text-text-primary transition-colors inline-block"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
