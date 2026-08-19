import { NormalizedAiQuery, AiRecommendedTitle } from "./types";

export const FALLBACK_NORMALIZE: NormalizedAiQuery = {
  request_summary_tr: "",
  intent: "discover",
  reference_title: "",
  recommended_titles: [],
  type: "any",
  genres: [],
  mood: "",
  year_min: null,
  year_max: null,
  language: "any",
  country: "",
  keywords: [],
  semantic_topics: [],
  must_have: [],
  nice_to_have: [],
  exclude: [],
  actors: [],
  directors: [],
  min_vote_average: null,
  min_vote_count: null,
  runtime_min: null,
  runtime_max: null,
  min_seasons: null,
  max_seasons: null,
  episode_count_min: null,
  episode_count_max: null,
  watch_provider: "",
  safety_level: "none",
  quality_profile: "mainstream",
  sort_by: "relevance",
  trailer_required: false,
};

export const MOVIE_GENRES: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  "science fiction": 878, "sci-fi": 878, thriller: 53, war: 10752, western: 37,
};

export const TV_GENRES: Record<string, number> = {
  action: 10759, adventure: 10759, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, kids: 10762, mystery: 9648,
  news: 10763, reality: 10764, "science fiction": 10765, "sci-fi": 10765,
  fantasy: 10765, soap: 10766, talk: 10767, war: 10768, politics: 10768, western: 37,
  thriller: 9648, horror: 9648, romance: 18,
};

export const TMDB_GENRE_NAMES: Record<number, string> = {
  28: "Aksiyon", 12: "Macera", 16: "Animasyon", 35: "Komedi", 80: "Suç",
  99: "Belgesel", 18: "Dram", 10751: "Aile", 14: "Fantastik", 36: "Tarih",
  27: "Korku", 10402: "Müzik", 9648: "Gizem", 10749: "Romantik",
  878: "Bilim Kurgu", 53: "Gerilim", 10752: "Savaş", 37: "Vahşi Batı",
  10759: "Aksiyon/Macera", 10762: "Çocuk", 10763: "Haber", 10764: "Reality",
  10765: "Bilim Kurgu", 10766: "Pembe Dizi", 10767: "Talk Show", 10768: "Politika",
};

export const KEYWORD_ALIASES: Record<string, string> = {
  "ai": "artificial intelligence", "thought-provoking": "philosophy", "philosophical": "philosophy",
  "complex": "mind bending", "single location": "single location", "single setting": "contained thriller",
  "class conflict": "social commentary", "ambition": "obsession", "suspense": "suspense",
  "yapay zeka": "artificial intelligence", "robot": "robot", "android": "android",
  "zaman yolculugu": "time travel", "zamanda yolculuk": "time travel", "zaman dongusu": "time loop",
  "paralel evren": "parallel universe", "coklu evren": "multiverse", "alternatif zaman": "alternate timeline",
  "uzay": "space", "uzay yolculugu": "space travel", "astronot": "astronaut", "mars": "mars", "uzayli": "alien",
  "distopya": "dystopia", "kiyamet": "apocalypse", "kiyamet sonrasi": "post-apocalyptic", "hayatta kalma": "survival",
  "seri katil": "serial killer", "dedektif": "detective", "mafya": "mafia", "uyusturucu": "drug cartel",
  "siberpunk": "cyberpunk", "vampir": "vampire", "zombi": "zombie", "buyu": "magic", "cadi": "witch",
  "dogaustu": "supernatural", "kafa yakan": "mind bending", "psikolojik": "psychological thriller",
  "hapishane": "prison", "soygun": "heist", "casus": "spy", "politik": "politics",
  "aile": "family", "cocuk": "children", "romantik": "romance", "komik": "comedy", "eglenceli": "fun",
  "dovus": "martial arts", "dovus sanatlari": "martial arts", "samuray": "samurai", "ninja": "ninja",
  "biyografi": "biography", "gercek hikaye": "based on a true story", "tarihi": "history", "orta cag": "middle ages",
  "anime": "anime", "spor": "sports", "futbol": "football", "basketbol": "basketball", "yaris": "racing",
  "gerilim": "thriller", "korku": "horror", "gizem": "mystery", "aksiyon": "action",
  "ask": "romance", "duygusal": "emotional", "dram": "drama", "suc": "crime"
};

