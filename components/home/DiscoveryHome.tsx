"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";
import { getProgressionForCount } from "@/lib/progression/service";

interface HomeMovie {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
  genres: string[];
  overview: string;
  runtime: number | null;
}

interface HomeModule {
  id: string;
  title: string;
  icon: string;
  description: string;
  movies: HomeMovie[];
}

interface DiscoveryHomeProps {
  userName: string;
  answeredCount: number;
  initialShowMilestone?: boolean;
}

export function DiscoveryHome({
  userName,
  answeredCount,
  initialShowMilestone = false,
}: DiscoveryHomeProps) {
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [topHeroMatch, setTopHeroMatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMilestoneNotice, setShowMilestoneNotice] = useState(initialShowMilestone);
  const [selectedMovieModal, setSelectedMovieModal] = useState<{
    movieId: string;
    initialData?: any;
  } | null>(null);

  const progression = getProgressionForCount(answeredCount);

  useEffect(() => {
    fetch("/api/home")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setModules(data.modules || []);
          setTopHeroMatch(data.topHeroMatch || null);
        }
      })
      .catch((e) => console.error("[DiscoveryHome Fetch Error]:", e))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDismissMilestone = () => {
    setShowMilestoneNotice(false);
    try {
      localStorage.setItem("filmprint_milestone_seen_30", "true");
    } catch {}
  };

  const scrollToModule = (moduleId: string) => {
    const el = document.getElementById(`module-${moduleId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header userName={userName} progressCount={answeredCount} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-12">
        {/* Milestone Celebration Banner (Dismissible 1-time notification) */}
        {showMilestoneNotice && (
          <div className="p-6 md:p-8 rounded-3xl bg-surface border border-accent/40 shadow-cinematic flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fadeIn relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center text-2xl font-bold font-mono flex-shrink-0">
                🎉
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                    MILESTONE TAMAMLANDI (30/30)
                  </span>
                </div>
                <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary">
                  Tebrikler {userName ? `, ${userName}` : ""}! İlk Film DNA Profiliniz Hazır
                </h2>
                <p className="text-xs md:text-sm text-text-secondary">
                  30 filmi sınıflandırdınız. Artık keşif ana sayfasındasınız. Dilediğiniz zaman önerilerinizi inceleyebilir veya profilinizi özelleştirebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
              <Link
                href="/profile"
                className="px-4 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm"
              >
                Profilimi Gör →
              </Link>
              <button
                onClick={handleDismissMilestone}
                className="px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-muted hover:text-text-primary font-mono text-xs transition-all"
              >
                Keşfe Başla ✕
              </button>
            </div>
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="p-8 md:p-12 rounded-3xl bg-surface border border-border/80 shadow-cinematic space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-bold uppercase tracking-wider">
                  {progression.currentRank.badgeIcon} {progression.currentRank.label}
                </span>
                <span className="text-xs font-mono text-text-muted">
                  • {answeredCount} Film Değerlendirildi
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
                Hoş Geldin{userName ? `, ${userName}` : ""}.
              </h1>

              <p className="text-sm md:text-base text-text-secondary leading-relaxed">
                Film DNA profilinize ve sinema zevkinize göre hazırlanan bugünün özel keşif seçkisi.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 self-start md:self-auto">
              <Link
                href="/recommendations"
                className="px-6 py-3 rounded-2xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all text-center shadow-md"
              >
                ✨ Önerilerime Git →
              </Link>
              <Link
                href="/calibrate"
                className="px-6 py-3 rounded-2xl bg-surface-elevated border border-border/80 hover:border-accent text-text-primary font-mono text-xs font-medium transition-all text-center"
              >
                ➕ Değerlendirmeye Devam Et
              </Link>
            </div>
          </div>

          {/* Quick Mood Pills */}
          <div className="pt-4 border-t border-border/60 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              BU AKŞAM SANA UYGUN MODLAR
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "known-unwatched", label: "👀 İzlemediğin" },
                { id: "rainy", label: "🌧️ Yağmurlu Hava" },
                { id: "comedy", label: "🍿 Komedi" },
                { id: "thriller", label: "⚡ Gerilim" },
                { id: "mind-bending", label: "🌀 Zihin Büken" },
                { id: "feel-good", label: "☕ Hafif" },
                { id: "night", label: "🌙 Gece Seansı" },
                { id: "classic", label: "🏛️ Klasik" },
                { id: "short", label: "⏱️ < 100 Dk" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => scrollToModule(m.id)}
                  className="px-3.5 py-1.5 rounded-full bg-surface-elevated/80 border border-border/60 hover:border-accent hover:bg-accent/10 text-xs font-mono text-text-secondary transition-all"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Hero Match ("Sana Özel Bugünkü Öneri") */}
        {topHeroMatch && topHeroMatch.movie && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                SANA ÖZEL BUGÜNKÜ ÖNERİ (TOP MATCH)
              </span>
              <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-mono font-bold">
                %{topHeroMatch.match} UYUM
              </span>
            </div>

            <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic flex flex-col md:flex-row gap-6 items-start">
              {/* Poster */}
              <div
                onClick={() =>
                  setSelectedMovieModal({
                    movieId: topHeroMatch.movie.id,
                    initialData: {
                      title: topHeroMatch.movie.title,
                      posterPath: topHeroMatch.movie.posterPath,
                      releaseYear: topHeroMatch.movie.releaseYear,
                      genres: topHeroMatch.movie.genres,
                      matchScore: topHeroMatch.match,
                      headline: topHeroMatch.headline,
                      reasons: topHeroMatch.reasons,
                    },
                  })
                }
                className="w-32 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-surface-elevated relative border border-border/80 shadow-lg cursor-pointer group flex-shrink-0"
              >
                {topHeroMatch.movie.posterPath ? (
                  <Image
                    src={
                      topHeroMatch.movie.posterPath.startsWith("http")
                        ? topHeroMatch.movie.posterPath
                        : `https://image.tmdb.org/t/p/w500${topHeroMatch.movie.posterPath}`
                    }
                    alt={topHeroMatch.movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="176px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
                    Görsel Yok
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-4 flex-1">
                <div>
                  <span className="text-xs font-mono text-text-muted">
                    {topHeroMatch.movie.releaseYear || "Tarihsiz"} • {topHeroMatch.movie.genres.join(", ")}
                  </span>
                  <h3
                    onClick={() =>
                      setSelectedMovieModal({
                        movieId: topHeroMatch.movie.id,
                        initialData: {
                          title: topHeroMatch.movie.title,
                          posterPath: topHeroMatch.movie.posterPath,
                          releaseYear: topHeroMatch.movie.releaseYear,
                          genres: topHeroMatch.movie.genres,
                          matchScore: topHeroMatch.match,
                          headline: topHeroMatch.headline,
                          reasons: topHeroMatch.reasons,
                        },
                      })
                    }
                    className="font-display text-2xl md:text-3xl font-bold text-text-primary cursor-pointer hover:text-accent transition-colors mt-0.5"
                  >
                    {topHeroMatch.movie.title}
                  </h3>
                </div>

                {topHeroMatch.headline && (
                  <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-border/60 space-y-2">
                    <p className="text-xs font-mono font-bold text-text-primary">
                      {topHeroMatch.headline}
                    </p>
                    {topHeroMatch.reasons && topHeroMatch.reasons.length > 0 && (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        • {topHeroMatch.reasons[0].replace(/\*\*(.*?)\*\*/g, "$1")}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setSelectedMovieModal({
                        movieId: topHeroMatch.movie.id,
                        initialData: {
                          title: topHeroMatch.movie.title,
                          posterPath: topHeroMatch.movie.posterPath,
                          releaseYear: topHeroMatch.movie.releaseYear,
                          genres: topHeroMatch.movie.genres,
                          matchScore: topHeroMatch.match,
                          headline: topHeroMatch.headline,
                          reasons: topHeroMatch.reasons,
                        },
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-semibold hover:bg-accent-hover transition-all shadow-sm"
                  >
                    Filmi İncele & Fragman İzle ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeleton Rows */}
        {isLoading && (
          <div className="space-y-8 animate-pulse">
            {[1, 2, 3].map((row) => (
              <div key={row} className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <div className="w-6 h-6 rounded-md bg-surface-elevated" />
                  <div className="h-5 w-48 rounded-md bg-surface-elevated" />
                </div>
                <div className="flex gap-4 overflow-hidden pt-1">
                  {[1, 2, 3, 4, 5, 6].map((card) => (
                    <div key={card} className="flex-shrink-0 w-36 sm:w-44 space-y-2">
                      <div className="w-full aspect-[2/3] rounded-2xl bg-surface-elevated border border-border/60" />
                      <div className="h-3.5 w-3/4 rounded bg-surface-elevated" />
                      <div className="h-2.5 w-1/2 rounded bg-surface-elevated" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 10-11 Discovery Modules (Horizontal Scrolling Rows) */}
        {!isLoading &&
          modules.map((mod) => (
            <section key={mod.id} id={`module-${mod.id}`} className="space-y-4 pt-2">
              <div className="flex items-end justify-between border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-display text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
                    <span>{mod.icon}</span>
                    <span>{mod.title}</span>
                  </h3>
                  <p className="text-xs text-text-secondary font-mono">
                    {mod.description}
                  </p>
                </div>
              </div>

              {/* Horizontal Scroll Movie Row */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1">
                {mod.movies.map((movie: any) => {
                  const posterUrl = movie.posterPath
                    ? movie.posterPath.startsWith("http")
                      ? movie.posterPath
                      : `https://image.tmdb.org/t/p/w500${movie.posterPath}`
                    : null;

                  return (
                    <div
                      key={movie.id}
                      onClick={() =>
                        setSelectedMovieModal({
                          movieId: movie.id,
                          initialData: {
                            title: movie.title,
                            posterPath: movie.posterPath,
                            releaseYear: movie.releaseYear,
                            genres: movie.genres,
                            matchScore: movie.matchScore,
                            reasons: movie.reasons,
                            headline: movie.headline,
                          },
                        })
                      }
                      className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-2"
                    >
                      {/* Poster */}
                      <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-surface-elevated relative border border-border/60 shadow-sm group-hover:border-accent/60 transition-all duration-300">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={movie.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="176px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-[10px]">
                            Görsel Yok
                          </div>
                        )}

                        {/* Top-Right Badge: Match % if available */}
                        {typeof movie.matchScore === "number" && movie.matchScore > 0 && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-md border border-accent/40 text-accent text-[10px] font-mono font-bold z-10">
                            ❤️ %{movie.matchScore}
                          </div>
                        )}
                      </div>

                      {/* Info & rating */}
                      <div>
                        <h4 className="font-display text-xs font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                          {movie.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mt-0.5">
                          <span className="line-clamp-1">
                            {movie.releaseYear || "Tarihsiz"} • {movie.genres[0] || "Film"}
                          </span>
                          {movie.voteAverage > 0 && (
                            <span className="text-text-secondary font-bold flex-shrink-0 ml-1">
                              ⭐ {movie.voteAverage.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}


        {/* Cinematic Movie Detail Modal */}
        <MovieDetailsModal
          movieId={selectedMovieModal?.movieId || null}
          onClose={() => setSelectedMovieModal(null)}
          initialData={selectedMovieModal?.initialData}
        />
      </main>

      <Footer />
    </div>
  );
}
