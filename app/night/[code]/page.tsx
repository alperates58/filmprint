"use client";

import React, { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { MovieNightSessionInfo, MovieNightRecommendationsResponse, GroupMovieMatchResult, MovieNightAdvancedOptions } from "@/lib/movie-night/types";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { trackEvent } from "@/lib/analytics/client";

export default function MovieNightSessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [session, setSession] = useState<MovieNightSessionInfo | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<MovieNightRecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFindingMovies, setIsFindingMovies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>("all");

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/movie-night/${code}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Seans yüklenemedi.");
      }
      const data = await res.json();
      setSession(data.session);

      if (data.session.isPremiumSession) {
        trackEvent({
          name: "movie_night_premium_opened",
          params: { session_code: code, is_host: data.session.isHost },
        });
      }

      if (data.session.status === "COMPLETED" && data.session.selectedMovie) {
        setIsLoading(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // Auto-poll session lobby status every 5 seconds
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [code]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/night/${code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleToggleReady = async () => {
    try {
      const res = await fetch(`/api/movie-night/${code}/ready`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleExcludeWatched = async () => {
    if (!session?.isHost) return;
    try {
      const res = await fetch(`/api/movie-night/${code}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeWatched: !session.excludeWatched }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFindGroupRecommendations = async () => {
    setIsFindingMovies(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (session?.isPremiumSession && selectedMood && selectedMood !== "all") {
        queryParams.set("mood", selectedMood);
      }

      const url = `/api/movie-night/${code}/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Grup önerileri hesaplanamadı.");
      }
      const data: MovieNightRecommendationsResponse = await res.json();
      setRecommendationsData(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsFindingMovies(false);
    }
  };

  const handleSelectMovie = async (movieId: string) => {
    try {
      const res = await fetch(`/api/movie-night/${code}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setRecommendationsData(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8 text-xs font-mono text-text-muted">
          Movie Night seansı yükleniyor...
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-12 flex flex-col justify-center items-center text-center space-y-4">
          <div className="p-6 rounded-3xl bg-surface border border-border text-xs font-mono text-text-primary space-y-2">
            <p className="font-bold text-sm text-accent">Seans Hatası</p>
            <p>{error || "Seans bulunamadı."}</p>
          </div>
          <Link href="/night" className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-medium">
            Movie Night Sayfasına Dön
          </Link>
        </main>
      </div>
    );
  }

  const isCompleted = session.status === "COMPLETED" && session.selectedMovie;
  const showResults = recommendationsData && recommendationsData.recommendations.length > 0;

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent/20">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Header Session Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-border/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
                MOVIE NIGHT SEANSI
              </span>
              {session.isExpired && (
                <span className="text-[10px] font-mono bg-border px-2 py-0.5 rounded text-text-muted">
                  SÜRESİ DOLDU
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl md:text-3xl font-bold tracking-widest text-text-primary">
                {session.code}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 rounded-xl bg-surface-elevated hover:bg-border border border-border text-xs font-mono text-text-secondary transition-colors"
              >
                {copied ? "✓ Kopyalandı" : "🔗 Bağlantıyı Kopyala"}
              </button>
            </div>
          </div>

          {/* Member Count Pill */}
          <div className="px-4 py-2 rounded-2xl bg-surface-elevated border border-border text-xs font-mono text-text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>{session.members.length} Katılımcı</span>
          </div>
        </div>

        {/* 1. COMPLETED VIEW: Selected Movie Showcase */}
        {isCompleted && (
          <div className="p-8 md:p-12 rounded-3xl bg-surface border border-accent/40 shadow-cinematic text-center space-y-6 max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-bold">
              🎉 SEÇİLEN KAZANAN FİLM
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-left">
              {getTmdbImageUrl(session.selectedMovie?.posterPath, "w500") && (
                <div className="w-48 aspect-[2/3] mx-auto rounded-2xl overflow-hidden bg-surface-elevated border border-border relative">
                  <Image
                    src={getTmdbImageUrl(session.selectedMovie?.posterPath, "w500")!}
                    alt={session.selectedMovie?.title || "Film"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <span className="text-xs font-mono text-text-muted">
                  {session.selectedMovie?.releaseYear} • {session.selectedMovie?.genres.join(", ")}
                </span>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                  {session.selectedMovie?.title}
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {session.selectedMovie?.overview}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-block px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors"
                  >
                    Ana Sayfaya Dön
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. GROUP RECOMMENDATIONS RESULTS VIEW */}
        {!isCompleted && showResults && (
          <div className="space-y-10 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                Ortak İzleme Seçenekleri
              </h2>
              <button
                onClick={() => setRecommendationsData(null)}
                className="text-xs font-mono text-text-muted hover:text-text-primary underline"
              >
                ← Lobiciliğe Dön
              </button>
            </div>

            {/* Top #1 Group Hero Recommendation */}
            {recommendationsData.recommendations.length > 0 && (
              <HeroGroupRecommendation
                item={recommendationsData.recommendations[0]}
                isHost={session.isHost}
                onSelectMovie={handleSelectMovie}
              />
            )}

            {/* Group Alternatives Grid */}
            {recommendationsData.recommendations.length > 1 && (
              <GroupAlternativesGrid
                items={recommendationsData.recommendations.slice(1)}
                isHost={session.isHost}
                onSelectMovie={handleSelectMovie}
              />
            )}
          </div>
        )}

        {/* 3. LOBBY VIEW */}
        {!isCompleted && !showResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Member List Panel */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-xl font-bold text-text-primary">
                  Seans Katılımcıları
                </h2>
                <p className="text-xs text-text-secondary">
                  Tüm katılımcılar lobide toplandığında ev sahibi ortak film önerilerini başlatabilir.
                </p>
              </div>

              {/* Members List Cards */}
              <div className="space-y-3">
                {session.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-surface border border-border/80 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.userLabel}
                          className="w-10 h-10 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center font-mono text-xs font-bold text-text-primary">
                          {m.isHost ? "👑" : m.userLabel.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-text-primary">
                            {m.userLabel}
                          </span>
                          {m.isHost && (
                            <span className="text-[9px] font-mono bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 rounded">
                              👑 Ev Sahibi
                            </span>
                          )}
                          {m.isCurrentUser && (
                            <span className="text-[9px] font-mono bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                              SEN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">
                          {m.hasDnaProfile ? "Film DNA Hazır" : "Sınırlı DNA"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.isReady ? (
                        <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold">
                          ✓ Hazır
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-surface-elevated border border-border text-text-muted text-xs font-mono">
                          Bekliyor
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ready Toggle for Current User */}
              <div className="pt-2">
                <button
                  onClick={handleToggleReady}
                  className="w-full py-3 rounded-xl bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs font-semibold transition-all"
                >
                  {session.members.find((m) => m.isCurrentUser)?.isReady
                    ? "Hazır Durumunu Kaldır"
                    : "✓ Hazırım"}
                </button>
              </div>
            </div>

            {/* Host Controls Panel */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-surface border border-border/80 space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-text-primary">
                      Seans Kontrolleri
                    </h3>
                    {session.isPremiumSession && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold">
                        👑 Premium Seans
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {session.isHost ? "Ev sahibi ayarları" : "Katılımcı görünümü"}
                  </p>
                </div>

                {/* Premium Session Perks / Host Mood Controls */}
                {session.isPremiumSession ? (
                  <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                      <span>✨</span>
                      <span>Gelişmiş Grup Zekası</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Ev sahibinin Premium ayrıcalığıyla bu seansta genişletilmiş öneriler ve ruh hali eşleşmesi aktiftir.
                    </p>
                    {session.isHost && (
                      <div className="pt-1 space-y-1.5">
                        <label className="text-[11px] font-semibold text-zinc-300 block">Ruh Hali / Tema Filtresi:</label>
                        <select
                          value={selectedMood}
                          onChange={(e) => setSelectedMood(e.target.value)}
                          className="w-full bg-zinc-900 border border-purple-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                        >
                          <option value="all">Tüm Temalar (Dengeli Ortak Zevk)</option>
                          <option value="mind_bending">🧠 Zeka & Gizem</option>
                          <option value="high_tension">😱 Yüksek Gerilim & Aksiyon</option>
                          <option value="comedy">😂 Kafa Dağıtmalık Komedi</option>
                          <option value="romance">🌊 Romantik & Duygusal</option>
                          <option value="sci_fi">🚀 Bilim Kurgu</option>
                          <option value="masterpiece">⭐ IMDb 8+ Başyapıtlar</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  session.isHost && (
                    <div className="p-3 rounded-2xl bg-surface-elevated border border-border space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-primary">Movie Night+</span>
                        <Link href="/premium" className="text-[10px] text-accent hover:underline font-mono">Premium'a Geç →</Link>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Ruh hali filtreleri ve 20'ye varan öneri havuzu için Premium'u keşfedin.
                      </p>
                    </div>
                  )
                )}

                {/* Settings Toggle (Host only) */}
                <div className="p-4 rounded-2xl bg-surface-elevated border border-border/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-text-primary">
                      İzlenen Filmleri Hariç Tut
                    </span>
                    <button
                      onClick={handleToggleExcludeWatched}
                      disabled={!session.isHost}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        session.excludeWatched ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          session.excludeWatched ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Katılımcılardan herhangi birinin izlediği filmleri grup önerilerinden gizler.
                  </p>
                </div>

                {/* Find Recommendations Action */}
                <button
                  onClick={handleFindGroupRecommendations}
                  disabled={isFindingMovies || session.members.length < 1}
                  className="w-full py-3.5 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isFindingMovies ? (
                    <>
                      <span className="animate-spin text-sm">↻</span>
                      <span>Grup Önerileri Hesaplanıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>{session.isPremiumSession ? "Gelişmiş Grup Önerilerini Bul" : "Film Bul (Grup Önerileri)"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Subcomponents: Hero Group Recommendation Card & Group Alternatives Grid

function HeroGroupRecommendation({
  item,
  isHost,
  onSelectMovie,
}: {
  item: GroupMovieMatchResult;
  isHost: boolean;
  onSelectMovie: (id: string) => void;
}) {
  const { movie, groupMatchScore, groupMatchLabel, memberScores, aiGroupReasoning, groupMatchHighlights } = item;
  const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");

  return (
    <div className="p-6 md:p-10 rounded-3xl bg-surface border border-border/80 shadow-cinematic space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          ZİRVESEL GRUP ÖNERİSİ
        </span>

        <div className="px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-text-primary text-xs font-mono font-bold">
          %{groupMatchScore} GRUP UYUMU ({groupMatchLabel})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="w-48 aspect-[2/3] mx-auto md:mx-0 rounded-2xl overflow-hidden bg-surface-elevated border border-border relative flex-shrink-0">
          {posterUrl ? (
            <Image src={posterUrl} alt={movie.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-mono">
              Görsel Yok
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <span className="text-xs font-mono text-text-muted">
              {movie.releaseYear || "Tarihsiz"} • {movie.genres.join(", ")}
            </span>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-text-primary mt-1">
              {movie.title}
            </h3>
          </div>

          {/* AI Group Reasoning Box */}
          {aiGroupReasoning && (
            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 leading-relaxed">
              <span className="font-semibold text-purple-400 mr-1.5">💡 Ortak Gerekçe:</span>
              {aiGroupReasoning}
            </div>
          )}

          {/* Group Highlights */}
          {groupMatchHighlights && groupMatchHighlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {groupMatchHighlights.map((hl, idx) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-accent/10 border border-accent/25 text-[11px] font-mono text-accent font-medium">
                  ✓ {hl}
                </span>
              ))}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-surface-elevated border border-border/70 space-y-2">
            <h4 className="font-display text-xs font-bold text-text-primary">
              Katılımcı Uyum Özeti
            </h4>
            <div className="flex flex-wrap gap-2">
              {memberScores.map((ms, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-mono text-text-secondary"
                >
                  {ms.userLabel}: <strong className="text-text-primary">%{ms.individualMatchScore}</strong>
                </span>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="pt-2">
              <button
                onClick={() => onSelectMovie(movie.id)}
                className="px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-all shadow-md"
              >
                🎉 Bunu İzleyelim (Gruba Seç)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupAlternativesGrid({
  items,
  isHost,
  onSelectMovie,
}: {
  items: GroupMovieMatchResult[];
  isHost: boolean;
  onSelectMovie: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold text-text-primary">
        Diğer Ortak Seçenekler ({items.length})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const { movie, groupMatchScore, groupMatchHighlights } = item;
          const posterUrl = getTmdbImageUrl(movie.posterPath, "w500");

          return (
            <div
              key={movie.id}
              className="p-4 rounded-2xl bg-surface border border-border/70 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3">
                <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated relative">
                  {posterUrl && (
                    <Image src={posterUrl} alt={movie.title} fill className="object-cover" />
                  )}
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background/90 border border-accent/40 text-text-primary text-[10px] font-mono font-bold">
                    %{groupMatchScore} UYUM
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-display text-sm font-bold text-text-primary line-clamp-1">
                    {movie.title}
                  </h4>
                  <p className="text-[10px] font-mono text-text-muted">
                    {movie.releaseYear} • {movie.genres.join(", ")}
                  </p>
                  {groupMatchHighlights && groupMatchHighlights.length > 0 && (
                    <span className="inline-block text-[10px] font-mono text-accent">
                      {groupMatchHighlights[0]}
                    </span>
                  )}
                </div>
              </div>

              {isHost && (
                <button
                  onClick={() => onSelectMovie(movie.id)}
                  className="w-full py-2 rounded-lg bg-surface-elevated hover:bg-border border border-border text-text-primary font-mono text-xs font-semibold transition-colors"
                >
                  Bunu Seç
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