export function toSearchText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return "";
  return toSearchText(title).trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ");
}

export function addUniqueStrings(target: string[] = [], values: string[] = []): string[] {
  const existing = new Set((target || []).map((v) => String(v).toLowerCase()));
  const merged = [...(target || [])];
  for (const value of values || []) {
    if (!value) continue;
    const lower = String(value).toLowerCase();
    if (!existing.has(lower)) {
      existing.add(lower);
      merged.push(value);
    }
  }
  return merged;
}

export const MIND_BENDING_MOVIE_FALLBACK: AiRecommendedTitle[] = [
  { title: "Inception", year: 2010, type: "movie", relevance_score: 99, reason: "İç içe geçen rüya katmanları ve sürekli değişen gerçeklik algısıyla zihinsel bir bulmaca kuruyor.", match_tags: ["dream layers", "unreliable reality", "nonlinear"] },
  { title: "Memento", year: 2000, type: "movie", relevance_score: 98, reason: "Tersine ilerleyen anlatısı ve güvenilmez hafıza ekseniyle seyirciyi parçaları kendisi birleştirmeye zorluyor.", match_tags: ["reverse chronology", "memory", "unreliable narrator"] },
  { title: "Coherence", year: 2013, type: "movie", relevance_score: 97, reason: "Sıradan bir akşamı paralel gerçekliklerin iç içe geçtiği düşük bütçeli ama güçlü bir zihin oyununa dönüştürüyor.", match_tags: ["parallel reality", "identity puzzle", "single location"] },
  { title: "Predestination", year: 2014, type: "movie", relevance_score: 97, reason: "Zaman paradoksunu kimlik bilmecesiyle birleştirerek sonuna kadar yeniden düşünmeye açık bir kurgu sunuyor.", match_tags: ["time paradox", "identity", "plot twist"] },
  { title: "The Prestige", year: 2006, type: "movie", relevance_score: 96, reason: "Rekabet, takıntı ve katmanlı aldatmacaları güçlü bir finalle birbirine bağlayan titiz bir anlatıya sahip.", match_tags: ["deception", "obsession", "plot twist"] },
  { title: "Shutter Island", year: 2010, type: "movie", relevance_score: 95, reason: "Algı ile gerçek arasındaki sınırı kasıtlı biçimde bulanıklaştıran psikolojik gizemiyle beklentiyi sürekli değiştiriyor.", match_tags: ["psychological mystery", "unreliable reality", "twist"] },
  { title: "Primer", year: 2004, type: "movie", relevance_score: 94, reason: "Zaman yolculuğunu basitleştirmeden ele alan yoğun nedensellik ağıyla dikkatli izleme ve sonradan düşünme istiyor.", match_tags: ["time travel", "causality", "complex narrative"] },
  { title: "Triangle", year: 2009, type: "movie", relevance_score: 93, reason: "Tekrarlanan olayları giderek yeni anlamlar kazanan karanlık bir zaman döngüsüne dönüştürüyor.", match_tags: ["time loop", "recursion", "psychological thriller"] },
  { title: "Mulholland Drive", year: 2001, type: "movie", relevance_score: 92, reason: "Rüya ile gerçekliği parçalı kimlikler üzerinden iç içe geçirerek tek açıklamaya direnen bir deneyim yaratıyor.", match_tags: ["dream logic", "fragmented identity", "surreal"] },
  { title: "Enemy", year: 2013, type: "movie", relevance_score: 91, reason: "Doppelgänger fikrini yoğun semboller ve belirsiz bir gerçeklik duygusuyla işleyen yorumlamaya açık bir bilmece.", match_tags: ["doppelganger", "symbolism", "ambiguity"] },
  { title: "Donnie Darko", year: 2001, type: "movie", relevance_score: 90, reason: "Alternatif zaman çizgileri, kader ve gerçeklik sorularını karanlık bir gençlik hikâyesi içinde birleştiriyor.", match_tags: ["alternate timeline", "fate", "surreal"] },
  { title: "The Machinist", year: 2004, type: "movie", relevance_score: 89, reason: "Uykusuzluk ve suçluluk üzerinden kahramanın algısına güvenemediğin giderek sıkılaşan bir psikolojik kurgu kuruyor.", match_tags: ["unreliable perception", "guilt", "psychological mystery"] }
];

