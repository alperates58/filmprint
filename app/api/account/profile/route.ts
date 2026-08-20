import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { db } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/security/crypto";

export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        provider: true,
        accountType: true,
        createdAt: true,
        tasteProfile: {
          select: { profileJson: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const profileJson = (user.tasteProfile?.profileJson as Record<string, any>) || {};
    const settings = profileJson.settings || {};
    const showEmail = settings.showEmail !== false; // Default true

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        image: user.image || "",
        provider: user.provider,
        accountType: user.accountType,
        showEmail,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[Account Profile GET Error]:", error);
    return NextResponse.json({ error: "Ayarlar alınamadı" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const { name, image, showEmail, currentPassword, newPassword, confirmPassword } = body;

    const user = await db.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      image?: string | null;
      passwordHash?: string;
    } = {};

    // 1. Validate Name
    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json({ error: "Profil adı en az 2 karakter olmalıdır." }, { status: 400 });
      }
      if (trimmedName.length > 50) {
        return NextResponse.json({ error: "Profil adı 50 karakterden uzun olamaz." }, { status: 400 });
      }
      updateData.name = trimmedName;
    }

    // 2. Validate Image
    if (image !== undefined) {
      if (image === null || image === "") {
        updateData.image = null;
      } else if (typeof image === "string") {
        // Allow data URIs or URLs or preset strings
        if (image.length > 500000) {
          return NextResponse.json({ error: "Görsel boyutu çok yüksek. Lütfen daha küçük bir fotoğraf seçin." }, { status: 400 });
        }
        updateData.image = image;
      }
    }

    // 3. Handle Password Change (if requested and user registered with EMAIL)
    if (newPassword) {
      if (user.provider !== "EMAIL") {
        return NextResponse.json({ error: "Google ile giriş yapılan hesaplarda parola değiştirilemez." }, { status: 400 });
      }

      if (!currentPassword) {
        return NextResponse.json({ error: "Parolanızı değiştirmek için mevcut parolanızı girmelisiniz." }, { status: 400 });
      }

      if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: "Mevcut parolanız hatalı." }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Yeni parola en az 6 karakter olmalıdır." }, { status: 400 });
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "Yeni parolalar birbiriyle eşleşmiyor." }, { status: 400 });
      }

      updateData.passwordHash = hashPassword(newPassword);
    }

    // 4. Update User in DB
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // 5. Update showEmail in TasteProfile JSON settings
    if (typeof showEmail === "boolean") {
      const tasteProfile = await db.userTasteProfile.findUnique({
        where: { userId: user.id },
      });

      const profileJson = (tasteProfile?.profileJson as Record<string, any>) || {};
      const settings = profileJson.settings || {};
      settings.showEmail = showEmail;
      profileJson.settings = settings;

      await db.userTasteProfile.upsert({
        where: { userId: user.id },
        update: { profileJson },
        create: {
          userId: user.id,
          profileJson,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profil ayarlarınız başarıyla güncellendi.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        image: updatedUser.image,
        email: updatedUser.email,
        showEmail: typeof showEmail === "boolean" ? showEmail : true,
      },
    });
  } catch (error) {
    console.error("[Account Profile PATCH Error]:", error);
    return NextResponse.json({ error: "Profil güncellenirken bir hata oluştu" }, { status: 500 });
  }
}
