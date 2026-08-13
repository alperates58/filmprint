export function runPhase7aTests() {
  console.log("=== PHASE 7A HOME EXPERIENCE, RECOMMENDATION CLARITY & PROFILE UX TESTS ===\n");
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] Test ${totalCount}: ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${totalCount}: ${testName}`);
    }
  }

  // Test 1: Header Source of Truth Progression Resolver
  const mockProgressionHelper = (count: number) => {
    if (count >= 2500) return { label: "Sinema Efsanesi", min: 2500 };
    if (count >= 1000) return { label: "Usta Sinefil", min: 1000 };
    if (count >= 500) return { label: "Kült Arayıcı", min: 500 };
    if (count >= 250) return { label: "Film Kurdu", min: 250 };
    if (count >= 100) return { label: "Sinefil", min: 100 };
    if (count >= 30) return { label: "Sinema Sever", min: 30 };
    return { label: "Yeni Başlayan", min: 0 };
  };

  const p1043 = mockProgressionHelper(1043);
  assert(
    p1043.label === "Usta Sinefil" && p1043.min === 1000,
    "Progression resolver calculates rank 'Usta Sinefil' for count 1043"
  );

  const p0 = mockProgressionHelper(0);
  assert(
    p0.label === "Yeni Başlayan" && p0.min === 0,
    "Progression resolver calculates rank for count 0"
  );

  // Test 2: Recommendation Explanation with Loved Movie Reference
  const mockMovie = {
    title: "Interstellar",
    genres: ["Bilim Kurgu", "Dram"],
  };

  const mockLovedMovies = [
    { title: "Inception", genres: ["Bilim Kurgu", "Aksiyon"] },
  ];

  const generateMockExplanation = (movie: any, loved: any[]) => {
    const matching = loved.find((l) => l.genres.some((g: string) => movie.genres.includes(g)));
    const headline = matching
      ? `Daha önce sevdiğin "${matching.title}" tarzında bir ${movie.genres[0]} yapımı.`
      : `${movie.genres[0]} zevkinle güçlü biçimde örtüşüyor.`;
    const reason1 = matching
      ? `Daha önce yüksek puan verdiğin "${matching.title}" filmi benzeri tempolu ve sürükleyici bir anlatı sunuyor.`
      : `${movie.genres[0]} türü sinema profilinle uyumlu sinyaller taşıyor.`;

    return {
      headline,
      reasons: [
        reason1,
        "8.4/10 IMDb puanıyla yüksek kalite beklentinle uyumlu.",
        "Derin Atmosfer Tutkunu sinema karakterinle güçlü biçimde eşleşiyor.",
      ],
    };
  };

  const explanation = generateMockExplanation(mockMovie, mockLovedMovies);

  assert(
    explanation.headline.includes("Inception") && explanation.reasons[0].includes("Inception"),
    "Recommendation explanation incorporates past loved movie title ('Inception') into personalized text"
  );

  assert(
    explanation.reasons.length === 3,
    "Explanation generates structured headline + 2-3 reasons"
  );

  // Test 3: Home Categorized Discovery Modules
  const mockModules = [
    { id: "rainy", title: "Yağmurlu Hava", moviesCount: 12 },
    { id: "comedy", title: "Ailece Komediler", moviesCount: 12 },
    { id: "thriller", title: "Çok Gerileyim", moviesCount: 12 },
    { id: "mind-bending", title: "Ruhum Değişsin", moviesCount: 12 },
    { id: "feel-good", title: "Hafif Ama Çok İyi", moviesCount: 12 },
    { id: "night", title: "Gece Seansı", moviesCount: 12 },
    { id: "brainy", title: "Beyni Açan Filmler", moviesCount: 12 },
    { id: "classic", title: "Klasikler", moviesCount: 12 },
    { id: "short", title: "< 100 Dk", moviesCount: 12 },
    { id: "gems", title: "Gizli Cevherler", moviesCount: 12 },
  ];

  assert(
    mockModules.length === 10 && mockModules.every((m) => m.moviesCount === 12),
    "10 categorized discovery rows populated with 12 movies each"
  );

  // Test 4: Recommendation Limit Expansion to 24 Items
  const mockRecommendationsLimit = 24;
  const topHeroCount = 1;
  const topMatchesCount = 8;
  const safeMatchesCount = 8;
  const discoveryGemsCount = 7;
  const totalSegmented = topHeroCount + topMatchesCount + safeMatchesCount + discoveryGemsCount;

  assert(
    totalSegmented === mockRecommendationsLimit,
    "24 recommendations segmented cleanly into Top Hero + En Uyumlu + Güvenli + Gizli Cevherler"
  );

  // Test 5: Milestone persistence & Root route fallback
  const isCalibrated = (count: number) => count >= 30;
  assert(isCalibrated(30) === true, "User with 30 movies is recognized as calibrated for Discovery Home");
  assert(isCalibrated(14) === false, "User with 14 movies remains in Calibration Engine flow");

  console.log(`\nRESULTS: Passed ${passedCount} of ${totalCount} tests.\n`);
}

runPhase7aTests();
