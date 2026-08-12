import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { getCurrentUser } from "@/lib/auth/service";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

export default async function AccountSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser.isAuthenticated) {
    redirect("/auth");
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.id },
    include: {
      _count: {
        select: { interactions: true },
      },
    },
  });

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-white">
      <Header userName={user.name || ""} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 animate-fadeIn">
        <div>
          <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
            HESAP AYARLARI
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary mt-1">
            Kullanıcı Profili & Güvenlik
          </h1>
        </div>

        <div className="rounded-3xl bg-surface border border-border/80 p-6 md:p-8 shadow-cinematic space-y-6">
          {/* User Identity Header */}
          <div className="flex items-center gap-4 border-b border-border/60 pb-6">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "Avatar"}
                className="w-16 h-16 rounded-2xl object-cover border border-border shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-2xl font-bold font-mono">
                {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-text-primary">
                  {user.name || "Filmprint Kullanıcısı"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 text-[10px] font-mono font-bold">
                  {user.provider === "GOOGLE" ? "Google" : user.provider === "EMAIL" ? "E-posta" : "Anonim"}
                </span>
              </div>
              <p className="text-xs font-mono text-text-secondary">{user.email || "E-posta tanımlanmamış"}</p>
              <p className="text-[11px] font-mono text-text-muted">
                {user._count.interactions} film değerlendirildi
              </p>
            </div>
          </div>

          {/* Account Details Form / Actions */}
          <form action="/api/auth/logout" method="GET" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-elevated border border-border">
              <div>
                <p className="text-xs font-mono text-text-primary font-bold">Oturumu Kapat</p>
                <p className="text-xs text-text-muted">Bu cihazdaki Filmprint hesabından çıkış yaparsınız.</p>
              </div>
              <a
                href="/api/auth/logout"
                className="px-5 py-2.5 rounded-xl bg-danger/15 text-danger border border-danger/30 hover:bg-danger hover:text-white text-xs font-mono font-bold transition-all text-center"
              >
                🚪 Çıkış Yap
              </a>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
