import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { getOrCalculateUserProfile } from "@/lib/profile/service";
import { getProgressionForCount } from "@/lib/progression/service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, image: true },
    });

    const userName = user?.name || "SineAI Sinefil";
    const profileData = await getOrCalculateUserProfile(id);
    const profile = profileData.profile;
    const progression = getProgressionForCount(profileData.current || 0);

    const rankLabel = progression.currentRank.label;
    const confidencePct = profile ? Math.round(profile.confidence * 100) : 100;
    const evaluatedCount = profileData.current || 0;
    const topGenres = profile?.genres.slice(0, 3).map((g) => g.name).join(" • ") || "Dram • Gerilim • Bilim Kurgu";
    const primaryTrait = profile?.traits?.[0] || "Prestij Dram Meraklısı";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#090A0F",
            backgroundImage: "radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.35) 0%, transparent 60%), radial-gradient(circle at 15% 85%, rgba(6, 182, 212, 0.25) 0%, transparent 50%)",
            padding: "60px 80px",
            fontFamily: "sans-serif",
            color: "#FFFFFF",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  backgroundColor: "#8B5CF6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "bold",
                }}
              >
                🧬
              </div>
              <span style={{ fontSize: "36px", fontWeight: "900", letterSpacing: "-1px" }}>
                SINEAI
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#A78BFA",
                  backgroundColor: "rgba(139, 92, 246, 0.2)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                }}
              >
                FILM DNA KİMLİĞİ
              </span>
            </div>

            <div style={{ fontSize: "20px", color: "#94A3B8", fontWeight: "600" }}>
              sineai.com.tr
            </div>
          </div>

          {/* Center Identity Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(22, 24, 34, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "32px",
              padding: "40px",
              gap: "36px",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "28px",
                backgroundColor: "#1E1B4B",
                border: "2px solid rgba(139, 92, 246, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "52px",
                color: "#A78BFA",
                fontWeight: "bold",
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "48px", fontWeight: "bold", letterSpacing: "-1px" }}>
                {userName}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#FBBF24",
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    padding: "6px 14px",
                    borderRadius: "14px",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  🏆 {rankLabel}
                </span>

                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#34D399",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    padding: "6px 14px",
                    borderRadius: "14px",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  %{confidencePct} DNA Güveni ({evaluatedCount} Film)
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Highlights */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "16px", color: "#A78BFA", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                BASKIN ARKETİP & TÜR REZONANSI
              </span>
              <span style={{ fontSize: "24px", color: "#F1F5F9", fontWeight: "600" }}>
                👑 {primaryTrait} • {topGenres}
              </span>
            </div>

            <div
              style={{
                backgroundColor: "#8B5CF6",
                color: "#FFFFFF",
                fontSize: "20px",
                fontWeight: "bold",
                padding: "16px 28px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>Zevkini Karşılaştır</span>
              <span>→</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error("[OG Image Generation Error]:", e);
    return new Response("Failed to generate OG Image", { status: 500 });
  }
}
