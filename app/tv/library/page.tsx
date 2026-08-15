import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getCurrentUser } from "@/lib/auth/service";
import { getTvLibraryData } from "@/lib/tv/service";

export default async function TvLibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; search?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv/library");
  }

  const params = (await searchParams) || {};
  const statusParam = (params.status || "watched") as
    | "watched"
    | "partially_watched"
    | "not_watched"
    | "unsure"
    | "watch_later";

  const libraryData = await getTvLibraryData(currentUser.id, {
    status: statusParam,
    search: params.search || "",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white">
      <Header
        userName={currentUser.name || ""}
        userAvatar={currentUser.image || undefined}
        userEmail={currentUser.email || undefined}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 animate-fadeIn">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Dizilerim
            </h1>
            <p className="text-text-secondary text-xs md:text-sm mt-1">
              İzlediğiniz, kısmen izlediğiniz ve kaydettiğiniz tüm diziler.
            </p>
          </div>

          <Link
            href="/tv/calibration"
            className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-semibold shadow-cinematic hover:bg-accent/90 transition-colors"
          >
            + Yeni Dizi Değerlendir
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-mono">
          <Link
            href="/tv/library?status=watched"
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusParam === "watched"
                ? "bg-accent text-white font-bold"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            İzlediklerim ({libraryData.counts.watched})
          </Link>
          <Link
            href="/tv/library?status=partially_watched"
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusParam === "partially_watched"
                ? "bg-accent text-white font-bold"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            Kısmen İzlenenler ({libraryData.counts.partiallyWatched})
          </Link>
          <Link
            href="/tv/library?status=watch_later"
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusParam === "watch_later"
                ? "bg-accent text-white font-bold"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            Sonra İzle ({libraryData.counts.watchLater})
          </Link>
          <Link
            href="/tv/library?status=not_watched"
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusParam === "not_watched"
                ? "bg-accent text-white font-bold"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            İzlemediklerim ({libraryData.counts.notWatched})
          </Link>
          <Link
            href="/tv/library?status=unsure"
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusParam === "unsure"
                ? "bg-accent text-white font-bold"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            Emin Değilim ({libraryData.counts.unsure})
          </Link>
        </div>

        {/* Content Area */}
        {libraryData.items.length === 0 ? (
          <div className="w-full text-center py-16 px-4 bg-surface border border-border/80 rounded-3xl space-y-4">
            <div className="text-3xl">📺</div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-text-primary">
                Bu kategoride henüz dizi bulunmuyor
              </h3>
              <p className="text-text-secondary text-xs max-w-sm mx-auto">
                Dizi kalibrasyonunu tamamlayarak kütüphanenizi ve Dizi DNA profilinizi oluşturabilirsiniz.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/tv/calibration"
                className="inline-block px-5 py-2 rounded-xl bg-accent text-white font-mono text-xs font-semibold"
              >
                Dizi Kalibrasyonuna Başla
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {libraryData.items.map((item) => {
              const posterUrl = item.posterPath
                ? item.posterPath.startsWith("http")
                  ? item.posterPath
                  : `https://image.tmdb.org/t/p/w500${item.posterPath}`
                : null;

              return (
                <div
                  key={item.id}
                  className="group relative rounded-2xl bg-surface border border-border overflow-hidden flex flex-col shadow-cinematic hover:border-accent/50 transition-all"
                >
                  <div className="aspect-[2/3] w-full bg-surface-elevated relative overflow-hidden">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-mono p-2 text-center">
                        {item.name}
                      </div>
                    )}
                    {item.rating && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-accent font-bold">
                        {item.rating}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div className="font-semibold text-xs text-text-primary line-clamp-1">
                      {item.name}
                    </div>
                    {item.firstAirDate && (
                      <div className="text-[10px] text-text-muted font-mono mt-0.5">
                        {item.firstAirDate.substring(0, 4)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
