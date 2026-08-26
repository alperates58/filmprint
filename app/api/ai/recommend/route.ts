import { NextResponse } from "next/server";
import { getAiRecommendations } from "@/lib/ai/engine";
import { getOrCreateSession } from "@/lib/session";
import {
  checkAndConsumeDailyQuota,
  refundDailyQuota,
  getDailyQuotaStatus,
} from "@/lib/entitlements/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let sessionUserId: string | null = null;
  let quotaConsumed = false;

  try {
    const session = await getOrCreateSession();
    sessionUserId = session?.userId || null;

    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || "").trim();

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Arama sorgusu boş olamaz.",
          results: [],
        },
        { status: 400 }
      );
    }

    // Atomic Daily Quota Check & Consumption (Server-Side Enforced)
    if (sessionUserId) {
      const quota = await checkAndConsumeDailyQuota(sessionUserId, "AI_DISCOVER");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Bugünkü ücretsiz AI keşif hakkınızı doldurdunuz (${quota.limit}/${quota.limit}).`,
            reason: "QUOTA_EXHAUSTED",
            quota,
            results: [],
          },
          { status: 429 }
        );
      }
      quotaConsumed = true;
    }

    try {
      const response = await getAiRecommendations(query);
      const currentQuota = sessionUserId
        ? await getDailyQuotaStatus(sessionUserId, "AI_DISCOVER")
        : null;

      return NextResponse.json({
        ...response,
        quota: currentQuota,
      });
    } catch (providerError) {
      // LLM Provider failure -> Atomically refund the consumed quota
      if (sessionUserId && quotaConsumed) {
        await refundDailyQuota(sessionUserId, "AI_DISCOVER");
        quotaConsumed = false;
      }
      throw providerError;
    }
  } catch (error: any) {
    if (sessionUserId && quotaConsumed) {
      await refundDailyQuota(sessionUserId, "AI_DISCOVER");
    }
    console.error("[API AI Recommend Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Öneri motoru çalışırken bir hata oluştu.",
        results: [],
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getOrCreateSession();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Quota status inquiry endpoint
    if (action === "quota") {
      const quota = session?.userId
        ? await getDailyQuotaStatus(session.userId, "AI_DISCOVER")
        : await getDailyQuotaStatus("", "AI_DISCOVER");
      return NextResponse.json({ success: true, quota });
    }

    const query = String(searchParams.get("q") || "").trim();
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "q parametresi gereklidir.",
          results: [],
        },
        { status: 400 }
      );
    }

    let sessionUserId = session?.userId || null;
    let quotaConsumed = false;

    if (sessionUserId) {
      const quota = await checkAndConsumeDailyQuota(sessionUserId, "AI_DISCOVER");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Bugünkü ücretsiz AI keşif hakkınızı doldurdunuz (${quota.limit}/${quota.limit}).`,
            reason: "QUOTA_EXHAUSTED",
            quota,
            results: [],
          },
          { status: 429 }
        );
      }
      quotaConsumed = true;
    }

    try {
      const response = await getAiRecommendations(query);
      const currentQuota = sessionUserId
        ? await getDailyQuotaStatus(sessionUserId, "AI_DISCOVER")
        : null;

      return NextResponse.json({
        ...response,
        quota: currentQuota,
      });
    } catch (providerError) {
      if (sessionUserId && quotaConsumed) {
        await refundDailyQuota(sessionUserId, "AI_DISCOVER");
      }
      throw providerError;
    }
  } catch (error: any) {
    console.error("[API AI Recommend GET Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Öneri motoru çalışırken bir hata oluştu.",
        results: [],
      },
      { status: 500 }
    );
  }
}
