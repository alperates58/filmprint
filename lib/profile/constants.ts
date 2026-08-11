import { RatingStatus } from "@prisma/client";

export const FILM_DNA_ALGORITHM_VERSION = 1;

export const RATING_WEIGHTS: Record<RatingStatus, number> = {
  LOVE: 3.0,
  LIKE: 1.5,
  NEUTRAL: 0.0,
  DISLIKE: -2.0,
};

export const ERA_BUCKETS = [
  { key: "Before 1970", label: "1970 Öncesi Klasik Dönem", minYear: 0, maxYear: 1969 },
  { key: "1970s", label: "1970'ler Altın Çağ", minYear: 1970, maxYear: 1979 },
  { key: "1980s", label: "1980'ler Popüler Sinema", minYear: 1980, maxYear: 1989 },
  { key: "1990s", label: "1990'lar Kült Dönem", minYear: 1990, maxYear: 1999 },
  { key: "2000s", label: "2000'ler Milenyum Sineması", minYear: 2000, maxYear: 2009 },
  { key: "2010s", label: "2010'lar Modern Sinema", minYear: 2010, maxYear: 2019 },
  { key: "2020s", label: "2020'ler Çağdaş Sinema", minYear: 2020, maxYear: 2099 },
] as const;
