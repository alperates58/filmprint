"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { TvDetailsModal } from "@/components/tv/TvDetailsModal";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

interface TvLibraryItem {
  id: string;
  tvShowId: string;
  name: string;
  originalName: string;
  firstAirDate: string | null;
  posterPath: string | null;
  status: string;
  rating: string | null;
  updatedAt: string;
}

interface TvLibraryCounts {
  watched: number;
  partiallyWatched: number;
  notWatched: number;
  unsure: number;
  watchLater: number;
}

function TvLibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusParam = (searchParams.get("status") || "watched").toLowerCase();
  const [currentStatus, setCurrentStatus] = useState<string>(statusParam);

  const [items, setItems] = useState<TvLibraryItem[]>([]);
  const [counts, setCounts] = useState<TvLibraryCounts>({
    watched: 0,
    partiallyWatched: 0,
    notWatched: 0,
    unsure: 0,
    watchLater: 0,
  });
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTvModal, setSelectedTvModal] = useState<{
    tvShowId: string;
    initialData?: any;
  } | null>(null);

  useEffect(() => {
    setCurrentStatus(statusParam);
  }, [statusParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTvLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch from API
      const res = await fetch(
        `/api/tv/interactions?status=${currentStatus}&search=${encodeURIComponent(
          debouncedSearch
        )}`
      ).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.counts) setCounts(data.counts);
      } else {
        // Fallback to unified library API
        let mappedState = "WATCHED";
        if (currentStatus === "watch_later") mappedState = "WATCHLIST";
        else if (currentStatus === "not_watched") mappedState = "DROPPED";

        const libRes = await fetch(
          `/api/library?mediaType=TV&state=${mappedState}&search=${encodeURIComponent(
            debouncedSearch
          )}`
        );
        if (libRes.ok) {
          const libData = await libRes.json();
          const mappedItems: TvLibraryItem[] = (libData.items || []).map((i: any) => ({
            id: i.id,
            tvShowId: i.contentId,
            name: i.title,
            originalName: i.originalTitle,
            firstAirDate: i.releaseYear ? String(i.releaseYear) : null,
            posterPath: i.posterPath,
            status: i.state,
            rating: i.userRating,
            updatedAt: i.updatedAt,
          }));
          setItems(mappedItems);
          if (libData.counts?.tv) {
            setCounts({
              watched: libData.counts.tv.watched,
              partiallyWatched: 0,
              notWatched: libData.counts.tv.dropped,
              unsure: 0,
              watchLater: libData.counts.tv.watchlist,
            });
          }
        }
      }
    } catch (e) {
      console.error("[TV Library Fetch Error]:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentStatus, debouncedSearch]);

  useEffect(() => {
    fetchTvLibrary();
  }, [fetchTvLibrary]);

  const handleTabChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    router.push(`/tv/library?status=${newStatus}`, { scroll: false });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent selection:text-white font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-10 space-y-6 md:space-y-8 animate-fadeIn">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-border/80 shadow-cinematic">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                DİZİ KÜTÜPHANESİ
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Dizilerim
            </h1>
            <p className="text-text-secondary text-xs md:text-sm">
              İzlediğiniz, planladığınız ve değerlendirdiğiniz dizileri yönetin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/library?mediaType=tv"
              className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs font-semibold transition-all"
            >
              📁 Birleşik Kütüphane
            </Link>
            <Link
              href="/tv/calibration"
              className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-semibold shadow-sm hover:bg-accent-hover transition-all"
            >
              + Dizi Kalibrasyonu
            </Link>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
              {[
                { key: "watched", label: "İzlediklerim", count: counts.watched, icon: "👁️" },
                { key: "watch_later", label: "Sonra İzle", count: counts.watchLater, icon: "🔖" },
                { key: "partially_watched", label: "Kısmen İzlenenler", count: counts.partiallyWatched, icon: "🎬" },
                { key: "not_watched", label: "İzlemediklerim", count: counts.notWatched, icon: "🚫" },
                { key: "unsure", label: "Emin Değilim", count: counts.unsure, icon: "❓" },
              ].map((t) => {
                const isActive = currentStatus === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabChange(t.key)}
                    className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? "bg-accent text-white font-bold shadow-sm"
                        : "bg-surface text-text-secondary hover:text-text-primary border border-border/80"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-black/20 text-white" : "bg-surface-elevated text-text-secondary"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Dizilerde ara..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                🔍
              </span>
            </div>
          </div>
        </div>

        {/* Content Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="aspect-[2/3] rounded-2xl bg-surface border border-border/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="w-full text-center py-16 px-4 bg-surface border border-border/80 rounded-3xl space-y-4">
            <div className="text-3xl">📺</div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-display text-lg font-bold text-text-primary">
                Bu kategoride henüz dizi bulunmuyor
              </h3>
              <p className="text-text-secondary text-xs">
                Dizi kalibrasyonunu tamamlayarak veya önerileri keşfederek kütüphanenizi oluşturabilirsiniz.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3 font-mono text-xs">
              <Link
                href="/tv/recommendations"
                className="px-4 py-2 rounded-xl bg-accent text-white font-bold hover:bg-accent-hover transition-all"
              >
                Dizi Önerilerine Git →
              </Link>
              <Link
                href="/tv/calibration"
                className="px-4 py-2 rounded-xl bg-surface-elevated border border-border text-text-secondary hover:text-text-primary transition-all"
              >
                Dizi Kalibrasyonu
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => {
              const posterUrl = getTmdbImageUrl(item.posterPath, "w500");

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedTvModal({ tvShowId: item.tvShowId })}
                  className="group relative rounded-2xl bg-surface border border-border/80 overflow-hidden flex flex-col shadow-sm hover:border-accent/50 transition-all cursor-pointer"
                >
                  <div className="aspect-[2/3] w-full bg-surface-elevated relative overflow-hidden">
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
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

                    {/* Quick Hover Action Overlay */}
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <span className="px-3 py-1.5 rounded-xl bg-accent text-white font-mono text-[10px] font-bold text-center">
                        {currentStatus === "watched" ? "Puanı Gör / Değiştir" : "Artık İzledim (Puanla)"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                    <div className="font-semibold text-xs text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                      {item.name}
                    </div>
                    {item.firstAirDate && (
                      <div className="text-[10px] text-text-muted font-mono">
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

      {/* Interactive TV Details Modal */}
      {selectedTvModal && (
        <TvDetailsModal
          tvShowId={selectedTvModal.tvShowId}
          initialData={selectedTvModal.initialData}
          onClose={() => {
            setSelectedTvModal(null);
            fetchTvLibrary();
          }}
          onInteractionUpdate={() => fetchTvLibrary()}
        />
      )}

      <Footer />
    </div>
  );
}

export default function TvLibraryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <TvLibraryContent />
    </Suspense>
  );
}
