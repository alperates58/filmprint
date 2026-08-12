import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { updateUserInteraction, removeFromWatchLater } from "@/lib/interactions/service";
import { InteractionStatus, RatingStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ movieId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { movieId } = await params;
    const body = await request.json();
    const { status, rating } = body;

    if (!status || !Object.values(InteractionStatus).includes(status)) {
      return NextResponse.json(
        { error: "Geçersiz etkileşim durumu (status)" },
        { status: 400 }
      );
    }

    if (status === InteractionStatus.WATCHED && !rating) {
      return NextResponse.json(
        { error: "İzlenen filmler için derecelendirme (rating) zorunludur" },
        { status: 400 }
      );
    }

    const updated = await updateUserInteraction(
      user.id,
      movieId,
      status as InteractionStatus,
      (rating as RatingStatus) || null
    );

    return NextResponse.json({ success: true, interaction: updated });
  } catch (error) {
    console.error("[PATCH /api/interactions/[movieId] Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Etkileşim güncellenemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ movieId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { movieId } = await params;
    const removed = await removeFromWatchLater(user.id, movieId);

    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error("[DELETE /api/interactions/[movieId] Error]:", error);
    return NextResponse.json(
      { error: "İşlem gerçekleştirilemedi" },
      { status: 500 }
    );
  }
}