export const SINGLE_LOCATION_THRILLER_FALLBACK: AiRecommendedTitle[] = [
  { title: "Exam", year: 2009, type: "movie", relevance_score: 99, reason: "Sekiz adayı tek bir sınav odasında kurallarını çözmeye çalıştıkları giderek sertleşen bir psikolojik oyuna kapatıyor.", match_tags: ["single room", "psychological game", "mystery"] },
  { title: "Buried", year: 2010, type: "movie", relevance_score: 98, reason: "Neredeyse tamamını bir tabutun içinde geçirerek mekân kısıtını doğrudan gerilimin kaynağına dönüştürüyor.", match_tags: ["confined space", "survival", "real time"] },
  { title: "Den skyldige", year: 2018, type: "movie", relevance_score: 97, reason: "Bir acil çağrı merkezinden hiç çıkmadan, yalnızca telefon konuşmalarıyla sürekli yön değiştiren yoğun bir gerilim kuruyor.", match_tags: ["single location", "phone thriller", "twist"] },
  { title: "Locke", year: 2013, type: "movie", relevance_score: 96, reason: "Tek bir gece yolculuğu ve telefon görüşmeleri üzerinden bir adamın hayatının çözülüşünü klostrofobik biçimde anlatıyor.", match_tags: ["car setting", "real time", "contained drama"] },
  { title: "Phone Booth", year: 2002, type: "movie", relevance_score: 95, reason: "Bir telefon kulübesine sıkışan karakteri görünmeyen bir tehditle yüzleştirerek temposunu tek noktada koruyor.", match_tags: ["phone booth", "sniper", "real time"] },
  { title: "10 Cloverfield Lane", year: 2016, type: "movie", relevance_score: 95, reason: "Yeraltı sığınağındaki üç kişi arasında kimin doğru söylediğini sorgulatan kapalı alan gerilimi yaratıyor.", match_tags: ["bunker", "claustrophobic", "unreliable truth"] },
  { title: "Cube", year: 1997, type: "movie", relevance_score: 94, reason: "Birbirine bağlı ölümcül odaları hem fiziksel kaçış problemine hem de paranoya dolu bir grup sınavına çeviriyor.", match_tags: ["trapped", "puzzle rooms", "paranoia"] },
  { title: "Oxygen", year: 2021, type: "movie", relevance_score: 93, reason: "Kapalı bir yaşam kapsülünde uyanan karakterin kimliğini ve kaçış yolunu sınırlı oksijenle çözmesini izletiyor.", match_tags: ["pod", "survival", "identity mystery"] },
];

export const SIX_EPISODE_CRIME_FALLBACK: AiRecommendedTitle[] = [
  { title: "Black Bird", year: 2022, type: "tv", relevance_score: 98, reason: "Altı bölüm boyunca bir mahkûmun seri katilden itiraf alma görevini yoğun gerilimle işliyor.", match_tags: ["six episodes", "crime", "psychological tension"] },
  { title: "The Chestnut Man", year: 2021, type: "tv", relevance_score: 97, reason: "Altı bölümlük karanlık soruşturmasını ritmini düşürmeden çözülen bir seri cinayet bilmecesine dönüştürüyor.", match_tags: ["six episodes", "serial killer", "investigation"] },
  { title: "Bodyguard", year: 2018, type: "tv", relevance_score: 96, reason: "Altı bölümde siyasi koruma görevini komplo ve suç gerilimiyle hızla tırmandırıyor.", match_tags: ["six episodes", "conspiracy", "crime thriller"] },
  { title: "Dear Child", year: 2023, type: "tv", relevance_score: 95, reason: "Altı bölümde bir kaçırılma vakasının saklı bağlantılarını karanlık bir suç bilmecesiyle açıyor.", match_tags: ["six episodes", "abduction", "mystery"] },
  { title: "The Undoing", year: 2020, type: "tv", relevance_score: 93, reason: "Altı bölüm boyunca seçkin bir ailenin çevresindeki cinayet soruşturmasını kuşku üzerine kuruyor.", match_tags: ["six episodes", "murder mystery", "family secrets"] },
];

