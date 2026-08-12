"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const queryError = searchParams.get("error");
    if (queryError) {
      setErrorMessage(queryError);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { name, email, password, confirmPassword }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Giriş işlemi başarısız.");
        setIsLoading(false);
        return;
      }

      // Success -> Redirect to returnTo or Home / Calibration
      const rawReturnTo = searchParams.get("returnTo");
      const returnTo = rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/";
      router.push(returnTo);
      router.refresh();
    } catch (err: any) {
      setErrorMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
      setIsLoading(false);
    }
  };

  const rawReturnTo = searchParams.get("returnTo");
  const googleAuthUrl = rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
    ? `/api/auth/google?returnTo=${encodeURIComponent(rawReturnTo)}`
    : "/api/auth/google";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 selection:bg-accent selection:text-white">
      {/* Brand Header */}
      <div className="w-full max-w-md space-y-6 text-center animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shadow-sm group-hover:bg-accent/25 transition-colors">
            <div className="w-3.5 h-3.5 rounded-full bg-accent animate-pulse" />
          </div>
          <span className="font-display text-2xl font-bold tracking-wider text-text-primary">
            FILMPRINT
          </span>
        </Link>

        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
            Film zevkini keşfet.
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
            İzlediğin filmleri değerlendir. Film DNA'n oluşsun ve sana gerçekten uygun filmleri bulalım.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs text-left animate-fadeIn font-mono flex items-start gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Authentication Card */}
        <div className="rounded-3xl bg-surface border border-border/80 p-6 md:p-8 shadow-cinematic space-y-6 text-left">
          {/* Primary Action: Google OAuth */}
          <a
            href={googleAuthUrl}
            className="w-full py-3.5 px-4 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-medium text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google ile devam et</span>
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[11px] font-mono text-text-muted uppercase">veya</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Yeni Hesap Oluştur
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              E-posta ile Giriş Yap
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1">
                <label className="text-xs font-mono text-text-secondary">Adınız</label>
                <input
                  type="text"
                  required
                  placeholder="ör. Alper Ateş"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-mono text-text-secondary">E-posta Adresi</label>
              <input
                type="email"
                required
                placeholder="ornek@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-text-secondary">Parola</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {mode === "register" && (
              <div className="space-y-1">
                <label className="text-xs font-mono text-text-secondary">Parola Tekrar</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover active:scale-[0.99] transition-all shadow-md disabled:opacity-50"
            >
              {isLoading
                ? "İşlem yapılıyor..."
                : mode === "register"
                ? "Hesap Oluştur ve Devam Et →"
                : "Giriş Yap →"}
            </button>
          </form>
        </div>

        {/* Footer Guarantee Note */}
        <p className="text-xs text-text-muted leading-relaxed font-mono">
          💡 Zaten Filmprint kullandıysan giriş yaptığında mevcut Film DNA'n korunur.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthContent />
    </Suspense>
  );
}
