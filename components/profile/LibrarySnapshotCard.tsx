"use client";

import React from "react";
import Link from "next/link";

interface LibrarySnapshotCardProps {
  mediaType: "FILM" | "TV";
  watchedCount: number;
  notWatchedCount: number;
  unsureCount: number;
  watchLaterCount: number;
  partialCount?: number;
  favoriteCount?: number;
}

export function LibrarySnapshotCard({
  mediaType,
  watchedCount,
  notWatchedCount,
  unsureCount,
  watchLaterCount,
  partialCount = 0,
  favoriteCount = 0,
}: LibrarySnapshotCardProps) {
  const isFilm = mediaType === "FILM";
  const total = watchedCount + notWatchedCount + unsureCount + watchLaterCount + partialCount;

  const watchedPct = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
  const notWatchedPct = total > 0 ? Math.round((notWatchedCount / total) * 100) : 0;
  const otherPct = Math.max(0, 100 - watchedPct - notWatchedPct);

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-1">
            <span>📚 KİŞİSEL KOLEKSİYON</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {isFilm ? "Film Kütüphaneniz" : "Dizi Kütüphaneniz"}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary font-sans mt-0.5">
            İzleme geçmişiniz, listeleriniz ve favorilerinizin dağılımı.
          </p>
        </div>

        <Link
          href={`/library?mediaType=${mediaType}`}
          className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-text-primary text-xs font-sans font-bold hover:bg-surface-3 transition-all min-h-[40px] flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <span>Tüm Koleksiyonu Aç</span>
          <span>➔</span>
        </Link>
      </div>

      {/* Distribution Balance Bar */}
      {total > 0 && (
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-[11px] font-semibold text-text-muted">
            <span>Etkileşim Dengesi</span>
            <span className="text-text-primary">{total} Toplam Kayıt</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-3 overflow-hidden border border-border/60 flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${watchedPct}%` }}
              title={`İzlendi: %${watchedPct}`}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-700"
              style={{ width: `${notWatchedPct}%` }}
              title={`İzlenmedi: %${notWatchedPct}`}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-700"
              style={{ width: `${otherPct}%` }}
              title={`Diğer: %${otherPct}`}
            />
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 font-sans">
        {/* Watched */}
        <Link
          href={`/library?mediaType=${mediaType}&tab=watched`}
          className="p-4 rounded-2xl bg-surface-2 border border-border/80 hover:border-emerald-500/40 transition-all space-y-1.5 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">🎬</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
              %{watchedPct}
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary group-hover:text-emerald-400 transition-colors">
            {watchedCount}
          </p>
          <p className="text-xs text-text-secondary font-medium">İzlediklerim</p>
        </Link>

        {/* Not Watched */}
        <Link
          href={`/library?mediaType=${mediaType}&tab=not_watched`}
          className="p-4 rounded-2xl bg-surface-2 border border-border/80 hover:border-rose-500/40 transition-all space-y-1.5 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">🙈</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400">
              %{notWatchedPct}
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary group-hover:text-rose-400 transition-colors">
            {notWatchedCount}
          </p>
          <p className="text-xs text-text-secondary font-medium">İzlemediklerim</p>
        </Link>

        {/* Watchlist */}
        <Link
          href={`/library?mediaType=${mediaType}&tab=watch_later`}
          className="p-4 rounded-2xl bg-surface-2 border border-border/80 hover:border-blue-500/40 transition-all space-y-1.5 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">🔖</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
              Plan
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary group-hover:text-blue-400 transition-colors">
            {watchLaterCount}
          </p>
          <p className="text-xs text-text-secondary font-medium">İzleme Listem</p>
        </Link>

        {/* Unsure */}
        <Link
          href={`/library?mediaType=${mediaType}&tab=unsure`}
          className="p-4 rounded-2xl bg-surface-2 border border-border/80 hover:border-amber-500/40 transition-all space-y-1.5 group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">🤔</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
              Kararsız
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary group-hover:text-amber-400 transition-colors">
            {unsureCount}
          </p>
          <p className="text-xs text-text-secondary font-medium">Emin Değilim</p>
        </Link>

        {/* Favorites */}
        <Link
          href={`/library?mediaType=${mediaType}&tab=favorites`}
          className="p-4 rounded-2xl bg-surface-2 border border-border/80 hover:border-amber-400/40 transition-all space-y-1.5 group shadow-sm col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">★</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Özel
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary group-hover:text-amber-300 transition-colors">
            {favoriteCount}
          </p>
          <p className="text-xs text-text-secondary font-medium">Favorilerim</p>
        </Link>
      </div>
    </div>
  );
}