export function inferGenresFromQuery(query: string): string[] {
  const q = toSearchText(query);
  const genres: string[] = [];
  const push = (genre: string) => { if (!genres.includes(genre)) genres.push(genre); };

  if (/\bkomedi\b|\bkomik\b|eglenceli/.test(q)) push("comedy");
  if (/\bdram\b/.test(q)) push("drama");
  if (/bilim kurgu|sci fi|science fiction/.test(q)) push("science fiction");
  if (/\baksiyon\b/.test(q)) push("action");
  if (/\bsuc\b|\bmafya\b|polisiye/.test(q)) push("crime");
  if (/polisiye/.test(q)) push("mystery");
  if (/gerilim|thriller/.test(q)) push("thriller");
  if (/korku|horror/.test(q)) push("horror");
  if (/gizem|mystery|dedektif/.test(q)) push("mystery");
  if (/romantik|ask|romance/.test(q)) push("romance");
  if (/animasyon|anime/.test(q)) push("animation");
  if (/belgesel|documentary/.test(q)) push("documentary");
  if (/fantastik|fantasy/.test(q)) push("fantasy");
  if (/aile|cocuk/.test(q)) push("family");

  return genres;
}

export function buildRequestSummaryTr(query: string, normalized: NormalizedAiQuery): string {
  const q = toSearchText(query);
  if (/beyin yakan|kafa yakan|akil oyunu|ters kose|plot twist/.test(q)) {
    return "Zihin zorlayan bir anlatı, sorgulanan gerçeklik algısı ve güçlü ters köşeler sunan filmler arıyorsun.";
  }
  if (normalized.intent === "similar_to_title" && normalized.reference_title) {
    const typeLabel = normalized.type === "tv" ? "diziler" : normalized.type === "movie" ? "filmler" : "yapımlar";
    return `“${normalized.reference_title}” ile tema, atmosfer ve anlatım tarzı bakımından gerçekten benzeşen ${typeLabel} arıyorsun.`;
  }
  if (normalized.intent === "person_search") {
    const person = normalized.actors?.[0] || normalized.directors?.[0];
    if (person) {
      const relation = normalized.directors?.length > 0 ? `${person} tarafından yönetilen` : `${person} rol aldığı`;
      const typeLabel = normalized.type === "tv" ? "dizileri" : normalized.type === "movie" ? "filmleri" : "yapımları";
      return `${relation} ve belirttiğin diğer ölçütlere uyan ${typeLabel} arıyorsun.`;
    }
  }

  const typeLabel = normalized.type === "tv" ? "diziler" : normalized.type === "movie" ? "filmler" : "film ve diziler";
  const genreLabels: Record<string, string> = {
    comedy: "komedi", drama: "dram", "science fiction": "bilim kurgu", action: "aksiyon",
    crime: "suç", thriller: "gerilim", horror: "korku", mystery: "gizem", romance: "romantik",
    animation: "animasyon", documentary: "belgesel", fantasy: "fantastik", family: "aile"
  };
  const genres = (normalized.genres || []).map((genre) => genreLabels[String(genre).toLowerCase()] || genre).slice(0, 3);
  const themeLabels: Record<string, string> = {
    "single location": "tek mekân", "mind bending": "zihin zorlayan anlatı", "plot twist": "ters köşe",
    "time travel": "zaman yolculuğu", "artificial intelligence": "yapay zekâ", "class conflict": "sınıf çatışması",
    prison: "hapishane", heist: "soygun", spy: "casusluk", vampire: "vampir", zombie: "zombi",
    space: "uzay", survival: "hayatta kalma", "serial killer": "seri katil", comedy: "komedi",
    thriller: "gerilim", mystery: "gizem", horror: "korku", family: "aile"
  };
  const rawTheme = normalized.must_have?.[0] || normalized.semantic_topics?.[0];
  const theme = rawTheme ? (themeLabels[String(rawTheme).toLowerCase()] || rawTheme) : "";
  const details: string[] = [];
  if (genres.length) details.push(`${genres.join(", ")} türlerinde`);
  if (theme) details.push(`${theme} temasını gerçekten taşıyan`);
  if (normalized.watch_provider) details.push(`${normalized.watch_provider} üzerinde izlenebilen`);
  return `${details.length ? details.join(", ") : "Belirgin bir tür kısıtı olmadan zevkine uyabilecek"} ${typeLabel} arıyorsun.`;
}

