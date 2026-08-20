import { NextResponse } from "next/server";
import { requireAdminSession, logAdminAudit } from "@/lib/admin/auth";
import {
  getGrowthCredential,
  saveGrowthCredential,
  GrowthProviderType,
} from "@/lib/growth/credentials";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") as GrowthProviderType | null;

    if (provider && ["google", "bing", "yandex"].includes(provider)) {
      const creds = await getGrowthCredential(provider);
      return NextResponse.json({
        provider: creds.provider,
        isConfigured: creds.isConfigured,
        clientIdMasked: creds.clientIdMasked,
        clientSecretMasked: creds.clientSecretMasked,
        source: creds.source,
      });
    }

    const [google, bing, yandex] = await Promise.all([
      getGrowthCredential("google"),
      getGrowthCredential("bing"),
      getGrowthCredential("yandex"),
    ]);

    return NextResponse.json({
      google: {
        isConfigured: google.isConfigured,
        clientIdMasked: google.clientIdMasked,
        clientSecretMasked: google.clientSecretMasked,
        source: google.source,
      },
      bing: {
        isConfigured: bing.isConfigured,
        clientIdMasked: bing.clientIdMasked,
        clientSecretMasked: bing.clientSecretMasked,
        source: bing.source,
      },
      yandex: {
        isConfigured: yandex.isConfigured,
        clientIdMasked: yandex.clientIdMasked,
        clientSecretMasked: yandex.clientSecretMasked,
        source: yandex.source,
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    return NextResponse.json({ error: "Kimlik bilgileri alınamadı" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();
    const { provider, clientId, clientSecret } = body;

    if (!provider || !["google", "bing", "yandex"].includes(provider)) {
      return NextResponse.json(
        { error: "Geçersiz sağlayıcı (google, bing veya yandex olmalıdır)" },
        { status: 400 }
      );
    }

    const updated = await saveGrowthCredential(provider as GrowthProviderType, {
      clientId,
      clientSecret,
    });

    await logAdminAudit(
      session.id,
      "GROWTH_CREDENTIALS_UPDATED",
      "SystemSetting",
      provider,
      {
        provider,
        clientIdUpdated: clientId !== undefined,
        clientSecretUpdated: Boolean(clientSecret && clientSecret.trim().length > 0),
      }
    );

    return NextResponse.json({
      success: true,
      message: `${provider.toUpperCase()} API kimlik bilgileri başarıyla kaydedildi.`,
      credential: {
        provider: updated.provider,
        isConfigured: updated.isConfigured,
        clientIdMasked: updated.clientIdMasked,
        clientSecretMasked: updated.clientSecretMasked,
        source: updated.source,
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    console.error("[PUT /api/admin/growth/credentials] Error:", error);
    return NextResponse.json({ error: "Kimlik bilgileri kaydedilirken hata oluştu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
