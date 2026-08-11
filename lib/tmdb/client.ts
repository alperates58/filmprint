import { db } from "@/lib/db/client";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  popularity: number;
  vote_average: number;
  overview?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
}

export interface CachedMovieData {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  popularity: number;
  voteAverage: number;
  overview: string;
  genres: string[];
  runtime: number | null;
}

export const GENRE_MAP: Record<number, string> = {
  28: "Aksiyon",
  12: "Macera",
  16: "Animasyon",
  35: "Komedi",
  80: "Suç",
  99: "Belgesel",
  18: "Dram",
  10751: "Aile",
  14: "Fantezi",
  36: "Tarih",
  27: "Korku",
  10402: "Müzik",
  9648: "Gizem",
  10749: "Romantik",
  878: "Bilim Kurgu",
  10770: "TV Film",
  53: "Gerilim",
  10752: "Savaş",
  37: "Vahşi Batı",
};

// Rich 40-movie fallback dataset for offline/dev calibration
const FALLBACK_MOVIES: TMDBMovie[] = [
  {
    id: 157336,
    title: "Interstellar",
    original_title: "Interstellar",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fKSuVQwOZ.jpg",
    release_date: "2014-11-05",
    popularity: 145.2,
    vote_average: 8.4,
    overview: "İnsanlığın son günlerinde, uzayda keşfedilen bir solucan deliğinden geçerek yaşanabilir yeni bir gezegen arayan kaşiflerin hikayesi.",
    genre_ids: [12, 18, 878],
    runtime: 169,
  },
  {
    id: 27205,
    title: "Inception",
    original_title: "Inception",
    poster_path: "/lFw5UwTslwDmC22eaDhKVyYhZ43.jpg",
    backdrop_path: "/8ZTVqvKDQ8emSGUEMjsR4yHA8jZ.jpg",
    release_date: "2010-07-15",
    popularity: 128.5,
    vote_average: 8.4,
    overview: "İnsanların rüyalarına girerek sırları çalan yetenekli bir hırsız, son görevinde bir fikri rüyaya yerleştirmek zorundadır.",
    genre_ids: [28, 878, 12],
    runtime: 148,
  },
  {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQY85WAgW2sJBehSFvYmF2z.jpg",
    release_date: "1999-10-15",
    popularity: 92.1,
    vote_average: 8.4,
    overview: "Uykusuzluk çeken bir büro çalışanı ve karizmatik bir sabun satıcısının yeraltı dövüş kulübü kurmasıyla başlayan psikolojik kaos.",
    genre_ids: [18],
    runtime: 139,
  },
  {
    id: 680,
    title: "Pulp Fiction",
    original_title: "Pulp Fiction",
    poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cf4p3.jpg",
    release_date: "1994-09-10",
    popularity: 110.4,
    vote_average: 8.5,
    overview: "İki kiralık katil, bir boksör ve bir mafya patronunun karısının yollarının kesiştiği kült suç anlatısı.",
    genre_ids: [80, 18],
    runtime: 154,
  },
  {
    id: 155,
    title: "The Dark Knight",
    original_title: "The Dark Knight",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/dq20wZ1vBld2v2Jy6j2D2jQ5N.jpg",
    release_date: "2008-07-16",
    popularity: 132.8,
    vote_average: 8.5,
    overview: "Batman, Gotham'ı kaosa sürükleyen psikopat dahi Joker ile amansız bir adalet mücadelesine girer.",
    genre_ids: [18, 28, 80],
    runtime: 152,
  },
  {
    id: 603,
    title: "The Matrix",
    original_title: "The Matrix",
    poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdrop_path: "/d3h9QgUjcR284mK12x9v48L321d.jpg",
    release_date: "1999-03-31",
    popularity: 98.4,
    vote_average: 8.2,
    overview: "Siber hırsız Neo, gerçekliğin yapay bir simülasyondan ibaret olduğunu öğrenerek insanlığın direnişine katılır.",
    genre_ids: [28, 878],
    runtime: 136,
  },
  {
    id: 13,
    title: "Forrest Gump",
    original_title: "Forrest Gump",
    poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    backdrop_path: "/qdIMLStA8g327vL7dNJws9PxZd3.jpg",
    release_date: "1994-06-23",
    popularity: 105.1,
    vote_average: 8.5,
    overview: "Düşük IQ'lu ancak kocaman kalpli Forrest Gump'ın 20. yüzyıl Amerikan tarihine damga vuran sıra dışı hayat yolculuğu.",
    genre_ids: [35, 18, 10749],
    runtime: 142,
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    original_title: "The Shawshank Redemption",
    poster_path: "/9cqN1BhF1rAUBivnqfdXslHDBp.jpg",
    backdrop_path: "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
    release_date: "1994-09-23",
    popularity: 150.8,
    vote_average: 8.7,
    overview: "Haksız yere müebbet hapse mahkum edilen bankacı Andy Dufresne'in Shawshank hapishanesindeki umut dolu dostluğu.",
    genre_ids: [18, 80],
    runtime: 142,
  },
  {
    id: 238,
    title: "The Godfather",
    original_title: "The Godfather",
    poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    backdrop_path: "/tmU7GeKVybMWF2SqKmsGZ2iOIv.jpg",
    release_date: "1972-03-14",
    popularity: 135.0,
    vote_average: 8.7,
    overview: "Corleone mafya ailesinin yaşlanan liderinden genç oğluna devredilen güç, sadakat ve ihanet destanı.",
    genre_ids: [18, 80],
    runtime: 175,
  },
  {
    id: 129,
    title: "Spirited Away",
    original_title: "千と千尋の神隠し",
    poster_path: "/39wmItE2ABW2rC1u98b3Y7vMmvX.jpg",
    backdrop_path: "/mSDeeBftAE2QJh3f1pip8GiBMTo.jpg",
    release_date: "2001-07-20",
    popularity: 99.3,
    vote_average: 8.5,
    overview: "Ailesi domuza dönüşen 10 yaşındaki Chihiro'nun büyüleyici ruhlar dünyasındaki kurtuluş mücadelesi.",
    genre_ids: [16, 14, 10751],
    runtime: 125,
  },
  {
    id: 475557,
    title: "Joker",
    original_title: "Joker",
    poster_path: "/udDclC67s9StG2yIZ-h9Lp2Yg5v.jpg",
    backdrop_path: "/n6bToF3wGvF7mUZRR4xtXA6YyW.jpg",
    release_date: "2019-10-02",
    popularity: 112.3,
    vote_average: 8.1,
    overview: "Toplum tarafından dışlanan başarısız komedyen Arthur Fleck'in adım adım şiddet dolu Joker figürüne dönüşmesi.",
    genre_ids: [80, 53, 18],
    runtime: 122,
  },
  {
    id: 597,
    title: "Titanic",
    original_title: "Titanic",
    poster_path: "/9xjZS2djR21vFH658RjOfW9vj5C.jpg",
    backdrop_path: "/yDI6D5jA67St8T9kDU8s0f7bdY6.jpg",
    release_date: "1997-11-18",
    popularity: 140.2,
    vote_average: 7.9,
    overview: "Asla batmaz denilen dev gemide tanışan zengin kıza tutulan fakir ressamın unutulmaz aşk hikayesi.",
    genre_ids: [18, 10749],
    runtime: 194,
  },
  {
    id: 807,
    title: "Se7en",
    original_title: "Se7en",
    poster_path: "/6yogfvz2uBvuZ1hZ9y2yv5z9x.jpg",
    backdrop_path: "/9GK70uA5666Y6c986n0h6a1P0.jpg",
    release_date: "1995-09-22",
    popularity: 88.7,
    vote_average: 8.4,
    overview: "Yedi ölümcül günahı temel alarak seri cinayetler işleyen bir katilin peşine düşen iki dedektif.",
    genre_ids: [80, 9648, 53],
    runtime: 127,
  },
  {
    id: 105,
    title: "Back to the Future",
    original_title: "Back to the Future",
    poster_path: "/fN1Csp6v43Jh25k9V6fKk53.jpg",
    backdrop_path: "/7c93VoW8a6YhC7b0Xk0.jpg",
    release_date: "1985-07-03",
    popularity: 82.5,
    vote_average: 8.3,
    overview: "Çılgın bilim insanı Doc'ın zaman makinesiyle 1955 yılına ışınlanan Marty McFly'ın eğlenceli macerası.",
    genre_ids: [12, 35, 878],
    runtime: 116,
  },
  {
    id: 244786,
    title: "Whiplash",
    original_title: "Whiplash",
    poster_path: "/7fn624j567s5.jpg",
    backdrop_path: "/vM98675.jpg",
    release_date: "2014-10-10",
    popularity: 76.4,
    vote_average: 8.4,
    overview: "Hırslı bir caz davulcusunun acımasız ve mükemmeliyetçi müzik hocasıyla yaşadığı psikolojik savaş.",
    genre_ids: [18, 10402],
    runtime: 107,
  },
  {
    id: 872585,
    title: "Oppenheimer",
    original_title: "Oppenheimer",
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop_path: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    release_date: "2023-07-19",
    popularity: 165.2,
    vote_average: 8.1,
    overview: "Amerikalı fizikçi J. Robert Oppenheimer'ın atom bombasını icat etme süreci ve sonrasındaki vicdani hesaplaşması.",
    genre_ids: [18, 36],
    runtime: 180,
  },
  {
    id: 324857,
    title: "Spider-Man: Into the Spider-Verse",
    original_title: "Spider-Man: Into the Spider-Verse",
    poster_path: "/iiEv2v3p83UjG.jpg",
    backdrop_path: "/7d6A.jpg",
    release_date: "2018-12-06",
    popularity: 94.1,
    vote_average: 8.4,
    overview: "Miles Morales'in farklı evrenlerden gelen Örümcek Adamlarla ortak tehdide karşı güçlerini birleştirmesi.",
    genre_ids: [16, 28, 12, 878],
    runtime: 117,
  },
  {
    id: 11,
    title: "Star Wars",
    original_title: "Star Wars",
    poster_path: "/6Fsc72Chm5h7u21z678.jpg",
    backdrop_path: "/4q2e4.jpg",
    release_date: "1977-05-25",
    popularity: 88.0,
    vote_average: 8.2,
    overview: "Luke Skywalker'ın Galaktik İmparatorluk'a karşı amansız isyana katılarak Jedi yolculuğuna başlaması.",
    genre_ids: [12, 28, 878],
    runtime: 121,
  },
  {
    id: 372058,
    title: "Your Name.",
    original_title: "君の名は。",
    poster_path: "/q719jXXEzV2qBN.jpg",
    backdrop_path: "/vOY.jpg",
    release_date: "2016-08-26",
    popularity: 85.3,
    vote_average: 8.5,
    overview: "Tokyo'da yaşayan bir erkek ve kırsalda yaşayan bir kızın rüyalarında beden değiştirmesiyle başlayan gizemli bağ.",
    genre_ids: [16, 18, 10749],
    runtime: 106,
  },
  {
    id: 496243,
    title: "Parasite",
    original_title: "기생충",
    poster_path: "/7IiT9b89.jpg",
    backdrop_path: "/hi8.jpg",
    release_date: "2019-05-30",
    popularity: 110.1,
    vote_average: 8.5,
    overview: "Yoksul Kim ailesinin adım adım zengin Park ailesinin evine sızmasını konu alan gerilim dolu toplumsal hiciv.",
    genre_ids: [35, 53, 18],
    runtime: 132,
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    original_title: "Blade Runner 2049",
    poster_path: "/gajva2L0r.jpg",
    backdrop_path: "/sA.jpg",
    release_date: "2017-10-04",
    popularity: 79.8,
    vote_average: 7.9,
    overview: "Yeni bir Blade Runner olan Memur K'nın toplumun geleceğini değiştirebilecek uzun süredir saklı sırrı keşfetmesi.",
    genre_ids: [878, 18, 9648],
    runtime: 164,
  },
  {
    id: 313369,
    title: "La La Land",
    original_title: "La La Land",
    poster_path: "/uDO8h.jpg",
    backdrop_path: "/qJ.jpg",
    release_date: "2016-12-01",
    popularity: 77.2,
    vote_average: 7.9,
    overview: "Los Angeles'ta hayallerinin peşinden koşan bir caz piyanisti ile oyuncu adayı kadının tutkulu aşkı.",
    genre_ids: [35, 18, 10749, 10402],
    runtime: 128,
  },
  {
    id: 10681,
    title: "WALL-E",
    original_title: "WALL-E",
    poster_path: "/hbh.jpg",
    backdrop_path: "/f.jpg",
    release_date: "2008-06-22",
    popularity: 75.1,
    vote_average: 8.1,
    overview: "Terk edilmiş Dünya'da çöpleri sıkıştıran sevimli robot WALL-E'nin uzay boşluğundaki epik aşk macerası.",
    genre_ids: [16, 10751, 878],
    runtime: 98,
  },
  {
    id: 68718,
    title: "Django Unchained",
    original_title: "Django Unchained",
    poster_path: "/7o.jpg",
    backdrop_path: "/2.jpg",
    release_date: "2012-12-25",
    popularity: 91.0,
    vote_average: 8.2,
    overview: "Alman ödül avcısının yardımıyla özgürlüğüne kavuşan köle Django'nun eşini acımasız bir çiftlik sahibinden kurtarma çabası.",
    genre_ids: [18, 37],
    runtime: 165,
  },
  {
    id: 299536,
    title: "Avengers: Infinity War",
    original_title: "Avengers: Infinity War",
    poster_path: "/7Wsy.jpg",
    backdrop_path: "/bM.jpg",
    release_date: "2018-04-25",
    popularity: 120.3,
    vote_average: 8.3,
    overview: "Yenilmezler ve müttefiklerinin evrenin yarısını yok etmek isteyen Thanos'a karşı nihai mücadelesi.",
    genre_ids: [12, 28, 878],
    runtime: 149,
  },
  {
    id: 1124,
    title: "The Prestige",
    original_title: "The Prestige",
    poster_path: "/t.jpg",
    backdrop_path: "/p.jpg",
    release_date: "2006-10-19",
    popularity: 84.1,
    vote_average: 8.2,
    overview: "19. yüzyıl Viktorya Londra'sında en büyük ilüzyon numarasını yaratmak için birbirinin hayatını karartan iki sihirbaz.",
    genre_ids: [18, 9648, 878],
    runtime: 130,
  },
  {
    id: 98,
    title: "Gladiator",
    original_title: "Gladiator",
    poster_path: "/ty.jpg",
    backdrop_path: "/h.jpg",
    release_date: "2000-05-01",
    popularity: 95.0,
    vote_average: 8.2,
    overview: "Ailesi katledilen ve köle yapılan Romalı General Maximus'un arena dövüşçüsü olarak imparatordan intikam alma yemini.",
    genre_ids: [28, 12, 18],
    runtime: 155,
  },
  {
    id: 545611,
    title: "Everything Everywhere All at Once",
    original_title: "Everything Everywhere All at Once",
    poster_path: "/r.jpg",
    backdrop_path: "/e.jpg",
    release_date: "2022-03-24",
    popularity: 89.2,
    vote_average: 7.8,
    overview: "Göçmen bir kadının paralelleşen evrenlerdeki diğer versiyonlarının yeteneklerine erişerek evreni kurtarma macerası.",
    genre_ids: [28, 12, 878],
    runtime: 139,
  },
  {
    id: 438631,
    title: "Dune",
    original_title: "Dune",
    poster_path: "/d.jpg",
    backdrop_path: "/d2.jpg",
    release_date: "2021-09-15",
    popularity: 115.4,
    vote_average: 7.8,
    overview: "Evrenin en değerli kaynağı baharata ev sahipliği yapan Arrakis gezegenine gönderilen Paul Atreides'in kader mücadelesi.",
    genre_ids: [878, 12],
    runtime: 155,
  },
  {
    id: 120,
    title: "The Lord of the Rings: The Fellowship of the Ring",
    original_title: "The Lord of the Rings: The Fellowship of the Ring",
    poster_path: "/6.jpg",
    backdrop_path: "/5.jpg",
    release_date: "2001-12-18",
    popularity: 130.5,
    vote_average: 8.4,
    overview: "Tek Yüzük'ü Hüküm Dağı'na götürüp yok etmek için kurulan Yüzük Kardeşliği'nin Orta Dünya'daki efsanevi yolculuğu.",
    genre_ids: [12, 14, 28],
    runtime: 178,
  },
];

