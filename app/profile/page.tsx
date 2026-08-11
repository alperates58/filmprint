import React from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { getOrCreateSession } from "@/lib/session";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { GenreSignature } from "@/components/profile/GenreSignature";
import { EraSignature } from "@/components/profile/EraSignature";
import { TasteTraits } from "@/components/profile/TasteTraits";

export default async function ProfilePage() {
  const { userId } = await getOrCreateSession();
  const data = await getOrCalculateUserProfile(userId);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-white">
      <Header progressCount={data.current} progressTarget={data.required} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-8">
        {!data.ready || !data.profile ? (
          /* Profile Not Ready State (Under Milestone Target) */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-surface border border-border/80 rounded-3xl p-8 md:p-12 shadow-cinematic my-8">
            <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto text-2xl font-bold">
              DNA
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                Film DNA'nız Henüz Hazır Değil
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed">
                Kişisel Film DNA profilinizin oluşması için en az{" "}
                <strong className="text-text-primary">{data.required} filmi</strong>{" "}
                değerlendirmeniz gerekmektedir.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-mono text-text-muted">
                <span>KALİBRASYON İLERLEMESİ</span>
                <span className="font-bold text-text-primary">
                  {data.current} / {data.required} Film
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden border border-border">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      Math.round((data.current / data.required) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover active:scale-[0.98] transition-all shadow-md"
              >
                Filmleri Değerlendirmeye Başla →
              </Link>
            </div>
          </div>
        ) : (
          /* Ready Film DNA Profile View */
          <div className="space-y-8 animate-fadeIn">
            {/* Profile Hero Header */}
            <div className="p-6 md:p-10 rounded-3xl bg-surface border border-border/80 space-y-5 shadow-cinematic relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-accent uppercase tracking-widest font-semibold">
                    KİŞİSEL KİMLİK
                  </span>
                  <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-1">
                    Film DNA'n
                  </h1>
                </div>

                {/* Confidence Badge */}
                <div className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-surface-elevated border border-border/80 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                  <div>
                    <p className="text-[10px] uppercase font-mono text-text-muted">PROFİL GÜVENİ</p>
                    <p className="text-sm font-mono font-bold text-text-primary">
                      %{Math.round(data.profile.confidence * 100)}{" "}
                      <span className="text-xs text-text-muted font-normal">
                        ({data.profile.sample.ratedMovies} Değerlendirilmiş Film)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Natural Turkish Summary Paragraph */}
              <div className="p-5 rounded-2xl bg-surface-elevated/70 border border-border/60 text-sm md:text-base text-text-primary leading-relaxed">
                <p>{data.profile.summary.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-accent text-white font-medium text-xs md:text-sm hover:bg-accent-hover active:scale-[0.98] transition-all shadow-md text-center"
                >
                  Film DNA'mı Keskinleştir (Değerlendirmeye Devam Et) →
                </Link>
              </div>
            </div>

            {/* Visual Signatures */}
            <GenreSignature genres={data.profile.genres} />
            <EraSignature eras={data.profile.eras} />
            <TasteTraits
              traits={data.profile.traits}
              popularityLabel={data.profile.popularity.label}
              familiarityDesc={data.profile.familiarity.description}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-text-muted font-mono">
        FILMPRINT &copy; {new Date().getFullYear()} — Film DNA Profile Engine v1.0
      </footer>
    </div>
  );
}
