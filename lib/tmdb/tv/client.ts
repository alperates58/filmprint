import { db } from "@/lib/db/client";
import { getTMDBApiKey } from "@/lib/config/service";
import {
  TMDBTvShow,
  CachedTvShowData,
  TMDBTvDetails,
  TV_GENRE_MAP,
} from "./types";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

// Rich iconic TV shows dataset across genres & eras for guaranteed fallback/dev calibration
export const FALLBACK_TV_SHOWS: TMDBTvShow[] = [
  {
    id: 1396,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    first_air_date: "2008-01-20",
    last_air_date: "2013-09-29",
    status: "Ended",
    popularity: 180.5,
    vote_average: 8.9,
    vote_count: 14000,
    overview: "Ölümcül akciğer kanseri teşhisi konan bir lise kimya öğretmeni, ailesinin mali geleceğini güvence altına almak için eski bir öğrencisiyle metamfetamin üretip satmaya başlar.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18, 80],
    number_of_seasons: 5,
    number_of_episodes: 62,
    episode_run_time: [47],
  },
  {
    id: 1399,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
    first_air_date: "2011-04-17",
    last_air_date: "2019-05-19",
    status: "Ended",
    popularity: 210.0,
    vote_average: 8.4,
    vote_count: 23000,
    overview: "Westeros'un yedi krallığında soylu hanedanlar Demir Taht'ı ele geçirmek için ölümcül entrikalar ve savaşlar yürütürken, kuzeyden antik bir tehdit yaklaşmaktadır.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [10765, 18, 10759],
    number_of_seasons: 8,
    number_of_episodes: 73,
    episode_run_time: [60],
  },
  {
    id: 87108,
    name: "Chernobyl",
    original_name: "Chernobyl",
    poster_path: "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    backdrop_path: "/uL6Ad12W09L1s2z49w1mO20k.jpg",
    first_air_date: "2019-05-06",
    last_air_date: "2019-06-03",
    status: "Ended",
    popularity: 95.4,
    vote_average: 8.7,
    vote_count: 6000,
    overview: "1986 Nisan ayında Sovyetler Birliği'nde meydana gelen Çernobil nükleer santral patlamasını ve faciayı kontrol altına almak için hayatlarını feda eden insanların gerçek hikayesini anlatan mini dizi.",
    original_language: "en",
    origin_country: ["US", "GB"],
    genre_ids: [18, 36],
    number_of_seasons: 1,
    number_of_episodes: 5,
    episode_run_time: [65],
  },
  {
    id: 1398,
    name: "The Sopranos",
    original_name: "The Sopranos",
    poster_path: "/6nO0L4kE0d5o1g1u1v.jpg",
    backdrop_path: "/s8j80.jpg",
    first_air_date: "1999-01-10",
    last_air_date: "2007-06-10",
    status: "Ended",
    popularity: 115.2,
    vote_average: 8.6,
    vote_count: 2800,
    overview: "New Jersey mafya lideri Tony Soprano'nun aile hayatı, suç imparatorluğu ve psikiyatrist seansları arasındaki dengeleri kurma mücadelesi.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18, 80],
    number_of_seasons: 6,
    number_of_episodes: 86,
    episode_run_time: [55],
  },
  {
    id: 76479,
    name: "Succession",
    original_name: "Succession",
    poster_path: "/7r0eE.jpg",
    backdrop_path: "/s9.jpg",
    first_air_date: "2018-06-03",
    last_air_date: "2023-05-28",
    status: "Ended",
    popularity: 130.8,
    vote_average: 8.5,
    vote_count: 1800,
    overview: "Dünyanın en büyük medya ve eğlence imparatorluklarından birini yöneten Roy ailesinin yaşlanan patriği Logan Roy'un ardından kontrolü ele geçirme savaşı.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18],
    number_of_seasons: 4,
    number_of_episodes: 39,
    episode_run_time: [60],
  },
  {
    id: 66732,
    name: "Stranger Things",
    original_name: "Stranger Things",
    poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    first_air_date: "2016-07-15",
    status: "Returning Series",
    popularity: 195.0,
    vote_average: 8.6,
    vote_count: 17000,
    overview: "1980'lerde Indiana'nın küçük bir kasabasında genç bir çocuğun kaybolmasıyla başlayan olaylar; gizli deneyler, doğaüstü güçler ve gizemli bir küçük kızın ortaya çıkışıyla derinleşir.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [10765, 18, 9648],
    number_of_seasons: 4,
    number_of_episodes: 34,
    episode_run_time: [50],
  },
  {
    id: 70523,
    name: "Dark",
    original_name: "Dark",
    poster_path: "/apbrkMD9w25jF33z89Q.jpg",
    backdrop_path: "/3lBD.jpg",
    first_air_date: "2017-12-01",
    last_air_date: "2020-06-27",
    status: "Ended",
    popularity: 125.0,
    vote_average: 8.5,
    vote_count: 6500,
    overview: "Almanya'nın Winden kasabasında iki çocuğun kaybolması, dört ailenin karmaşık ilişkilerini ve üç nesli kapsayan bir zaman yolculuğu gizemini açığa çıkarır.",
    original_language: "de",
    origin_country: ["DE"],
    genre_ids: [10765, 18, 9648],
    number_of_seasons: 3,
    number_of_episodes: 26,
    episode_run_time: [60],
  },
  {
    id: 1438,
    name: "The Wire",
    original_name: "The Wire",
    poster_path: "/4lbcl.jpg",
    backdrop_path: "/wire.jpg",
    first_air_date: "2002-06-02",
    last_air_date: "2008-03-09",
    status: "Ended",
    popularity: 90.0,
    vote_average: 8.6,
    vote_count: 2500,
    overview: "Baltimore kentindeki uyuşturucu ticareti, polis teşkilatı, liman işçileri, belediye yönetimi ve okul sisteminin iç içe geçmiş sosyolojik ve gerçekçi portresi.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [80, 18],
    number_of_seasons: 5,
    number_of_episodes: 60,
    episode_run_time: [58],
  },
  {
    id: 60059,
    name: "Better Call Saul",
    original_name: "Better Call Saul",
    poster_path: "/fC2rG.jpg",
    backdrop_path: "/bcs.jpg",
    first_air_date: "2015-02-08",
    last_air_date: "2022-08-15",
    status: "Ended",
    popularity: 140.0,
    vote_average: 8.7,
    vote_count: 5200,
    overview: "Eski dolandırıcı Jimmy McGill'in ahlaki sınırları aşarak suç dünyasının meşhur avukatı Saul Goodman'a dönüşme sürecini anlatan Breaking Bad spin-off'u.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18, 80],
    number_of_seasons: 6,
    number_of_episodes: 63,
    episode_run_time: [50],
  },
  {
    id: 60625,
    name: "Rick and Morty",
    original_name: "Rick and Morty",
    poster_path: "/cvhNj.jpg",
    backdrop_path: "/rm.jpg",
    first_air_date: "2013-12-02",
    status: "Returning Series",
    popularity: 160.0,
    vote_average: 8.7,
    vote_count: 9500,
    overview: "Sosyopat dahi bilim insanı Rick Sanchez ve saf torunu Morty Smith'in boyutlar ve uzaylar arası tehlikeli, komik ve çılgın maceraları.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [16, 35, 10765, 10759],
    number_of_seasons: 7,
    number_of_episodes: 71,
    episode_run_time: [22],
  },
  {
    id: 94605,
    name: "Arcane",
    original_name: "Arcane",
    poster_path: "/fqldf.jpg",
    backdrop_path: "/arcane.jpg",
    first_air_date: "2021-11-06",
    status: "Ended",
    popularity: 155.0,
    vote_average: 8.7,
    vote_count: 4200,
    overview: "Ütopik Piltover şehri ile baskı altındaki Zaun yeraltı dünyası arasındaki derin gerilimde, büyülü teknolojiler ve iki kız kardeşin karşı saflarda savaşı.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [16, 10765, 10759, 18],
    number_of_seasons: 2,
    number_of_episodes: 18,
    episode_run_time: [40],
  },
  {
    id: 93405,
    name: "Squid Game",
    original_name: "오징어 게임",
    poster_path: "/dDlEc.jpg",
    backdrop_path: "/sg.jpg",
    first_air_date: "2021-09-17",
    status: "Returning Series",
    popularity: 175.0,
    vote_average: 7.8,
    vote_count: 14000,
    overview: "Ağır borç batağındaki 456 çaresiz insanın 45.6 milyar wonluk büyük ödülü kazanmak için ölümcül çocuk oyunlarında hayatta kalma mücadelesi.",
    original_language: "ko",
    origin_country: ["KR"],
    genre_ids: [10759, 9648, 18],
    number_of_seasons: 2,
    number_of_episodes: 15,
    episode_run_time: [55],
  },
  {
    id: 4614,
    name: "The Office",
    original_name: "The Office",
    poster_path: "/qW4t.jpg",
    backdrop_path: "/office.jpg",
    first_air_date: "2005-03-24",
    last_air_date: "2013-05-16",
    status: "Ended",
    popularity: 150.0,
    vote_average: 8.6,
    vote_count: 4000,
    overview: "Dunder Mifflin kağıt şirketinin Scranton şubesinde çalışan renkli karakterlerin ve beceriksiz müdürleri Michael Scott'ın ofis komedisi.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [35],
    number_of_seasons: 9,
    number_of_episodes: 201,
    episode_run_time: [22],
  },
  {
    id: 1104,
    name: "Mad Men",
    original_name: "Mad Men",
    poster_path: "/mad.jpg",
    backdrop_path: "/madbg.jpg",
    first_air_date: "2007-07-19",
    last_air_date: "2015-05-17",
    status: "Ended",
    popularity: 80.0,
    vote_average: 8.1,
    vote_count: 1200,
    overview: "1960'ların New York Madison Avenue reklam dünyasında karizmatik ve gizemli yaratıcı yönetmen Don Draper'ın yükselişi ve dönemin toplumsal değişimi.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18],
    number_of_seasons: 7,
    number_of_episodes: 92,
    episode_run_time: [47],
  },
  {
    id: 85271,
    name: "WandaVision",
    original_name: "WandaVision",
    poster_path: "/wv.jpg",
    backdrop_path: "/wvbg.jpg",
    first_air_date: "2021-01-15",
    last_air_date: "2021-03-05",
    status: "Ended",
    popularity: 98.0,
    vote_average: 8.2,
    vote_count: 11500,
    overview: "Wanda Maximoff ve Vision'ın banliyöde ideal hayatlar yaşamaya çalışırken çevrelerindeki gerçekliğin göründüğü gibi olmadığını fark etmeleri.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [10765, 9648, 18],
    number_of_seasons: 1,
    number_of_episodes: 9,
    episode_run_time: [35],
  },
  {
    id: 100088,
    name: "The Last of Us",
    original_name: "The Last of Us",
    poster_path: "/tlou.jpg",
    backdrop_path: "/tloubg.jpg",
    first_air_date: "2023-01-15",
    status: "Returning Series",
    popularity: 185.0,
    vote_average: 8.6,
    vote_count: 5300,
    overview: "Modern uygarlığın yok oluşundan 20 yıl sonra, sertleşmiş bir hayatta kalan olan Joel'in insanlığın son umudu olabilecek 14 yaşındaki Ellie'yi kaçırma görevi.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18, 10759, 10765],
    number_of_seasons: 1,
    number_of_episodes: 9,
    episode_run_time: [60],
  },
  {
    id: 63333,
    name: "The Crown",
    original_name: "The Crown",
    poster_path: "/crown.jpg",
    backdrop_path: "/crownbg.jpg",
    first_air_date: "2016-11-04",
    last_air_date: "2023-12-14",
    status: "Ended",
    popularity: 105.0,
    vote_average: 8.2,
    vote_count: 1900,
    overview: "Kraliçe II. Elizabeth'in tahta çıkışından itibaren İngiliz monarşisinin perde arkasındaki siyasi rekabetleri, aşkları ve 20. yüzyıla damga vuran olayları.",
    original_language: "en",
    origin_country: ["GB", "US"],
    genre_ids: [18, 36],
    number_of_seasons: 6,
    number_of_episodes: 60,
    episode_run_time: [58],
  },
  {
    id: 84958,
    name: "Loki",
    original_name: "Loki",
    poster_path: "/loki.jpg",
    backdrop_path: "/lokibg.jpg",
    first_air_date: "2021-06-09",
    last_air_date: "2023-11-09",
    status: "Ended",
    popularity: 145.0,
    vote_average: 8.1,
    vote_count: 11000,
    overview: "Fesatlık Tanrısı Loki'nin Tesseract'ı çaldıktan sonra Zaman Değişimi Otoritesi (TVA) tarafından yakalanıp zaman çizelgesini düzeltmeye zorlanması.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [18, 10765, 10759],
    number_of_seasons: 2,
    number_of_episodes: 12,
    episode_run_time: [50],
  },
  {
    id: 97546,
    name: "Ted Lasso",
    original_name: "Ted Lasso",
    poster_path: "/ted.jpg",
    backdrop_path: "/tedbg.jpg",
    first_air_date: "2020-08-14",
    last_air_date: "2023-05-31",
    status: "Ended",
    popularity: 110.0,
    vote_average: 8.5,
    vote_count: 1600,
    overview: "Amerikan futbolu antrenörü Ted Lasso'nun hiçbir tecrübesi olmadığı halde bir İngiliz Premier League futbol takımını yönetmek için işe alınmasıyla başlayan sıcak ve komik hikaye.",
    original_language: "en",
    origin_country: ["US", "GB"],
    genre_ids: [35, 18],
    number_of_seasons: 3,
    number_of_episodes: 34,
    episode_run_time: [45],
  },
  {
    id: 119051,
    name: "Wednesday",
    original_name: "Wednesday",
    poster_path: "/wed.jpg",
    backdrop_path: "/wedbg.jpg",
    first_air_date: "2022-11-23",
    status: "Returning Series",
    popularity: 170.0,
    vote_average: 8.4,
    vote_count: 8500,
    overview: "Wednesday Addams'ın Nevermore Akademisi'ndeki öğrencilik yıllarında yeni keşfettiği psişik yeteneklerinde ustalaşırken kasabayı dehşete düşüren cinayetleri çözmesi.",
    original_language: "en",
    origin_country: ["US"],
    genre_ids: [10765, 9648, 35],
    number_of_seasons: 1,
    number_of_episodes: 8,
    episode_run_time: [50],
  },
];

