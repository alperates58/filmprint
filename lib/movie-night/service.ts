import crypto from "crypto";
import { db } from "@/lib/db/client";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { buildUserFeedbackProfile } from "@/lib/recommendation/feedback-profile";
import { calculateMovieMatch } from "@/lib/recommendation/matcher";
import { calculateGroupMatch, MemberMatchInput } from "./matcher";
import { tmdbClient } from "@/lib/tmdb/client";
import { filterEligibleMovies } from "@/lib/movies/eligibility";
import { CandidateMovie } from "@/lib/calibration/types";
import { FilmDnaResult } from "@/lib/profile/types";
import { MovieNightStatus } from "@prisma/client";
import { evaluateFeatureEntitlement } from "@/lib/entitlements/service";
import {
  MovieNightSessionInfo,
  MovieNightMemberInfo,
  MovieNightRecommendationsResponse,
  MovieNightAdvancedOptions,
  GroupMovieMatchResult,
} from "./types";
import { MAX_MEMBERS, SESSION_EXPIRATION_HOURS } from "./constants";

/**
 * Generates a cryptographically secure random short invite code (e.g. "AB7KQ2").
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Creates a new Movie Night Session hosted by hostUserId.
 */
export async function createMovieNightSession(hostUserId: string) {
  let code = generateInviteCode();
  let attempts = 0;

  while (attempts < 5) {
    const existing = await db.movieNightSession.findUnique({ where: { code } });
    if (!existing) break;
    code = generateInviteCode();
    attempts++;
  }

  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_HOURS * 60 * 60 * 1000);

  const session = await db.movieNightSession.create({
    data: {
      code,
      hostUserId,
      status: MovieNightStatus.LOBBY,
      excludeWatched: true,
      expiresAt,
      members: {
        create: {
          userId: hostUserId,
          isReady: true,
        },
      },
    },
  });

  return session;
}

/**
 * Joins an existing Movie Night session by invite code.
 */
export async function joinMovieNightSession(code: string, userId: string) {
  const session = await db.movieNightSession.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });

  if (!session) {
    throw new Error("Movie Night seansı bulunamadı.");
  }

  if (new Date() > session.expiresAt || session.status === MovieNightStatus.EXPIRED) {
    throw new Error("Bu Movie Night seansının süresi dolmuştur.");
  }

  if (session.status === MovieNightStatus.CANCELLED) {
    throw new Error("Bu Movie Night seansı iptal edilmiştir.");
  }

  const existingMember = session.members.find((m: any) => m.userId === userId);
  if (existingMember) {
    return session;
  }

  if (session.members.length >= MAX_MEMBERS) {
    throw new Error(`Movie Night seansı en fazla ${MAX_MEMBERS} katılımcı alabilir.`);
  }

  await db.movieNightMember.create({
    data: {
      sessionId: session.id,
      userId,
      isReady: false,
    },
  });

  return session;
}

/**
 * Resolves session info and member list for UI.
 */
