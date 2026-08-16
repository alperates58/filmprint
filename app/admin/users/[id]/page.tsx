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
  const filmDna = user.filmDnaStatus;
  const tvDna = user.tvDnaStatus;

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
                <p className="text-[10px] font-mono text-text-muted truncate max-w-[240px] sm:max-w-none">UUID: {user.id}</p>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-text-muted space-y-1 self-stretch sm:self-auto flex sm:flex-col justify-between">
              <div>Kayıt: <span className="text-text-primary font-medium">{new Date(user.createdAt).toLocaleDateString("tr-TR")}</span></div>
              <div>Son Görülme: <span className="text-text-primary font-medium">{new Date(user.lastSeenAt).toLocaleString("tr-TR")}</span></div>
            </div>
          </div>
        </div>

        {/* Film & TV Stats Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Film Stats */}
          <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
            <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
              <span>🎬</span> Film İstatistikleri
            </h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">TOPLAM</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.stats.totalInteractions}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">İZLEDİ</p>
                <p className="font-display text-lg font-bold text-success">{user.stats.watched}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">İZLEMEDİ</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.stats.notWatched}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">EMİN DEĞİL</p>
                <p className="font-display text-lg font-bold text-text-muted">{user.stats.unsure}</p>
              </div>
            </div>
          </div>

          {/* TV Stats */}
          <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
            <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
              <span>📺</span> Dizi İstatistikleri
            </h2>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">TOPLAM</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.tvStats.totalInteractions}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">İZLEDİ</p>
                <p className="font-display text-lg font-bold text-success">{user.tvStats.watched}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">KISMEN</p>
                <p className="font-display text-lg font-bold text-accent">{user.tvStats.partiallyWatched}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">İZLEMEDİ</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.tvStats.notWatched}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-border space-y-0.5">
                <p className="text-[9px] text-text-muted font-mono uppercase">EMİN DEĞİL</p>
                <p className="font-display text-lg font-bold text-text-muted">{user.tvStats.unsure}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rank & Progression Card */}
        {user.progression && (
          <div className="p-5 rounded-2xl bg-surface border border-accent/30 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{user.progression.currentRank.badgeIcon}</span>
                <h2 className="font-display text-base font-bold text-text-primary">
                  {user.progression.currentRank.label} Rütbesi
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent/15 border border-accent/30 text-accent">
                %{Math.round(user.progression.progress * 100)} Rütbe İlerlemesi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">DEĞERLENDİRİLEN FİLM</span>
                <span className="font-bold text-text-primary">{user.progression.evaluatedCount} Film</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">SIRADAKİ RÜTBE</span>
                <span className="font-bold text-accent">
                  {user.progression.nextRank ? user.progression.nextRank.label : "Maksimum Rütbe"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">SIRADAKİ EŞİĞE KALAN</span>
                <span className="font-bold text-text-primary">
                  {user.progression.isMaxRank ? "0 Film" : `${user.progression.remaining} Film`}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">FILM DNA GÜVEN</span>
                <span className="font-bold text-success">%{Math.round(filmDna.confidence * 100)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Film DNA & TV DNA Profil Durumları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Film DNA Status Card */}
          <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-1.5">
                <span>🎬</span> Film DNA Profil Durumu
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                  filmDna.ready
                    ? "bg-success/15 border border-success/30 text-success"
                    : "bg-surface-elevated border border-border text-text-muted"
                }`}
              >
                {filmDna.ready ? "Profil Hazır" : "Kalibrasyon Aşamasında"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">ALGORİTMA</span>
                <span className="font-bold text-text-primary">v{filmDna.version}.0</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">GÜVEN ORANI</span>
                <span className="font-bold text-accent">%{Math.round(filmDna.confidence * 100)}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">KAYNAK FİLM</span>
                <span className="font-bold text-text-primary">{user.stats.watched}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">SON HESAPLAMA</span>
                <span className="text-text-secondary truncate">
                  {filmDna.lastCalculated
                    ? new Date(filmDna.lastCalculated).toLocaleTimeString("tr-TR")
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* TV DNA Status Card */}
          <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-1.5">
                <span>📺</span> Dizi DNA Profil Durumu
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
                  tvDna.ready
                    ? "bg-success/15 border border-success/30 text-success"
                    : "bg-surface-elevated border border-border text-text-muted"
                }`}
              >
                {tvDna.ready ? "Profil Hazır" : "Kalibrasyon Aşamasında"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">ALGORİTMA</span>
                <span className="font-bold text-text-primary">v{tvDna.version}.0</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">GÜVEN ORANI</span>
                <span className="font-bold text-success">%{Math.round(tvDna.confidence * 100)}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">KAYNAK DİZİ</span>
                <span className="font-bold text-text-primary">{user.tvStats.watched + user.tvStats.partiallyWatched}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated border border-border">
                <span className="text-text-muted block text-[10px]">SON HESAPLAMA</span>
                <span className="text-text-secondary truncate">
                  {tvDna.lastCalculated
                    ? new Date(tvDna.lastCalculated).toLocaleTimeString("tr-TR")
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Film Interactions History Table */}
        <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-md space-y-3 p-4">
          <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <span>🎬</span> Cevaplanan Film Geçmişi (Son {user.interactions.length})
          </h2>

          {user.interactions.length === 0 ? (
            <p className="text-xs text-text-muted font-mono py-4 text-center">Henüz film etkileşimi bulunmuyor.</p>
          ) : (
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
          )}
        </div>

        {/* User TV Interactions History Table */}
        <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-md space-y-3 p-4">
          <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <span>📺</span> Cevaplanan Dizi Geçmişi (Son {user.tvInteractions.length})
          </h2>

          {user.tvInteractions.length === 0 ? (
            <p className="text-xs text-text-muted font-mono py-4 text-center">Henüz dizi etkileşimi bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-mono text-text-muted uppercase">
                    <th className="py-2.5 px-3">Dizi Adı</th>
                    <th className="py-2.5 px-3">İlk Yayın</th>
                    <th className="py-2.5 px-3">Durum</th>
                    <th className="py-2.5 px-3">Rating</th>
                    <th className="py-2.5 px-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs font-mono">
                  {user.tvInteractions.map((i: any) => (
                    <tr key={i.id} className="hover:bg-surface-elevated/40">
                      <td className="py-3 px-3 font-semibold text-text-primary">
                        {i.tvShowName}
                      </td>
                      <td className="py-3 px-3 text-text-muted">{i.firstAirDate || "-"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            i.status === "WATCHED"
                              ? "bg-success/15 text-success"
                              : i.status === "PARTIALLY_WATCHED"
                              ? "bg-accent/15 text-accent font-bold"
                              : i.status === "NOT_WATCHED"
                              ? "bg-surface-elevated text-text-primary"
                              : "bg-surface-elevated text-text-muted"
                          }`}
                        >
                          {i.status === "PARTIALLY_WATCHED" ? "KISMEN İZLEDİ" : i.status}
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
          )}
        </div>

        {/* User TV Recommendations Feedback Table */}
        {user.tvRecommendationFeedbacks.length > 0 && (
          <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-md space-y-3 p-4">
            <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
              <span>📺</span> Dizi Öneri Geri Bildirimleri ({user.tvRecommendationFeedbacks.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-mono text-text-muted uppercase">
                    <th className="py-2.5 px-3">Dizi</th>
                    <th className="py-2.5 px-3">Eşleşme Skoru</th>
                    <th className="py-2.5 px-3">Geri Bildirim Aksiyonu</th>
                    <th className="py-2.5 px-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs font-mono">
                  {user.tvRecommendationFeedbacks.map((f: any) => (
                    <tr key={f.id} className="hover:bg-surface-elevated/40">
                      <td className="py-3 px-3 font-semibold text-text-primary">
                        {f.tvShowName}
                      </td>
                      <td className="py-3 px-3 text-accent font-bold">
                        %{f.matchScore}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-elevated text-text-secondary text-[10px]">
                          {f.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-text-muted">
                        {new Date(f.updatedAt).toLocaleString("tr-TR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
