import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/service";
import { db } from "@/lib/db/client";
import {
  getTvHomeModules,
  getPersonalizedTvRecommendations,
} from "@/lib/tv/recommendation/service";
import { TvDiscoveryHome } from "@/components/tv/TvDiscoveryHome";

export const dynamic = "force-dynamic";

export default async function TvHomePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth?returnTo=/tv");
  }

  const [tvInteractionCount, watchedCount, partiallyWatchedCount, homeModules, recResult] =
    await Promise.all([
      db.tvInteraction.count({ where: { userId: currentUser.id } }),
      db.tvInteraction.count({
        where: { userId: currentUser.id, status: "WATCHED" },
      }),
      db.tvInteraction.count({
        where: { userId: currentUser.id, status: "PARTIALLY_WATCHED" },
      }),
      getTvHomeModules(currentUser.id),
      getPersonalizedTvRecommendations(currentUser.id, {
        limit: 10,
        includeKnownUnwatched: true,
      }),
    ]);

  const topHeroMatch =
    recResult.recommendations.length > 0 ? recResult.recommendations[0] : null;

  return (
    <TvDiscoveryHome
      userName={currentUser.name || ""}
      userAvatar={currentUser.image || undefined}
      userEmail={currentUser.email || undefined}
      answeredCount={tvInteractionCount}
      watchedCount={watchedCount}
      partiallyWatchedCount={partiallyWatchedCount}
      homeModules={homeModules}
      topHeroMatch={topHeroMatch}
      profileConfidence={recResult.profileConfidence}
      maturityLabel={recResult.maturityLabel}
    />
  );
}

