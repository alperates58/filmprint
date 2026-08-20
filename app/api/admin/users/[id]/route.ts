import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminUserDetailData } from "@/lib/admin/data";
import { db } from "@/lib/db/client";
import { AccountType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const data = await getAdminUserDetailData(id);
    if (!data) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin User Detail Error]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const body = await request.json();
    const { name, email, accountType } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Check email uniqueness if email is changing
    if (email && email.trim() !== existing.email) {
      const emailExists = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (emailExists && emailExists.id !== id) {
        return NextResponse.json({ error: "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor." }, { status: 400 });
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name?.trim() || null } : {}),
        ...(email !== undefined ? { email: email?.trim() ? email.trim().toLowerCase() : null } : {}),
        ...(accountType && Object.values(AccountType).includes(accountType) ? { accountType } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        accountType: updatedUser.accountType,
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin User Update Error]:", error);
    return NextResponse.json({ error: "Kullanıcı güncellenirken bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Cascade delete user
    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Kullanıcı ve tüm verileri başarıyla silindi." });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[Admin User Delete Error]:", error);
    return NextResponse.json({ error: "Kullanıcı silinirken bir hata oluştu" }, { status: 500 });
  }
}
