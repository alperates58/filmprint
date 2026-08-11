import { Header } from "@/components/ui/Header";
import { MovieCardSkeleton } from "@/components/movie/MovieCardSkeleton";
import { getOrCreateSession } from "@/lib/session";

export default async function Home() {
  // Provision or retrieve persistent anonymous user session
  const { userId, created } = await getOrCreateSession();

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-white">
      <Header progressCount={0} progressTarget={30} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        {/* Intro Banner */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-xs text-text-secondary font-mono">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>CALIBRATION ENGINE ENGINE — PHASE 0</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Film DNA Profilini Oluştur
          </h1>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed">
            Tek tek filmleri değerlendir, sinema zevkini milisaniyeler içinde haritalandır.
          </p>
        </div>

        {/* Minimal Movie Card Shell Preview */}
        <MovieCardSkeleton />

        {/* Phase 0 System Verification Footer Pill */}
        <div className="mt-12 p-4 rounded-xl bg-surface/60 border border-border/80 max-w-lg w-full text-xs font-mono text-text-muted space-y-2">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span>Session ID:</span>
            <span className="text-text-secondary truncate max-w-[220px]">{userId}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span>Session Status:</span>
            <span className={created ? "text-accent" : "text-success"}>
              {created ? "NEWLY PROVISIONED" : "PERSISTENT COOKIE VERIFIED"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>TMDB Client Boundary:</span>
            <span className="text-text-secondary">SERVER-SIDE ONLY</span>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-text-muted font-mono">
        FILMPRINT &copy; {new Date().getFullYear()} — Movie Taste Calibration Engine
      </footer>
    </div>
  );
}
