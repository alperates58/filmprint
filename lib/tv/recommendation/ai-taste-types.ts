export interface TvAiStoryPreferences {
  slowBurn: number;              // 0.0 to 1.0
  serializedNarrative: number;   // 0.0 to 1.0 (vs episodic)
  episodicNarrative: number;     // 0.0 to 1.0 (standalone episodes)
  complexNarrative: number;      // 0.0 to 1.0 (multi-thread / lore-heavy)
  characterDriven: number;       // 0.0 to 1.0 (vs plot-driven)
  moralAmbiguity: number;        // 0.0 to 1.0 (grey characters vs clear heroes)
  cliffhangerTolerance: number;  // 0.0 to 1.0 (binge readiness)
  comfortViewing: number;        // 0.0 to 1.0 (lighthearted / cozy)
}

export interface TvAiCommitmentPreference {
  shortSeries: number;           // 0.0 to 1.0 (miniseries / 1-2 seasons)
  longRunning: number;           // 0.0 to 1.0 (4+ seasons)
}

export interface TvAiTasteProfile {
  schemaVersion: number;
  corePreferences: string[];
  strongDislikes: string[];
  storyPreferences: TvAiStoryPreferences;
  commitmentPreference: TvAiCommitmentPreference;
  internationalOpenness: number; // 0.0 to 1.0
  preferredCharacteristics: string[];
  avoidCharacteristics: string[];
  confidence: number;
}

export interface TvAiTasteTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TvAiRerankCandidateItem {
  candidateId: string;
  title: string;
  genres: string[];
  firstAirYear: number | null;
  numberOfSeasons: number | null;
  episodeRuntime: number | null;
  status: string | null;
  originalLanguage: string | null;
  networkOrStyle: string | null;
  bayesianQuality: number;
  deterministicMatch: number;
  reasonCodes: string[];
}

export interface TvAiRerankRankingItem {
  candidateId: string;
  affinity: number;       // 0 to 100
  confidence: number;     // 0.0 to 1.0
  signals: string[];
}

export interface TvAiRerankResult {
  rankings: TvAiRerankRankingItem[];
  model: string;
  tokenUsage?: TvAiTasteTokenUsage;
}

export interface TvHybridScoreBreakdown {
  deterministicMatch: number;
  rawAiAffinity: number;
  guardedAiAffinity: number;
  effectiveMatchWeight: number;
  effectiveAiWeight: number;
  hybridScore: number;
  isGuarded: boolean;
  aiSignals: string[];
}
