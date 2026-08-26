"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface AccountSettingsUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  provider: "ANONYMOUS" | "GOOGLE" | "EMAIL";
  accountType: "ANONYMOUS" | "REGISTERED";
  showEmail: boolean;
  interactionCount: number;
  tier?: "FREE" | "PREMIUM";
  isPremium?: boolean;
  validUntil?: string | null;
}

interface AccountSettingsFormProps {
  initialUser: AccountSettingsUser;
}

const PRESET_AVATARS = [
  { id: "director", label: "Yönetmen", emoji: "🎬", bg: "from-amber-600 to-amber-950" },
  { id: "cinephile", label: "Sinefil", emoji: "🍿", bg: "from-rose-600 to-rose-950" },
  { id: "noir", label: "Neo-Noir", emoji: "🕶️", bg: "from-slate-700 to-slate-950" },
  { id: "prestige", label: "Başyapıt", emoji: "👑", bg: "from-yellow-500 to-amber-900" },
  { id: "scifi", label: "Sci-Fi", emoji: "🤖", bg: "from-cyan-600 to-blue-950" },
  { id: "gothic", label: "Gotik", emoji: "🧛‍♂️", bg: "from-purple-800 to-indigo-950" },
  { id: "cosmic", label: "Kozmik", emoji: "🚀", bg: "from-violet-600 to-purple-950" },
  { id: "arthouse", label: "Art-House", emoji: "🎨", bg: "from-pink-600 to-rose-950" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "⚡", bg: "from-emerald-600 to-teal-950" },
  { id: "classic", label: "Klasik", emoji: "📽️", bg: "from-amber-700 to-stone-950" },
];