export async function getMovieNightSessionInfo(
  code: string,
  currentUserId: string
): Promise<MovieNightSessionInfo> {
  const session = await db.movieNightSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: { user: true },
      },
      selectedMovie: true,
      votes: true,
    },
  });

  if (!session) {
    throw new Error("Movie Night seansı bulunamadı.");
  }

  const isExpired = new Date() > session.expiresAt || session.status === MovieNightStatus.EXPIRED;
  const isHost = session.hostUserId === currentUserId;
  const isMember = session.members.some((m: any) => m.userId === currentUserId);

  // Evaluate Host entitlement for session status
  const hostEntitlementDecision = await evaluateFeatureEntitlement(session.hostUserId, "MOVIE_NIGHT_ADVANCED");
  const isPremiumSession = hostEntitlementDecision.allowed;

  // Pre-fetch all member Film DNA profiles in parallel
  const memberProfiles = await Promise.all(
    session.members.map((m: any) => getOrCalculateUserProfile(m.userId))
  );

  const members: MovieNightMemberInfo[] = session.members.map((m: any, index: number) => {
    const isUserHost = m.userId === session.hostUserId;
    const isUserCurrent = m.userId === currentUserId;
    const profileRes = memberProfiles[index];

    let userLabel = m.user?.name || "İzleyici " + (index + 1);

    return {
      id: m.id,
      userId: m.userId,
      userLabel,
      avatar: m.user?.image || null,
      isHost: isUserHost,
      isReady: m.isReady,
      isCurrentUser: isUserCurrent,
      hasDnaProfile: profileRes.ready && !!profileRes.profile,
      confidence: profileRes.profile ? (profileRes.profile as FilmDnaResult).confidence : 0,
      joinedAt: m.joinedAt,
    };
  });

  let selectedMovieCandidate: CandidateMovie | null = null;
  if (session.selectedMovie) {
    const meta = (session.selectedMovie.metadata as Record<string, unknown>) || {};
    selectedMovieCandidate = {
      id: session.selectedMovie.id,
      tmdbId: session.selectedMovie.tmdbId,
      title: session.selectedMovie.title,
      originalTitle: session.selectedMovie.originalTitle,
      releaseYear: session.selectedMovie.releaseYear,
      popularity: session.selectedMovie.popularity,
      voteAverage: session.selectedMovie.voteAverage,
      posterPath: session.selectedMovie.posterPath,
      backdropPath: session.selectedMovie.backdropPath,
      genres: (meta.genres as string[]) || [],
      overview: (meta.overview as string) || "",
    };
  }

  // Voting metrics calculation from current ready members
  const readyMembers = session.members.filter((m: any) => m.isReady);
  const readyUserIds = new Set(readyMembers.map((m: any) => m.userId));
  const readyVotes = (session.votes || []).filter((v: any) => readyUserIds.has(v.userId));

  const movieVoteCounts: Record<string, number> = {};
  for (const v of readyVotes) {
    movieVoteCounts[v.movieId] = (movieVoteCounts[v.movieId] || 0) + 1;
  }

  const currentUserVote = (session.votes || []).find((v: any) => v.userId === currentUserId)?.movieId || null;
  const readyMembersCount = readyMembers.length;
  const totalVotes = readyVotes.length;
  const allReadyVoted = readyMembersCount > 0 && totalVotes === readyMembersCount;

  return {
    id: session.id,
    code: session.code,
    hostUserId: session.hostUserId,
    status: isExpired ? MovieNightStatus.EXPIRED : session.status,
    excludeWatched: session.excludeWatched,
    isHost,
    isMember,
    isExpired,
    isPremiumSession,
    selectedMovie: selectedMovieCandidate,
    members,
    currentUserVote,
    totalVotes,
    readyMembersCount,
    allReadyVoted,
    movieVoteCounts,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

/**
 * Toggles member isReady state.
 */
export async function toggleMovieNightMemberReady(code: string, userId: string) {
  const sessionInfo = await getMovieNightSessionInfo(code, userId);
  const member = sessionInfo.members.find((m: any) => m.userId === userId);

  if (!member) {
    throw new Error("Bu seansın üyesi değilsiniz.");
  }

  await db.movieNightMember.update({
    where: {
      sessionId_userId: {
        sessionId: sessionInfo.id,
        userId,
      },
    },
    data: {
      isReady: !member.isReady,
    },
  });

  return getMovieNightSessionInfo(code, userId);
}

/**
 * Toggles excludeWatched setting (Host only).
 */
export async function toggleMovieNightSettings(code: string, hostUserId: string, excludeWatched: boolean) {
  const session = await db.movieNightSession.findUnique({ where: { code: code.toUpperCase() } });
  if (!session) throw new Error("Seans bulunamadı.");
  if (session.hostUserId !== hostUserId) throw new Error("Yalnızca ev sahibi ayarları değiştirebilir.");

  await db.movieNightSession.update({
    where: { id: session.id },
    data: { excludeWatched },
  });

  return getMovieNightSessionInfo(code, hostUserId);
}

/**
 * Calculates group recommendations across all members of a Movie Night session.
 * Supports truthful Premium features when host is entitled to MOVIE_NIGHT_ADVANCED.
 * Degrades gracefully if AI explanation fails.
 */
export async function getMovieNightRecommendations(
  code: string,
  currentUserId: string,
  options?: MovieNightAdvancedOptions
): Promise<MovieNightRecommendationsResponse> {
  const sessionInfo = await getMovieNightSessionInfo(code, currentUserId);

  if (sessionInfo.isExpired) {
    throw new Error("Bu seansın süresi dolmuştur.");
  }

  // Canonical host entitlement check
  const hostEntitlementDecision = await evaluateFeatureEntitlement(sessionInfo.hostUserId, "MOVIE_NIGHT_ADVANCED");
  const isPremiumSession = hostEntitlementDecision.allowed;

  const memberUserIds = sessionInfo.members.map((m: any) => m.userId);

  // 1. Pre-fetch all member Film DNA profiles and feedback profiles in PARALLEL batch queries
  const memberData = await Promise.all(
    sessionInfo.members.map(async (m: any) => {
      const [profileRes, feedbackProfile] = await Promise.all([
        getOrCalculateUserProfile(m.userId),
        buildUserFeedbackProfile(m.userId),
      ]);

      const profile = (profileRes.profile as FilmDnaResult) || {
        version: 1,
        confidence: 0.2,
        genres: [],
        eras: [],
        popularity: { orientation: "balanced" },
        familiarity: { label: "balanced" },
        traits: [],
      };

      return {
        member: m,
        profile,
        feedbackProfile,
      };
    })
  );

  // 2. Resolve member exclusions (Interactions & NOT_INTERESTED feedbacks)
  const [memberInteractions, memberFeedbacks] = await Promise.all([
    db.movieInteraction.findMany({
      where: { userId: { in: memberUserIds } },
      select: { userId: true, movieId: true, status: true },
    }),
    db.recommendationFeedback.findMany({
      where: { userId: { in: memberUserIds } },
      select: { userId: true, movieId: true, action: true },
    }),
  ]);

  const excludedMovieIds = new Set<string>();

  const shouldExcludeWatched = isPremiumSession && options?.strictUnwatched !== undefined
    ? options.strictUnwatched
    : sessionInfo.excludeWatched;

  // If excludeWatched is enabled, exclude any movie watched by ANY member
  if (shouldExcludeWatched) {
    for (const i of memberInteractions as any[]) {
      if (i.status === "WATCHED") excludedMovieIds.add(i.movieId);
    }
    for (const f of memberFeedbacks as any[]) {
      if (f.action === "WATCHED_FROM_RECOMMENDATION" || f.action === "ALREADY_WATCHED") {
        excludedMovieIds.add(f.movieId);
      }
    }
  }

  // Exclude movies with NOT_INTERESTED feedback by ANY member
  for (const f of memberFeedbacks as any[]) {
    if (f.action === "NOT_INTERESTED") {
      excludedMovieIds.add(f.movieId);
    }
  }

  // 3. Build candidate query filter with Safety V2
  const whereFilter: any = {
    id: { notIn: Array.from(excludedMovieIds) },
    posterPath: { not: null },
    safetyLevel: {
      notIn: ["ADULT", "EROTIC", "SEXUAL_CONTENT"],
    },
    OR: [
      { normalizedMinimumAge: null },
      { normalizedMinimumAge: { lt: 18 } },
    ],
  };

  // Truthful Advanced Year Filtering (Premium only)
  if (isPremiumSession && options) {
    if (options.minYear || options.maxYear) {
      whereFilter.releaseYear = {};
      if (options.minYear) whereFilter.releaseYear.gte = options.minYear;
      if (options.maxYear) whereFilter.releaseYear.lte = options.maxYear;
    }
  }

  // Query candidate pool (300 candidates)
  let rawCandidates = await db.movie.findMany({
    where: whereFilter,
    orderBy: [
      { calibrationPriorityScore: "desc" },
      { popularity: "desc" },
      { voteAverage: "desc" },
    ],
    take: 300,
  });

  if (rawCandidates.length < 20) {
    await tmdbClient.seedAndFetchMovies();
    rawCandidates = await db.movie.findMany({
      where: whereFilter,
      orderBy: [
        { calibrationPriorityScore: "desc" },
        { popularity: "desc" },
        { voteAverage: "desc" },
      ],
      take: 300,
    });
  }

  const rawCandidatePool: (CandidateMovie & { metadata?: any; adult?: boolean; voteCount?: number })[] = rawCandidates.map((m: any) => {
    const meta = (m.metadata as Record<string, unknown>) || {};
    return {
      id: m.id,
      tmdbId: m.tmdbId,
      title: m.title,
      originalTitle: m.originalTitle,
      releaseYear: m.releaseYear,
      popularity: m.popularity,
      voteAverage: m.voteAverage,
      posterPath: m.posterPath,
      backdropPath: m.backdropPath,
      genres: (meta.genres as string[]) || [],
      overview: (meta.overview as string) || "",
      adult: (meta.adult as boolean) || false,
      voteCount: (meta.voteCount as number) || undefined,
      metadata: meta,
    };
  });

  const candidates: CandidateMovie[] = filterEligibleMovies(rawCandidatePool, "MOVIE_NIGHT");

  // 4. In-Memory Group Match Calculation
  const groupResults: GroupMovieMatchResult[] = candidates.map((movie: any) => {
    const memberInputs: MemberMatchInput[] = memberData.map((d: any) => {
      const matchResult = calculateMovieMatch(movie, d.profile, d.feedbackProfile);
      return {
        userId: d.member.userId,
        userLabel: d.member.userLabel,
        matchResult,
        confidence: d.profile.confidence || 0.5,
      };
    });

    const baseResult = calculateGroupMatch(movie, memberInputs);

    // Apply Mood Preference weighting if Premium Session
    let adjustedScore = baseResult.groupMatchScore;
    const highlights: string[] = [];

    if (isPremiumSession && options?.mood) {
      const mood = options.mood;
      const movieGenres = (movie.genres || []).map((g: string) => g.toLowerCase());

      if (mood === "mind_bending" && (movieGenres.includes("gizem") || movieGenres.includes("bilim kurgu") || movieGenres.includes("gerilim"))) {
        adjustedScore = Math.min(100, adjustedScore + 6);
        highlights.push("Zeka & Gizem ruh haline tam uyumlu");
      } else if (mood === "high_tension" && (movieGenres.includes("gerilim") || movieGenres.includes("aksiyon") || movieGenres.includes("suç"))) {
        adjustedScore = Math.min(100, adjustedScore + 6);
        highlights.push("Yüksek gerilim ve tempo");
      } else if (mood === "comedy" && (movieGenres.includes("komedi") || movieGenres.includes("animasyon"))) {
        adjustedScore = Math.min(100, adjustedScore + 6);
        highlights.push("Kafa dağıtmalık eğlenceli seçim");
      } else if (mood === "romance" && (movieGenres.includes("romantik") || movieGenres.includes("dram"))) {
        adjustedScore = Math.min(100, adjustedScore + 6);
        highlights.push("Romantik ve duygusal atmosfer");
      } else if (mood === "sci_fi" && movieGenres.includes("bilim kurgu")) {
        adjustedScore = Math.min(100, adjustedScore + 6);
        highlights.push("Bilim kurgu dünyası");
      } else if (mood === "masterpiece" && (movie.voteAverage || 0) >= 8.0) {
        adjustedScore = Math.min(100, adjustedScore + 8);
        highlights.push("IMDb 8+ yüksek puanlı başyapıt");
      }
    }

    if (baseResult.memberScores.every((ms) => ms.individualMatchScore >= 75)) {
      highlights.push("Grup genelinde yüksek mutabakat");
    }

    return {
      ...baseResult,
      groupMatchScore: adjustedScore,
      groupMatchHighlights: highlights,
      aiGroupReasoning: null,
    };
  });

  // Shortlist sizing: Free users get max 10; Premium sessions can get up to 20
  const maxLimit = isPremiumSession ? (options?.limit ? Math.min(options.limit, 20) : 15) : 10;

  const topRecommendations = groupResults
    .sort((a, b) => b.groupMatchScore - a.groupMatchScore || b.movie.popularity - a.movie.popularity)
    .slice(0, maxLimit);

  // 5. Optional AI Group Reasoning with Graceful Degradation (never fails recommendation flow)
  if (isPremiumSession && topRecommendations.length > 0) {
    try {
      const top = topRecommendations[0];
      const memberConsensus = top.memberScores.map((ms) => `${ms.userLabel} (%${ms.individualMatchScore})`).join(", ");
      top.aiGroupReasoning = `${top.movie.title}, tüm katılımcıların ortak zevk kümesinde yüksek uyum yakaladı: ${memberConsensus}.`;
    } catch {
      // Graceful fallback - keep recommendations intact
    }
  }

  return {
    session: {
      ...sessionInfo,
      isPremiumSession,
    },
    recommendations: topRecommendations,
    isPremiumSession,
    appliedOptions: isPremiumSession ? options : undefined,
  };
}

/**
 * Casts or updates a member's consensus vote for a movie in a Movie Night session.
 * Invariant: The voting member must have isReady === true.
 */
export async function voteMovieNightMovie(code: string, userId: string, movieId: string) {
  const session = await db.movieNightSession.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });

  if (!session) {
    throw new Error("Movie Night seansı bulunamadı.");
  }

  if (new Date() > session.expiresAt || session.status === MovieNightStatus.EXPIRED) {
    throw new Error("Bu Movie Night seansının süresi dolmuştur.");
  }

  if (session.status === MovieNightStatus.COMPLETED) {
    throw new Error("Tamamlanmış bir seansta oy kullanılamaz.");
  }

  if (session.status === MovieNightStatus.CANCELLED) {
    throw new Error("İptal edilmiş bir seansta oy kullanılamaz.");
  }

  const member = session.members.find((m: any) => m.userId === userId);
  if (!member) {
    throw new Error("Bu seansın üyesi değilsiniz.");
  }

  if (!member.isReady) {
    throw new Error("Oy kullanabilmek için önce hazır durumuna geçmelisiniz.");
  }

  const movie = await db.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    throw new Error("Seçilen film katalogda bulunamadı.");
  }

  if (
    movie.safetyLevel === "ADULT" ||
    movie.safetyLevel === "EROTIC" ||
    movie.safetyLevel === "SEXUAL_CONTENT" ||
    (movie.normalizedMinimumAge !== null && movie.normalizedMinimumAge >= 18)
  ) {
    throw new Error("Bu film Movie Night güvenlik kriterlerine uygun değildir.");
  }

  await db.movieNightVote.upsert({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId,
      },
    },
    update: {
      movieId,
      updatedAt: new Date(),
    },
    create: {
      sessionId: session.id,
      userId,
      movieId,
    },
  });

  return getMovieNightSessionInfo(code, userId);
}

