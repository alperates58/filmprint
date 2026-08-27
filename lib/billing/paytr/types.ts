export type PaytrProviderLifecycle =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "TESTED"
  | "ACTIVE"
  | "DISABLED"
  | "ERROR";

export type BillingIntervalType = "MONTHLY" | "YEARLY";

export interface PaytrConfig {
  merchantId: string | null;
  merchantKey: string | null;
  merchantSalt: string | null;
  testMode: boolean;
  enabled: boolean;
  billingEnabled: boolean;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  currency: string;
  gracePeriodDays: number;
  recurringEnabled: boolean;
  non3dEnabled: boolean;
  lastTestedAt?: Date | null;
  lastSuccessfulCallback?: Date | null;
  lastCallbackError?: string | null;
  lastProviderError?: string | null;
}

export interface MaskedPaytrConfig {
  merchantId: string | null;
  merchantKeyMasked: string | null;
  merchantSaltMasked: string | null;
  testMode: boolean;
  enabled: boolean;
  billingEnabled: boolean;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  currency: string;
  gracePeriodDays: number;
  recurringEnabled: boolean;
  non3dEnabled: boolean;
  status: PaytrProviderLifecycle;
  callbackUrl: string;
  lastTestedAt: string | null;
  lastSuccessfulCallback: string | null;
  lastCallbackError: string | null;
  lastProviderError: string | null;
}

export interface PaytrBasketItem {
  name: string;
  price: string;
  quantity: number;
}

export interface PaytrIframeTokenRequest {
  merchantOid: string;
  userEmail: string;
  paymentAmount: number; // in kuruş (e.g. 9900 for 99.00 TL)
  userIp: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  userBasket: PaytrBasketItem[];
  okUrl: string;
  failUrl: string;
  currency?: string;
  testMode?: boolean;
  non3d?: boolean;
  utoken?: string;
}

export interface PaytrIframeTokenResponse {
  status: "success" | "failed";
  token?: string;
  iframeUrl?: string;
  reason?: string;
  errorCode?: string;
}

export interface PaytrCallbackPayload {
  merchant_oid: string;
  status: "success" | "failed";
  total_amount: string;
  hash: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  payment_amount?: string;
  payment_type?: string;
  currency?: string;
  test_mode?: string;
  utoken?: string;
  ctoken?: string;
}

export interface PaytrRecurringChargeRequest {
  merchantOid: string;
  userEmail: string;
  paymentAmount: number;
  userIp: string;
  utoken: string;
  ctoken?: string;
  currency?: string;
}

export interface PaytrRecurringChargeResponse {
  status: "success" | "failed";
  merchantOid: string;
  paymentAmount?: number;
  reason?: string;
  errorCode?: string;
}

export interface PaytrRefundRequest {
  merchantOid: string;
  returnAmount: number;
  referenceNo?: string;
}

export interface PaytrRefundResponse {
  status: "success" | "failed";
  merchantOid: string;
  returnAmount: number;
  reason?: string;
  errorCode?: string;
}