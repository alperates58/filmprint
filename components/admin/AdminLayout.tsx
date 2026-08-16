"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
  adminEmail?: string;
}

export function AdminLayout({ children, adminEmail }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { label: "Genel Bakış", href: "/admin", icon: "📊" },
    { label: "Kullanıcılar", href: "/admin/users", icon: "👥" },
    { label: "Katalog Motoru", href: "/admin/catalog-ingestion", icon: "📦" },
    { label: "Entegrasyonlar", href: "/admin/integrations", icon: "🔌" },
    { label: "Sistem Ayarları", href: "/admin/settings", icon: "⚙️" },
    { label: "Sistem Durumu", href: "/admin/system", icon: "🖥️" },
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-text-primary selection:bg-accent selection:text-white">
      {/* Mobile Top Header (md:hidden) */}
      <header className="md:hidden border-b border-border/80 bg-surface px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
            <span className="text-accent text-xs font-mono font-bold">ADM</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sm tracking-wider text-text-primary">
              SINEAI
            </h1>
            <p className="text-[9px] text-text-muted font-mono uppercase">
              ADMIN CONSOLE
            </p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm font-mono"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/90 backdrop-blur-md p-4 flex flex-col justify-between animate-fadeIn">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-mono text-xs text-accent uppercase tracking-widest font-bold">
                MENÜ
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-surface-elevated text-xs font-mono text-text-primary"
              >
                ✕ Kapat
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-accent text-white font-semibold shadow-md"
                        : "bg-surface-elevated text-text-secondary border border-border/60"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-border/60 space-y-3">
            {adminEmail && (
              <div className="px-2">
                <p className="text-[10px] uppercase text-text-muted font-mono">OTURUM</p>
                <p className="text-xs text-text-secondary font-mono truncate">{adminEmail}</p>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive font-medium text-xs flex items-center justify-center gap-2"
            >
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (hidden md:flex) */}
      <aside className="hidden md:flex w-64 border-r border-border/80 bg-surface flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Admin Header / Logo */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-border/60">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
              <span className="text-accent text-xs font-mono font-bold">ADM</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-sm tracking-wider text-text-primary">
                SINEAI
              </h1>
              <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                ADMIN CONSOLE
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-accent/15 border border-accent/30 text-text-primary font-semibold"
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          {adminEmail && (
            <div className="px-2">
              <p className="text-[10px] uppercase text-text-muted font-mono">OTURUM</p>
              <p className="text-xs text-text-secondary font-mono truncate">{adminEmail}</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-destructive hover:bg-destructive/10 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
