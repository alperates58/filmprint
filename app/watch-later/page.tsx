"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/ui/Header";

interface WatchLaterItem {
  feedbackId: string;
  savedMatchScore: number;
  savedAt: string;
  movie: {
    id: string;
    tmdbId: number;
    title: string;
    originalTitle: string;
    releaseYear: number | null;
    posterPath: string | null;
    genres: string[];
    overview: string;
  };
}

export default function WatchLaterPage() {
  const [items, setItems] = useState<WatchLaterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRatingMovieId, setActiveRatingMovieId] = useState<string | null>(null);

  const fetchWatchLaterItems = async () => {
    try {
      const res = await fetch("/api/watch-later");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchLaterItems();
  }, []);

  const handleRemove = async (movieId: string) => {
    try {
      setItems((prev) => prev.filter((i) => i.movie.id !== movieId));
      await fetch(`/api/watch-later?movieId=${movieId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRatingSelect = async (movieId: string, rating: string) => {
    try {
      setItems((prev) => prev.filter((i) => i.movie.id !== movieId));
      setActiveRatingMovieId(null);
      await fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          action: "WATCHED_FROM_RECOMMENDATION",
          rating,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
            KİŞİSEL KÜTÜPHANE
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
            Daha Sonra İzlenecekler
          </h1>
          <p className="text-xs md:text-sm text-text-secondary max-w-xl">
            Öneri sayfasında daha sonra izlemek üzere kaydettiğiniz filmler.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            Listeniz yükleniyor...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-4 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold text-sm flex items-center justify-center mx-auto">
              🔖
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-text-primary">
                Listeniz Henüz Boş
              </h2>
              <p className="text-xs text-text-muted">
                Öneriler sayfasındaki filmleri daha sonra izlemek için buraya ekleyebilirsiniz.
              </p>
            </div>
            <div>
              <Link
                href="/recommendations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all"
              >
                Önerilere Git
              </Link>
            </div>
          </div>
        )}

        {/* Watch Later Items Grid */}
        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((item) => {
              const { movie, savedMatchScore } = item;
              const isRatingOpen = activeRatingMovieId === movie.id;
              const posterUrl = movie.posterPath
                ? movie.posterPath.startsWith("http")
                  ? movie.posterPath
                  : `https://image.tmdb.org/t/p/w500${movie.posterPath}`
                : null;

              return (
                <div
                  key={movie.id}
                  className="p-4 rounded-2xl bg-surface border border-border/80 shadow-sm flex flex-col justify-between space-y-4 group hover:border-accent/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative shadow-sm">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={movie.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
                          Görsel Yok
                        </div>
                      )}

                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-text-primary text-[10px] font-mono font-bold">
                        %{savedMatchScore} UYUM
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display text-sm font-bold text-text-primary line-clamp-1">
                        {movie.title}
                      </h3>
                      <p className="text-[10px] font-mono text-text-muted">
                        {movie.releaseYear || "Tarihsiz"} • {movie.genres.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Rating Selector or Actions */}
                  {isRatingOpen ? (
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-mono text-text-primary font-bold">
                        <span>Nasıl buldun?</span>
                        <button
                          onClick={() => setActiveRatingMovieId(null)}
                          className="text-text-muted hover:text-text-primary text-[10px]"
                        >
                          İptal
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleRatingSelect(movie.id, "LOVE")}
                          className="py-1.5 rounded-lg bg-accent/20 text-text-primary font-mono text-[10px] border border-accent/40"
                        >
                          ❤️ Çok Sevdim
                        </button>
                        <button
                          onClick={() => handleRatingSelect(movie.id, "LIKE")}
                          className="py-1.5 rounded-lg bg-surface-elevated text-text-primary font-mono text-[10px] border border-border"
                        >
                          👍 Beğendim
                        </button>
                        <button
                          onClick={() => handleRatingSelect(movie.id, "NEUTRAL")}
                          className="py-1.5 rounded-lg bg-surface-elevated text-text-secondary font-mono text-[10px] border border-border"
                        >
                          😐 Ortalama
                        </button>
                        <button
                          onClick={() => handleRatingSelect(movie.id, "DISLIKE")}
                          className="py-1.5 rounded-lg bg-surface-elevated text-text-muted font-mono text-[10px] border border-border"
                        >
                          👎 Sevmedim
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveRatingMovieId(movie.id)}
                        className="flex-1 py-1.5 rounded-lg bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors"
                      >
                        İzledim
                      </button>
                      <button
                        onClick={() => handleRemove(movie.id)}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-muted hover:text-text-primary text-xs font-mono border border-border transition-colors"
                      >
                        Kaldır
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
