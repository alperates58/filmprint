"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { generateMovieSlug, generateTvSlug } from "@/lib/growth/seo/slug";

export interface MediaItem {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
  popularity: number;
  overview: string;
  genres: string[];
  runtime?: number | null;
  director?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  status?: string | null;
  totalInteractions: number;
  totalLibraryEntries: number;
  createdAt: string;
  updatedAt: string;
}

const GENRE_OPTIONS = [
  "Aksiyon",
  "Macera",
  "Animasyon",
  "Komedi",
  "Suç",
  "Belgesel",
  "Dram",
  "Aile",
  "Fantastik",
  "Tarih",
  "Korku",
  "Müzik",
  "Gizem",
  "Romantik",
  "Bilim Kurgu",
  "Gerilim",
  "Savaş",
  "Western",
];

const YEAR_OPTIONS = [
  { label: "Tüm Yıllar", value: "all" },
  { label: "2026", value: "2026" },
  { label: "2025", value: "2025" },
  { label: "2024", value: "2024" },
  { label: "2023", value: "2023" },
  { label: "2022", value: "2022" },
  { label: "2021", value: "2021" },
  { label: "2020", value: "2020" },
  { label: "2020'ler (2020-2029)", value: "2020s" },
  { label: "2010'lar (2010-2019)", value: "2010s" },
  { label: "2000'ler (2000-2009)", value: "2000s" },
  { label: "90'lar (1990-1999)", value: "1990s" },
  { label: "Klasikler (< 1990)", value: "classics" },
];

const RATING_OPTIONS = [
  { label: "Tüm Puanlar", value: "0" },
  { label: "8.0+ ⭐ Üst Seviye", value: "8.0" },
  { label: "7.0+ ⭐ Çok İyi", value: "7.0" },
  { label: "6.0+ ⭐ İyi", value: "6.0" },
  { label: "5.0+ ⭐ Ortalama", value: "5.0" },
];

const SORT_OPTIONS = [
  { label: "En Yeni Eklenenler", value: "newest" },
  { label: "En Yüksek Puan", value: "rating_desc" },
  { label: "En Düşük Puan", value: "rating_asc" },
  { label: "En Popüler", value: "pop_desc" },
  { label: "Çıkış Yılı (Yeni ➔ Eski)", value: "year_desc" },
  { label: "Çıkış Yılı (Eski ➔ Yeni)", value: "year_asc" },
  { label: "İsim (A-Z)", value: "title_asc" },
  { label: "İlk Eklenenler", value: "oldest" },
];

