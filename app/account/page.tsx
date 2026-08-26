import React from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getAuthenticatedUser } from "@/lib/auth/service";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { getUserEntitlementSummary } from "@/lib/entitlements/service";
import { AccountSettingsForm, AccountSettingsUser } from "@/components/account/AccountSettingsForm";

export default async function AccountSettingsPage() {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !currentUser.isAuthenticated) {
    redirect("/auth");
  }

  const [entitlement, user] = await Promise.all([
    getUserEntitlementSummary(currentUser.id),
    db.user.findUnique({
      where: { id: currentUser.id },
      include: {
        _count: {
          select: { interactions: true },
        },
        tasteProfile: {
          select: { profileJson: true },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/auth");
  }

  const profileJson = (user.tasteProfile?.profileJson as Record<string, any>) || {};
  const settings = profileJson.settings || {};
  const showEmail = settings.showEmail !== false; // Default true

  const initialUser: AccountSettingsUser = {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    image: user.image || null,
    provider: user.provider,
    accountType: user.accountType,
    showEmail,
    interactionCount: user._count.interactions,
    tier: entitlement.tier,
    isPremium: entitlement.isPremium,
    validUntil: entitlement.validUntil,
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary selection:bg-accent selection:text-white font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 animate-fadeIn">
        <div className="space-y-1">
          <span className="text-xs font-mono text-accent uppercase tracking-widest font-bold">
            HESAP AYARLARI & PROFİL
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
            Kullanıcı Profili & Gizlilik
          </h1>
          <p className="text-sm text-text-secondary">
            Profil adını, avatarını ve e-posta görünürlük tercihlerini bu sayfadan yönetebilirsin.
          </p>
        </div>

        <AccountSettingsForm initialUser={initialUser} />
      </main>

      <Footer />
    </div>
  );
}
