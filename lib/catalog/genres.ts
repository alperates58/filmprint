import { slugify } from "@/lib/growth/seo/slug";

export interface CanonicalGenre {
  id: number;
  name: string;
  slug: string;
  mediaType: "FILM" | "TV" | "BOTH";
  description: string;
}

export const CANONICAL_MOVIE_GENRES: CanonicalGenre[] = [
  { id: 28, name: "Aksiyon", slug: "aksiyon", mediaType: "FILM", description: "En yüksek tempolu, soluksuz aksiyon ve macera filmleri." },
  { id: 12, name: "Macera", slug: "macera", mediaType: "FILM", description: "Bilinmeyene yolculuk, keşif ve sürükleyici macera filmleri." },
  { id: 16, name: "Animasyon", slug: "animasyon", mediaType: "BOTH", description: "Her yaştan izleyiciye hitap eden yaratıcı animasyon yapımları." },
  { id: 35, name: "Komedi", slug: "komedi", mediaType: "BOTH", description: "Gülümseten, zekice kurgulanmış ve eğlenceli komedi filmleri." },
  { id: 80, name: "Suç", slug: "suc", mediaType: "BOTH", description: "Karanlık sokaklar, karmaşık cinayetler ve zeka dolu suç filmleri." },
  { id: 99, name: "Belgesel", slug: "belgesel", mediaType: "BOTH", description: "Gerçek olaylar, doğa, bilim ve insan hikayeleri." },
  { id: 18, name: "Dram", slug: "dram", mediaType: "BOTH", description: "Duygusal derinliği yüksek, unutulmaz dram başyapıtları." },
  { id: 10751, name: "Aile", slug: "aile", mediaType: "BOTH", description: "Tüm ailenin keyifle izleyebileceği sıcak ve ilham verici filmler." },
  { id: 14, name: "Fantezi", slug: "fantezi", mediaType: "FILM", description: "Büyülü dünyalar, efsaneler ve fantastik sinema evrenleri." },
  { id: 36, name: "Tarih", slug: "tarih", mediaType: "FILM", description: "Tarihin dönüm noktalarını ekrana taşıyan biyografik ve tarihi filmler." },
  { id: 27, name: "Korku", slug: "korku", mediaType: "FILM", description: "Tüyler ürperten, gerilim dolu en iyi korku filmleri." },
  { id: 10402, name: "Müzik", slug: "muzik", mediaType: "FILM", description: "Müzik dünyasının ritmini ve sahne arkasını yansıtan filmler." },
  { id: 9648, name: "Gizem", slug: "gizem", mediaType: "BOTH", description: "Sürpriz sonlu, zihin açan ve merak uyandıran gizem filmleri." },
  { id: 10749, name: "Romantik", slug: "romantik", mediaType: "FILM", description: "Aşk, tutku ve duygusal bağları anlatan romantik yapımlar." },
  { id: 878, name: "Bilim Kurgu", slug: "bilim-kurgu", mediaType: "FILM", description: "Gelecek, yapay zekâ, uzay ve zaman yolculuğu temalı bilim kurgu filmleri." },
  { id: 10770, name: "TV Film", slug: "tv-film", mediaType: "FILM", description: "Televizyon için özel olarak üretilmiş seçkin sinema filmleri." },
  { id: 53, name: "Gerilim", slug: "gerilim", mediaType: "FILM", description: "Nabzı yükselten, nefes kesen psikolojik ve polisiye gerilimler." },
  { id: 10752, name: "Savaş", slug: "savas", mediaType: "FILM", description: "Savaşın yıkıcılığını ve insan iradesini anlatan epik savaş filmleri." },
  { id: 37, name: "Vahşi Batı", slug: "vahsi-bati", mediaType: "BOTH", description: "Kovboylar, kanunsuz kasabalar ve klasik Western hikayeleri." },
];

