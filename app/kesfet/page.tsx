"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/ui/Header";
import { BottomNav } from "@/components/ui/BottomNav";
import { Footer } from "@/components/ui/Footer";
import { MovieDetailsModal } from "@/components/movie/MovieDetailsModal";
import { TvDetailsModal } from "@/components/tv/TvDetailsModal";
import { EnrichedAiMovieItem, AiRecommendationResponse } from "@/lib/ai/types";
import { generateMovieSlug, generateTvSlug } from "@/lib/growth/seo/slug";
import Link from "next/link";

const MOOD_CHIPS = [
  { id: "mind_bending", label: "Zeka & Gizem", emoji: "🧠", query: "Beyin yakan, ters köşe ve gerçekliği sorgulatan gizemli filmler" },
  { id: "ocean_romance", label: "Okyanusta Aşk", emoji: "🌊", query: "Okyanusta veya adada geçen romantik ve duygusal filmler" },
  { id: "single_location", label: "Klips Gerilim", emoji: "😱", query: "Tek mekanda geçen klostrofobik ve sürükleyici gerilim filmleri" },
  { id: "sci_fi_space", label: "Zaman & Uzay", emoji: "🚀", query: "Zaman yolculuğu, paradoks ve uzayda geçen bilim kurgu filmleri" },
  { id: "high_rated", label: "IMDb 8+ Ödüllü", emoji: "⭐", query: "IMDb puanı 8 ve üzeri olan ödüllü başyapıt filmler" },
  { id: "comedy", label: "Kafa Dağıtmalık Komedi", emoji: "😂", query: "Yormayan, kahkaha attıran kafa dağıtmalık eğlenceli komedi filmleri" },
  { id: "six_episodes", label: "6 Bölümlük Mini Dizi", emoji: "📺", query: "Altı bölümlük sürükleyici ve karanlık mini polisiye dizi" },
  { id: "serial_killer", label: "Seri Katil & Polisiye", emoji: "🕵️‍♂️", query: "Gerçek olaylara dayanan karanlık seri katil ve dedektif filmleri" },
];

const RANDOM_PROMPTS = [
  "Tek bir odada geçen ve sonuna kadar nefes kesen akıl oyunları",
  "Christopher Nolan ve Denis Villeneuve tarzında dev bütçeli bilim kurgu",
  "90 dakikayı geçmeyen tempolu ve sürükleyici gerilim filmi",
  "Altı bölümlük karanlık atmosferli mini polisiye dizisi",
  "Yağmurlu bir gecede kahve eşliğinde izlenecek sıcak ve nostaljik bir film",
  "Yapay zeka ve robotların dünyayı ele geçirdiği felsefi distopya",
  "Güney Kore yapımı ters köşeli intikam ve suç filmleri",
  "Dostluğu ve umudu anlatan sıcacık bir yol hikayesi",
];

