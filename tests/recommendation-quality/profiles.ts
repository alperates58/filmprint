import { FixtureArchetypeSpec } from "./types";
import { RecommendationAction } from "@prisma/client";

/**
 * 16 Deterministic Fixture Profiles for Phase 9 Recommendation Quality Lab.
 * Spanning maturity levels (30, 100, 120, 150, 180, 200, 250, 300, 500, 1043, 1500+ interactions)
 * and diverse cinephile archetypes with independent ground-truth taste intent.
 */

export const FIXTURE_PROFILES: FixtureArchetypeSpec[] = [
  // 1. P01: Mainstream Blockbuster Lover (Maturity: 100)
  {
    id: "P01_BLOCKBUSTER",
    name: "Mainstream Blockbuster Lover",
    description: "High-octane mainstream blockbusters with high popularity and epic scale.",
    maturity: 100,
    targetWatchedCount: 80,
    targetNotWatchedCount: 20,
    primaryGenres: ["Aksiyon", "Macera", "Bilim Kurgu"],
    secondaryGenres: ["Gerilim", "Fantezi"],
    dislikedGenres: ["Romantik", "Belgesel"],
    preferredEras: ["2010s", "2020s", "2000s"],
    popularityPreference: "mainstream",
    anchorLoveTmdbIds: [155, 27205, 157336, 299536, 603, 98], // Dark Knight, Inception, Interstellar, Infinity War, Matrix, Gladiator
    anchorLikeTmdbIds: [438631, 324857, 120], // Dune, Spider-Verse, Fellowship of the Ring
    anchorDislikeTmdbIds: [313369, 597], // La La Land, Titanic (romance negative)
    holdoutPositiveTmdbIds: [68721, 299534, 181808], // Iron Man 3, Avengers: Endgame, Star Wars: The Last Jedi
  },

  // 2. P02: Crime / Thriller Lover (Maturity: 150)
  {
    id: "P02_CRIME_THRILLER",
    name: "Crime / Thriller Lover",
    description: "Dark, tense, neo-noir psychological thrillers, mysteries, and crime dramas.",
    maturity: 150,
    targetWatchedCount: 120,
    targetNotWatchedCount: 30,
    primaryGenres: ["Suç", "Gerilim", "Gizem"],
    secondaryGenres: ["Dram"],
    dislikedGenres: ["Animasyon", "Müzik"],
    preferredEras: ["1990s", "2010s", "2000s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [807, 210577, 1422, 1124, 769, 274], // Se7en, Gone Girl, The Departed, The Prestige, GoodFellas, Silence of the Lambs
    anchorLikeTmdbIds: [11324, 27576, 680], // Shutter Island, Sicario (search/proxy), Pulp Fiction
    anchorDislikeTmdbIds: [10681, 129], // WALL-E, Spirited Away (animation negative)
    holdoutPositiveTmdbIds: [1949, 146233, 77], // Zodiac, Prisoners, Memento
  },

  // 3. P03: Comedy Lover (Maturity: 100)
  {
    id: "P03_COMEDY",
    name: "Comedy Lover",
    description: "Light-hearted, witty, character-driven comedies and warm dramedies.",
    maturity: 100,
    targetWatchedCount: 75,
    targetNotWatchedCount: 25,
    primaryGenres: ["Komedi"],
    secondaryGenres: ["Dram", "Romantik", "Aile"],
    dislikedGenres: ["Korku", "Savaş"],
    preferredEras: ["1990s", "2000s", "2010s", "2020s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [13, 23925, 313369, 105], // Forrest Gump, Life Is Beautiful, La La Land, Back to the Future
    anchorLikeTmdbIds: [496243, 372058], // Parasite (comedy-satire), Your Name
    anchorDislikeTmdbIds: [807, 274], // Se7en, Silence of the Lambs (horror/thriller negative)
    holdoutPositiveTmdbIds: [840430, 137, 115], // The Holdovers, Groundhog Day, The Big Lebowski
  },

  // 4. P04: Prestige Drama Lover (Maturity: 200)
  {
    id: "P04_PRESTIGE_DRAMA",
    name: "Prestige Drama Lover",
    description: "Emotionally profound, character-driven masterworks with exceptional acting.",
    maturity: 200,
    targetWatchedCount: 160,
    targetNotWatchedCount: 40,
    primaryGenres: ["Dram"],
    secondaryGenres: ["Tarih", "Biyografi", "Suç"],
    dislikedGenres: ["Korku", "Bilim Kurgu"],
    preferredEras: ["1990s", "2010s", "2020s", "1970s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [278, 244786, 872585, 424, 238, 550], // Shawshank, Whiplash, Oppenheimer, Schindler's List, Godfather, Fight Club
    anchorLikeTmdbIds: [101, 597], // Leon, Titanic
    anchorDislikeTmdbIds: [603, 11], // Matrix, Star Wars (Sci-Fi negative)
    holdoutPositiveTmdbIds: [389, 598, 490132], // 12 Angry Men, City of God, Green Book
  },

  // 5. P05: Sci-Fi / Fantasy Explorer (Maturity: 250)
  {
    id: "P05_SCIFI_FANTASY",
    name: "Sci-Fi / Fantasy Explorer",
    description: "Mind-bending concepts, speculative science, space exploration, and rich world-building.",
    maturity: 250,
    targetWatchedCount: 200,
    targetNotWatchedCount: 50,
    primaryGenres: ["Bilim Kurgu", "Fantezi"],
    secondaryGenres: ["Macera", "Gizem"],
    dislikedGenres: ["Romantik", "Komedi"],
    preferredEras: ["1970s", "1990s", "2010s", "2020s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [157336, 603, 335984, 438631, 27205, 120], // Interstellar, Matrix, Blade Runner 2049, Dune, Inception, LOTR
    anchorLikeTmdbIds: [11, 545611, 105], // Star Wars, EEAAO, Back to the Future
    anchorDislikeTmdbIds: [13, 23925], // Forrest Gump, Life is Beautiful (sentimentality negative)
    holdoutPositiveTmdbIds: [62, 329865, 264660], // 2001: A Space Odyssey, Arrival, Ex Machina
  },

  // 6. P06: Horror Lover (Maturity: 120)
  {
    id: "P06_HORROR",
    name: "Horror Lover",
    description: "Atmospheric dread, psychological horror, supernatural mysteries, and visceral tension.",
    maturity: 120,
    targetWatchedCount: 90,
    targetNotWatchedCount: 30,
    primaryGenres: ["Korku", "Gizem"],
    secondaryGenres: ["Gerilim"],
    dislikedGenres: ["Romantik", "Aile", "Komedi"],
    preferredEras: ["1970s", "1980s", "2010s", "2020s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [807, 274], // Se7en, Silence of the Lambs
    anchorLikeTmdbIds: [475557, 550], // Joker, Fight Club
    anchorDislikeTmdbIds: [10681, 129, 313369], // WALL-E, Spirited Away, La La Land
    holdoutPositiveTmdbIds: [694, 493922, 539], // The Shining, Hereditary, Psycho
  },

  // 7. P07: Animation & Family Lover (Maturity: 150)
  {
    id: "P07_ANIMATION_FAMILY",
    name: "Animation & Family Lover",
    description: "Visually stunning animations, Ghibli/Pixar classics, heart-warming stories for all ages.",
    maturity: 150,
    targetWatchedCount: 110,
    targetNotWatchedCount: 40,
    primaryGenres: ["Animasyon", "Aile", "Fantezi"],
    secondaryGenres: ["Macera", "Komedi"],
    dislikedGenres: ["Korku", "Suç"],
    preferredEras: ["2000s", "2010s", "2020s"],
    popularityPreference: "mainstream",
    anchorLoveTmdbIds: [129, 324857, 372058, 10681], // Spirited Away, Spider-Verse, Your Name, WALL-E
    anchorLikeTmdbIds: [105, 120], // Back to the Future, LOTR
    anchorDislikeTmdbIds: [807, 769, 475557], // Se7en, GoodFellas, Joker (dark crime negative)
    holdoutPositiveTmdbIds: [354912, 508442, 2062], // Coco, Soul, Ratatouille
  },

  // 8. P08: International Cinema Explorer (Maturity: 300)
  {
    id: "P08_INTERNATIONAL",
    name: "International Cinema Explorer",
    description: "Diverse cinematic horizons spanning South Korean, Japanese, French, German, and Turkish cinema.",
    maturity: 300,
    targetWatchedCount: 240,
    targetNotWatchedCount: 60,
    primaryGenres: ["Dram", "Gerilim", "Gizem"],
    secondaryGenres: ["Suç", "Komedi"],
    dislikedGenres: [],
    preferredEras: ["1990s", "2000s", "2010s", "2020s"],
    preferredLanguages: ["ko", "ja", "fr", "de", "es", "tr", "it"],
    popularityPreference: "niche",
    anchorLoveTmdbIds: [496243, 372058, 129, 23925, 429], // Parasite, Your Name, Spirited Away, Life is Beautiful, Good Bad Ugly
    anchorLikeTmdbIds: [101, 278], // Leon, Shawshank
    anchorDislikeTmdbIds: [299536], // Infinity War (Hollywood CGI negative)
    holdoutPositiveTmdbIds: [670, 194, 582], // Oldboy, Amélie, The Lives of Others
  },

  // 9. P09: Classic Cinema Lover (Maturity: 250)
  {
    id: "P09_CLASSIC_CINEMA",
    name: "Classic Cinema Lover",
    description: "Masterworks of mid-to-late 20th century cinema (1950s–1980s).",
    maturity: 250,
    targetWatchedCount: 200,
    targetNotWatchedCount: 50,
    primaryGenres: ["Dram", "Suç", "Vahşi Batı"],
    secondaryGenres: ["Gizem", "Tarih"],
    dislikedGenres: [],
    preferredEras: ["1970s", "1960s", "1950s", "1980s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [238, 240, 429, 11, 769], // Godfather I & II, Good Bad Ugly, Star Wars, GoodFellas
    anchorLikeTmdbIds: [105, 278], // Back to the Future, Shawshank
    anchorDislikeTmdbIds: [545611, 299536], // EEAAO, Infinity War (modern hyper-paced negative)
    holdoutPositiveTmdbIds: [389, 289, 426], // 12 Angry Men, Casablanca, Vertigo
  },

  // 10. P10: Niche / Arthouse Explorer (Maturity: 180)
  {
    id: "P10_NICHE_ARTHOUSE",
    name: "Niche / Arthouse Explorer",
    description: "Festival favorites, auteur-driven cinema, and philosophical depth with low mainstream popularity.",
    maturity: 180,
    targetWatchedCount: 130,
    targetNotWatchedCount: 50,
    primaryGenres: ["Dram", "Gizem"],
    secondaryGenres: ["Bilim Kurgu"],
    dislikedGenres: ["Aksiyon", "Macera"],
    preferredEras: ["1970s", "1990s", "2010s", "2020s"],
    popularityPreference: "niche",
    anchorLoveTmdbIds: [496243, 335984, 550, 244786], // Parasite, Blade Runner 2049, Fight Club, Whiplash
    anchorLikeTmdbIds: [372058, 23925], // Your Name, Life is Beautiful
    anchorDislikeTmdbIds: [299536, 155, 98], // Infinity War, Dark Knight, Gladiator (pop blockbuster negative)
    holdoutPositiveTmdbIds: [1398, 1018, 598], // Stalker, Mulholland Drive, City of God
  },

  // 11. P11: Mixed Balanced Viewer (Maturity: 500)
  {
    id: "P11_MIXED_BALANCED",
    name: "Mixed Balanced Viewer",
    description: "Well-rounded cinephile with balanced appetite across genres, eras, and styles.",
    maturity: 500,
    targetWatchedCount: 400,
    targetNotWatchedCount: 100,
    primaryGenres: ["Dram", "Bilim Kurgu", "Suç", "Komedi"],
    secondaryGenres: ["Macera", "Gerilim", "Animasyon"],
    dislikedGenres: [],
    preferredEras: ["1990s", "2000s", "2010s", "2020s", "1970s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [157336, 278, 238, 807, 13, 129, 680], // Interstellar, Shawshank, Godfather, Se7en, Forrest Gump, Spirited Away, Pulp Fiction
    anchorLikeTmdbIds: [105, 313369, 155, 335984], // Back to the Future, La La Land, Dark Knight, Blade Runner 2049
    anchorDislikeTmdbIds: [],
    holdoutPositiveTmdbIds: [872585, 496243, 244786], // Oppenheimer, Parasite, Whiplash
  },

  // 12. P12: Strong Negative Preference User (Maturity: 150)
  {
    id: "P12_STRONG_NEGATIVE",
    name: "Strong Negative Preference User",
    description: "Strong aversion to Horror / Gore, high affinity for Romantic Drama and Light Comedy.",
    maturity: 150,
    targetWatchedCount: 100,
    targetNotWatchedCount: 50,
    primaryGenres: ["Romantik", "Dram", "Komedi"],
    secondaryGenres: ["Müzik", "Aile"],
    dislikedGenres: ["Korku", "Gerilim"], // Target: -25 dislike penalty
    preferredEras: ["1990s", "2000s", "2010s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [597, 313369, 13, 23925], // Titanic, La La Land, Forrest Gump, Life is Beautiful
    anchorLikeTmdbIds: [372058, 105], // Your Name, Back to the Future
    anchorDislikeTmdbIds: [807, 274, 475557], // Se7en, Silence of the Lambs, Joker (strictly disliked!)
    holdoutPositiveTmdbIds: [19913, 11216, 508442], // (500) Days of Summer, Cinema Paradiso, Soul
  },

  // 13. P13: Mostly NOT_WATCHED User (Maturity: 300)
  {
    id: "P13_MOSTLY_NOT_WATCHED",
    name: "Mostly NOT_WATCHED User",
    description: "User with 270 NOT_WATCHED interactions and only 30 WATCHED. Tests NOT_WATCHED candidate recovery.",
    maturity: 300,
    targetWatchedCount: 30,
    targetNotWatchedCount: 270,
    primaryGenres: ["Bilim Kurgu", "Gerilim"],
    secondaryGenres: ["Dram"],
    dislikedGenres: ["Romantik"],
    preferredEras: ["2010s", "2020s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [157336, 27205, 603], // Interstellar, Inception, Matrix
    anchorLikeTmdbIds: [335984, 438631], // Blade Runner 2049, Dune
    anchorDislikeTmdbIds: [597], // Titanic
    holdoutPositiveTmdbIds: [329865, 264660, 545611], // Arrival, Ex Machina, EEAAO
  },

  // 14. P14: Small Evidence User (Maturity: 30)
  {
    id: "P14_SMALL_EVIDENCE",
    name: "Small Profile User (30 Items)",
    description: "Boundary onboarding user with exactly 30 interactions. Tests low-evidence confidence & score smoothing.",
    maturity: 30,
    targetWatchedCount: 25,
    targetNotWatchedCount: 5,
    primaryGenres: ["Aksiyon", "Gerilim"],
    secondaryGenres: ["Suç"],
    dislikedGenres: [],
    preferredEras: ["2010s", "2020s"],
    popularityPreference: "mainstream",
    anchorLoveTmdbIds: [155, 680, 550], // Dark Knight, Pulp Fiction, Fight Club
    anchorLikeTmdbIds: [98, 475557], // Gladiator, Joker
    anchorDislikeTmdbIds: [],
    holdoutPositiveTmdbIds: [299536, 157336, 807], // Infinity War, Interstellar, Se7en
  },

  // 15. P15: Power User (Production Simulation: 1043 Items)
  {
    id: "P15_POWER_USER_1043",
    name: "Power User (1043 Evaluated: 177 Watched / 866 Not Watched)",
    description: "Exact historical production regression profile. Tests candidate supply, >=5 home rows, zero 2-row collapse.",
    maturity: 1043,
    targetWatchedCount: 177,
    targetNotWatchedCount: 866,
    primaryGenres: ["Dram", "Gerilim", "Suç", "Bilim Kurgu"],
    secondaryGenres: ["Gizem", "Komedi", "Macera"],
    dislikedGenres: ["Müzik"],
    preferredEras: ["1990s", "2000s", "2010s", "2020s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [278, 157336, 807, 238, 244786, 496243, 680, 550], // Shawshank, Interstellar, Se7en, Godfather, Whiplash, Parasite, Pulp Fiction, Fight Club
    anchorLikeTmdbIds: [105, 335984, 155, 475557, 129], // Back to the Future, Blade Runner 2049, Dark Knight, Joker, Spirited Away
    anchorDislikeTmdbIds: [313369], // La La Land
    holdoutPositiveTmdbIds: [872585, 1422, 1949, 146233, 438631], // Oppenheimer, The Departed, Zodiac, Prisoners, Dune
  },

  // 16. P16: Super Power User (1500+ Items)
  {
    id: "P16_SUPER_POWER_1500",
    name: "Super Power User (1500+ Items: 300 Watched / 1200+ Not Watched)",
    description: "Deep cinephile library scaling to maximum rank. Evaluates candidate pool scaling, evidence precision, and 3000+ candidate supply headroom.",
    maturity: 1500,
    targetWatchedCount: 300,
    targetNotWatchedCount: 1200,
    primaryGenres: ["Dram", "Suç", "Bilim Kurgu", "Gizem", "Gerilim"],
    secondaryGenres: ["Tarih", "Macera", "Komedi"],
    dislikedGenres: [],
    preferredEras: ["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"],
    popularityPreference: "balanced",
    anchorLoveTmdbIds: [238, 240, 278, 157336, 807, 769, 424, 274, 429, 389, 496243, 335984], // Deep classic & modern masters
    anchorLikeTmdbIds: [101, 105, 129, 372058, 603, 1124, 120, 244786],
    anchorDislikeTmdbIds: [],
    holdoutPositiveTmdbIds: [872585, 62, 598, 1398, 1422, 1949], // Oppenheimer, 2001, City of God, Stalker, Departed, Zodiac
  },
];