export const CANONICAL_TV_GENRES: CanonicalGenre[] = [
  { id: 10759, name: "Aksiyon & Macera", slug: "aksiyon-macera", mediaType: "TV", description: "Bölümden bölüme heyecanın düşmediği aksiyon ve macera dizileri." },
  { id: 16, name: "Animasyon", slug: "animasyon", mediaType: "BOTH", description: "Yetişkin ve genç izleyiciler için sürükleyici animasyon serileri." },
  { id: 35, name: "Komedi", slug: "komedi", mediaType: "BOTH", description: "Sitcomlar, kara mizah ve gününüzü neşelendirecek komedi dizileri." },
  { id: 80, name: "Suç", slug: "suc", mediaType: "BOTH", description: "Dedektifler, karteller ve akıl oyunlarıyla dolu suç dizileri." },
  { id: 99, name: "Belgesel", slug: "belgesel", mediaType: "BOTH", description: "Gerçek suç, bilim ve doğa temalı mini dizi ve belgeseller." },
  { id: 18, name: "Dram", slug: "dram", mediaType: "BOTH", description: "Karakter gelişimi güçlü, derinlikli ve sürükleyici dram serileri." },
  { id: 10751, name: "Aile", slug: "aile", mediaType: "BOTH", description: "Ailecek ekran başına geçilecek sıcak ve keyifli diziler." },
  { id: 10762, name: "Çocuk", slug: "cocuk", mediaType: "TV", description: "Çocuklar için eğitici, öğretici ve eğlenceli çizgi diziler." },
  { id: 9648, name: "Gizem", slug: "gizem", mediaType: "BOTH", description: "Her bölümde yeni bir sırrı aralayan gizem dolu diziler." },
  { id: 10763, name: "Haber", slug: "haber", mediaType: "TV", description: "Gündemi takip eden haber ve aktüalite programları." },
  { id: 10764, name: "Reality", slug: "reality", mediaType: "TV", description: "Yarışma, yaşam tarzı ve popüler reality show serileri." },
  { id: 10765, name: "Bilim Kurgu & Fantezi", slug: "bilim-kurgu-fantezi", mediaType: "TV", description: "Alternatif evrenler, distopyalar ve büyüleyici bilim kurgu dizileri." },
  { id: 10766, name: "Pembe Dizi", slug: "pembe-dizi", mediaType: "TV", description: "Tutkulu aşklar, sırlar ve entrikalarla dolu uzun soluklu diziler." },
  { id: 10767, name: "Talk Show", slug: "talk-show", mediaType: "TV", description: "Ünlü konuklar ve sohbet programları." },
  { id: 10768, name: "Savaş & Politika", slug: "savas-politika", mediaType: "TV", description: "Siyasi güç mücadeleleri, diplomasi ve tarihi savaş serileri." },
  { id: 37, name: "Vahşi Batı", slug: "vahsi-bati", mediaType: "BOTH", description: "Klasik ve modern Western dizileri." },
];

export const MOVIE_GENRES = CANONICAL_MOVIE_GENRES;
export const TV_GENRES = CANONICAL_TV_GENRES;

export const MOVIE_GENRE_BY_ID = new Map<number, CanonicalGenre>(
  CANONICAL_MOVIE_GENRES.map((g) => [g.id, g])
);

export const TV_GENRE_BY_ID = new Map<number, CanonicalGenre>(
  CANONICAL_TV_GENRES.map((g) => [g.id, g])
);

export const MOVIE_GENRE_BY_NAME = new Map<string, CanonicalGenre>(
  CANONICAL_MOVIE_GENRES.map((g) => [g.name.toLowerCase().trim(), g])
);

export const TV_GENRE_BY_NAME = new Map<string, CanonicalGenre>(
  CANONICAL_TV_GENRES.map((g) => [g.name.toLowerCase().trim(), g])
);

export const MOVIE_GENRE_BY_SLUG = new Map<string, CanonicalGenre>(
  CANONICAL_MOVIE_GENRES.map((g) => [g.slug, g])
);