export function sanitizeNormalizedInput(input: any): NormalizedAiQuery {
  const normalized: NormalizedAiQuery = {
    ...FALLBACK_NORMALIZE,
    ...(input && typeof input === "object" ? input : {}),
  };

  const arrayFields = [
    "genres", "keywords", "semantic_topics", "must_have", "nice_to_have",
    "exclude", "actors", "directors"
  ] as const;

  for (const field of arrayFields) {
    (normalized as any)[field] = Array.isArray((normalized as any)[field])
      ? (normalized as any)[field].map((v: any) => String(v).trim()).filter(Boolean).slice(0, 12)
      : [];
  }

  const genreAliases: Record<string, string> = {
    "sci fi": "science fiction",
    "sci-fi": "science fiction",
    "science_fiction": "science fiction",
    "bilim kurgu": "science fiction",
  };

  normalized.genres = Array.from(new Set(normalized.genres.map((genre) => {
    const value = toSearchText(genre).trim();
    return genreAliases[value] || value;
  }).filter(Boolean)));

  normalized.type = ["movie", "tv", "any"].includes(normalized.type) ? normalized.type : "any";
  normalized.intent = ["discover", "similar_to_title", "person_search"].includes(normalized.intent) ? normalized.intent : "discover";
  normalized.quality_profile = ["mainstream", "hidden_gems", "new", "classic", "family"].includes(normalized.quality_profile)
    ? normalized.quality_profile
    : "mainstream";
  normalized.sort_by = ["relevance", "popularity", "vote_average", "release_date"].includes(normalized.sort_by)
    ? normalized.sort_by
    : "relevance";
  normalized.request_summary_tr = String(normalized.request_summary_tr || "").trim().substring(0, 280);
  normalized.reference_title = String(normalized.reference_title || "").trim().substring(0, 160);
  normalized.watch_provider = String(normalized.watch_provider || "").trim().substring(0, 80);
  normalized.language = String(normalized.language || "any").trim().toLowerCase();
  if (!/^(any|[a-z]{2,3})$/.test(normalized.language)) normalized.language = "any";
  normalized.country = String(normalized.country || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized.country)) normalized.country = "";
  normalized.safety_level = ["none", "family", "no_adult", "low_violence"].includes(normalized.safety_level)
    ? normalized.safety_level
    : "none";
  normalized.trailer_required = Boolean(normalized.trailer_required);

  type NumericFieldKey =
    | "year_min"
    | "year_max"
    | "min_vote_average"
    | "min_vote_count"
    | "runtime_min"
    | "runtime_max"
    | "min_seasons"
    | "max_seasons"
    | "episode_count_min"
    | "episode_count_max";

  const numericFields: NumericFieldKey[] = [
    "year_min",
    "year_max",
    "min_vote_average",
    "min_vote_count",
    "runtime_min",
    "runtime_max",
    "min_seasons",
    "max_seasons",
    "episode_count_min",
    "episode_count_max",
  ];

  for (const field of numericFields) {
    const rawVal = input && typeof input === "object" ? input[field] : normalized[field];
    if (rawVal === null || rawVal === "" || rawVal === undefined) {
      normalized[field] = null;
      continue;
    }
    const val = Number(rawVal);
    normalized[field] = Number.isFinite(val) && val >= 0 ? val : null;
  }

  const rawRecs = Array.isArray(normalized.recommended_titles) ? normalized.recommended_titles : [];
  normalized.recommended_titles = rawRecs.map((item: any, index: number) => {
    const source = typeof item === "string" ? { title: item } : (item || {});
    const explicitScore = Number(source.relevance_score);
    return {
      title: String(source.title || "").trim().substring(0, 160),
      year: Number.isInteger(Number(source.year)) ? Number(source.year) : null,
      type: ["movie", "tv"].includes(source.type) ? source.type : normalized.type,
      relevance_score: Number.isFinite(explicitScore) ? Math.max(0, Math.min(100, explicitScore)) : Math.max(80, 92 - index),
      reason: String(source.reason || "").trim().substring(0, 320),
      match_tags: Array.isArray(source.match_tags) ? source.match_tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 5) : []
    };
  }).filter((item) => item.title && (item.relevance_score || 0) >= 80).slice(0, 12);

  return normalized;
}

