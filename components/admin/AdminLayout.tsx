"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
  adminEmail?: string;
}

export function AdminLayout({ children, adminEmail }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navCategories = [
    {
      category: "OPERASYON",
      items: [
        { label: "Genel Bakış", href: "/admin", icon: "📊" },
        { label: "İçerik Kataloğu", href: "/admin/media", icon: "🎬" },
        { label: "Kullanıcılar", href: "/admin/users", icon: "👥" },
        { label: "Premium & Billing", href: "/admin/billing", icon: "💳" },
      ],
    },
    {
      category: "BÜYÜME & SEO",
      items: [
        { label: "Growth & SEO", href: "/admin/growth", icon: "🚀" },
      ],
    },
    {
      category: "VERİ & MOTOR",
      items: [
        { label: "Katalog Motoru", href: "/admin/catalog-ingestion", icon: "📦" },
        { label: "Entegrasyonlar", href: "/admin/integrations", icon: "🔌" },
      ],
    },
    {
      category: "YÖNETİM",
      items: [
        { label: "Sistem Ayarları", href: "/admin/settings", icon: "⚙️" },
        { label: "Sistem Durumu", href: "/admin/system", icon: "🖥️" },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const getPageTitle = () => {
    if (pathname === "/admin") return "Genel Bakış";
    if (pathname.startsWith("/admin/media")) return "Film & Dizi Katalog Yönetimi";
    if (pathname.startsWith("/admin/users")) return "Kullanıcı Yönetimi";
    if (pathname.startsWith("/admin/billing")) return "Premium & Faturalandırma Yönetimi";
    if (pathname.startsWith("/admin/growth")) return "Growth & SEO Yönetim Merkezi";
    if (pathname.startsWith("/admin/catalog-ingestion")) return "Katalog İçe Aktarma Motoru";
    if (pathname.startsWith("/admin/integrations")) return "API & Servis Entegrasyonları";
    if (pathname.startsWith("/admin/settings")) return "Sistem & Öneri Ayarları";
    if (pathname.startsWith("/admin/system")) return "Sistem & Altyapı Durumu";
    return "Yönetim Konsolu";
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-base text-text-primary selection:bg-accent selection:text-white font-sans">
      {/* Mobile Top Bar (md:hidden) */}
      <header className="md:hidden border-b border-border bg-surface-1 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <span className="text-accent text-xs font-bold font-mono">ADM</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-text-primary tracking-tight">SINEAI</h1>
            <p className="text-[10px] text-text-muted font-mono uppercase leading-none">Console</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-h-[40px] min-w-[40px] px-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm font-mono flex items-center justify-center"
          aria-label="Menüyü Aç"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex flex-col justify-between animate-fadeIn">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs text-text-muted uppercase tracking-wider font-semibold">
                  SİSTEM MENÜSÜ
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-surface-2 text-xs font-mono text-text-primary border border-border"
              >
                ✕ Kapat
              </button>
            </div>

            <nav className="space-y-4">
              {navCategories.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <p className="text-[10px] font-mono text-text-muted uppercase px-2 font-semibold tracking-wider">
                    {cat.category}
                  </p>
                  {cat.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-accent text-white font-semibold shadow-sm"
                            : "bg-surface-2 text-text-secondary border border-border/60 hover:text-text-primary"
                        }`}
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-border/80 space-y-3">
            {adminEmail && (
              <div className="px-2">
                <p className="text-[10px] uppercase text-text-muted font-mono">YÖNETİCİ</p>
                <p className="text-xs text-text-secondary font-mono truncate">{adminEmail}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="py-2.5 px-3 rounded-xl bg-surface-2 border border-border text-xs text-text-secondary hover:text-text-primary text-center font-medium"
              >
                Siteye Git ↗
              </Link>
              <button
                onClick={handleLogout}
                className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium text-xs hover:bg-red-500/20 transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (hidden md:flex) */}
      <aside className="hidden md:flex w-64 border-r border-border bg-surface-1 flex-col justify-between p-4 flex-shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Admin Header / Logo */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shadow-sm">
                <span className="text-accent text-xs font-mono font-bold">ADM</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-sm tracking-tight text-text-primary">
                  SINEAI
                </h1>
                <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                  Admin Console
                </p>
              </div>
            </div>

            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sistem Aktif" />
          </div>

          {/* Navigation Categories */}
          <nav className="space-y-5">
            {navCategories.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <p className="text-[10px] font-mono text-text-muted uppercase px-2 font-semibold tracking-wider">
                  {cat.category}
                </p>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-accent/15 border border-accent/40 text-accent font-semibold shadow-sm"
                            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary border border-transparent"
                        }`}
                      >
                        <span className="text-sm opacity-90">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer: User Identity & Site Link & Logout */}
        <div className="pt-4 border-t border-border/80 space-y-3">
          {adminEmail && (
            <div className="px-2">
              <p className="text-[10px] uppercase text-text-muted font-mono">YÖNETİCİ</p>
              <p className="text-xs text-text-secondary font-mono truncate">{adminEmail}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex-1 py-2 px-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-[11px] text-text-secondary hover:text-text-primary text-center font-medium transition-colors"
            >
              Uygulama ↗
            </Link>
            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-xl bg-surface-2 hover:bg-red-500/10 border border-border hover:border-red-500/30 text-[11px] text-red-400 transition-colors font-medium"
            >
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Header Strip */}
        <header className="hidden md:flex h-14 border-b border-border bg-surface-1/70 backdrop-blur-md px-6 items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-text-muted">Admin</span>
            <span className="text-border">/</span>
            <span className="text-text-primary font-semibold font-sans">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production</span>
            </div>
            {adminEmail && (
              <span className="text-xs font-mono text-text-muted truncate max-w-[200px]">
                {adminEmail}
              </span>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
