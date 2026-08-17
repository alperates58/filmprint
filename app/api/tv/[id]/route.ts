import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/service";
import { tmdbTvClient } from "@/lib/tmdb/tv/client";
import { TvInteractionStatus, RatingStatus } from "@prisma/client";
import { getTmdbImageUrl } from "@/lib/tmdb/image";
import { evaluateContentIngestionSafety } from "@/lib/content/ingestion-safety";
import { isMeaningfulOverview } from "@/lib/content/overview-safety";
import { getTvPersonalMatch } from "@/lib/tv/recommendation/universal-matcher";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const { id: rawId } = await params;

    // 1. Identify parameter semantics: parse explicit tmdbId vs internal database UUID
    const isNumeric = !isNaN(Number(rawId)) && Number.isInteger(Number(rawId));
    const tmdbId = isNumeric ? parseInt(rawId, 10) : null;

    let show = null;

    if (tmdbId !== null) {
      // Cache-First resolution: Checks local PostgreSQL TvShow first, fetches from TMDB if missing
      show = await tmdbTvClient.getOrFetchTvShow(tmdbId);
    } else {
      // Lookup by internal database UUID
      const dbShow = await db.tvShow.findUnique({
        where: { id: rawId },
      });
      if (dbShow) {
        const meta = (dbShow.metadata as Record<string, unknown>) || {};
        show = {
          id: dbShow.id,
          tmdbId: dbShow.tmdbId,
          name: dbShow.name,
          originalName: dbShow.originalName,
          posterPath: dbShow.posterPath,
          backdropPath: dbShow.backdropPath,
          firstAirDate: dbShow.firstAirDate,
          lastAirDate: dbShow.lastAirDate,
          status: dbShow.status,
          originalLanguage: dbShow.originalLanguage,
          popularity: dbShow.popularity,
          voteAverage: dbShow.voteAverage,
          voteCount: dbShow.voteCount,
          overview: dbShow.overview,
          genres: (meta.genres as string[]) || [],
          numberOfSeasons: (meta.numberOfSeasons as number | null) || null,
          numberOfEpisodes: (meta.numberOfEpisodes as number | null) || null,
          metadata: meta,
        };
      }
    }

    if (!show) {
      return NextResponse.json({ error: "Dizi bulunamadı" }, { status: 404 });
    }

    let meta = (show.metadata as Record<string, any>) || {};

    // 2. Enrich missing creators, cast, or trailer via TMDB Client if needed
    if (!meta.creators || !meta.cast || meta.trailer === undefined) {
      const tmdbDetails = await tmdbTvClient.getTvDetails(show.tmdbId);
      const localization = tmdbDetails.localization;
      const localizationSafety = localization
        ? evaluateContentIngestionSafety({
            localizedTitle: localization.turkishTitle,
            englishTitle: localization.englishTitle,
            originalTitle: localization.originalName,
            overview: localization.overview,
            adult: localization.adult,
          })
        : null;
      const canRepairLocalization =
        localization !== null &&
        localizationSafety?.allowed === true &&
        localizationSafety.displayTitle !== null;
      const repairedName = canRepairLocalization
        ? localizationSafety!.displayTitle!.title
        : show.name;
      const repairedOverview =
        canRepairLocalization && isMeaningfulOverview(localization?.overview)
          ? localization?.overview || show.overview
          : isMeaningfulOverview(show.overview)
            ? show.overview
            : "";

      const updatedMeta = {
        ...meta,
        numberOfSeasons: tmdbDetails.numberOfSeasons || meta.numberOfSeasons || null,
        numberOfEpisodes: tmdbDetails.numberOfEpisodes || meta.numberOfEpisodes || null,
        episodeRunTime: tmdbDetails.episodeRunTime || meta.episodeRunTime || null,
        creators: tmdbDetails.creators || meta.creators || [],
        cast: tmdbDetails.cast || meta.cast || [],
        trailer: tmdbDetails.trailer !== undefined ? tmdbDetails.trailer : (meta.trailer || null),
        overview: repairedOverview,
        turkishTitle: localization?.turkishTitle || meta.turkishTitle || "",
        englishTitle: localization?.englishTitle || meta.englishTitle || "",
        titleLocalizationSource: localization?.titleSource || meta.titleLocalizationSource || "NONE",
        overviewLocalizationSource: localization?.overviewSource || meta.overviewLocalizationSource || "NONE",
      };

      try {
        await db.tvShow.update({
          where: { id: show.id },
          data: {
            name: repairedName,
            originalName: canRepairLocalization ? localization?.originalName || show.originalName : show.originalName,
            overview: repairedOverview,
            metadata: updatedMeta,
          },
        });
        meta = updatedMeta;
        show = {
          ...show,
          name: repairedName,
          originalName: canRepairLocalization ? localization?.originalName || show.originalName : show.originalName,
          overview: repairedOverview,
        };
      } catch (e) {
        meta = updatedMeta;
      }
    }

    // 3. Resolve current user's interaction or feedback status
    let userStatus: TvInteractionStatus | "WATCH_LATER" | null = null;
    let userRating: RatingStatus | null = null;

    if (currentUser) {
      const [interaction, feedback] = await Promise.all([
        db.tvInteraction.findUnique({
          where: { userId_tvShowId: { userId: currentUser.id, tvShowId: show.id } },
        }),
        db.tvRecommendationFeedback.findUnique({
          where: { userId_tvShowId: { userId: currentUser.id, tvShowId: show.id } },
        }),
      ]);

      if (interaction) {
        userStatus = interaction.status;
        userRating = interaction.rating;
      } else if (feedback && feedback.action === "WATCH_LATER") {
        userStatus = "WATCH_LATER";
      }
    }

    const posterUrl = getTmdbImageUrl(show.posterPath, "w500");
    const backdropUrl = getTmdbImageUrl(show.backdropPath, "w1280");

    let personalMatch = null;
    if (currentUser) {
      try {
        personalMatch = await getTvPersonalMatch(currentUser.id, show.id);
      } catch (e) {
        console.error("[GET /api/tv/[id] Match Error]:", e);
      }
    }

    return NextResponse.json({
      id: show.id,
      tmdbId: show.tmdbId,
      name: show.name,
      originalName: show.originalName,
      overview: (meta.overview as string) || show.overview || "Bu dizi için detaylı özet bulunmuyor.",
      firstAirDate: show.firstAirDate,
      lastAirDate: show.lastAirDate,
      status: show.status,
      originalLanguage: show.originalLanguage,
      numberOfSeasons: (meta.numberOfSeasons as number | null) || null,
      numberOfEpisodes: (meta.numberOfEpisodes as number | null) || null,
      genres: (meta.genres as string[]) || [],
      voteAverage: show.voteAverage,
      voteCount: show.voteCount,
      popularity: show.popularity,
      posterUrl,
      backdropUrl,
      creators: (meta.creators as string[]) || [],
      cast: (meta.cast as any[]) || [],
      trailer: (meta.trailer as any) || null,
      userStatus,
      userRating,
      personalMatch,
    });
  } catch (error) {
    console.error("[GET /api/tv/[id] Error]:", error);
    return NextResponse.json(
      { error: "Dizi detayları alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
