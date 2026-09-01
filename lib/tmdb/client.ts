import { db } from "@/lib/db/client";
import { getTMDBApiKey } from "@/lib/config/service";
import { evaluateContentIngestionSafety } from "@/lib/content/ingestion-safety";
import { normalizeOverviewForPersistence } from "@/lib/content/overview-safety";
import {
  localizeTmdbMovie,
  mergeTmdbMovieLocalization,
  type LocalizedTmdbMovie,
} from "@/lib/tmdb/movie-localization";
import { resolveCanonicalGenreIds } from "@/lib/catalog/genres";
import { pickTmdbCertification, evaluateContentSafety } from "@/lib/content/safety";
import {
  computeCalibrationPriorityScore,
  generateSearchNormalizedTitle,
} from "@/lib/calibration/priority";
import { resolveLocalizedTrailer } from "@/lib/tmdb/trailer";

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
  vote_count?: number;
  adult?: boolean;
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

export interface TMDBMovieDetails {
  runtime: number | null;
  director: string | null;
  cast: { id?: number; name: string; character: string; profilePath: string | null }[];
  trailer: { provider: "youtube"; key: string } | null;
  localization: {
    title: string;
    originalTitle: string;
    overview: string;
    turkishTitle: string;
    englishTitle: string;
    titleSource: "TR" | "EN" | "ORIGINAL" | "NONE";
    overviewSource: "TR" | "EN" | "ORIGINAL" | "NONE";
    adult: boolean;
  } | null;
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

// Rich 60+ iconic movie dataset across all eras & genres for guaranteed fallback/dev calibration
const FALLBACK_MOVIES: TMDBMovie[] = [
  {
    id: 157336,
    title: "Interstellar",
    original_title: "Interstellar",
    poster_path: "/xbiycuc84TrieEWwkkuH2hoEa9S.jpg",
    backdrop_path: "/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg",
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
    poster_path: "/xn0Kcg4e6p0mLxVS3nAWhNmW2Ni.jpg",
    backdrop_path: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
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
    poster_path: "/yjMuqAyJUoQZGWsZ0vZuYj5inAR.jpg",
    backdrop_path: "/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
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
    poster_path: "/AgY33Wtg4737MhYopJSFyKWhKsO.jpg",
    backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
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
    poster_path: "/7IPCEr7ifdH5CtU97QG7XgAAtOp.jpg",
    backdrop_path: "/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg",
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
    poster_path: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
    backdrop_path: "/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg",
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
    poster_path: "/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg",
    backdrop_path: "/66Kn4XWhkuPkJxOJyPEx4U2CUfN.jpg",
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
    poster_path: "/7T2SDS5efuJiK45oyKoEzf9RKjw.jpg",
    backdrop_path: "/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg",
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
    poster_path: "/vseIVRdN4xasYwStQIi6SI7DcEu.jpg",
    backdrop_path: "/tSPT36ZKlP2WVHJLM4cQPLSzv3b.jpg",
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
    poster_path: "/xvOEOMCzfV8qXkd1n1btZ8q4Psd.jpg",
    backdrop_path: "/dyJvKsNs2KP8qQnAXbRwDjblViy.jpg",
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
    poster_path: "/3DeEAwO42j4VmRdI4KSSN1VloM.jpg",
    backdrop_path: "/rlay2M5QYvi6igbGcFjq8jxeusY.jpg",
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
    poster_path: "/hEntfzxB8yUXIxqZY929dELjLsi.jpg",
    backdrop_path: "/xnHVX37XZEp33hhCbYlQFq7ux1J.jpg",
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
    poster_path: "/3qpOnTbxPK2HeHObBHttcvQHLGI.jpg",
    backdrop_path: "/i5H7zusQGsysGQ8i6P361Vnr0n2.jpg",
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
    poster_path: "/s6pfkJuTFZe7BCfJ5vOCECNmQbW.jpg",
    backdrop_path: "/5bzPWQ2dFUl2aZKkp7ILJVVkRed.jpg",
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
    poster_path: "/q3Ev5vIC3fklycV9kfpVIdbRe14.jpg",
    backdrop_path: "/wbQa0EnWUyRzQ5d1pHLNRlmsCUP.jpg",
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
    poster_path: "/mmZi0tyPFfbcCqEsJIPxVldCPOL.jpg",
    backdrop_path: "/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
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
    poster_path: "/ii2MsmBmTL5kQuvBRCtKokUAF8v.jpg",
    backdrop_path: "/8mnXR9rey5uQ08rZAvzojKWbDQS.jpg",
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
    poster_path: "/fT9pEpt2pd0m7ZC0shQo08E77xI.jpg",
    backdrop_path: "/yUiXA68FfQeA8cRBhd0Ao0jIRZt.jpg",
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
    poster_path: "/jkK6XdJqSCm7maDV8xgbE0JVNIP.jpg",
    backdrop_path: "/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg",
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
    poster_path: "/nx7TmJDMkgyBc09DVo5ze52Wt3F.jpg",
    backdrop_path: "/vbC0rzdrb7Ohc2TkbEbxtOABECe.jpg",
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
    poster_path: "/yTk0pkcjIRTbbAfJ12ZVW0Cebk0.jpg",
    backdrop_path: "/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
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
    poster_path: "/xDBZNak6HyOEjKIbrjqDxllWXRn.jpg",
    backdrop_path: "/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg",
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
    poster_path: "/jzCpGwWHUwby14KPJJWla9ybY81.jpg",
    backdrop_path: "/nYs4ZwnJBK4AgljhvzwNz7fpr3E.jpg",
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
    poster_path: "/wjN6Cg2Ow7eP1HotskuDyVQQiKb.jpg",
    backdrop_path: "/2oZklIzUbvZXXzIFzv7Hi68d6xf.jpg",
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
    poster_path: "/7FQTJyrvhUp9oYDhHgujWRlxUES.jpg",
    backdrop_path: "/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg",
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
    poster_path: "/wiSuje8hdVuwM0pvhtSFirCHmJF.jpg",
    backdrop_path: "/z3br1ub7spqGMkxgjgJSdM4DC21.jpg",
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
    poster_path: "/wN2xWp1eIwCKOD0BHTcErTBv1Uq.jpg",
    backdrop_path: "/jhk6D8pim3yaByu1801kMoxXFaX.jpg",
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
    poster_path: "/vt5Fd1wouNEL7HN3TQ0PMls4auE.jpg",
    backdrop_path: "/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg",
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
    poster_path: "/roeYIqWHyVHcjWDk6SOaepNEk0y.jpg",
    backdrop_path: "/h3HsfV8Kn9Sz2QWUYYdP5ya23hx.jpg",
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
    poster_path: "/37kdeAEyw8YlVLaAhYazBRAni9S.jpg",
    backdrop_path: "/mWDdRXTivGE7aaY2vo1Ie0PfCX5.jpg",
    release_date: "2001-12-18",
    popularity: 130.5,
    vote_average: 8.4,
    overview: "Tek Yüzük'ü Hüküm Dağı'na götürüp yok etmek için kurulan Yüzük Kardeşliği'nin Orta Dünya'daki efsanevi yolculuğu.",
    genre_ids: [12, 14, 28],
    runtime: 178,
  },
  {
    id: 429,
    title: "The Good, the Bad and the Ugly",
    original_title: "Il buono, il brutto, il cattivo",
    poster_path: "/c7xlVD3VVn5skrhvy03NbNx5FhR.jpg",
    backdrop_path: "/x4biAVdPVCghBlsVIzB6NmbghIz.jpg",
    release_date: "1966-12-23",
    popularity: 78.5,
    vote_average: 8.5,
    overview: "İç Savaş sırasındaki kargaşada gizlenmiş konfederasyon altınını arayan üç silahşörün efsanevi western mücadelesi.",
    genre_ids: [37],
    runtime: 161,
  },
  {
    id: 240,
    title: "The Godfather Part II",
    original_title: "The Godfather Part II",
    poster_path: "/3Yaj5y25485A2YeixwayoP8ywZ0.jpg",
    backdrop_path: "/kGzFbGhp99zva6oZODW5atUtnqi.jpg",
    release_date: "1974-12-20",
    popularity: 112.4,
    vote_average: 8.6,
    overview: "Vito Corleone'nin gençlik günleri ile oğlu Michael'ın mafya imparatorluğunu genişletme sürecinin paralel hikayesi.",
    genre_ids: [18, 80],
    runtime: 202,
  },
  {
    id: 769,
    title: "GoodFellas",
    original_title: "GoodFellas",
    poster_path: "/oMPDt1rNLYEVRpigNLaiTnibVn8.jpg",
    backdrop_path: "/gILte6Zd7m1YneIr6MVhh30S9pr.jpg",
    release_date: "1990-09-12",
    popularity: 89.4,
    vote_average: 8.5,
    overview: "Genç yaşta mafyaya katılan Henry Hill'in suç dünyasındaki yükselişi ve düşüşünü anlatan efsanevi biyografi.",
    genre_ids: [18, 80],
    runtime: 145,
  },
  {
    id: 23925,
    title: "Life Is Beautiful",
    original_title: "La vita è bella",
    poster_path: "/sqDg462IA9sJu7W55kWN47XFO7V.jpg",
    backdrop_path: "/es3lWdrAEscc2B85pR51c9k5lQ7.jpg",
    release_date: "1997-12-20",
    popularity: 82.1,
    vote_average: 8.5,
    overview: "Toplama kampına gönderilen Yahudi bir babanın, küçük oğlunu savaşın dehşetinden korumak için uydurduğu masalsı oyun.",
    genre_ids: [35, 18],
    runtime: 116,
  },
  {
    id: 101,
    title: "Leon: The Professional",
    original_title: "Léon",
    poster_path: "/5wc5a1z0POdwMfDVrjbeTEhfygV.jpg",
    backdrop_path: "/fj0hwDJEOOHllRim2BMt5L7tbjf.jpg",
    release_date: "1994-09-14",
    popularity: 84.6,
    vote_average: 8.3,
    overview: "Ailesi katledilen 12 yaşındaki Mathilda'nın profesyonel kiralık katil Léon'a sığınması ve aralarında kurulan sıra dışı bağ.",
    genre_ids: [80, 18, 28],
    runtime: 110,
  },
  {
    id: 424,
    title: "Schindler's List",
    original_title: "Schindler's List",
    poster_path: "/2mOH8EqumIaepdP94e0cy4Xnyg7.jpg",
    backdrop_path: "/zb6fM1CX41D9rF9hdgclu0peUmy.jpg",
    release_date: "1993-12-15",
    popularity: 98.2,
    vote_average: 8.6,
    overview: "İkinci Dünya Savaşı sırasında 1100'den fazla Yahudiyi fabrikasında çalıştırarak kurtaran Oskar Schindler'in gerçek hikayesi.",
    genre_ids: [18, 36],
    runtime: 195,
  },
  {
    id: 274,
    title: "The Silence of the Lambs",
    original_title: "The Silence of the Lambs",
    poster_path: "/4AoIoP6q006blFeb7vV9kKPD4En.jpg",
    backdrop_path: "/aYcnDyLMnpKce1FOYUpZrXtgUye.jpg",
    release_date: "1991-02-01",
    popularity: 87.3,
    vote_average: 8.3,
    overview: "Seri katil 'Buffy Bill'i yakalamak için dahi kaniyal psikiyatrist Dr. Hannibal Lecter ile görüşen genç FBI ajanı Clarice.",
    genre_ids: [80, 18, 53],
    runtime: 118,
  },
];

/**
 * Server-side TMDB Client
 * Resolves API key dynamically from encrypted Admin DB IntegrationSecret or environment.
 */
// Module-scope in-memory cursor for TMDB discovery page rotation (1..10).
// Resetting to 0 upon server restart is intentional, stateless, and acceptable.
let movieSeedPageCursor = 0;

export class TMDBClient {
  private async resolveApiKey(): Promise<string> {
    try {
      const dbKey = await getTMDBApiKey();
      if (dbKey) return dbKey;
    } catch (e) {
      console.error("[TMDB Client] Error resolving API key from config service:", e);
    }
    return process.env.TMDB_API_KEY || "";
  }