/**
 * Server-side TMDB TV Client.
 * Fully isolated from the Movie client.
 */
export class TMDBTvClient {
  private async resolveApiKey(): Promise<string> {
    try {
      const dbKey = await getTMDBApiKey();
      if (dbKey) return dbKey;
    } catch (e) {
      console.error("[TMDB TV Client] Error resolving API key from config service:", e);
    }
    return process.env.TMDB_API_KEY || "";
  }

  /**
   * Fetches full details, credits (cast & creators), and trailers for a TV show.
   */
  public async getTvDetails(tmdbId: number): Promise<TMDBTvDetails> {
    const apiKey = await this.resolveApiKey();

    if (!apiKey) {
      return {
        numberOfSeasons: null,
        numberOfEpisodes: null,
        episodeRunTime: null,
        creators: [],
        cast: [],
        trailer: null,
      };
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR&append_to_response=credits,videos`,
        { next: { revalidate: 86400 } }
      );

      if (!response.ok) {
        return {
          numberOfSeasons: null,
          numberOfEpisodes: null,
          episodeRunTime: null,
          creators: [],
          cast: [],
          trailer: null,
        };
      }

      const data = await response.json();
      const numberOfSeasons = data.number_of_seasons || null;
      const numberOfEpisodes = data.number_of_episodes || null;
      const episodeRunTime =
        Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0
          ? data.episode_run_time[0]
          : null;

      // Extract creators
      const creators: string[] = [];
      if (data.created_by && Array.isArray(data.created_by)) {
        data.created_by.forEach((c: any) => {
          if (c.name) creators.push(c.name);
        });
      }

      // Extract top 8 cast members
      const cast: { name: string; character: string; profilePath: string | null }[] = [];
      if (data.credits?.cast && Array.isArray(data.credits.cast)) {
        data.credits.cast.slice(0, 8).forEach((actor: any) => {
          cast.push({
            name: actor.name,
            character: actor.character || "",
            profilePath: actor.profile_path || null,
          });
        });
      }

      // Extract trailer
      let trailer: { provider: "youtube"; key: string } | null = null;
      if (data.videos?.results && Array.isArray(data.videos.results)) {
        const videos = data.videos.results;

        let targetVideo = videos.find(
          (v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official === true
        );

        if (!targetVideo) {
          targetVideo = videos.find(
            (v: any) => v.site === "YouTube" && v.type === "Trailer"
          );
        }

        if (!targetVideo) {
          targetVideo = videos.find(
            (v: any) => v.site === "YouTube" && v.type === "Teaser"
          );
        }

        if (!targetVideo) {
          targetVideo = videos.find((v: any) => v.site === "YouTube" && v.key);
        }

        if (targetVideo && targetVideo.key) {
          trailer = {
            provider: "youtube",
            key: targetVideo.key,
          };
        }
      }

      return {
        numberOfSeasons,
        numberOfEpisodes,
        episodeRunTime,
        creators,
        cast,
        trailer,
      };
    } catch (e) {
      console.error("[TMDB TV Client] Error fetching TV details:", e);
      return {
        numberOfSeasons: null,
        numberOfEpisodes: null,
        episodeRunTime: null,
        creators: [],
        cast: [],
        trailer: null,
      };
    }
  }

  /**
   * Fetches popular TV shows from TMDB API server-side with explicit include_adult=false.
   */
  public async getPopularTv(page: number = 1): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_TV_SHOWS;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/popular?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) {
        throw new Error(`TMDB TV API response failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error fetching popular TV shows:", error);
      return FALLBACK_TV_SHOWS;
    }
  }

