import { db } from "@/lib/db/client";
import { countCatalogSafetyFindings } from "@/lib/content/catalog-safety-audit";

function metadataString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

async function main() {
  // Read-only diagnostic: no update/delete/upsert and no cleanup side effects.
  const [movies, tvShows] = await Promise.all([
    db.movie.findMany({
      select: { title: true, originalTitle: true, metadata: true },
    }),
    db.tvShow.findMany({
      select: { name: true, originalName: true, overview: true },
    }),
  ]);

  const movieCounts = countCatalogSafetyFindings(
    movies.map((movie) => ({
      displayTitle: movie.title,
      originalTitle: movie.originalTitle,
      overview: metadataString(movie.metadata, "overview"),
    }))
  );
  const tvCounts = countCatalogSafetyFindings(
    tvShows.map((show) => ({
      displayTitle: show.name,
      originalTitle: show.originalName,
      overview: show.overview,
    }))
  );

  console.log(JSON.stringify({ movie: movieCounts, tvShow: tvCounts }, null, 2));
}

main()
  .catch((error) => {
    console.error("Content-safety audit failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
