import { CandidateMovie } from "@/lib/calibration/types";
import { MovieMatchResult } from "@/lib/recommendation/types";
import { MovieNightStatus } from "@prisma/client";

export interface GroupMemberScore {
  userId: string;
  userLabel: string;
  individualMatchScore: number;
  confidence: number;
}

export interface GroupMovieMatchResult {
  movie: CandidateMovie;
  groupMatchScore: number;
  groupMatchLabel: string;
  memberScores: GroupMemberScore[];
  reasons: string[];
}

export interface MovieNightMemberInfo {
  id: string;
  userId: string;
  userLabel: string;
  avatar?: string | null;
  isHost: boolean;
  isReady: boolean;
  isCurrentUser: boolean;
  hasDnaProfile: boolean;
  confidence: number;
  joinedAt: Date;
}

export interface MovieNightSessionInfo {
  id: string;
  code: string;
  hostUserId: string;
  status: MovieNightStatus;
  excludeWatched: Boolean;
  isHost: boolean;
  isMember: boolean;
  isExpired: boolean;
  selectedMovie?: CandidateMovie | null;
  members: MovieNightMemberInfo[];
  createdAt: Date;
  expiresAt: Date;
}

export interface MovieNightRecommendationsResponse {
  session: MovieNightSessionInfo;
  recommendations: GroupMovieMatchResult[];
}