export const TV_GENRE_BY_SLUG = new Map<string, CanonicalGenre>(
  CANONICAL_TV_GENRES.map((g) => [g.slug, g])
);

export const TV_GENRE_ALIASES: Record<string, number> = {
  "gerçeklik": 10764,
  "gerceklik": 10764,
  "reality": 10764,
  "talk": 10767,
  "talk show": 10767,
  "bilim kurgu & fantazi": 10765,
  "bilim kurgu ve fantezi": 10765,
  "bilim kurgu ve fantazi": 10765,
  "çocuklar": 10762,
  "cocuklar": 10762,
  "savaş & politik": 10768,
  "savas & politik": 10768,
  "savaş ve politika": 10768,
  "savas ve politika": 10768,
};

/**
 * Finds a movie genre definition by URL slug.
 */
export function getMovieGenreBySlug(slug: string): CanonicalGenre | null {
  const norm = slugify(slug);
  return MOVIE_GENRE_BY_SLUG.get(norm) || null;
}

/**
 * Finds a TV genre definition by URL slug.
 */
export function getTvGenreBySlug(slug: string): CanonicalGenre | null {
  const norm = slugify(slug);
  return TV_GENRE_BY_SLUG.get(norm) || null;
}

/**
 * Maps raw genre inputs (IDs, strings, or {id, name} objects) to canonical IDs for a given mediaType.
 */
export function resolveCanonicalGenreIds(
  rawGenres: Array<number | string | { id?: number; name?: string }>,
  mediaType: "FILM" | "TV"
): number[] {
  if (!rawGenres || !Array.isArray(rawGenres)) return [];
  const byId = mediaType === "FILM" ? MOVIE_GENRE_BY_ID : TV_GENRE_BY_ID;
  const byName = mediaType === "FILM" ? MOVIE_GENRE_BY_NAME : TV_GENRE_BY_NAME;
  const aliases = mediaType === "TV" ? TV_GENRE_ALIASES : {};
  const resultIds = new Set<number>();

  for (const item of rawGenres) {
    if (typeof item === "number") {
      if (byId.has(item)) {
        resultIds.add(item);
      }
    } else if (typeof item === "string") {
      const normalized = item.toLowerCase().trim();
      const match = byName.get(normalized);
      if (match) {
        resultIds.add(match.id);
      } else if (aliases[normalized] && byId.has(aliases[normalized])) {
        resultIds.add(aliases[normalized]);
      }
    } else if (item && typeof item === "object") {
      if (typeof item.id === "number" && byId.has(item.id)) {
        resultIds.add(item.id);
      } else if (typeof item.name === "string") {
        const normalized = item.name.toLowerCase().trim();
        const match = byName.get(normalized);
        if (match) {
          resultIds.add(match.id);
        } else if (aliases[normalized] && byId.has(aliases[normalized])) {
          resultIds.add(aliases[normalized]);
        }
      }
    }
  }

  return Array.from(resultIds);
}

/**
 * Maps canonical genre IDs to displayable genre names.
 */
export function resolveGenreNamesFromIds(genreIds: number[], mediaType: "FILM" | "TV"): string[] {
  if (!genreIds || !Array.isArray(genreIds)) return [];
  const byId = mediaType === "FILM" ? MOVIE_GENRE_BY_ID : TV_GENRE_BY_ID;
  return genreIds.map((id) => byId.get(id)?.name || "").filter(Boolean);
}

/**
 * Backward-compatible helper to resolve raw genre arrays to displayable string names.
 */
export function resolveGenreNames(rawGenres?: Array<string | { id: number; name: string }>): string[] {
  if (!rawGenres || !Array.isArray(rawGenres)) return [];
  return rawGenres
    .map((g) => (typeof g === "string" ? g : g?.name || ""))
    .filter((name) => Boolean(name && name.trim().length > 0));
}
