import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminUsersData } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q || "";
  const currentPage = parseInt(resolvedParams.page || "1", 10) || 1;

  const data = await getAdminUsersData(searchQuery, currentPage, 50);

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <span>👥 KULLANICI DİZİNİ</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-xs text-text-secondary font-sans">
              Sistemdeki tüm kayıtlı ve anonim SineAI kullanıcıları ({data.totalCount} Kullanıcı)
            </p>
          </div>

          {/* Search Form */}
          <form method="GET" className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Ad, e-posta veya UUID ara..."
              className="flex-1 sm:w-72 px-3.5 py-2 rounded-xl bg-surface-1 border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-sans min-h-[40px]"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-accent text-white font-sans text-xs font-semibold hover:bg-accent-hover transition-colors flex-shrink-0"
            >
              Ara
            </button>
          </form>
        </div>

        {/* Users Table / Card List */}
        <div className="rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-sm">
          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-mono text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Kullanıcı</th>
                  <th className="py-3 px-3 font-semibold">Film Rütbesi</th>
                  <th className="py-3 px-3 font-semibold">Dizi Rütbesi</th>
                  <th className="py-3 px-3 font-semibold">Hesap Türü</th>
                  <th className="py-3 px-3 font-semibold">Kayıt Tarihi</th>
                  <th className="py-3 px-3 font-semibold">Son Görülme</th>
                  <th className="py-3 px-2 text-center font-semibold">Film</th>
                  <th className="py-3 px-2 text-center font-semibold">Dizi</th>
                  <th className="py-3 px-2 text-center font-semibold">Film DNA</th>
                  <th className="py-3 px-2 text-center font-semibold">Dizi DNA</th>
                  <th className="py-3 px-4 text-right font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {data.users.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-text-muted font-sans text-xs">
                      Arama kriterlerine uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  data.users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name || "User"}
                              className="w-8 h-8 rounded-xl object-cover border border-border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center font-mono">
                              {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary text-xs truncate max-w-[150px]">
                              {user.name || "Anonim Kullanıcı"}
                            </p>
                            <p className="text-[10px] font-mono text-text-muted truncate max-w-[150px]">
                              {user.email || user.id.slice(0, 13) + "..."}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Film Rank Badge Column */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/25 text-accent text-[11px] font-semibold inline-flex items-center gap-1">
                          <span>{user.rank?.badgeIcon || "🎬"}</span>
                          <span className="truncate max-w-[110px]">{user.rank?.label || "Sinema Çırağı"}</span>
                        </span>
                      </td>

                      {/* TV Rank Badge Column */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold inline-flex items-center gap-1">
                          <span>{user.tvRank?.badgeIcon || "📺"}</span>
                          <span className="truncate max-w-[110px]">{user.tvRank?.label || "Dizi Meraklısı"}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <AdminStatusBadge
                          status={user.accountType === "REGISTERED" ? (user.provider === "GOOGLE" ? "GOOGLE" : "REGISTERED") : "ANONYMOUS"}
                        />
                      </td>

                      <td className="py-3 px-3 text-text-muted font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                      </td>

                      <td className="py-3 px-3 text-text-muted font-mono text-[11px]">
                        {new Date(user.lastSeenAt).toLocaleDateString("tr-TR")}
                      </td>

                      {/* Movie count */}
                      <td className="py-3 px-2 text-center font-mono font-semibold text-text-primary">
                        {user.movieInteractionCount}
                      </td>

                      {/* TV count */}
                      <td className="py-3 px-2 text-center font-mono font-semibold text-accent">
                        {user.tvInteractionCount}
                      </td>

                      {/* Film DNA Status */}
                      <td className="py-3 px-2 text-center font-mono text-[11px]">
                        {user.hasTasteProfile ? (
                          <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold border border-accent/30">
                            %{Math.round(user.confidence * 100)}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>

                      {/* TV DNA Status */}
                      <td className="py-3 px-2 text-center font-mono text-[11px]">
                        {user.hasTvTasteProfile ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                            %{Math.round(user.tvConfidence * 100)}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-primary text-xs font-medium transition-colors border border-border inline-block"
                        >
                          Detay →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (block md:hidden) */}
          <div className="block md:hidden divide-y divide-border/60 font-sans">
            {data.users.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-xs">
                Kullanıcı bulunamadı.
              </div>
            ) : (
              data.users.map((user: any) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || "User"}
                          className="w-9 h-9 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center font-mono">
                          {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-text-primary text-xs">
                          {user.name || "Anonim Kullanıcı"}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted truncate max-w-[180px]">
                          {user.email || user.id}
                        </p>
                      </div>
                    </div>

                    <AdminStatusBadge
                      status={user.accountType === "REGISTERED" ? "REGISTERED" : "ANONYMOUS"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-surface-2 border border-border space-y-0.5">
                      <span className="text-text-muted text-[10px] block">FİLM RÜTBESİ</span>
                      <span className="font-semibold text-accent truncate block">
                        {user.rank?.badgeIcon || "🎬"} {user.rank?.label || "Sinema Çırağı"} ({user.movieInteractionCount})
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-surface-2 border border-border space-y-0.5">
                      <span className="text-text-muted text-[10px] block">DİZİ RÜTBESİ</span>
                      <span className="font-semibold text-emerald-400 truncate block">
                        {user.tvRank?.badgeIcon || "📺"} {user.tvRank?.label || "Dizi Meraklısı"} ({user.tvInteractionCount})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-text-muted font-mono">
                    <span>Son: {new Date(user.lastSeenAt).toLocaleDateString("tr-TR")}</span>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="px-3 py-1 rounded-lg bg-accent text-white font-sans text-xs font-semibold"
                    >
                      Profili İncele →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {data.totalPages > 1 && (
            <div className="p-4 border-t border-border bg-surface-2 flex items-center justify-between text-xs font-sans">
              <span className="text-text-muted">
                Sayfa <strong className="text-text-primary font-mono">{currentPage}</strong> / {data.totalPages} ({data.totalCount} Toplam)
              </span>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/admin/users?q=${searchQuery}&page=${currentPage - 1}`}
                    className="px-3 py-1.5 rounded-lg bg-surface-1 border border-border text-text-primary hover:bg-surface-3 transition-colors"
                  >
                    ← Önceki
                  </Link>
                )}
                {currentPage < data.totalPages && (
                  <Link
                    href={`/admin/users?q=${searchQuery}&page=${currentPage + 1}`}
                    className="px-3 py-1.5 rounded-lg bg-surface-1 border border-border text-text-primary hover:bg-surface-3 transition-colors"
                  >
                    Sonraki →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