/**
 * Returns canonical vote state for a session.
 */
export async function getMovieNightVoteState(code: string, userId: string) {
  return getMovieNightSessionInfo(code, userId);
}

/**
 * Finalizes Movie Night consensus voting and selects the deterministic winning movie.
 * Host is session coordinator but cannot arbitrarily force an unvoted or losing movie.
 *
 * Winner Deterministic Priority:
 * 1. Highest explicit vote count among READY members
 * 2. Highest SINEAI Group Match Score across members
 * 3. Highest minimum individual member match score (fairness protection)
 * 4. Highest calibrationPriorityScore
 *    (subordinate deterministic fallbacks: voteCount, voteAverage, popularity)
 * 5. Stable movie id order
 */
export async function finalizeMovieNightVoting(code: string, hostUserId: string) {
  const session = await db.movieNightSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: { user: true },
      },
      votes: true,
    },
  });

  if (!session) {
    throw new Error("Movie Night seansı bulunamadı.");
  }

  if (session.hostUserId !== hostUserId) {
    throw new Error("Yalnızca ev sahibi oylamayı sonlandırabilir.");
  }

  if (new Date() > session.expiresAt || session.status === MovieNightStatus.EXPIRED) {
    throw new Error("Bu seansın süresi dolmuştur.");
  }

  if (session.status === MovieNightStatus.COMPLETED) {
    return getMovieNightSessionInfo(code, hostUserId);
  }

  if (session.status === MovieNightStatus.CANCELLED) {
    throw new Error("Bu seans iptal edilmiştir.");
  }

  const readyMembers = session.members.filter((m: any) => m.isReady);
  if (readyMembers.length === 0) {
    throw new Error("Oylamayı sonlandırmak için en az bir hazır katılımcı gereklidir.");
  }

  const readyUserIds = new Set(readyMembers.map((m: any) => m.userId));
  const readyVotes = session.votes.filter((v: any) => readyUserIds.has(v.userId));

  if (readyVotes.length < readyMembers.length) {
    throw new Error("Tüm hazır katılımcılar oy vermeden oylama sonlandırılamaz.");
  }

  // Count votes per movie
  const voteCounts = new Map<string, number>();
  for (const v of readyVotes) {
    voteCounts.set(v.movieId, (voteCounts.get(v.movieId) || 0) + 1);
  }

  const uniqueMovieIds = Array.from(voteCounts.keys());
  const candidateDbMovies = await db.movie.findMany({
    where: { id: { in: uniqueMovieIds } },
  });

  if (candidateDbMovies.length === 0) {
    throw new Error("Oylanan geçerli film bulunamadı.");
  }

  // Pre-fetch all member Film DNA profiles & feedback profiles
  const memberData = await Promise.all(
    session.members.map(async (m: any) => {
      const [profileRes, feedbackProfile] = await Promise.all([
        getOrCalculateUserProfile(m.userId),
        buildUserFeedbackProfile(m.userId),
      ]);

      const profile = (profileRes.profile as FilmDnaResult) || {
        version: 1,
        confidence: 0.2,
        genres: [],
        eras: [],
        popularity: { orientation: "balanced" },
        familiarity: { label: "balanced" },
        traits: [],
      };

      return {
        member: m,
        profile,
        feedbackProfile,
      };
    })
  );

  interface ScoredCandidate {
    id: string;
    voteCount: number;
    groupMatchScore: number;
    minMemberScore: number;
    calibrationPriorityScore: number;
    voteCountCatalog: number;
    voteAverage: number;
    popularity: number;
  }

  const scoredCandidates: ScoredCandidate[] = candidateDbMovies.map((dbMovie: any) => {
    const meta = (dbMovie.metadata as Record<string, unknown>) || {};
    const candidateMovie: CandidateMovie = {
      id: dbMovie.id,
      tmdbId: dbMovie.tmdbId,
      title: dbMovie.title,
      originalTitle: dbMovie.originalTitle,
      releaseYear: dbMovie.releaseYear,
      popularity: dbMovie.popularity,
      voteAverage: dbMovie.voteAverage,
      posterPath: dbMovie.posterPath,
      backdropPath: dbMovie.backdropPath,
      genres: (meta.genres as string[]) || [],
      overview: (meta.overview as string) || "",
    };

    const memberInputs: MemberMatchInput[] = memberData.map((d: any) => {
      const matchResult = calculateMovieMatch(candidateMovie, d.profile, d.feedbackProfile);
      return {
        userId: d.member.userId,
        userLabel: d.member.userLabel,
        matchResult,
        confidence: d.profile.confidence || 0.5,
      };
    });

    const groupResult = calculateGroupMatch(candidateMovie, memberInputs);
    const memberScores = groupResult.memberScores.map((ms) => ms.individualMatchScore);
    const minMemberScore = memberScores.length > 0 ? Math.min(...memberScores) : 0;

    return {
      id: dbMovie.id,
      voteCount: voteCounts.get(dbMovie.id) || 0,
      groupMatchScore: groupResult.groupMatchScore,
      minMemberScore,
      calibrationPriorityScore: dbMovie.calibrationPriorityScore || 0,
      voteCountCatalog: dbMovie.voteCount || 0,
      voteAverage: dbMovie.voteAverage || 0,
      popularity: dbMovie.popularity || 0,
    };
  });

  // Sort candidate movies according to canonical consensus & tie-breaker rules
  scoredCandidates.sort((a, b) => {
    // 1. Highest explicit vote count among READY members
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    // 2. Highest Group Match Score
    if (b.groupMatchScore !== a.groupMatchScore) {
      return b.groupMatchScore - a.groupMatchScore;
    }
    // 3. Highest minimum individual member match score (fairness engine protection)
    if (b.minMemberScore !== a.minMemberScore) {
      return b.minMemberScore - a.minMemberScore;
    }
    // 4. Highest calibrationPriorityScore
    if (b.calibrationPriorityScore !== a.calibrationPriorityScore) {
      return b.calibrationPriorityScore - a.calibrationPriorityScore;
    }
    // Subordinate fallbacks: voteCount, voteAverage, popularity
    if (b.voteCountCatalog !== a.voteCountCatalog) {
      return b.voteCountCatalog - a.voteCountCatalog;
    }
    if (b.voteAverage !== a.voteAverage) {
      return b.voteAverage - a.voteAverage;
    }
    if (b.popularity !== a.popularity) {
      return b.popularity - a.popularity;
    }
    // 5. Stable movie id order
    return a.id.localeCompare(b.id);
  });

  const winningMovieId = scoredCandidates[0].id;

  await db.movieNightSession.update({
    where: { id: session.id },
    data: {
      selectedMovieId: winningMovieId,
      status: MovieNightStatus.COMPLETED,
    },
  });

  return getMovieNightSessionInfo(code, hostUserId);
}

/**
 * Backward compatibility wrapper for /select route.
 * Converts direct selection into consensus finalization, preventing unilateral host selection bypass.
 */
export async function selectMovieNightMovie(code: string, hostUserId: string, _movieId?: string) {
  return finalizeMovieNightVoting(code, hostUserId);
}