export function AccountSettingsForm({ initialUser }: AccountSettingsFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(initialUser.name || "");
  const [image, setImage] = useState<string | null>(initialUser.image || null);
  const [showEmail, setShowEmail] = useState(initialUser.showEmail);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle custom image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Görsel boyutu en fazla 5MB olabilir.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to maximum 256x256 square on Canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        if (ctx) {
          // Crop square center
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setImage(resizedDataUrl);
          setErrorMessage(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate an avatar SVG data URI from preset emoji
  const handleSelectPreset = (preset: typeof PRESET_AVATARS[0]) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8B5CF6"/>
            <stop offset="100%" stop-color="#1E1B4B"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="30" fill="url(#grad)"/>
        <text x="60" y="75" font-size="52" text-anchor="middle">${preset.emoji}</text>
      </svg>
    `.trim();

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setImage(dataUri);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload: any = {
        name,
        image,
        showEmail,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Güncelleme başarısız oldu.");
      } else {
        setSuccessMessage("Profil ayarlarınız başarıyla güncellendi!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      }
    } catch (err) {
      console.error("Account update error:", err);
      setErrorMessage("Sunucu ile bağlantı kurulamadı.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 font-sans">
      {/* Success & Error Banners */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2.5 animate-fadeIn">
          <span className="text-base">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-sm font-semibold flex items-center gap-2.5 animate-fadeIn">
          <span className="text-base">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Profile Picture / Avatar Section */}
      <div className="rounded-3xl bg-surface-1 border border-border/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
            <span>🖼️</span>
            <span>Profil Fotoğrafı & Avatar</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            SineAI profilinde, Film DNA kartında ve yorumlarında görünecek avatarını özelleştir.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Preview */}
          <div className="relative group">
            {image ? (
              <img
                src={image}
                alt="Avatar"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-accent shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-accent/20 to-surface-2 border-2 border-accent/40 flex items-center justify-center text-accent text-4xl font-bold font-mono shadow-inner">
                {name ? name.charAt(0).toUpperCase() : "👤"}
              </div>
            )}

            {image && (
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center shadow-md hover:bg-rose-500 transition-all cursor-pointer"
                title="Fotoğrafı Kaldır"
              >
                ✕
              </button>
            )}
          </div>

          {/* Upload Controls & Presets */}
          <div className="space-y-4 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent text-text-primary text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <span>📁</span>
                <span>Cihazdan Fotoğraf Yükle</span>
              </button>

              {image && (
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-2 hover:bg-rose-950/40 border border-border hover:border-rose-500/40 text-text-muted hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Sıfırla
                </button>
              )}
            </div>

            {/* Presets Slider */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] uppercase font-bold text-text-muted tracking-wider">
                Veya Sinematik Hazır Bir Avatar Seç
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title={preset.label}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-xs text-text-secondary">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Identity & Name Section */}
      <div className="rounded-3xl bg-surface-1 border border-border/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
            <span>👤</span>
            <span>Profil Kimliği & İsim</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Platformda ve herkese açık Film DNA sayfanda görünecek adını belirle.
          </p>
        </div>

        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Görünen Ad / Sinefil İsmi
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Alper Ateş"
              maxLength={50}
              required
              className="w-full px-4 py-3 rounded-2xl bg-surface-2 border border-border focus:border-accent focus:outline-none text-text-primary text-sm transition-all"
            />
            <p className="text-[11px] text-text-muted">
              En az 2, en fazla 50 karakter uzunluğunda olmalıdır.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Email & Privacy Settings Section */}
      <div className="rounded-3xl bg-surface-1 border border-border/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
            <span>🔒</span>
            <span>E-posta & Gizlilik Ayarları</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            E-posta adresinin profilinde ve paylaştığın kartlarda nasıl görüneceğini yönet.
          </p>
        </div>

        <div className="space-y-5 max-w-xl">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Kayıtlı E-posta Adresi
            </label>
            <div className="px-4 py-3 rounded-2xl bg-surface-2/60 border border-border text-text-muted text-sm font-mono flex items-center justify-between">
              <span>{initialUser.email || "E-posta tanımlanmamış"}</span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-accent/15 text-accent font-bold">
                {initialUser.provider === "GOOGLE" ? "Google Girişi" : "E-posta Girişi"}
              </span>
            </div>
          </div>

          {/* Toggle Switch for Email Visibility */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-border gap-4">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-text-primary">
                E-posta Adresim Profilimde ve Kartlarımda Görünsün
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                {showEmail
                  ? "Açık: Profil sayfanızda e-posta adresiniz görüntülenir."
                  : "Kapalı: Profilinizde ve paylaştığınız DNA kartlarında e-postanız gizlenir."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEmail(!showEmail)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center cursor-pointer flex-shrink-0 ${
                showEmail ? "bg-accent justify-end" : "bg-surface-3 justify-start"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Password Change (Only for EMAIL Provider) */}
      {initialUser.provider === "EMAIL" && (
        <div className="rounded-3xl bg-surface-1 border border-border/80 p-6 md:p-8 space-y-6 shadow-sm">
          <div className="border-b border-border/60 pb-3">
            <h2 className="font-display text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
              <span>🔑</span>
              <span>Parola Değiştir</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Hesap güvenliğiniz için parolanızı güncelleyin (Opsiyonel).
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Mevcut Parola
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-2 border border-border focus:border-accent focus:outline-none text-text-primary text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Yeni Parola
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-2 border border-border focus:border-accent focus:outline-none text-text-primary text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Yeni Parola Tekrar
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-2xl bg-surface-2 border border-border focus:border-accent focus:outline-none text-text-primary text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Subscription & Membership Status Section */}
      <div className="rounded-3xl bg-surface-1 border border-border/80 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="border-b border-border/60 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
              <span>👑</span>
              <span>Üyelik & Abonelik Planı</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              SINEAI hesap katmanınız ve aktif yetkileriniz.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
              initialUser.isPremium
                ? "bg-purple-950/80 border border-purple-500/40 text-purple-300"
                : "bg-surface-2 border border-border text-text-muted"
            }`}
          >
            {initialUser.isPremium ? "✨ PREMIUM" : "ÜCRETSİZ PLAN"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-2 border border-border/70">
          <div className="space-y-1">
            <p className="text-sm font-bold text-text-primary">
              {initialUser.isPremium ? "SINEAI Premium Üyeliği Aktif" : "SINEAI Free Planı"}
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              {initialUser.isPremium
                ? initialUser.validUntil
                  ? `Üyeliğiniz ${new Date(initialUser.validUntil).toLocaleDateString("tr-TR")} tarihine kadar geçerlidir.`
                  : "Süresiz aktif Premium üyeliğiniz bulunmaktadır."
                : "Günlük 5 AI keşfi, sınırsız film/dizi kalibrasyonu ve temel Movie Night dahildir."}
            </p>
          </div>

          <Link
            href="/premium"
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 flex-shrink-0 ${
              initialUser.isPremium
                ? "bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40"
                : "bg-accent hover:bg-accent-hover text-white shadow-md"
            }`}
          >
            <span>{initialUser.isPremium ? "Plan Detayları" : "✨ Premium'a Yükselt"}</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 6. Sticky / Prominent Save Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-surface-1 border border-border shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="px-5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center"
          >
            ← Profile Dön
          </Link>
          <a
            href="/api/auth/logout"
            className="px-4 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <span>🚪</span>
            <span>Çıkış Yap</span>
          </a>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-all shadow-lg shadow-accent/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Değişiklikleri Kaydet</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
