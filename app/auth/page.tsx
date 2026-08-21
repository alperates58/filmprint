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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"dna" | "match" | "compare">("dna");

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
    <div className="relative min-h-screen bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent selection:text-white">
      {/* Background Ambient Glow Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-accent/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-accent-secondary/10 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[160px]" />
        {/* Subtle dot mesh background overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 min-h-screen flex flex-col justify-between">
        
        {/* Top Navbar / Brand Bar */}
        <header className="flex items-center justify-between pb-6 sm:pb-10 border-b border-border/40">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center shadow-sm group-hover:bg-accent/25 transition-all">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            </div>
            <div>
              <span className="font-display text-xl sm:text-2xl font-black tracking-wider text-text-primary">
                SINEAI
              </span>
              <span className="hidden sm:inline-block ml-2.5 px-2 py-0.5 rounded-md bg-accent-subtle border border-accent/20 text-[10px] font-mono font-semibold text-accent uppercase tracking-wider">
                AI Taste Engine
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden md:flex items-center gap-2 text-text-secondary font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              10.000+ Film & Dizi Analizi
            </span>
          </div>
        </header>

        {/* Hero & Auth Split Grid */}
        <main className="my-auto py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
            
            {/* LEFT COLUMN: Value Proposition & Product Showcase */}
            <div className="lg:col-span-7 space-y-8 text-left">
              
              {/* Badge & Slogan */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-xs font-mono font-medium text-accent backdrop-blur-md">
                  <span>✨</span>
                  <span>Şişirilmiş Puanlar Yok. Gerçek Zevk Analizi Var.</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-primary leading-[1.15]">
                  Film zevkinizi <span className="bg-gradient-to-r from-accent via-violet-400 to-accent-secondary bg-clip-text text-transparent">matematiksel olarak</span> keşfedin.
                </h1>

                <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl font-normal">
                  SineAI, popülerlik listeleri yerine verdiğiniz oylardan <strong className="text-text-primary font-semibold">Film DNA’nızı</strong> modeller. Size neden bir yapımı önerdiğini şeffaf gerekçelerle açıklar.
                </p>
              </div>

              {/* Interactive Showcase Preview Widget */}
              <div className="rounded-3xl bg-surface-1/90 border border-border/80 p-5 sm:p-7 shadow-cinematic backdrop-blur-xl space-y-5">
                
                {/* Showcase Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    SİSTEMİN GÜCÜNÜ İNCELEYİN:
                  </span>

                  <div className="flex rounded-xl bg-surface-2 p-1 border border-border/80 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("dna")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        activePreviewTab === "dna"
                          ? "bg-accent text-white font-semibold shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      🧬 Film DNA
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("match")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        activePreviewTab === "match"
                          ? "bg-accent text-white font-semibold shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      🎯 % Eşleşme
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("compare")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        activePreviewTab === "compare"
                          ? "bg-accent text-white font-semibold shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      👥 Arkadaş Kıyaslama
                    </button>
                  </div>
                </div>

                {/* Showcase Tab 1: Film DNA */}
                {activePreviewTab === "dna" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-surface-2/80 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-xl">
                          🎭
                        </div>
                        <div>
                          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Kişisel Arketipiniz</p>
                          <p className="text-sm sm:text-base font-bold text-text-primary">Atmosferik Neo-Noir & Felsefi Bilimkurgu</p>
                        </div>
                      </div>
                      <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-semibold">
                        Yüksek Sezgisellik
                      </span>
                    </div>

                    {/* Gauges */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-surface-2 border border-border/70 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary">Felsefi & Anlatı Derinliği</span>
                          <span className="text-accent font-mono font-bold">%94</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-500 to-accent rounded-full w-[94%]" />
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted">
                          <span>Aksiyon / Yüzeysel</span>
                          <span>Derin Katmanlar</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2 border border-border/70 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary">Görsel Spektakl & Doku</span>
                          <span className="text-accent font-mono font-bold">%88</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full w-[88%]" />
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted">
                          <span>Minimalist Sahne</span>
                          <span>Görsel Şölen</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Showcase Tab 2: % Eşleşme */}
                {activePreviewTab === "match" && (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="p-4 rounded-2xl bg-surface-2 border border-accent/30 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-text-primary">Blade Runner 2049</span>
                            <span className="text-xs text-text-muted font-mono">(2017)</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">Yönetmen: Denis Villeneuve • Bilimkurgu / Gizem</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-accent text-white font-mono font-bold text-sm shadow-md flex items-center gap-1.5 flex-shrink-0">
                          <span>🎯</span>
                          <span>%97 Uyum</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-3/80 border border-border text-xs text-text-secondary flex items-start gap-2 leading-relaxed">
                        <span className="text-accent text-sm">💡</span>
                        <span>
                          <strong className="text-text-primary">Neden Size Göre?</strong> Ağır tempolu görsel anlatım, Roger Deakins sinematografisi ve varoluşsal tema tercihlerinize tam oturuyor.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Showcase Tab 3: Arkadaş Karşılaştırma */}
                {activePreviewTab === "compare" && (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-bold text-xs text-accent">
                            Siz
                          </div>
                          <span className="text-sm font-bold text-text-primary">vs</span>
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-xs text-amber-400">
                            Ece
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                          %86 Zevk Uyumu
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        🍿 <strong>Bu Akşam Ne İzlemelisiniz?</strong> İkinizin de yüksek puan vereceği ortak kesişim türü: <span className="text-text-primary font-semibold">Psikolojik Gerilim & Kara Komedi</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 4-Pillar Value Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-surface-1/70 border border-border/70 hover:border-accent/40 transition-colors space-y-1">
                  <span className="text-xl">⚡</span>
                  <p className="text-xs font-bold text-text-primary">Hızlı Kalibrasyon</p>
                  <p className="text-[11px] text-text-muted leading-tight">30 saniyede algoritmayı eğit</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-1/70 border border-border/70 hover:border-accent/40 transition-colors space-y-1">
                  <span className="text-xl">🎯</span>
                  <p className="text-xs font-bold text-text-primary">Kişiye Özel % Skor</p>
                  <p className="text-[11px] text-text-muted leading-tight">Sana özel eşleşme oranı</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-1/70 border border-border/70 hover:border-accent/40 transition-colors space-y-1">
                  <span className="text-xl">👥</span>
                  <p className="text-xs font-bold text-text-primary">Zevk Kıyaslama</p>
                  <p className="text-[11px] text-text-muted leading-tight">Arkadaşlarınla Film DNA'nı eşle</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-1/70 border border-border/70 hover:border-accent/40 transition-colors space-y-1">
                  <span className="text-xl">🍿</span>
                  <p className="text-xs font-bold text-text-primary">Movie Night</p>
                  <p className="text-[11px] text-text-muted leading-tight">Grup için ideal filmi bul</p>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Ultra-Sleek Auth Form Card */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-3xl bg-surface-1/95 border border-border/90 p-6 sm:p-9 shadow-cinematic backdrop-blur-2xl space-y-6 relative overflow-hidden">
                
                {/* Decorative subtle card glow */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

                {/* Card Title */}
                <div className="space-y-1 text-left">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-text-primary">
                    {mode === "register" ? "Film Dünyana Adım At" : "Tekrar Hoş Geldin"}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary">
                    {mode === "register"
                      ? "Film DNA'nızı kaydedin ve kişiselleştirilmiş keşfe hemen başlayın."
                      : "Hesabınıza giriş yaparak zevk profilinizi görüntüleyin."}
                  </p>
                </div>

                {/* Error Alert */}
                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs text-left animate-fadeIn flex items-start gap-2.5 font-medium">
                    <span className="text-sm mt-0.5">⚠️</span>
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}

                {/* Primary Action: Google OAuth Button */}
                <a
                  href={googleAuthUrl}
                  className="w-full py-3.5 px-4 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-primary font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-sm group"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
                  <span className="group-hover:text-text-primary transition-colors">Google ile Devam Et</span>
                </a>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">veya e-posta ile</span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>

                {/* Mode Switcher Tabs */}
                <div className="flex rounded-2xl bg-surface-2 p-1.5 border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                      mode === "register"
                        ? "bg-accent text-white shadow-md font-bold"
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
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                      mode === "login"
                        ? "bg-accent text-white shadow-md font-bold"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Giriş Yap
                  </button>
                </div>

                {/* Form Elements */}
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {mode === "register" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
                        <span>Adınız & Soyadınız</span>
                        <span className="text-[10px] text-text-muted font-normal">Profilinizde görünür</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn. Sinan Kaya"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">E-posta Adresi</label>
                    <input
                      type="email"
                      required
                      placeholder="ornek@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Parola</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-11 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 text-xs transition-colors"
                        aria-label="Şifreyi Göster/Gizle"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {mode === "register" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Parola Tekrar</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-11 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 text-xs transition-colors"
                          aria-label="Şifre Tekrarını Göster/Gizle"
                        >
                          {showConfirmPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-hover active:scale-[0.99] transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>İşlem yapılıyor...</span>
                      </>
                    ) : mode === "register" ? (
                      <>
                        <span>Hesap Oluştur ve Zevkini Keşfet</span>
                        <span>→</span>
                      </>
                    ) : (
                      <>
                        <span>Giriş Yap ve Devam Et</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Notes */}
                <div className="pt-2 border-t border-border/50 space-y-2 text-center">
                  <p className="text-xs text-text-muted leading-relaxed font-sans">
                    💡 <strong>Zaten oy verdin mi?</strong> Giriş yaptığında tüm değerlendirmelerin ve Film DNA'n hesabına aktarılır.
                  </p>
                  <p className="text-[11px] text-text-muted/80">
                    🔒 Reklamsız, bağımsız ve gizliliğe saygılı sinema deneyimi.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="pt-6 sm:pt-10 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted font-sans">
          <p>© {new Date().getFullYear()} SineAI. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="hover:text-text-primary transition-colors">
              Nasıl Çalışır?
            </Link>
            <span>•</span>
            <span className="text-text-muted">Film & Dizi Tavsiye Motoru</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <AuthContent />
    </Suspense>
  );
}

