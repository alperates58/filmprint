import { db } from "@/lib/db/client";
import { createUserSession } from "./service";
import { getOrCalculateUserProfile } from "@/lib/profile/service";

export interface AccountLinkResult {
  userId: string;
  action: "UPGRADED" | "MERGED";
  sessionToken: string;
}

export interface LinkIdentityParams {
  anonymousUserId?: string;
  email: string;
  name?: string;
  image?: string;
  passwordHash?: string;
  provider: "GOOGLE" | "EMAIL";
}

/**
 * Links identity (Google OAuth or Email/Password) to Filmprint account.
 * Upgrades anonymous user or merges anonymous data into existing account in a single transaction.
 */
export async function linkIdentityToAccount(params: LinkIdentityParams): Promise<AccountLinkResult> {
  const normalizedEmail = params.email.toLowerCase().trim();

  // Check if a registered user with this email already exists
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!existingUser) {
    // SCENARIO 1: No existing account with this email. Upgrade current anonymous user.
    if (params.anonymousUserId) {
      const anonUser = await db.user.findUnique({
        where: { id: params.anonymousUserId },
      });

      if (anonUser) {
        const upgradedUser = await db.user.update({
          where: { id: params.anonymousUserId },
          data: {
            email: normalizedEmail,
            name: params.name || anonUser.name || normalizedEmail.split("@")[0],
            image: params.image || anonUser.image,
            passwordHash: params.passwordHash || anonUser.passwordHash,
            accountType: "REGISTERED",
            provider: params.provider,
            updatedAt: new Date(),
          },
        });

        const sessionToken = await createUserSession(upgradedUser.id);
        return {
          userId: upgradedUser.id,
          action: "UPGRADED",
          sessionToken,
        };
      }
    }

    // Fallback if no anonymous user found: Create fresh registered user
    const newUser = await db.user.create({
      data: {
        email: normalizedEmail,
        name: params.name || normalizedEmail.split("@")[0],
        image: params.image,
        passwordHash: params.passwordHash,
        accountType: "REGISTERED",
        provider: params.provider,
      },
    });

    const sessionToken = await createUserSession(newUser.id);
    return {
      userId: newUser.id,
      action: "UPGRADED",
      sessionToken,
    };
  }

  // SCENARIO 2: Account already exists with this email. Merge anonymous data if different.
  if (params.anonymousUserId && params.anonymousUserId !== existingUser.id) {
    await mergeAnonymousUserIntoAccount(params.anonymousUserId, existingUser.id);
  }

  // Update profile info if Google provided newer name/image
  if (params.name || params.image) {
    await db.user.update({
      where: { id: existingUser.id },
      data: {
        ...(params.name && !existingUser.name ? { name: params.name } : {}),
        ...(params.image && !existingUser.image ? { image: params.image } : {}),
      },
    }).catch(() => {});
  }

  const sessionToken = await createUserSession(existingUser.id);
  return {
    userId: existingUser.id,
    action: "MERGED",
    sessionToken,
  };
}

/**
 * Deterministic merge of anonymous user data into existing registered user account inside a single Prisma transaction.
 */