  private async localizeMovieIfNeeded(
    turkish: TMDBMovie,
    apiKey: string
  ): Promise<LocalizedTmdbMovie> {
    return localizeTmdbMovie(
      turkish,
      apiKey
        ? async () => {
            const response = await fetch(
              `${TMDB_API_BASE}/movie/${turkish.id}?api_key=${apiKey}&language=en-US`,
              { next: { revalidate: 86400 } }
            );
            return response.ok ? ((await response.json()) as TMDBMovie) : null;
          }
        : undefined
    );
  }

  /**
   * Fetches full details, credits (cast & director), and trailers for a movie.
   */
  public async getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
    const apiKey = await this.resolveApiKey();

    if (!apiKey) {
      return {
        runtime: null,
        director: null,
        cast: [],
        trailer: null,
        localization: null,
      };
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=tr-TR&append_to_response=credits,videos,release_dates,keywords`,
        { next: { revalidate: 86400 } }
      );

      if (!response.ok) {
        return { runtime: null, director: null, cast: [], trailer: null, localization: null };
      }

      const data = (await response.json()) as TMDBMovie & {
        credits?: { crew?: Array<Record<string, any>>; cast?: Array<Record<string, any>> };
        videos?: { results?: Array<Record<string, any>> };
        release_dates?: { results?: Array<Record<string, any>> };
        keywords?: { keywords?: Array<{ id: number; name: string }> };
      };
      let englishDetail: (TMDBMovie & {
        videos?: { results?: Array<Record<string, any>> };
        release_dates?: { results?: Array<Record<string, any>> };
        keywords?: { keywords?: Array<{ id: number; name: string }> };
      }) | null = null;
      const localized = await localizeTmdbMovie(data, async () => {
        const englishResponse = await fetch(
          `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=en-US&append_to_response=videos,release_dates,keywords`,
          { next: { revalidate: 86400 } }
        );
        if (!englishResponse.ok) return null;
        englishDetail = (await englishResponse.json()) as any;
        return englishDetail;
      });
      const runtime = data.runtime || null;

      // Extract director
      let director: string | null = null;
      if (data.credits?.crew) {
        const dirObj = data.credits.crew.find((c: any) => c.job === "Director");
        if (dirObj) director = dirObj.name;
      }

      // Extract top 8 cast members
      const cast: { id?: number; name: string; character: string; profilePath: string | null }[] = [];
      if (data.credits?.cast && Array.isArray(data.credits.cast)) {
        data.credits.cast.slice(0, 8).forEach((actor: any) => {
          cast.push({
            id: actor.id || undefined,
            name: actor.name,
            character: actor.character || "",
            profilePath: actor.profile_path || null,
          });
        });
      }

      const trailerResolution = await resolveLocalizedTrailer(
        data.videos?.results,
        async () => {
          if (!englishDetail) {
            const englishResponse = await fetch(
              `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=en-US&append_to_response=videos`,
              { next: { revalidate: 86400 } }
            );
            if (!englishResponse.ok) return [];
            englishDetail = (await englishResponse.json()) as TMDBMovie & {
              videos?: { results?: Array<Record<string, any>> };
            };
          }
          return englishDetail.videos?.results || [];
        }
      );
      const trailer = trailerResolution.trailer
        ? { provider: "youtube" as const, key: trailerResolution.trailer.key }
        : null;

      return {
        runtime,
        director,
        cast,
        trailer,
        localization: {
          title: localized.movie.title,
          originalTitle: localized.movie.original_title,
          overview: localized.movie.overview || "",
          turkishTitle: localized.turkishTitle,
          englishTitle: localized.englishTitle,
          titleSource: localized.titleSource,
          overviewSource: localized.overviewSource,
          adult: localized.movie.adult === true,
        },
      };
    } catch (e) {
      console.error("[TMDB Client] Error fetching movie details:", e);
      return { runtime: null, director: null, cast: [], trailer: null, localization: null };
    }
  }

  /**
   * Fetches high-relevance recommendations and similar movies for a given TMDB movie ID.
   * Combines /movie/{id}/recommendations and /movie/{id}/similar with adult filtering and deduplication.
   */
  public async getSimilarAndRecommendedMovies(
    tmdbId: number,
    limit: number = 12
  ): Promise<TMDBMovie[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) return [];

    try {
      const [recRes, simRes] = await Promise.allSettled([
        fetch(
          `${TMDB_API_BASE}/movie/${tmdbId}/recommendations?api_key=${apiKey}&language=tr-TR&page=1`,
          { next: { revalidate: 86400 } }
        ),
        fetch(
          `${TMDB_API_BASE}/movie/${tmdbId}/similar?api_key=${apiKey}&language=tr-TR&page=1`,
          { next: { revalidate: 86400 } }
        ),
      ]);

      const candidates: TMDBMovie[] = [];
      const seenIds = new Set<number>([tmdbId]);

      // 1. Process recommendations first (highest quality semantic similarity)
      if (recRes.status === "fulfilled" && recRes.value.ok) {
        const data = await recRes.value.json();
        if (Array.isArray(data.results)) {
          for (const item of data.results) {
            if (
              item.id &&
              !seenIds.has(item.id) &&
              item.poster_path &&
              !item.adult &&
              (item.title || item.original_title)
            ) {
              seenIds.add(item.id);
              candidates.push(item);
            }
          }
        }
      }

      // 2. Supplement with similar endpoint if needed
      if (simRes.status === "fulfilled" && simRes.value.ok) {
        const data = await simRes.value.json();
        if (Array.isArray(data.results)) {
          for (const item of data.results) {
            if (
              item.id &&
              !seenIds.has(item.id) &&
              item.poster_path &&
              !item.adult &&
              (item.title || item.original_title)
            ) {
              seenIds.add(item.id);
              candidates.push(item);
            }
          }
        }
      }

      return candidates.slice(0, limit);
    } catch (error) {
      console.error("[TMDB Client] Error fetching similar/recommended movies:", error);
      return [];
    }
  }

  /**
   * Fetches popular movies from TMDB API server-side with explicit include_adult=false.
   */
  public async getPopularMovies(page: number = 1): Promise<TMDBMovie[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_MOVIES;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/popular?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`,
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
   * Fetches top rated movies across all eras from TMDB API server-side with explicit include_adult=false.
   */
  public async getTopRatedMovies(page: number = 1): Promise<TMDBMovie[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      return FALLBACK_MOVIES;
    }

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/top_rated?api_key=${apiKey}&language=tr-TR&page=${page}&include_adult=false`,
        { next: { revalidate: 3600 } }
      );

      if (!response.ok) return FALLBACK_MOVIES;

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("[TMDB Server Client] Error fetching top rated movies:", error);
      return FALLBACK_MOVIES;
    }
  }

  /**
   * Upserts TMDB movie metadata into local PostgreSQL `Movie` table.
   */
  public async syncMovieToDatabase(
    tmdbMovie: TMDBMovie,
    localization: LocalizedTmdbMovie = mergeTmdbMovieLocalization(tmdbMovie)
  ): Promise<CachedMovieData | null> {
    const safety = evaluateContentIngestionSafety({
      localizedTitle: localization.turkishTitle || tmdbMovie.title,
      englishTitle: localization.englishTitle,
      originalTitle: tmdbMovie.original_title,
      overview: tmdbMovie.overview,
      adult: tmdbMovie.adult,
    });

    // This guard must run before the upsert so rejected content never reaches DB.
    if (!safety.allowed || !safety.displayTitle) return null;

    const displayTitle = safety.displayTitle.title;
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

    const overviewText = normalizeOverviewForPersistence(tmdbMovie.overview);
    const existingMovie = await db.movie.findUnique({
      where: { tmdbId: tmdbMovie.id },
      select: { metadata: true },
    });
    const existingMetadata =
      existingMovie?.metadata &&
      typeof existingMovie.metadata === "object" &&
      !Array.isArray(existingMovie.metadata)
        ? (existingMovie.metadata as Record<string, unknown>)
        : {};
    const localizedMetadata = {
      ...existingMetadata,
      overview: overviewText,
      genres: genreNames,
      runtime: tmdbMovie.runtime || null,
      adult: tmdbMovie.adult === true,
      voteCount: tmdbMovie.vote_count || 0,
      releaseDate: tmdbMovie.release_date || null,
      titleLocalizationSource: localization.titleSource,
      overviewLocalizationSource: localization.overviewSource,
      turkishTitle: localization.turkishTitle,
      englishTitle: localization.englishTitle,
    };

    // Extract canonical genre IDs
    const canonicalGenreIds = resolveCanonicalGenreIds(
      tmdbMovie.genre_ids || tmdbMovie.genres || [],
      "FILM"
    );

    // Extract Certification & Content Safety V2
    const cert = pickTmdbCertification(tmdbMovie, "FILM");
    const safetyV2 = evaluateContentSafety({
      adult: tmdbMovie.adult,
      contentRating: cert.contentRating,
      normalizedMinimumAge: cert.normalizedMinimumAge,
      title: displayTitle,
      originalTitle: tmdbMovie.original_title,
      englishTitle: localization.englishTitle,
      overview: tmdbMovie.overview,
      genres: canonicalGenreIds,
    });

    const voteCount = tmdbMovie.vote_count || 0;
    const voteAverage = tmdbMovie.vote_average || 0.0;
    const popularity = tmdbMovie.popularity || 0.0;

    const calibrationPriorityScore = computeCalibrationPriorityScore({
      popularity,
      voteAverage,
      voteCount,
      releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
      safetyLevel: safetyV2.safetyLevel,
      normalizedMinimumAge: safetyV2.normalizedMinimumAge,
      adult: tmdbMovie.adult,
    });

    const searchNormalizedTitle = generateSearchNormalizedTitle(
      displayTitle,
      tmdbMovie.original_title,
      localization.englishTitle
    );

    const movie = await db.movie.upsert({
      where: { tmdbId: tmdbMovie.id },
      update: {
        title: displayTitle,
        originalTitle: tmdbMovie.original_title,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
        popularity,
        voteAverage,
        voteCount,
        genreIds: canonicalGenreIds,
        adult: tmdbMovie.adult === true || safetyV2.safetyLevel === "ADULT",
        contentRating: safetyV2.contentRating,
        normalizedMinimumAge: safetyV2.normalizedMinimumAge,
        safetyLevel: safetyV2.safetyLevel,
        calibrationPriorityScore,
        searchNormalizedTitle,
        metadata: localizedMetadata,
      },
      create: {
        tmdbId: tmdbMovie.id,
        title: displayTitle,
        originalTitle: tmdbMovie.original_title,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseYear: releaseYear && !isNaN(releaseYear) ? releaseYear : null,
        popularity,
        voteAverage,
        voteCount,
        genreIds: canonicalGenreIds,
        adult: tmdbMovie.adult === true || safetyV2.safetyLevel === "ADULT",
        contentRating: safetyV2.contentRating,
        normalizedMinimumAge: safetyV2.normalizedMinimumAge,
        safetyLevel: safetyV2.safetyLevel,
        calibrationPriorityScore,
        searchNormalizedTitle,
        metadata: localizedMetadata,
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
   * Fetches a movie from local database, or pulls from TMDB and syncs to DB if missing.
   */
  public async getOrFetchMovie(tmdbId: number): Promise<CachedMovieData | null> {
    const local = await db.movie.findUnique({ where: { tmdbId } });
    if (local) {
      const meta = (local.metadata as Record<string, any>) || {};
      return {
        id: local.id,
        tmdbId: local.tmdbId,
        title: local.title,
        originalTitle: local.originalTitle,
        posterPath: local.posterPath,
        backdropPath: local.backdropPath,
        releaseYear: local.releaseYear,
        popularity: local.popularity,
        voteAverage: local.voteAverage,
        overview: (meta.overview as string) || "",
        genres: (meta.genres as string[]) || [],
        runtime: (meta.runtime as number | null) || null,
      };
    }

    const apiKey = await this.resolveApiKey();
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=tr-TR`,
        { next: { revalidate: 86400 } }
      );
      if (!response.ok) return null;
      const raw = (await response.json()) as TMDBMovie;
      const localized = await this.localizeMovieIfNeeded(raw, apiKey);
      return await this.syncMovieToDatabase(localized.movie, localized);
    } catch (e) {
      console.error("[TMDB Client] Error in getOrFetchMovie:", e);
      return null;
    }
  }

  /**
   * Discovers movies using TMDB discover endpoint with custom filter criteria.
   */
  public async discoverMovies(params: Record<string, string | number>): Promise<TMDBMovie[]> {
    const apiKey = await this.resolveApiKey();
    if (!apiKey) return [];

    try {
      const query = new URLSearchParams({
        api_key: apiKey,
        language: "tr-TR",
        include_adult: "false",
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      });

      const response = await fetch(`${TMDB_API_BASE}/discover/movie?${query.toString()}`, {
        next: { revalidate: 3600 },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error("[TMDB Client] Error discovering movies:", e);
      return [];
    }
  }

  /**
   * Synchronizes candidate pool dynamically using multi-stream discovery and page rotation.
   * Ensures candidate pool never runs dry even when users evaluate hundreds of movies.
   * Multi-stream covers popular, top-rated, drama, crime, scifi, action, thriller, comedy, and animation.
   */
  public async seedAndFetchMovies(): Promise<CachedMovieData[]> {
    const apiKey = await this.resolveApiKey();
    const syncedMovies: CachedMovieData[] = [];
    const processedIds = new Set<number>();

    // 1. Sync fallback movies for resilience
    for (const m of FALLBACK_MOVIES) {
      if (!processedIds.has(m.id)) {
        processedIds.add(m.id);
        const localized = await this.localizeMovieIfNeeded(m, apiKey);
        const synced = await this.syncMovieToDatabase(localized.movie, localized);
        if (synced) syncedMovies.push(synced);
      }
    }

    if (apiKey) {
      try {
        // Dynamic page rotation: in-memory cursor cycles across pages 1..10 to constantly bring varied quality titles without full-table COUNT(*)
        const basePage = (movieSeedPageCursor++ % 10) + 1;
        const nextPage = (basePage % 10) + 1;

        const [popA, popB, topA, topB, drama, crime, scifi, action, thriller, comedy, animation] =
          await Promise.all([
            this.getPopularMovies(basePage),
            this.getPopularMovies(nextPage),
            this.getTopRatedMovies(basePage),
            this.getTopRatedMovies(nextPage),
            this.discoverMovies({ with_genres: "18", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
            this.discoverMovies({ with_genres: "80", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
            this.discoverMovies({ with_genres: "878", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
            this.discoverMovies({ with_genres: "28", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
            this.discoverMovies({ with_genres: "53", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
            this.discoverMovies({ with_genres: "35", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
            this.discoverMovies({ with_genres: "16", sort_by: "popularity.desc", "vote_count.gte": 40, page: basePage }),
          ]);

        const combined = [
          ...topA,
          ...popA,
          ...topB,
          ...popB,
          ...drama,
          ...crime,
          ...scifi,
          ...action,
          ...thriller,
          ...comedy,
          ...animation,
        ];

        for (const m of combined) {
          if (!processedIds.has(m.id)) {
            processedIds.add(m.id);
            const localized = await this.localizeMovieIfNeeded(m, apiKey);
            const synced = await this.syncMovieToDatabase(localized.movie, localized);
            if (synced) syncedMovies.push(synced);
          }
        }
      } catch (err) {
        console.error("[TMDB Client] Error during multi-stream movie replenishment:", err);
      }
    }

    return syncedMovies;
  }
}

export const tmdbClient = new TMDBClient();