/**
 * Server-side TMDB Client
 * Strictly executed on the server. TMDB_API_KEY is kept private.
 */
export class TMDBClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || "";
  }

  /**
   * Fetches popular movies from TMDB API server-side.
   * If key is absent, uses fallback static movies for seamless dev experience.
   */
  public async getPopularMovies(page: number = 1): Promise<TMDBMovie[]> {
    if (!this.apiKey) {
      return FALLBACK_MOVIES;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/popular?api_key=${this.apiKey}&language=tr-TR&page=${page}`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) {
        throw new Error(`TMDB API response failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB Server Client] Error fetching popular movies:", error);
      return FALLBACK_MOVIES;
    }
  }

  /**
   * Upserts TMDB movie metadata into local PostgreSQL `Movie` table.
   */
  public async syncMovieToDatabase(tmdbMovie: TMDBMovie): Promise<CachedMovieData> {
    const releaseYear = tmdbMovie.release_date
      ? parseInt(tmdbMovie.release_date.substring(0, 4), 10)
      : null;

    const genreNames: string[] = [];
    if (tmdbMovie.genres && tmdbMovie.genres.length > 0) {
      tmdbMovie.genres.forEach((g) => genreNames.push(g.name));
    } else if (tmdbMovie.genre_ids && tmdbMovie.genre_ids.length > 0) {
      tmdbMovie.genre_ids.forEach((id) => {
        if (GENRE_MAP[id]) genreNames.push(GENRE_MAP[id]);
      });
    }

    const overviewText = tmdbMovie.overview || "Film hakkında özet bilgi bulunmuyor.";

    const movie = await db.movie.upsert({
      where: { tmdbId: tmdbMovie.id },
      update: {
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
        popularity: tmdbMovie.popularity || 0.0,
        voteAverage: tmdbMovie.vote_average || 0.0,
        metadata: {
          overview: overviewText,
          genres: genreNames,
          runtime: tmdbMovie.runtime || null,
        },
      },
      create: {
        tmdbId: tmdbMovie.id,
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
        popularity: tmdbMovie.popularity || 0.0,
        voteAverage: tmdbMovie.vote_average || 0.0,
        metadata: {
          overview: overviewText,
          genres: genreNames,
          runtime: tmdbMovie.runtime || null,
        },
      },
    });

    const metaObj = (movie.metadata as Record<string, unknown>) || {};

    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      releaseYear: movie.releaseYear,
      popularity: movie.popularity,
      voteAverage: movie.voteAverage,
      overview: (metaObj.overview as string) || overviewText,
      genres: (metaObj.genres as string[]) || genreNames,
      runtime: (metaObj.runtime as number | null) || null,
    };
  }

  /**
   * Synchronizes candidate pool and returns synced DB movies.
   */
  public async seedAndFetchMovies(): Promise<CachedMovieData[]> {
    const tmdbList = await this.getPopularMovies(1);
    const syncedMovies: CachedMovieData[] = [];

    for (const m of tmdbList) {
      const synced = await this.syncMovieToDatabase(m);
      syncedMovies.push(synced);
    }

    return syncedMovies;
  }
}

export const tmdbClient = new TMDBClient();
