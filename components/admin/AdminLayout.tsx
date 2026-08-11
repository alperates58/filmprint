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

  const navItems = [
    { label: "Genel Bakış", href: "/admin", icon: "📊" },
    { label: "Kullanıcılar", href: "/admin/users", icon: "👥" },
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
    <div className="min-h-screen flex bg-background text-text-primary selection:bg-accent selection:text-white">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-border/80 bg-surface flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Admin Header / Logo */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-border/60">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
              <span className="text-accent text-xs font-mono font-bold">ADM</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-sm tracking-wider text-text-primary">
                FILMPRINT
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