export function AdminMediaManager() {
  const [activeType, setActiveType] = useState<"movie" | "tv">("movie");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Data & loading states
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals state
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editOriginalTitle, setEditOriginalTitle] = useState("");
  const [editOverview, setEditOverview] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editVoteAverage, setEditVoteAverage] = useState("");
  const [editPopularity, setEditPopularity] = useState("");
  const [editGenres, setEditGenres] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch media from API
  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeType,
        q: searchQuery.trim(),
        genre: selectedGenre,
        year: selectedYear,
        minRating,
        sort: sortOption,
        page: currentPage.toString(),
        limit: "25",
      });

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      if (!res.ok) throw new Error("Veriler yüklenemedi.");

      const data = await res.json();
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
      setFilteredCount(data.filteredCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Fetch media error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeType, searchQuery, selectedGenre, selectedYear, minRating, sortOption, currentPage]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Handle Tab switch
  const handleTypeSwitch = (newType: "movie" | "tv") => {
    if (newType === activeType) return;
    setActiveType(newType);
    setCurrentPage(1);
  };

  // Open Edit Modal
  const openEditModal = (item: MediaItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditOriginalTitle(item.originalTitle);
    setEditOverview(item.overview);
    setEditYear(item.releaseYear ? item.releaseYear.toString() : "");
    setEditVoteAverage(item.voteAverage.toString());
    setEditPopularity(item.popularity.toString());
    setEditGenres(item.genres.join(", "));
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);

    try {
      const genresArray = editGenres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/media/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          title: editTitle,
          originalTitle: editOriginalTitle,
          overview: editOverview,
          releaseYear: editYear ? parseInt(editYear, 10) : null,
          voteAverage: parseFloat(editVoteAverage) || 0,
          popularity: parseFloat(editPopularity) || 0,
          genres: genresArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Güncelleme başarısız oldu.");

      setEditingItem(null);
      setActionMessage({ type: "success", text: `"${editTitle}" başarıyla güncellendi.` });
      fetchMedia();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Güncelleme hatası." });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle TMDB Sync
  const handleSyncTmdb = async (item: MediaItem) => {
    setSyncingId(item.id);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/media/${item.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "TMDB senkronizasyonu başarısız oldu.");

      setActionMessage({ type: "success", text: `"${item.title}" TMDB'den başarıyla güncellendi.` });
      fetchMedia();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Senkronizasyon hatası." });
    } finally {
      setSyncingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/admin/media/${deletingItem.id}?type=${activeType}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Silme işlemi başarısız.");

      setDeletingItem(null);
      setActionMessage({ type: "success", text: `"${deletingItem.title}" sistemden silindi.` });
      fetchMedia();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Silme hatası." });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-lg animate-fadeIn ${
            actionMessage.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === "success" ? "✓" : "⚠️"}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-text-muted hover:text-text-primary text-sm ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header: Tabs & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
            <span>🎬 KATALOG YÖNETİMİ</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Film & Dizi Kataloğu
          </h1>
          <p className="text-xs text-text-secondary">
            SineAI veritabanındaki tüm yapımları filtreleyin, sıralayın, düzenleyin ve TMDB ile senkronize edin.
          </p>
        </div>

        {/* Media Type Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-1 border border-border">
          <button
            type="button"
            onClick={() => handleTypeSwitch("movie")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeType === "movie"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <span>🎬</span>
            <span>Filmler</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
              {activeType === "movie" ? filteredCount : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch("tv")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeType === "tv"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <span>📺</span>
            <span>Diziler</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
              {activeType === "tv" ? filteredCount : ""}
            </span>
          </button>
        </div>
      </div>

      {/* Advanced Filter & Search Bar */}
      <div className="p-5 rounded-2xl bg-surface-1 border border-border shadow-sm space-y-4">
        {/* Row 1: Search and Main Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`${activeType === "movie" ? "Film" : "Dizi"} adı, orijinal başlık veya TMDB ID ara...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent min-h-[42px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Genre Filter */}
          <div>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent min-h-[42px]"
            >
              <option value="all">Tüm Türler / Kategoriler</option>
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent min-h-[42px]"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Min Rating Filter */}
          <div>
            <select
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:border-accent min-h-[42px]"
            >
              {RATING_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Sort, View Toggle, Counts */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-[11px] font-mono uppercase font-semibold">Sıralama:</span>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {(searchQuery || selectedGenre !== "all" || selectedYear !== "all" || minRating !== "0") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("all");
                  setSelectedYear("all");
                  setMinRating("0");
                  setCurrentPage(1);
                }}
                className="text-[11px] text-accent hover:underline ml-2"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-text-secondary">
            <span className="font-mono text-xs">
              <strong className="text-text-primary">{filteredCount}</strong> / {totalCount} Yapım Bulundu
            </span>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === "table" ? "bg-surface-1 text-accent font-bold" : "text-text-muted hover:text-text-primary"
                }`}
                title="Tablo Görünümü"
              >
                📋
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === "grid" ? "bg-surface-1 text-accent font-bold" : "text-text-muted hover:text-text-primary"
                }`}
                title="Kart Görünümü"
              >
                🎴
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Display */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-surface-1 border border-border rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-text-muted font-mono">İçerikler yükleniyor...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center space-y-2 bg-surface-1 border border-border rounded-2xl">
          <span className="text-3xl">🔍</span>
          <p className="font-bold text-sm text-text-primary">Kayıt Bulunamadı</p>
          <p className="text-xs text-text-muted">Arama veya filtre kriterlerinize uygun {activeType === "movie" ? "film" : "dizi"} bulunamadı.</p>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-mono text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold w-16">Afiş</th>
                  <th className="py-3 px-4 font-semibold">Başlık & Orijinal İsim</th>
                  <th className="py-3 px-3 font-semibold">Türler</th>
                  <th className="py-3 px-3 font-semibold text-center">Yıl / Süre</th>
                  <th className="py-3 px-3 font-semibold text-center">Puan</th>
                  <th className="py-3 px-3 font-semibold text-center">Popülerlik</th>
                  <th className="py-3 px-3 font-semibold text-center">Etkileşim</th>
                  <th className="py-3 px-4 text-right font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {items.map((item) => {
                  const posterUrl = getTmdbImageUrl(item.posterPath, "w185");
                  const slug =
                    item.type === "movie"
                      ? generateMovieSlug(item.title, item.tmdbId)
                      : generateTvSlug(item.title, item.tmdbId);
                  const publicUrl = item.type === "movie" ? `/film/${slug}` : `/dizi/${slug}`;

                  return (
                    <tr key={item.id} className="hover:bg-surface-2/60 transition-colors">
                      {/* Poster */}
                      <td className="py-2.5 px-4">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-surface-2 border border-border relative flex-shrink-0">
                          {posterUrl ? (
                            <img src={posterUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted font-mono">
                              Yok
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Title & TMDB ID */}
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-text-primary text-xs line-clamp-1">{item.title}</p>
                          {item.originalTitle && item.originalTitle !== item.title && (
                            <p className="text-[11px] text-text-muted line-clamp-1 italic">{item.originalTitle}</p>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            <a
                              href={`https://www.themoviedb.org/${item.type === "movie" ? "movie" : "tv"}/${item.tmdbId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-accent hover:underline flex items-center gap-0.5"
                            >
                              TMDB #{item.tmdbId} ↗
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Genres */}
                      <td className="py-2.5 px-3 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {item.genres.slice(0, 3).map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-[10px] text-text-secondary font-medium"
                            >
                              {g}
                            </span>
                          ))}
                          {item.genres.length > 3 && (
                            <span className="text-[10px] text-text-muted font-mono self-center">
                              +{item.genres.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Year & Runtime / Seasons */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div>{item.releaseYear || "—"}</div>
                        <div className="text-[10px] text-text-muted">
                          {item.type === "movie"
                            ? item.runtime
                              ? `${item.runtime} dk`
                              : ""
                            : item.numberOfSeasons
                            ? `${item.numberOfSeasons} Sezon`
                            : ""}
                        </div>
                      </td>

                      {/* Vote Average */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
                            item.voteAverage >= 7.5
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : item.voteAverage >= 6.0
                              ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                              : "bg-surface-2 border-border text-text-secondary"
                          }`}
                        >
                          ⭐ {item.voteAverage.toFixed(1)}
                        </span>
                      </td>

                      {/* Popularity */}
                      <td className="py-2.5 px-3 text-center font-mono text-text-muted text-xs">
                        {item.popularity.toFixed(1)}
                      </td>

                      {/* Interaction Counts */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                        <div className="text-text-primary font-semibold">{item.totalInteractions} Oy</div>
                        <div className="text-text-muted text-[10px]">{item.totalLibraryEntries} Liste</div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={publicUrl}
                            target="_blank"
                            title="Canlı Sayfayı Aç"
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface-2 transition-colors text-xs"
                          >
                            🔗
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Düzenle"
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSyncTmdb(item)}
                            disabled={syncingId === item.id}
                            title="TMDB'den Yenile"
                            className={`p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors text-xs ${
                              syncingId === item.id ? "animate-spin text-accent" : ""
                            }`}
                          >
                            🔄
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            title="Katalogdan Sil"
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => {
            const posterUrl = getTmdbImageUrl(item.posterPath, "w300");
            const slug =
              item.type === "movie"
                ? generateMovieSlug(item.title, item.tmdbId)
                : generateTvSlug(item.title, item.tmdbId);
            const publicUrl = item.type === "movie" ? `/film/${slug}` : `/dizi/${slug}`;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-sm flex flex-col justify-between hover:border-accent/40 transition-all group"
              >
                <div className="aspect-[2/3] relative bg-surface-2 overflow-hidden">
                  {posterUrl ? (
                    <img src={posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-mono">
                      Görsel Yok
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-xs font-mono font-bold text-amber-300 border border-amber-500/20">
                    ⭐ {item.voteAverage.toFixed(1)}
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white/80">
                    {item.releaseYear || ""}
                  </div>
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                      {item.overview || "Özet bulunmuyor."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-text-muted">TMDB #{item.tmdbId}</span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={publicUrl}
                        target="_blank"
                        className="p-1 rounded-lg text-text-muted hover:text-accent text-xs"
                        title="Sayfayı Gör"
                      >
                        🔗
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1 rounded-lg text-text-muted hover:text-text-primary text-xs"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSyncTmdb(item)}
                        className="p-1 rounded-lg text-text-muted hover:text-emerald-400 text-xs"
                        title="Senkronize Et"
                      >
                        🔄
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="p-1 rounded-lg text-text-muted hover:text-rose-400 text-xs"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl bg-surface-1 border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            ← Önceki Sayfa
          </button>

          <span className="font-mono text-text-muted">
            Sayfa <strong className="text-text-primary">{currentPage}</strong> / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl bg-surface-1 border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Sonraki Sayfa →
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-surface-1 border border-border rounded-3xl p-6 shadow-2xl space-y-5 text-text-primary max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-accent font-bold">✏️</span>
                <h3 className="font-display font-bold text-base text-text-primary">
                  {editingItem.type === "movie" ? "Film" : "Dizi"} Düzenle: {editingItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                    Türkçe Başlık
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                    Orijinal Başlık
                  </label>
                  <input
                    type="text"
                    value={editOriginalTitle}
                    onChange={(e) => setEditOriginalTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                  Özet / Konu
                </label>
                <textarea
                  rows={4}
                  value={editOverview}
                  onChange={(e) => setEditOverview(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                    Çıkış Yılı
                  </label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                    Puan (Vote Avg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editVoteAverage}
                    onChange={(e) => setEditVoteAverage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                    Popülerlik
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editPopularity}
                    onChange={(e) => setEditPopularity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                  Türler (Virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={editGenres}
                  onChange={(e) => setEditGenres(e.target.value)}
                  placeholder="Dram, Aksiyon, Bilim Kurgu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-surface-1 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-text-primary text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl font-bold mx-auto">
              ⚠️
            </div>

            <div className="space-y-1.5">
              <h3 className="font-display font-bold text-base text-text-primary">
                {deletingItem.type === "movie" ? "Filmi" : "Diziyi"} Silmek İstiyor Musunuz?
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-bold text-white">{deletingItem.title}</span> (TMDB #{deletingItem.tmdbId}) katalogdan kalıcı olarak silinecektir.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary font-medium text-xs transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30"
              >
                Evet, Katalogdan Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