export async function mergeAnonymousUserIntoAccount(
  anonymousUserId: string,
  targetUserId: string
): Promise<void> {
  if (!anonymousUserId || !targetUserId || anonymousUserId === targetUserId) {
    return;
  }

  // Verify anonymous user actually exists in the database
  const anonUser = await db.user.findUnique({
    where: { id: anonymousUserId },
    select: { id: true, accountType: true },
  });

  // If no record exists or it's already a registered user, nothing to merge
  if (!anonUser || anonUser.accountType !== "ANONYMOUS") {
    return;
  }

  const [
    anonInteractions,
    targetInteractions,
    anonTvInteractions,
    targetTvInteractions,
  ] = await Promise.all([
    db.movieInteraction.findMany({ where: { userId: anonymousUserId } }),
    db.movieInteraction.findMany({ where: { userId: targetUserId } }),
    db.tvInteraction.findMany({ where: { userId: anonymousUserId } }),
    db.tvInteraction.findMany({ where: { userId: targetUserId } }),
  ]);

  const targetInteractionMap = new Map(targetInteractions.map((i: any) => [i.movieId, i]));
  const targetTvInteractionMap = new Map(targetTvInteractions.map((i: any) => [i.tvShowId, i]));

  await db.$transaction(async (tx: any) => {
    // 1. Merge MovieInteractions
    for (const anonInt of anonInteractions as any[]) {
      const targetInt: any = targetInteractionMap.get(anonInt.movieId);

      if (!targetInt) {
        // Move interaction to target user
        await tx.movieInteraction.update({
          where: { id: anonInt.id },
          data: { userId: targetUserId },
        });
      } else {
        // Conflict resolution:
        // Prefer WATCHED + rating over NOT_WATCHED
        const anonValue = anonInt.status === "WATCHED" ? 2 : anonInt.status === "UNSURE" ? 1 : 0;
        const targetValue = targetInt.status === "WATCHED" ? 2 : targetInt.status === "UNSURE" ? 1 : 0;

        if (anonValue > targetValue) {
          // Delete target interaction, transfer anon interaction
          await tx.movieInteraction.delete({ where: { id: targetInt.id } });
          await tx.movieInteraction.update({
            where: { id: anonInt.id },
            data: { userId: targetUserId },
          });
        } else {
          // Keep target interaction, delete duplicate anon interaction
          await tx.movieInteraction.delete({ where: { id: anonInt.id } });
        }
      }
    }

    // 2. Merge TvInteractions
    for (const anonTv of anonTvInteractions as any[]) {
      const targetTv: any = targetTvInteractionMap.get(anonTv.tvShowId);

      if (!targetTv) {
        // Move TV interaction to target user
        await tx.tvInteraction.update({
          where: { id: anonTv.id },
          data: { userId: targetUserId },
        });
      } else {
        const getTvScore = (status: string) => {
          if (status === "WATCHED") return 3;
          if (status === "PARTIALLY_WATCHED") return 2;
          if (status === "UNSURE") return 1;
          return 0;
        };

        const anonScore = getTvScore(anonTv.status);
        const targetScore = getTvScore(targetTv.status);

        if (anonScore > targetScore) {
          await tx.tvInteraction.delete({ where: { id: targetTv.id } });
          await tx.tvInteraction.update({
            where: { id: anonTv.id },
            data: { userId: targetUserId },
          });
        } else {
          await tx.tvInteraction.delete({ where: { id: anonTv.id } });
        }
      }
    }

    // 3. Merge Movie RecommendationFeedback
    const anonFeedbacks = await tx.recommendationFeedback.findMany({ where: { userId: anonymousUserId } });
    const targetFeedbacks = await tx.recommendationFeedback.findMany({ where: { userId: targetUserId } });
    const targetFeedbackMap = new Map(targetFeedbacks.map((f: any) => [f.movieId, f]));

    for (const fb of anonFeedbacks as any[]) {
      const targetFb: any = targetFeedbackMap.get(fb.movieId);
      if (!targetFb) {
        await tx.recommendationFeedback.update({
          where: { id: fb.id },
          data: { userId: targetUserId },
        });
      } else {
        // Keep newest feedback, delete older duplicate
        if (fb.updatedAt > targetFb.updatedAt) {
          await tx.recommendationFeedback.delete({ where: { id: targetFb.id } });
          await tx.recommendationFeedback.update({
            where: { id: fb.id },
            data: { userId: targetUserId },
          });
        } else {
          await tx.recommendationFeedback.delete({ where: { id: fb.id } });
        }
      }
    }

    // 4. Merge TV RecommendationFeedback
    const anonTvFeedbacks = await tx.tvRecommendationFeedback.findMany({ where: { userId: anonymousUserId } });
    const targetTvFeedbacks = await tx.tvRecommendationFeedback.findMany({ where: { userId: targetUserId } });
    const targetTvFeedbackMap = new Map(targetTvFeedbacks.map((f: any) => [f.tvShowId, f]));

    for (const fb of anonTvFeedbacks as any[]) {
      const targetFb: any = targetTvFeedbackMap.get(fb.tvShowId);
      if (!targetFb) {
        await tx.tvRecommendationFeedback.update({
          where: { id: fb.id },
          data: { userId: targetUserId },
        });
      } else {
        if (fb.updatedAt > targetFb.updatedAt) {
          await tx.tvRecommendationFeedback.delete({ where: { id: targetFb.id } });
          await tx.tvRecommendationFeedback.update({
            where: { id: fb.id },
            data: { userId: targetUserId },
          });
        } else {
          await tx.tvRecommendationFeedback.delete({ where: { id: fb.id } });
        }
      }
    }

    // 5. Merge RecommendationExplanations
    const anonExplanations = await tx.recommendationExplanation.findMany({ where: { userId: anonymousUserId } });
    for (const exp of anonExplanations as any[]) {
      const exists = await tx.recommendationExplanation.findFirst({
        where: {
          userId: targetUserId,
          movieId: exp.movieId,
          profileVersion: exp.profileVersion,
          matchVersion: exp.matchVersion,
        },
      });
      if (!exists) {
        await tx.recommendationExplanation.update({
          where: { id: exp.id },
          data: { userId: targetUserId },
        });
      } else {
        await tx.recommendationExplanation.delete({ where: { id: exp.id } });
      }
    }

    // 6. Merge Movie Night Sessions & Memberships
    await tx.movieNightSession.updateMany({
      where: { hostUserId: anonymousUserId },
      data: { hostUserId: targetUserId },
    });

    const anonMemberships = await tx.movieNightMember.findMany({ where: { userId: anonymousUserId } });
    for (const m of anonMemberships as any[]) {
      const exists = await tx.movieNightMember.findUnique({
        where: { sessionId_userId: { sessionId: m.sessionId, userId: targetUserId } },
      });
      if (!exists) {
        await tx.movieNightMember.update({
          where: { id: m.id },
          data: { userId: targetUserId },
        });
      } else {
        await tx.movieNightMember.delete({ where: { id: m.id } });
      }
    }

    // 7. Clean up old anonymous sessions, taste profiles and User record safely
    await tx.userSession.deleteMany({ where: { userId: anonymousUserId } });
    await tx.userTasteProfile.deleteMany({ where: { userId: anonymousUserId } });
    await tx.userTvTasteProfile.deleteMany({ where: { userId: anonymousUserId } });
    await tx.user.deleteMany({ where: { id: anonymousUserId } });
  });

  // 8. Recalculate Taste Profile for target user
  await getOrCalculateUserProfile(targetUserId).catch(() => {});
}