export function applyQueryHeuristics(normalizedInput: any, query: string): NormalizedAiQuery {
  const normalized = sanitizeNormalizedInput(normalizedInput);
  const q = toSearchText(query);
  const inferredGenres = inferGenresFromQuery(query);

  normalized.genres = addUniqueStrings(normalized.genres, inferredGenres);
  normalized.explicit_genres = [...inferredGenres];

  const locationAliases = [
    ["ankara", "ankara"], ["istanbul", "istanbul"], ["izmir", "izmir"], ["adana", "adana"],
    ["antalya", "antalya"], ["trabzon", "trabzon"], ["londra", "london"], ["london", "london"],
    ["paris", "paris"], ["new york", "new york"], ["tokyo", "tokyo"], ["seul", "seoul"], ["seoul", "seoul"]
  ];
  if (/gecen|gecsin|mekan|sehrinde|kentinde|set in/.test(q)) {
    const location = locationAliases.find(([alias]) => q.includes(alias));
    if (location) normalized.required_location = location[1];
  }

  const hasScopedGenreNegation = (terms: string) => {
    const match = q.match(new RegExp(`(?:${terms})(.{0,64}?)(?:olmasin|istemem|istemiyorum|olmadan|yok)`));
    if (!match) return false;
    return !/(?:\bama\b|\bfakat\b|\bancak\b|\blakin\b|\+18|18\+|yetiskin)/.test(match[1]);
  };
  const negativeGenreRules = [
    { genre: "romance", terms: "ask mesk|romantik|romance" },
    { genre: "horror", terms: "korku|horror" },
    { genre: "comedy", terms: "komedi|komik" },
    { genre: "action", terms: "aksiyon" }
  ];
  for (const rule of negativeGenreRules) {
    if (!hasScopedGenreNegation(rule.terms)) continue;
    normalized.genres = normalized.genres.filter((g) => String(g).toLowerCase() !== rule.genre);
    normalized.explicit_genres = (normalized.explicit_genres || []).filter((g) => String(g).toLowerCase() !== rule.genre);
    normalized.must_have = normalized.must_have.filter((v) => String(v).toLowerCase() !== rule.genre);
    normalized.exclude = addUniqueStrings(normalized.exclude, [rule.genre]);
  }

  const maxRuntimeMatch = q.match(/(en fazla|maksimum|max)\s*(\d{2,3})\s*(dakika|dk)/)
    || q.match(/(\d{2,3})\s*(dakika|dk).{0,24}(gecmesin|asmasin|altinda)/);
  if (maxRuntimeMatch) {
    const value = maxRuntimeMatch.slice(1).map(Number).find(Number.isFinite);
    if (Number.isFinite(value)) normalized.runtime_max = value!;
  }

  const seasonExclusion = q.match(/(\d{1,2})\s*sezon.{0,20}(olmasin|istemem|istemiyorum|fazla)/);
  if (seasonExclusion) {
    normalized.type = "tv";
    normalized.max_seasons = Math.max(1, Number(seasonExclusion[1]) - 1);
  }
  const maxSeasonMatch = q.match(/(en fazla|maksimum|max)\s*(\d{1,2})\s*sezon/);
  if (maxSeasonMatch) {
    normalized.type = "tv";
    normalized.max_seasons = Number(maxSeasonMatch[2]);
  }

  const episodeAroundMatch = q.match(/(\d{1,4})\s*bolum.{0,16}(falan|civari|civarinda|gibi)/);
  if (episodeAroundMatch) {
    const target = Number(episodeAroundMatch[1]);
    normalized.type = "tv";
    normalized.episode_count_min = Math.max(1, target - 2);
    normalized.episode_count_max = target + 2;
  }
  const exactEpisodeMatch = q.match(/(\d{1,4})\s*(?:bolumluk|bolumden olusan)/);
  if (exactEpisodeMatch) {
    const target = Number(exactEpisodeMatch[1]);
    normalized.type = "tv";
    normalized.episode_count_min = target;
    normalized.episode_count_max = target;
    if (target === 6 && normalized.genres.includes("crime")) {
      normalized.recommended_titles = [...SIX_EPISODE_CRIME_FALLBACK, ...normalized.recommended_titles];
    }
  }
  if (/kisa surede bitsin|cok uzamasin|hemen bitsin/.test(q)) {
    normalized.type = "tv";
    normalized.max_seasons = Math.min(normalized.max_seasons ?? 2, 2);
    normalized.episode_count_max = Math.min(normalized.episode_count_max ?? 30, 30);
  }

  if (/(\+18|18\+|yetiskin).{0,20}(olmasin|istemem|istemiyorum|olmadan)/.test(q)) {
    normalized.safety_level = "no_adult";
  }
  if (/(kan|vahset|gore|splatter).{0,24}(olmasin|istemem|istemiyorum|olmadan|yok)/.test(q)) {
    normalized.safety_level = "low_violence";
    normalized.exclude = addUniqueStrings(normalized.exclude, ["gore", "splatter", "graphic violence"]);
  }
  if (/ailece|cocuklarla|cocukla/.test(q)) {
    normalized.safety_level = "family";
    normalized.quality_profile = "family";
  }

  if (/kore|k-drama|kdrama/.test(q)) {
    normalized.country = "KR";
    normalized.language = "ko";
    if (/dizi/.test(q)) normalized.type = "tv";
  }
  if (/turk yapimi|turk filmi|turk dizisi|ankara/.test(q)) {
    normalized.country = "TR";
    normalized.language = "tr";
  }

  if (/\bmini dizi|minidizi\b/.test(q)) {
    normalized.type = "tv";
    normalized.must_have = addUniqueStrings(normalized.must_have, ["miniseries"]);
    normalized.semantic_topics = addUniqueStrings(normalized.semantic_topics, ["limited series", "miniseries"]);
  }

  if ((/\bdizi|diziler|sezon\b/.test(q)) && normalized.type === "any") normalized.type = "tv";
  if ((/\bfilm|filmler|sinemasi\b/.test(q)) && normalized.type === "any") normalized.type = "movie";

  if (/netflix/.test(q)) normalized.watch_provider = normalized.watch_provider || "Netflix";
  if (/prime|amazon/.test(q)) normalized.watch_provider = normalized.watch_provider || "Amazon Prime Video";
  if (/blutv|blu tv/.test(q)) normalized.watch_provider = normalized.watch_provider || "BluTV";
  if (/disney/.test(q)) normalized.watch_provider = normalized.watch_provider || "Disney Plus";

  if (/tek mekan|tek mekanda|tek ortam|single location|single setting/.test(q)) {
    normalized.must_have = addUniqueStrings(normalized.must_have, ["single location"]);
    normalized.semantic_topics = addUniqueStrings(normalized.semantic_topics, ["single setting", "claustrophobic"]);
    if (/gerilim|thriller/.test(q) && normalized.type !== "tv") {
      normalized.type = "movie";
      const combined = [...SINGLE_LOCATION_THRILLER_FALLBACK, ...normalized.recommended_titles];
      const seenTitles = new Set();
      normalized.recommended_titles = combined.filter((item) => {
        const key = normalizeTitle(item.title);
        if (!key || seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      }).slice(0, 12);
    }
  }

  if (/yapay zeka|robot|android/.test(q)) {
    normalized.must_have = addUniqueStrings(normalized.must_have, ["artificial intelligence"]);
    normalized.semantic_topics = addUniqueStrings(normalized.semantic_topics, ["technology", "thought-provoking"]);
    normalized.type = normalized.type === "any" ? "movie" : normalized.type;
  }

  if (/beyin yakan|akil oyunu|ters kose|tokat gibi final|plot twist/.test(q)) {
    normalized.must_have = addUniqueStrings(normalized.must_have, ["mind bending", "plot twist"]);
    normalized.semantic_topics = addUniqueStrings(normalized.semantic_topics, ["mind-bending", "twist"]);
    normalized.mood = normalized.mood || "şaşırtıcı, düşündürücü ve gizemli";
    if (normalized.type !== "tv" && normalized.recommended_titles.length === 0) {
      normalized.type = "movie";
      normalized.recommended_titles = MIND_BENDING_MOVIE_FALLBACK.map((item) => ({ ...item }));
    }
  }

  if (/zamanla oynayan|zaman yolculugu|zaman dongusu|paradoks/.test(q)) {
    normalized.must_have = addUniqueStrings(normalized.must_have, ["time travel"]);
    normalized.semantic_topics = addUniqueStrings(normalized.semantic_topics, ["time loop", "alternate timeline"]);
  }

  if (normalized.type === "any" && !/dizi|sezon|bolum|series|show/.test(q)) {
    normalized.type = "movie";
    normalized.recommended_titles = normalized.recommended_titles.filter((item) => item.type !== "tv");
  }

  normalized.request_summary_tr = normalized.request_summary_tr || buildRequestSummaryTr(query, normalized);

  return normalized;
}