  /**
   * Fetches top rated TV shows across all eras from TMDB API server-side with explicit include_adult=false.
   */
  public async getTopRatedTv(page: number = 1): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_TV_SHOWS;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/top_rated?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) return FALLBACK_TV_SHOWS;

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error fetching top rated TV shows:", error);
      return FALLBACK_TV_SHOWS;
    }
  }

  /**
   * Discovers TV shows using flexible query filters with explicit include_adult=false.
   */
  public async discoverTv(
    params: Record<string, string | number | boolean> = {}
  ): Promise<TMDBTvShow[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_TV_SHOWS;
    }

    try {
      const queryParams = new URLSearchParams({
        api_key: apiKey,
        language: "tr-TR",
        include_adult: "false",
        ...Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ),
      });

      const response = await fetch(
        `${TMDB_API_BASE}/discover/tv?${queryParams.toString()}`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) return FALLBACK_TV_SHOWS;

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB TV Server Client] Error discovering TV shows:", error);
      return FALLBACK_TV_SHOWS;
    }
  }

  /**
   * Upserts TMDB TV show metadata into local PostgreSQL `TvShow` table.
   */
  public async syncTvShowToDatabase(tmdbShow: TMDBTvShow): Promise<CachedTvShowData> {
    const genreNames: string[] = [];
    if (tmdbShow.genres && tmdbShow.genres.length > 0) {
      tmdbShow.genres.forEach((g) => genreNames.push(g.name));
    } else if (tmdbShow.genre_ids && tmdbShow.genre_ids.length > 0) {
      tmdbShow.genre_ids.forEach((id) => {
        if (TV_GENRE_MAP[id]) genreNames.push(TV_GENRE_MAP[id]);
      });
    }

    const overviewText = tmdbShow.overview || "Dizi hakkında özet bilgi bulunmuyor.";

    const show = await db.tvShow.upsert({
      where: { tmdbId: tmdbShow.id },
      update: {
        name: tmdbShow.name,
        originalName: tmdbShow.original_name || null,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        lastAirDate: tmdbShow.last_air_date || null,
        status: tmdbShow.status || null,
        originalLanguage: tmdbShow.original_language || null,
        popularity: tmdbShow.popularity || 0.0,
        voteAverage: tmdbShow.vote_average || 0.0,
        voteCount: tmdbShow.vote_count || null,
        overview: overviewText,
        metadata: {
          overview: overviewText,
          genres: genreNames,
          numberOfSeasons: tmdbShow.number_of_seasons || null,
          numberOfEpisodes: tmdbShow.number_of_episodes || null,
          episodeRunTime: tmdbShow.episode_run_time || null,
          originCountry: tmdbShow.origin_country || [],
          createdBy: tmdbShow.created_by || [],
          adult: tmdbShow.adult === true,
        },
      },
      create: {
        tmdbId: tmdbShow.id,
        name: tmdbShow.name,
        originalName: tmdbShow.original_name || null,
        posterPath: tmdbShow.poster_path,
        backdropPath: tmdbShow.backdrop_path,
        firstAirDate: tmdbShow.first_air_date || null,
        lastAirDate: tmdbShow.last_air_date || null,
        status: tmdbShow.status || null,
        originalLanguage: tmdbShow.original_language || null,
        popularity: tmdbShow.popularity || 0.0,
        voteAverage: tmdbShow.vote_average || 0.0,
        voteCount: tmdbShow.vote_count || null,
        overview: overviewText,
        metadata: {
          overview: overviewText,
          genres: genreNames,
          numberOfSeasons: tmdbShow.number_of_seasons || null,
          numberOfEpisodes: tmdbShow.number_of_episodes || null,
          episodeRunTime: tmdbShow.episode_run_time || null,
          originCountry: tmdbShow.origin_country || [],
          createdBy: tmdbShow.created_by || [],
          adult: tmdbShow.adult === true,
        },
      },
    });

    const metaObj = (show.metadata as Record<string, unknown>) || {};

    return {
      id: show.id,
      tmdbId: show.tmdbId,
      name: show.name,
      originalName: show.originalName,
      posterPath: show.posterPath,
      backdropPath: show.backdropPath,
      firstAirDate: show.firstAirDate,
      lastAirDate: show.lastAirDate,
      status: show.status,
      originalLanguage: show.originalLanguage,
      popularity: show.popularity,
      voteAverage: show.voteAverage,
      voteCount: show.voteCount,
      overview: show.overview,
      genres: (metaObj.genres as string[]) || genreNames,
      numberOfSeasons: (metaObj.numberOfSeasons as number | null) || null,
      numberOfEpisodes: (metaObj.numberOfEpisodes as number | null) || null,
      metadata: metaObj,
    };
  }

  /**
   * Cache-First TV Show Resolution.
   * 1. Query local PostgreSQL `TvShow` table first.
   * 2. If exists, return cached data immediately (zero TMDB network calls).
   * 3. If missing, fetch from TMDB, normalize, upsert into `TvShow`, and return.
   */
  public async getOrFetchTvShow(tmdbId: number): Promise<CachedTvShowData | null> {
    // 1. Local Cache Lookup First
    const cached = await db.tvShow.findUnique({
      where: { tmdbId },
    });

    if (cached) {
      const metaObj = (cached.metadata as Record<string, unknown>) || {};
      return {
        id: cached.id,
        tmdbId: cached.tmdbId,
        name: cached.name,
        originalName: cached.originalName,
        posterPath: cached.posterPath,
        backdropPath: cached.backdropPath,
        firstAirDate: cached.firstAirDate,
        lastAirDate: cached.lastAirDate,
        status: cached.status,
        originalLanguage: cached.originalLanguage,
        popularity: cached.popularity,
        voteAverage: cached.voteAverage,
        voteCount: cached.voteCount,
        overview: cached.overview,
        genres: (metaObj.genres as string[]) || [],
        numberOfSeasons: (metaObj.numberOfSeasons as number | null) || null,
        numberOfEpisodes: (metaObj.numberOfEpisodes as number | null) || null,
        metadata: metaObj,
      };
    }

    // 2. Fetch from TMDB if not in local cache
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      // Fallback check
      const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
      if (fallback) {
        return this.syncTvShowToDatabase(fallback);
      }
      return null;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR`,
        { next: { revalidate: 86400 } }
      );

      if (!response.ok) {
        const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
        if (fallback) return this.syncTvShowToDatabase(fallback);
        return null;
      }

      const data: TMDBTvShow = await response.json();
      return this.syncTvShowToDatabase(data);
    } catch (e) {
      console.error(`[TMDB TV Client] Error fetching show ${tmdbId}:`, e);
      const fallback = FALLBACK_TV_SHOWS.find((f) => f.id === tmdbId);
      if (fallback) return this.syncTvShowToDatabase(fallback);
      return null;
    }
  }

  /**
   * Synchronizes candidate pool dynamically advancing TMDB page offsets for TV shows.
   */
  public async seedAndFetchTvShows(): Promise<CachedTvShowData[]> {
    const apiKey = await this.resolveApiKey();
    const syncedShows: CachedTvShowData[] = [];
    const processedIds = new Set<number>();

    if (apiKey) {
      const existingCount = await db.tvShow.count();
      const pageOffset = Math.floor(existingCount / 20) + 1;

      const [popA, popB, topA, topB] = await Promise.all([
        this.getPopularTv(pageOffset),
        this.getPopularTv(pageOffset + 1),
        this.getTopRatedTv(pageOffset),
        this.getTopRatedTv(pageOffset + 1),
      ]);

      const combined = [...topA, ...popA, ...topB, ...popB];
      for (const s of combined) {
        if (!processedIds.has(s.id)) {
          processedIds.add(s.id);
          const synced = await this.syncTvShowToDatabase(s);
          syncedShows.push(synced);
        }
      }
    } else {
      for (const s of FALLBACK_TV_SHOWS) {
        if (!processedIds.has(s.id)) {
          processedIds.add(s.id);
          const synced = await this.syncTvShowToDatabase(s);
          syncedShows.push(synced);
        }
      }
    }

    return syncedShows;
  }
}

export const tmdbTvClient = new TMDBTvClient();
