import type { TasteEvidenceMovie, TasteCluster } from "./types";

export function extractTasteClusters(positiveMovies: TasteEvidenceMovie[]): TasteCluster[] {
  if (!positiveMovies || positiveMovies.length === 0) {
    return [];
  }

  const genreMap = new Map<string, TasteEvidenceMovie[]>();
  for (const m of positiveMovies) {
    for (const g of m.genres) {
      if (!genreMap.has(g)) {
        genreMap.set(g, []);
      }
      genreMap.get(g)!.push(m);
    }
  }

  // Sort genres by movie count
  const sortedGenres = Array.from(genreMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const clusters: TasteCluster[] = [];
  const clusterNamesMap: Record<string, string> = {
    Dram: "Prestij Drama & Karakter Anlatıları",
    Aksiyon: "Tempolu Aksiyon & Suç Evrenleri",
    Gerilim: "Psikolojik Gerilim & Gizem",
    "Bilim Kurgu": "Zihin Büken Kurgular & Bilim Kurgu",
    Komedi: "Samimi Komedi & Mizah Yapımları",
    Korku: "Karanlık Atmosfer & Gerilim",
    Macera: "Epik Sinema & Keşif Yolculukları",
    Romantik: "Duygusal İlişkiler & Romantik Anlatılar",
    Suç: "Karanlık Suç & Polisiye",
  };

  for (const [genreName, movies] of sortedGenres.slice(0, 5)) {
    const titles = Array.from(new Set(movies.map((m) => m.title)));
    const name = clusterNamesMap[genreName] || `${genreName} Sineması Seçkisi`;

    clusters.push({
      id: `cluster-${genreName.toLowerCase()}`,
      name,
      genres: [genreName],
      movieTitles: titles,
      weight: Number((movies.length / positiveMovies.length).toFixed(2)),
    });
  }

  return clusters;
}
