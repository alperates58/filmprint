import { NextResponse } from "next/server";
import { getAiRecommendations } from "@/lib/ai/engine";
import { getOrCreateSession } from "@/lib/session";
import {
  reserveDailyQuota,
  commitDailyQuotaReservation,
  refundDailyQuotaReservation,
  getDailyQuotaStatus,
} from "@/lib/entitlements/service";
import { AiRecommendationResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let reservationId: string | null = null;

  try {
    // 1. Enforce Server-Side Authentication
    const session = await getOrCreateSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Keşif Stüdyosu'nu kullanmak için giriş yapmalısınız.",
          reason: "AUTHENTICATION_REQUIRED",
          results: [],
        },
        { status: 401 }
      );
    }
    const sessionUserId = session.userId;

    // 2. Validate Input
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

    // 3. Atomically Reserve Quota Unit
    let reservation;
    try {
      reservation = await reserveDailyQuota(sessionUserId, "AI_DISCOVER");
    } catch (err: any) {
      console.error("[API AI Recommend Quota DB Error]: Fail-closed.", err);
      return NextResponse.json(
        {
          success: false,
          error: "Kota servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
          reason: "QUOTA_SERVICE_UNAVAILABLE",
          results: [],
        },
        { status: 503 }
      );
    }

    if (!reservation.allowed) {
      const isPremium = reservation.tier === "PREMIUM";
      return NextResponse.json(
        {
          success: false,
          error: isPremium
            ? "Günlük AI keşif adil kullanım sınırına ulaştınız."
            : `Bugünkü ücretsiz AI keşif hakkınızı doldurdunuz (${reservation.limit}/${reservation.limit}).`,
          reason: isPremium ? "PREMIUM_FAIR_USE_LIMIT" : "QUOTA_EXHAUSTED",
          quota: reservation,
          results: [],
        },
        { status: 429 }
      );
    }

    reservationId = reservation.reservationId;

    // 4. Run AI Recommendation Engine
    let response: AiRecommendationResponse;
    try {
      response = await getAiRecommendations(query);
    } catch (providerError) {
      // Hard failure -> Refund reservation
      if (reservationId) {
        await refundDailyQuotaReservation(reservationId);
        reservationId = null;
      }
      throw providerError;
    }

    // 5. Account Machine-Readable Provider Outcome
    if (response._analysis?.chargeable) {
      if (reservationId) {
        await commitDailyQuotaReservation(reservationId);
      }
    } else {
      // Fallback, missing credentials, or provider error with fallback -> 0 Net consumption
      if (reservationId) {
        await refundDailyQuotaReservation(reservationId);
      }
    }

    const currentQuota = await getDailyQuotaStatus(sessionUserId, "AI_DISCOVER");
    return NextResponse.json({
      ...response,
      quota: currentQuota,
    });
  } catch (error: any) {
    if (reservationId) {
      await refundDailyQuotaReservation(reservationId);
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

    // 1. Enforce Server-Side Authentication
    if (!session || !session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Keşif Stüdyosu'nu kullanmak için giriş yapmalısınız.",
          reason: "AUTHENTICATION_REQUIRED",
          results: [],
        },
        { status: 401 }
      );
    }
    const sessionUserId = session.userId;

    // 2. Validate Input
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

    // 3. Atomically Reserve Quota Unit
    let reservation;
    try {
      reservation = await reserveDailyQuota(sessionUserId, "AI_DISCOVER");
    } catch (err: any) {
      console.error("[API AI Recommend GET Quota DB Error]: Fail-closed.", err);
      return NextResponse.json(
        {
          success: false,
          error: "Kota servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
          reason: "QUOTA_SERVICE_UNAVAILABLE",
          results: [],
        },
        { status: 503 }
      );
    }

    if (!reservation.allowed) {
      const isPremium = reservation.tier === "PREMIUM";
      return NextResponse.json(
        {
          success: false,
          error: isPremium
            ? "Günlük AI keşif adil kullanım sınırına ulaştınız."
            : `Bugünkü ücretsiz AI keşif hakkınızı doldurdunuz (${reservation.limit}/${reservation.limit}).`,
          reason: isPremium ? "PREMIUM_FAIR_USE_LIMIT" : "QUOTA_EXHAUSTED",
          quota: reservation,
          results: [],
        },
        { status: 429 }
      );
    }

    const reservationId = reservation.reservationId;

    // 4. Run AI Engine
    let response: AiRecommendationResponse;
    try {
      response = await getAiRecommendations(query);
    } catch (providerError) {
      if (reservationId) {
        await refundDailyQuotaReservation(reservationId);
      }
      throw providerError;
    }

    // 5. Account Machine-Readable Provider Outcome
    if (response._analysis?.chargeable) {
      if (reservationId) {
        await commitDailyQuotaReservation(reservationId);
      }
    } else {
      if (reservationId) {
        await refundDailyQuotaReservation(reservationId);
      }
    }

    const currentQuota = await getDailyQuotaStatus(sessionUserId, "AI_DISCOVER");
    return NextResponse.json({
      ...response,
      quota: currentQuota,
    });
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
