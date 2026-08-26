import { getSystemSettings } from '@/lib/config/service';
import { BillingProvider, EffectiveBillingReadiness, BillingPlan, CheckoutSessionResult, WebhookEventResult, SubscriptionStatusResult } from './types';

/**
 * Clean stub provider implementation for Phase P1.
 * Truthfully returns isReady() === false until live gateway integration in next phase.
 */
class StubBillingProvider implements BillingProvider {
  readonly name = 'unconfigured_provider';

  isReady(): boolean {
    return false;
  }

  async createCheckoutSession(userId: string, plan: BillingPlan): Promise<CheckoutSessionResult> {
    throw new Error('BILLING_NOT_CONFIGURED: Ödeme sağlayıcısı henüz aktif değildir.');
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookEventResult> {
    return { event: 'none', handled: false };
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusResult> {
    return { active: false, tier: 'FREE', expiresAt: null };
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    return false;
  }
}

const activeBillingProvider: BillingProvider = new StubBillingProvider();

export function getBillingProvider(): BillingProvider {
  return activeBillingProvider;
}

/**
 * Returns effective billing readiness gate.
 * Requires BOTH admin toggle enabled AND live billing provider ready.
 */
export async function getEffectiveBillingReadiness(): Promise<EffectiveBillingReadiness> {
  const settings = await getSystemSettings();
  const provider = getBillingProvider();
  const providerReady = provider.isReady();
  const adminEnabled = Boolean(settings.adminBillingEnabled);

  return {
    isReady: adminEnabled && providerReady,
    adminEnabled,
    providerReady,
    providerName: provider.name,
  };
}
