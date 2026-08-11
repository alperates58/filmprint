import { CandidateMovie } from "@/lib/calibration/types";
import { MovieMatchResult } from "@/lib/recommendation/types";
import { GroupMovieMatchResult, GroupMemberScore } from "./types";
import {
  GROUP_MATCH_WEIGHTS,
  PENALTIES,
  BONUS,
  getGroupMatchLabel,
} from "./constants";

export interface MemberMatchInput {
  userId: string;
  userLabel: string;
  matchResult: MovieMatchResult;
  confidence: number;
}

/**
 * Calculates pure, deterministic Group Match Score for a candidate movie
 * across 2 to 6 Movie Night session members (Group Match Engine v1.0).
 */
export function calculateGroupMatch(
  movie: CandidateMovie,
  memberInputs: MemberMatchInput[]
): GroupMovieMatchResult {
  const reasons: string[] = [];

  if (!memberInputs || memberInputs.length === 0) {
    return {
      movie,
      groupMatchScore: 0,
      groupMatchLabel: "Uyumsuz",
      memberScores: [],
      reasons: ["no_members"],
    };
  }

  const memberScores: GroupMemberScore[] = memberInputs.map((m) => {
    // If confidence is low, slightly damp extreme low scores to prevent incomplete profile domination
    let score = m.matchResult.matchScore;
    if (m.confidence < 0.4 && score < 50) {
      score = Math.round(score * 0.7 + 50 * 0.3);
    }
    return {
      userId: m.userId,
      userLabel: m.userLabel,
      individualMatchScore: score,
      confidence: m.confidence,
    };
  });

  const scores = memberScores.map((ms) => ms.individualMatchScore);
  const sum = scores.reduce((a, b) => a + b, 0);
  const averageScore = sum / scores.length;
  const minimumScore = Math.min(...scores);
  const maximumScore = Math.max(...scores);
  const spread = maximumScore - minimumScore;

  // 1. Calculate Base Weighted Score
  let rawGroupScore =
    averageScore * GROUP_MATCH_WEIGHTS.AVERAGE +
    minimumScore * GROUP_MATCH_WEIGHTS.MINIMUM;

  // 2. Apply Fairness Guardrail Penalty (Low minimum score penalty)
  let lowScorePenalty = 0;
  if (minimumScore < 45) {
    lowScorePenalty = Math.abs(PENALTIES.VERY_LOW_MINIMUM);
    reasons.push("very_low_minimum_member_score");
  } else if (minimumScore < 60) {
    lowScorePenalty = Math.abs(PENALTIES.LOW_MINIMUM);
    reasons.push("low_minimum_member_score");
  }

  // 3. Apply Spread Penalty
  const spreadPenalty = Math.round(spread * PENALTIES.SPREAD_FACTOR);
  if (spread > 30) {
    reasons.push("high_score_spread_across_members");
  }

  // 4. Apply Consensus Bonus
  let consensusBonus = 0;
  if (scores.every((s) => s >= 80)) {
    consensusBonus = BONUS.STRONG_CONSENSUS;
    reasons.push("strong_group_consensus");
  } else if (scores.every((s) => s >= 70)) {
    consensusBonus = BONUS.MILD_CONSENSUS;
    reasons.push("good_group_consensus");
  }

  // Calculate Final Bounded Group Score
  rawGroupScore = rawGroupScore - spreadPenalty - lowScorePenalty + consensusBonus;
  const finalGroupMatchScore = Math.max(0, Math.min(100, Math.round(rawGroupScore)));

  return {
    movie,
    groupMatchScore: finalGroupMatchScore,
    groupMatchLabel: getGroupMatchLabel(finalGroupMatchScore),
    memberScores,
    reasons,
  };
}
