import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
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
        <div className="p-12 text-center text-text-muted font-sans text-xs bg-surface-1 border border-border rounded-2xl">
          Kullanıcı bulunamadı veya sistemden silinmiş.
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
        {/* Navigation & Header */}
        <div>
          <Link
            href="/admin/users"
            className="text-xs text-text-muted hover:text-text-primary font-sans inline-flex items-center gap-1.5 mb-3 transition-colors"
          >
            <span>←</span>
            <span>Kullanıcı Listesine Dön</span>
          </Link>

          {/* User Profile Header */}
          <div className="p-6 rounded-2xl bg-surface-1 border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

              <div className="space-y-1 font-sans">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-xl font-bold tracking-tight text-text-primary">
                    {user.name || "Anonim Kullanıcı"}
                  </h1>
                  <AdminStatusBadge
                    status={user.accountType === "REGISTERED" ? (user.provider === "GOOGLE" ? "GOOGLE" : "REGISTERED") : "ANONYMOUS"}
                  />
                </div>
                <p className="text-xs text-text-secondary">{user.email || "E-posta tanımlanmamış"}</p>
                <p className="text-[11px] font-mono text-text-muted truncate max-w-[240px] sm:max-w-none">UUID: {user.id}</p>
              </div>
            </div>

            <div className="text-right font-sans text-xs text-text-muted space-y-1 self-stretch sm:self-auto flex sm:flex-col justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
              <div>Kayıt: <span className="text-text-primary font-medium font-mono">{new Date(user.createdAt).toLocaleDateString("tr-TR")}</span></div>
              <div>Son Görülme: <span className="text-text-primary font-medium font-mono">{new Date(user.lastSeenAt).toLocaleString("tr-TR")}</span></div>
            </div>
          </div>
        </div>

        {/* Film & TV Stats Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Film Stats */}
          <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-3 font-sans">
            <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
              <span>🎬</span> Film İstatistikleri
            </h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">TOPLAM</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.stats.totalInteractions}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">İZLEDİ</p>
                <p className="font-display text-lg font-bold text-emerald-400">{user.stats.watched}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">İZLEMEDİ</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.stats.notWatched}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">EMİN DEĞİL</p>
                <p className="font-display text-lg font-bold text-text-muted">{user.stats.unsure}</p>
              </div>
            </div>
          </div>

          {/* TV Stats */}
          <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-3 font-sans">
            <h2 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
              <span>📺</span> Dizi İstatistikleri
            </h2>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">TOPLAM</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.tvStats.totalInteractions}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">İZLEDİ</p>
                <p className="font-display text-lg font-bold text-emerald-400">{user.tvStats.watched}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">KISMEN</p>
                <p className="font-display text-lg font-bold text-accent">{user.tvStats.partiallyWatched}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">İZLEMEDİ</p>
                <p className="font-display text-lg font-bold text-text-primary">{user.tvStats.notWatched}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-0.5">
                <p className="text-[10px] text-text-muted font-medium uppercase">EMİN DEĞİL</p>
                <p className="font-display text-lg font-bold text-text-muted">{user.tvStats.unsure}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Film & TV Rank Progression Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans">
          {/* Film Rank & Progression Card */}
          {user.progression && (
            <div className="p-5 rounded-2xl bg-surface-1 border border-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{user.progression.currentRank.badgeIcon}</span>
                  <h2 className="font-display text-base font-bold text-text-primary">
                    {user.progression.currentRank.label} (Film Rütbesi)
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent/15 border border-accent/30 text-accent">
                  %{Math.round(user.progression.progress * 100)} İlerleme
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">DEĞERLENDİRİLEN</span>
                  <span className="font-bold text-text-primary font-mono">{user.progression.evaluatedCount} Film</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">SIRADAKİ RÜTBE</span>
                  <span className="font-semibold text-accent truncate block">
                    {user.progression.nextRank ? user.progression.nextRank.label : "Maksimum"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">EŞİĞE KALAN</span>
                  <span className="font-bold text-text-primary font-mono">
                    {user.progression.isMaxRank ? "0 Film" : `${user.progression.remaining} Film`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">FİLM DNA GÜVEN</span>
                  <span className="font-bold text-emerald-400 font-mono">%{Math.round(filmDna.confidence * 100)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TV Rank & Progression Card */}
          {user.tvProgression && (
            <div className="p-5 rounded-2xl bg-surface-1 border border-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{user.tvProgression.currentRank.badgeIcon}</span>
                  <h2 className="font-display text-base font-bold text-text-primary">
                    {user.tvProgression.currentRank.label} (Dizi Rütbesi)
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  %{Math.round(user.tvProgression.progress * 100)} İlerleme
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">DEĞERLENDİRİLEN</span>
                  <span className="font-bold text-text-primary font-mono">{user.tvProgression.evaluatedCount} Dizi</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">SIRADAKİ RÜTBE</span>
                  <span className="font-semibold text-emerald-400 truncate block">
                    {user.tvProgression.nextRank ? user.tvProgression.nextRank.label : "Maksimum"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">EŞİĞE KALAN</span>
                  <span className="font-bold text-text-primary font-mono">
                    {user.tvProgression.isMaxRank ? "0 Dizi" : `${user.tvProgression.remaining} Dizi`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-text-muted block text-[10px] uppercase">DİZİ DNA GÜVEN</span>
                  <span className="font-bold text-emerald-400 font-mono">%{Math.round(tvDna.confidence * 100)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Film DNA & TV DNA Profil Durumları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans">
          {/* Film DNA Status Card */}
          <div className="p-5 rounded-2xl bg-surface-1 border border-border space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-1.5">
                <span>🎬</span> Film DNA Profil Durumu
              </h2>
              <AdminStatusBadge
                status={filmDna.ready ? "ACTIVE" : "PAUSED"}
                label={filmDna.ready ? "Profil Hazır" : "Kalibrasyon Aşamasında"}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">ALGORİTMA</span>
                <span className="font-bold text-text-primary font-mono">v{filmDna.version}.0</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">GÜVEN ORANI</span>
                <span className="font-bold text-accent font-mono">%{Math.round(filmDna.confidence * 100)}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">KAYNAK FİLM</span>
                <span className="font-bold text-text-primary font-mono">{user.stats.watched}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">SON HESAPLAMA</span>
                <span className="text-text-secondary truncate block font-mono text-[11px]">
                  {filmDna.lastCalculated
                    ? new Date(filmDna.lastCalculated).toLocaleTimeString("tr-TR")
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* TV DNA Status Card */}
          <div className="p-5 rounded-2xl bg-surface-1 border border-border space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-1.5">
                <span>📺</span> Dizi DNA Profil Durumu
              </h2>
              <AdminStatusBadge
                status={tvDna.ready ? "ACTIVE" : "PAUSED"}
                label={tvDna.ready ? "Profil Hazır" : "Kalibrasyon Aşamasında"}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">ALGORİTMA</span>
                <span className="font-bold text-text-primary font-mono">v{tvDna.version}.0</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">GÜVEN ORANI</span>
                <span className="font-bold text-emerald-400 font-mono">%{Math.round(tvDna.confidence * 100)}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">KAYNAK DİZİ</span>
                <span className="font-bold text-text-primary font-mono">{user.tvStats.watched + user.tvStats.partiallyWatched}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <span className="text-text-muted block text-[10px] uppercase">SON HESAPLAMA</span>
                <span className="text-text-secondary truncate block font-mono text-[11px]">
                  {tvDna.lastCalculated
                    ? new Date(tvDna.lastCalculated).toLocaleTimeString("tr-TR")
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Film Interactions History Table */}
        <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-sm space-y-3 p-5 font-sans">
          <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <span>🎬</span> Cevaplanan Film Geçmişi (Son {user.interactions.length})
          </h2>

          {user.interactions.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">Henüz film etkileşimi bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] font-mono text-text-muted uppercase">
                    <th className="py-2.5 px-3">Film Adı</th>
                    <th className="py-2.5 px-3">Yıl</th>
                    <th className="py-2.5 px-3">Durum</th>
                    <th className="py-2.5 px-3">Rating</th>
                    <th className="py-2.5 px-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {user.interactions.map((i: any) => (
                    <tr key={i.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-text-primary">
                        {i.movieTitle}
                      </td>
                      <td className="py-3 px-3 text-text-muted font-mono">{i.releaseYear || "-"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                            i.status === "WATCHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : i.status === "NOT_WATCHED"
                              ? "bg-surface-2 text-text-secondary border border-border"
                              : "bg-surface-2 text-text-muted border border-border"
                          }`}
                        >
                          {i.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {i.rating ? (
                          <span className="font-semibold text-accent">{i.rating}</span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-text-muted font-mono text-[11px]">
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
        <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-sm space-y-3 p-5 font-sans">
          <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <span>📺</span> Cevaplanan Dizi Geçmişi (Son {user.tvInteractions.length})
          </h2>

          {user.tvInteractions.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">Henüz dizi etkileşimi bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] font-mono text-text-muted uppercase">
                    <th className="py-2.5 px-3">Dizi Adı</th>
                    <th className="py-2.5 px-3">İlk Yayın</th>
                    <th className="py-2.5 px-3">Durum</th>
                    <th className="py-2.5 px-3">Rating</th>
                    <th className="py-2.5 px-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {user.tvInteractions.map((i: any) => (
                    <tr key={i.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-text-primary">
                        {i.tvShowName}
                      </td>
                      <td className="py-3 px-3 text-text-muted font-mono">{i.firstAirDate || "-"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                            i.status === "WATCHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : i.status === "PARTIALLY_WATCHED"
                              ? "bg-accent/10 text-accent font-semibold border border-accent/25"
                              : i.status === "NOT_WATCHED"
                              ? "bg-surface-2 text-text-secondary border border-border"
                              : "bg-surface-2 text-text-muted border border-border"
                          }`}
                        >
                          {i.status === "PARTIALLY_WATCHED" ? "KISMEN İZLEDİ" : i.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {i.rating ? (
                          <span className="font-semibold text-accent">{i.rating}</span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-text-muted font-mono text-[11px]">
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
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-sm space-y-3 p-5 font-sans">
            <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
              <span>📺</span> Dizi Öneri Geri Bildirimleri ({user.tvRecommendationFeedbacks.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] font-mono text-text-muted uppercase">
                    <th className="py-2.5 px-3">Dizi</th>
                    <th className="py-2.5 px-3">Eşleşme Skoru</th>
                    <th className="py-2.5 px-3">Geri Bildirim Aksiyonu</th>
                    <th className="py-2.5 px-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {user.tvRecommendationFeedbacks.map((f: any) => (
                    <tr key={f.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-text-primary">
                        {f.tvShowName}
                      </td>
                      <td className="py-3 px-3 text-accent font-bold font-mono">
                        %{f.matchScore}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-2 text-text-secondary text-[11px] border border-border">
                          {f.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-text-muted font-mono text-[11px]">
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
