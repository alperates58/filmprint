import { NextResponse } from 'next/server';
import { getOrCreateSession } from '@/lib/session';
import { getUserEntitlementSummary } from '@/lib/entitlements/service';
import { getEffectiveBillingReadiness } from '@/lib/billing/service';
import { getSystemSettings } from '@/lib/config/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getOrCreateSession();
    const userId = session?.userId || '';

    const [summary, billingReadiness, settings] = await Promise.all([
      getUserEntitlementSummary(userId),
      getEffectiveBillingReadiness(),
      getSystemSettings(),
    ]);

    return NextResponse.json({
      success: true,
      summary,
      billingReadiness,
      pricing: {
        premiumEnabled: settings.premiumEnabled,
        monthlyPrice: settings.premiumMonthlyPrice,
        annualPrice: settings.premiumAnnualPrice,
        annualDiscountLabel: settings.premiumAnnualDiscountLabel,
        currency: settings.premiumCurrency,
        trialText: settings.premiumTrialText,
      },
    });
  } catch (error: any) {
    console.error('[API Entitlements Me Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Kullanıcı yetkileri alınamadı.' },
      { status: 500 }
    );
  }
}
