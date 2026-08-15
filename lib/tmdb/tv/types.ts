export interface TMDBTvShow {
  id: number;
  name: string;
  original_name: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  last_air_date?: string;
  status?: string;
  popularity: number;
  vote_average: number;
  vote_count?: number;
  adult?: boolean;
  original_language?: string;
  origin_country?: string[];
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
}

export interface CachedTvShowData {
  id: string; // Database UUID
  tmdbId: number;
  name: string;
  originalName: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number | null;
  genres: string[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  metadata: Record<string, unknown>;
}

export interface TMDBTvDetails {
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  episodeRunTime: number | null;
  creators: string[];
  cast: { name: string; character: string; profilePath: string | null }[];
  trailer: { provider: "youtube"; key: string } | null;
}

export const TV_GENRE_MAP: Record<number, string> = {
  10759: "Aksiyon & Macera",
  16: "Animasyon",
  35: "Komedi",
  80: "Suç",
  99: "Belgesel",
  18: "Dram",
  10751: "Aile",
  10762: "Çocuk",
  9648: "Gizem",
  10763: "Haber",
  10764: "Reality",
  10765: "Bilim Kurgu & Fantezi",
  10766: "Pembe Dizi",
  10767: "Talk Show",
  10768: "Savaş & Politika",
  37: "Vahşi Batı",
};
