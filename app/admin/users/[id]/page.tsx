import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminUserDetailData } from "@/lib/admin/data";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const data = await getAdminUserDetailData(id);

  if (!data || !data.user) {
    return (
      <AdminLayout adminEmail={session.email}>
        <div className="p-8 text-center text-text-muted font-mono text-xs">
          Kullanıcı bulunamadı.
        </div>
      </AdminLayout>
    );
  }

  const { user } = data;
  const dna = user.filmDnaStatus;

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6">
        <div>
          <Link
            href="/admin/users"
            className="text-xs text-text-muted hover:text-text-primary font-mono inline-block mb-3"
          >
            ← Kullanıcı Listesine Dön
          </Link>

          {/* User Profile Header */}
          <div className="p-6 rounded-2xl bg-surface border border-border/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-14 h-14 rounded-2xl object-cover border border-border shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-accent font-bold text-xl flex items-center justify-center font-mono">
                  {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold tracking-tight text-text-primary">
                    {user.name || "Anonim Kullanıcı"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 text-[10px] font-mono font-bold">
                    {user.accountType === "REGISTERED"
                      ? user.provider === "GOOGLE"
                        ? "Google Hesabı"
                        : "E-posta Hesabı"
                      : "Anonim"}
                  </span>
                </div>
                <p className="text-xs font-mono text-text-secondary">{user.email || "E-posta tanımlanmamış"}</p>
                <p className="text-[10px] font-mono text-text-muted">UUID: {user.id}</p>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-text-muted space-y-1 self-stretch sm:self-auto flex sm:flex-col justify-between">
              <div>Kayıt: <span className="text-text-primary font-medium">{new Date(user.createdAt).toLocaleDateString("tr-TR")}</span></div>
              <div>Son Görülme: <span className="text-text-primary font-medium">{new Date(user.lastSeenAt).toLocaleString("tr-TR")}</span></div>
            </div>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <p className="text-[10px] text-text-muted font-mono uppercase">TOPLAM CEVAP</p>
            <p className="font-display text-2xl font-bold text-text-primary">{user.stats.totalInteractions}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <p className="text-[10px] text-text-muted font-mono uppercase">İZLEDİ</p>
            <p className="font-display text-2xl font-bold text-success">{user.stats.watched}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <p className="text-[10px] text-text-muted font-mono uppercase">İZLEMEDİ</p>
            <p className="font-display text-2xl font-bold text-text-primary">{user.stats.notWatched}</p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <p className="text-[10px] text-text-muted font-mono uppercase">EMİN DEĞİL</p>
            <p className="font-display text-2xl font-bold text-text-muted">{user.stats.unsure}</p>
          </div>
        </div>

        {/* Film DNA Status Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-text-primary">
              Film DNA Profil Durumu
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                dna.ready
                  ? "bg-success/15 border border-success/30 text-success"
                  : "bg-surface-elevated border border-border text-text-muted"
              }`}
            >
              {dna.ready ? "Profil Hazır" : "Kalibrasyon Aşamasında"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-surface-elevated border border-border">
              <span className="text-text-muted block text-[10px]">ALGORİTMA SÜRÜMÜ</span>
              <span className="font-bold text-text-primary">v{dna.version}.0</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border">
              <span className="text-text-muted block text-[10px]">GÜVEN ORANI</span>
              <span className="font-bold text-accent">%{Math.round(dna.confidence * 100)}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border">
              <span className="text-text-muted block text-[10px]">DEĞERLENDİRİLEN FİLM</span>
              <span className="font-bold text-text-primary">{user.stats.watched}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-elevated border border-border">
              <span className="text-text-muted block text-[10px]">SON HESAPLAMA</span>
              <span className="text-text-secondary">
                {dna.lastCalculated
                  ? new Date(dna.lastCalculated).toLocaleTimeString("tr-TR")
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* User Interactions History Table */}
        <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-md space-y-3 p-4">
          <h2 className="font-display text-base font-bold text-text-primary">
            Cevaplanan Film Geçmişi ({user.interactions.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-mono text-text-muted uppercase">
                  <th className="py-2.5 px-3">Film Adı</th>
                  <th className="py-2.5 px-3">Yıl</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3">Rating</th>
                  <th className="py-2.5 px-3 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-mono">
                {user.interactions.map((i: any) => (
                  <tr key={i.id} className="hover:bg-surface-elevated/40">
                    <td className="py-3 px-3 font-semibold text-text-primary">
                      {i.movieTitle}
                    </td>
                    <td className="py-3 px-3 text-text-muted">{i.releaseYear || "-"}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          i.status === "WATCHED"
                            ? "bg-success/15 text-success"
                            : i.status === "NOT_WATCHED"
                            ? "bg-surface-elevated text-text-primary"
                            : "bg-surface-elevated text-text-muted"
                        }`}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {i.rating ? (
                        <span className="font-bold text-accent">{i.rating}</span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-text-muted">
                      {new Date(i.answeredAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