export default function AiDiscoveryPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AiRecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTrailer, setActiveTrailer] = useState<{ title: string; url: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"relevance" | "rating" | "year">("relevance");

  // Rich interaction modals
  const [selectedMovieModal, setSelectedMovieModal] = useState<{
    id: string;
    initialData?: any;
  } | null>(null);

  const [selectedTvModal, setSelectedTvModal] = useState<{
    id: string;
    initialData?: any;
  } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Perform search
  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, window.location.pathname + `?q=${encodeURIComponent(q)}`);
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Öneriler alınırken bir sorun oluştu.");
      }

      const json: AiRecommendationResponse = await res.json();
      setData(json);

      // Scroll to results on mobile/desktop smoothly
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      setError(err?.message || "Bağlantı hatası oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check URL parameters on mount for query
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const initialQ = urlParams.get("q");
    if (initialQ) {
      setQuery(initialQ);
      handleSearch(initialQ);
    }
  }, []);

  // Voice Search using Web Speech API
  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayıcınız sesli aramayı desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "tr-TR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
          handleSearch(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleRandomPick = () => {
    const random = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setQuery(random);
    handleSearch(random);
  };

  const handleSaveToWatchlist = async (movie: EnrichedAiMovieItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isSaved = savedIds.has(movie.id);

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(movie.id)) next.delete(movie.id);
      else next.add(movie.id);
      return next;
    });

    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: movie.type === "tv" ? "TV" : "FILM",
          contentId: String(movie.id),
          action: isSaved ? "REMOVE" : "ADD_WATCHLIST",
        }),
      });
    } catch (err) {
      console.error("[Watchlist Toggle Error]:", err);
    }
  };

  const handleOpenDetails = (movie: EnrichedAiMovieItem) => {
    if (movie.type === "tv") {
      setSelectedTvModal({
        id: String(movie.id),
        initialData: {
          title: movie.title,
          posterPath: movie.poster,
          backdropPath: movie.backdrop,
          firstAirDate: movie.release_date,
          genres: movie.genres,
          matchScore: movie.ai_relevance_score,
          headline: movie.reason,
          reasons: movie.ai_match_tags,
        },
      });
    } else {
      setSelectedMovieModal({
        id: String(movie.id),
        initialData: {
          title: movie.title,
          posterPath: movie.poster,
          backdropPath: movie.backdrop,
          releaseYear: movie.release_year,
          genres: movie.genres,
          matchScore: movie.ai_relevance_score,
          headline: movie.reason,
          reasons: movie.ai_match_tags,
        },
      });
    }
  };

  // Extract YouTube ID for embed
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  };

  // Sort results
  const sortedResults = [...(data?.results || [])].sort((a, b) => {
    if (sortBy === "rating") return (b.vote_average || 0) - (a.vote_average || 0);
    if (sortBy === "year") return (b.release_year || 0) - (a.release_year || 0);
    return (b.ai_relevance_score || 0) - (a.ai_relevance_score || 0);
  });

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
      <Header />

      {/* Ambient Glow Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl rounded-full" />
      </div>

      <main className="flex-1 relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-24">
        {/* Studio Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>SineAI Keşif Stüdyosu</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Bu gece ne izlemek istiyorsun?
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Ruh halini, sevdiğin bir filmi veya aradığın deneyimi doğal dille anlat. SineAI senin için en mükemmel eşleşmeyi bulsun.
          </p>
        </div>

        {/* Search Bar Input Area */}
        <div className="max-w-3xl mx-auto space-y-4 mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative flex items-center bg-zinc-900/90 border border-purple-500/30 focus-within:border-purple-500 rounded-2xl p-2 shadow-2xl backdrop-blur-xl transition-all"
          >
            <div className="pl-3 pr-2 text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ne izlemek istiyorsun? (Örn: Okyanusta geçen romantik bir film, 6 bölümlük polisiye dizi...)"
              className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none px-2 py-2"
            />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleVoiceSearch}
                title="Sesli Arama"
                className={`p-2.5 rounded-xl transition-all ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Bulunuyor...</span>
                  </>
                ) : (
                  <>
                    <span>Önerileri Bul</span>
                    <span>✨</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Actions (Random Pick) */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRandomPick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/20 rounded-lg transition-all"
            >
              <span>🎲</span>
              <span>Şanslı Hissediyorum (Rastgele Öneri)</span>
            </button>
          </div>
        </div>

        {/* Mood Chips Bar */}
        <div className="space-y-2 mb-12">
          <div className="text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Veya Bir Ruh Hali Seçin
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {MOOD_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => {
                  setQuery(chip.query);
                  handleSearch(chip.query);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/40 text-xs text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <span>{chip.emoji}</span>
                <span className="font-medium">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-3xl mx-auto p-4 mb-8 bg-rose-950/50 border border-rose-800 rounded-xl text-sm text-rose-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white text-xs">
              Kapat
            </button>
          </div>
        )}

        {/* Results Container */}
        <div ref={resultsRef}>
          {data && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-zinc-900/80 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold flex-shrink-0">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      {data.request_summary_tr}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {data.total} özel eşleşme listeleniyor ({data._analysis?.model || "AI Engine"})
                    </p>
                  </div>
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs text-zinc-400">Sırala:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                  >
                    <option value="relevance">En İyi Eşleşme</option>
                    <option value="rating">IMDb Puanı</option>
                    <option value="year">Çıkış Yılı</option>
                  </select>
                </div>
              </div>

              {/* Movie Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedResults.map((movie: EnrichedAiMovieItem) => {
                  const isSaved = savedIds.has(movie.id);

                  return (
                    <div
                      key={`${movie.type}_${movie.id}`}
                      onClick={() => handleOpenDetails(movie)}
                      className="group cursor-pointer bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/30 hover:-translate-y-1"
                    >
                      {/* Poster & Badges Container */}
                      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                            Afiş Yok
                          </div>
                        )}

                        {/* Top Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/60 pointer-events-none" />

                        {/* AI Match Score Badge */}
                        <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-purple-950/90 border border-purple-500/40 text-purple-300 text-[11px] font-bold tracking-wider backdrop-blur-md">
                          %{movie.ai_relevance_score || 95} Eşleşme
                        </div>

                        {/* Type & Year Badge */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                          <span className="px-2 py-1 rounded-lg bg-black/70 border border-white/10 text-white text-[11px] font-mono">
                            {movie.release_year || "—"}
                          </span>
                        </div>

                        {/* Watch Providers Floating Bar */}
                        {movie.providers?.length > 0 && (
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                            {movie.providers.slice(0, 4).map((p) => (
                              <div
                                key={p.provider_id}
                                title={p.provider_name}
                                className="w-6 h-6 rounded-md overflow-hidden bg-zinc-800 border border-white/20 flex-shrink-0 shadow"
                              >
                                {p.logo_path ? (
                                  <img src={p.logo_path} alt={p.provider_name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] flex items-center justify-center h-full text-zinc-300">
                                    {p.provider_name.slice(0, 2)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Content Area */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold flex-shrink-0">
                              <span>★</span>
                              <span>{movie.vote_average ? movie.vote_average.toFixed(1) : "—"}</span>
                            </div>
                          </div>

                          {/* Genres list */}
                          <div className="text-[11px] text-zinc-400 line-clamp-1">
                            {movie.genres.slice(0, 3).join(" • ")}
                          </div>
                        </div>

                        {/* AI Reason Box */}
                        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/90 leading-relaxed">
                          <span className="text-purple-400 font-semibold mr-1">💡 Neden:</span>
                          {movie.reason}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/80">
                          {movie.trailer_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTrailer({ title: movie.title, url: movie.trailer_url! });
                              }}
                              className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-200 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1 flex-shrink-0"
                              title="Fragmanı Oynat"
                            >
                              <span>▶</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(movie);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-medium transition-colors text-center flex items-center justify-center gap-1"
                            title="Hızlı Değerlendir & Detaylar"
                          >
                            <span>⭐</span>
                            <span>Değerlendir</span>
                          </button>

                          <Link
                            href={
                              movie.type === "tv"
                                ? `/dizi/${generateTvSlug(movie.title, movie.id)}`
                                : `/film/${generateMovieSlug(movie.title, movie.id)}`
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1 flex-shrink-0"
                            title="Filmin Özel Sayfasına Git"
                          >
                            <span>Sayfa</span>
                            <span className="text-[10px]">↗</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => handleSaveToWatchlist(movie, e)}
                            title={isSaved ? "Listeden Çıkar" : "İzleme Listeme Ekle"}
                            className={`p-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                              isSaved
                                ? "bg-purple-600 border-purple-500 text-white"
                                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                            }`}
                          >
                            <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Movie Details Modal (with Watched, Love, Like, Dislike, Watchlist) */}
      {selectedMovieModal && (
        <MovieDetailsModal
          movieId={selectedMovieModal.id}
          initialData={selectedMovieModal.initialData}
          onClose={() => setSelectedMovieModal(null)}
        />
      )}

      {/* TV Details Modal */}
      {selectedTvModal && (
        <TvDetailsModal
          tvShowId={selectedTvModal.id}
          initialData={selectedTvModal.initialData}
          onClose={() => setSelectedTvModal(null)}
        />
      )}

      {/* YouTube Trailer Modal */}
      {activeTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white line-clamp-1">{activeTrailer.title} — Fragman</h3>
              <button
                onClick={() => setActiveTrailer(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full bg-black">
              {getYouTubeEmbedUrl(activeTrailer.url) ? (
                <iframe
                  src={getYouTubeEmbedUrl(activeTrailer.url)!}
                  title={activeTrailer.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  Fragman yüklenemedi.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
      <BottomNav />
    </div>
  );
}
