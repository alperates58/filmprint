import { NextResponse } from "next/server";
import { getAiRecommendations } from "@/lib/ai/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const response = await getAiRecommendations(query);
    return NextResponse.json(response);
  } catch (error: any) {
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
    const { searchParams } = new URL(request.url);
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

    const response = await getAiRecommendations(query);
    return NextResponse.json(response);
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
