import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminUsersData } from "@/lib/admin/data";

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-xs text-text-secondary font-mono mt-0.5">
              Sistemdeki tüm kayıtlı ve anonim Filmprint kullanıcıları ({data.totalCount} Kullanıcı)
            </p>
          </div>

          {/* Search Form */}
          <form method="GET" className="flex items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Ad, e-posta veya ID ara..."
              className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-xs text-text-primary focus:outline-none focus:border-accent w-64 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              Ara
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-surface border border-border/80 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-surface-elevated/50 text-[11px] font-mono text-text-muted uppercase">
                  <th className="py-3 px-4">Kullanıcı</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Kayıt Tarihi</th>
                  <th className="py-3 px-4">Son Aktivite</th>
                  <th className="py-3 px-4 text-center">Film</th>
                  <th className="py-3 px-4 text-center">Film DNA</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {data.users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted font-mono text-xs">
                      Kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  data.users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-surface-elevated/40 transition-colors">
                      {/* User Avatar + Name + Email */}
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
                          <div>
                            <p className="font-semibold text-text-primary text-xs">
                              {user.name || "Anonim Kullanıcı"}
                            </p>
                            <p className="text-[10px] font-mono text-text-muted">
                              {user.email || user.id.slice(0, 13) + "..."}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status / Account Type Badge */}
                      <td className="py-3 px-4 font-mono">
                        {user.accountType === "REGISTERED" ? (
                          <span className="px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/30 text-[10px] font-bold">
                            {user.provider === "GOOGLE" ? "Google" : "E-posta"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border text-[10px]">
                            Anonim
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-text-muted font-mono">
                        {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                      </td>

                      {/* Last Seen At */}
                      <td className="py-3 px-4 text-text-muted font-mono">
                        {new Date(user.lastSeenAt).toLocaleDateString("tr-TR")}
                      </td>

                      {/* Interaction Count */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-text-primary">
                        {user.interactionCount}
                      </td>

                      {/* Film DNA Status */}
                      <td className="py-3 px-4 text-center font-mono">
                        {user.hasTasteProfile ? (
                          <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-bold border border-accent/30">
                            HAZIR (%{Math.round(user.confidence * 100)})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted text-[10px] border border-border">
                            EKSİK
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-primary text-[11px] font-mono transition-colors border border-border"
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-side Pagination Controls */}
          {data.totalPages > 1 && (
            <div className="p-4 border-t border-border/60 flex items-center justify-between font-mono text-xs text-text-muted">
              <span>
                Sayfa {data.currentPage} / {data.totalPages} ({data.totalCount} Toplam)
              </span>

              <div className="flex items-center gap-2">
                {data.currentPage > 1 && (
                  <Link
                    href={`/admin/users?page=${data.currentPage - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                    className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-text-primary hover:bg-border transition-colors"
                  >
                    ← Önceki
                  </Link>
                )}
                {data.currentPage < data.totalPages && (
                  <Link
                    href={`/admin/users?page=${data.currentPage + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                    className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-text-primary hover:bg-border transition-colors"
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
