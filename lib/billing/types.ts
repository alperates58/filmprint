export type BillingPlan = "monthly" | "annual";

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId?: string;
}

export interface WebhookEventResult {
  event: string;
  handled: boolean;
}

export interface SubscriptionStatusResult {
  active: boolean;
  tier: "FREE" | "PREMIUM";
  expiresAt?: Date | null;
}

export interface BillingProvider {
  readonly name: string;
  isReady(): Promise<boolean> | boolean;
  createCheckoutSession(userId: string, plan: BillingPlan): Promise<CheckoutSessionResult>;
  handleWebhook(payload: any, signature?: string): Promise<WebhookEventResult>;
  getSubscriptionStatus(userId: string): Promise<SubscriptionStatusResult>;
  cancelSubscription(userId: string): Promise<boolean>;
}

export interface EffectiveBillingReadiness {
  isReady: boolean;
  adminEnabled: boolean;
  providerReady: boolean;
  providerName: string;
  pricing?: {
    monthlyPrice: number | null;
    yearlyPrice: number | null;
    currency: string;
  };
}