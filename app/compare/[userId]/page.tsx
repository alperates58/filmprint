"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export default function CompareDuelPage() {
  const params = useParams();
  const targetUserId = params?.userId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [calculatedComparison, setCalculatedComparison] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    fetch(`/api/compare/${targetUserId}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d.comparison) {
          setCalculatedComparison(d.comparison);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load duel data:", err);
        setLoading(false);
      });
  }, [targetUserId]);

  const handleQuizAnswer = async (status: string, rating: string | null) => {
    const movie = data?.miniQuizMovies?.[quizIndex];
    if (!movie) return;

    const newAnswers = [...answers, { movieId: movie.id, status, rating }];
    setAnswers(newAnswers);

    if (quizIndex + 1 < (data?.miniQuizMovies?.length || 5) && quizIndex < 4) {
      setQuizIndex(quizIndex + 1);
    } else {
      // Finished 5 quick answers! Calculate compatibility
      setCalculating(true);
      try {
        const res = await fetch(`/api/compare/${targetUserId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quickAnswers: newAnswers }),
        });
        const resData = await res.json();
        if (resData.comparison) {
          setCalculatedComparison(resData.comparison);
        }
      } catch (err) {
        console.error("Duel calculation failed:", err);
      } finally {
        setCalculating(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-base text-text-primary">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-sans text-text-muted">Sinefil Zevk Düellosu Yükleniyor...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const targetUser = data?.targetUser;
  const comparison = calculatedComparison;

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 animate-fadeIn">
        {/* Duel Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold font-mono">
            <span>⚔️ SİNEFİL ZEVK DÜELLOSU</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text-primary">
            {targetUser?.name || "Kullanıcı"} ile Film Zevkini Karşılaştır
          </h1>
          <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto">
            İki sinefil zevkinin matematiksel uyumunu, ortak tutkularını ve birlikte izlemeniz gereken ortak başyapıtları keşfet.
          </p>
        </div>

        {/* Avatars Duel Showcase */}
        <div className="relative flex items-center justify-center gap-4 sm:gap-8 my-6">
          {/* Target User */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-violet-950 to-surface-2 border-2 border-violet-500/50 flex items-center justify-center text-violet-300 font-bold text-3xl shadow-xl shadow-violet-500/10">
              {targetUser?.name ? targetUser.name.charAt(0).toUpperCase() : "🎬"}
            </div>
            <span className="text-xs sm:text-sm font-bold text-text-primary max-w-[120px] truncate">
              {targetUser?.name || "Kullanıcı"}
            </span>
            <span className="text-[10px] font-mono text-amber-400">
              {targetUser?.rankBadgeIcon} {targetUser?.rankLabel}
            </span>
          </div>

          {/* VS Badge */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-fuchsia-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-accent/30 animate-pulse">
            VS
          </div>

          {/* Visitor / You */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-cyan-950 to-surface-2 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-300 font-bold text-3xl shadow-xl shadow-cyan-500/10">
              {data?.visitor?.name ? data.visitor.name.charAt(0).toUpperCase() : "👤"}
            </div>
            <span className="text-xs sm:text-sm font-bold text-text-primary max-w-[120px] truncate">
              {data?.visitor?.name || "Sen"}
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {data?.visitor ? "Aktif Sinefil" : "Yeni Kaşif"}
            </span>
          </div>
        </div>

        {/* Interactive Content: Result vs Mini Quiz */}
        {calculating ? (
          <div className="p-12 rounded-3xl bg-surface-1 border border-border text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-text-primary">Zevk Uyumu Hesaplanıyor...</h3>
            <p className="text-xs text-text-muted">Film DNA modelleriniz karşılaştırılıyor.</p>
          </div>
        ) : comparison ? (
          /* RESULT SCREEN */
          <div className="space-y-6 animate-fadeIn">
            {/* Main Compatibility Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-1 via-purple-950/30 to-surface-2 border border-purple-500/40 p-6 sm:p-10 text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">
                  SİNEMATİK UYUM SKORU
                </p>
                <div className="font-display text-5xl sm:text-7xl font-extrabold bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
                  %{comparison.compatibilityPercent}
                </div>
              </div>

              <p className="text-sm sm:text-base text-text-primary max-w-lg mx-auto font-medium leading-relaxed">
                {comparison.verdict}
              </p>

              {/* Shared Passions & Contrasts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-2 text-left">
                <div className="p-4 rounded-2xl bg-surface-2/80 border border-border space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                    <span>❤️</span>
                    <span>Ortak Tutkular</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {comparison.sharedPassions?.length > 0 ? (
                      comparison.sharedPassions.map((p: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-muted">Genel sinema zevkinde buluşuyorsunuz.</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-2/80 border border-border space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase">
                    <span>⚡</span>
                    <span>Zevk Ayrışmaları</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {comparison.contrasts?.length > 0 ? (
                      comparison.contrasts.map((c: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-muted">Tür seçimleriniz oldukça paralel.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Joint Movie Recommendations */}
            {comparison.jointRecommendations?.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="text-center space-y-1">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-text-primary">
                    🍿 Birlikte İzlemeniz Gereken Ortak Başyapıtlar
                  </h3>
                  <p className="text-xs text-text-muted">
                    İkinizin de Film DNA'sındaki ortak rezonans noktalarına hitap eden seçkiler.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {comparison.jointRecommendations.map((movie: any) => (
                    <div
                      key={movie.id}
                      className="p-3 rounded-2xl bg-surface-1 border border-border/80 hover:border-accent/60 transition-all space-y-3 shadow-md flex flex-col justify-between"
                    >
                      {movie.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                          alt={movie.title}
                          className="w-full h-48 sm:h-56 object-cover rounded-xl shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-48 sm:h-56 bg-surface-2 rounded-xl flex items-center justify-center text-3xl">
                          🎬
                        </div>
                      )}

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-text-primary line-clamp-1">
                          {movie.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>{movie.releaseYear || "—"}</span>
                          <span className="text-amber-400 font-semibold">★ {movie.voteAverage?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duel Actions */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/p/${targetUserId}`}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-text-primary font-bold text-xs transition-all flex items-center justify-center gap-2 min-h-[46px]"
              >
                <span>👤</span>
                <span>{targetUser?.name} Profiline Göz At</span>
              </Link>

              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-all shadow-lg shadow-accent/25 flex items-center justify-center gap-2 min-h-[46px] active:scale-95"
              >
                <span>✨</span>
                <span>Kendi Film DNA&apos;nı Tamamla</span>
              </Link>
            </div>
          </div>
        ) : (
          /* 5-MOVIE QUICK CALIBRATION QUIZ */
          <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-2xl text-center animate-fadeIn">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-text-muted">
                <span className="font-bold font-mono text-accent">HIZLI ZEVK TESTİ</span>
                <span>{quizIndex + 1} / 5 Film</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${((quizIndex + 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            {data?.miniQuizMovies?.[quizIndex] && (
              <div className="space-y-4">
                {data.miniQuizMovies[quizIndex].posterPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${data.miniQuizMovies[quizIndex].posterPath}`}
                    alt={data.miniQuizMovies[quizIndex].title}
                    className="w-44 h-64 object-cover rounded-2xl mx-auto shadow-xl border border-border"
                  />
                ) : (
                  <div className="w-44 h-64 bg-surface-2 rounded-2xl mx-auto flex items-center justify-center text-4xl">
                    🎬
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold text-text-primary">
                    {data.miniQuizMovies[quizIndex].title}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {data.miniQuizMovies[quizIndex].releaseYear}
                  </p>
                </div>
              </div>
            )}

            {/* Answer Buttons */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => handleQuizAnswer("WATCHED", "LOVE")}
                className="py-3 px-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all active:scale-95 flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-lg">❤️</span>
                <span>Çok Sevdim</span>
              </button>

              <button
                onClick={() => handleQuizAnswer("WATCHED", "LIKE")}
                className="py-3 px-2 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-xs transition-all active:scale-95 flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-lg">👍</span>
                <span>Beğendim</span>
              </button>

              <button
                onClick={() => handleQuizAnswer("NOT_WATCHED", null)}
                className="py-3 px-2 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-border text-text-muted font-bold text-xs transition-all active:scale-95 flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-lg">✕</span>
                <span>İzlemedim</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
