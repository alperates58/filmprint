-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCEL_AT_PERIOD_END', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('BILLING', 'MANUAL', 'PROMOTIONAL');

-- AlterTable
ALTER TABLE "UserEntitlement" ADD COLUMN "source" "EntitlementSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYTR',
    "providerCustomerId" TEXT,
    "encryptedUtoken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYTR',
    "providerSubscriptionId" TEXT,
    "planKey" TEXT NOT NULL DEFAULT 'SINEAI_PREMIUM',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "gracePeriodEnd" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'PAYTR',
    "merchantOid" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "paidAt" TIMESTAMP(3),
    "renewalKey" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYTR',
    "providerEventKey" TEXT,
    "merchantOid" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEntitlement_source_idx" ON "UserEntitlement"("source");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_userId_key" ON "BillingCustomer"("userId");

-- CreateIndex
CREATE INDEX "BillingCustomer_provider_idx" ON "BillingCustomer"("provider");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex (Unique single active subscription per user/provider/planKey)
CREATE UNIQUE INDEX "Subscription_user_active_unique" ON "Subscription"("userId", "provider", "planKey") WHERE "status" IN ('ACTIVE', 'PAST_DUE', 'CANCEL_AT_PERIOD_END');

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_merchantOid_key" ON "BillingPayment"("merchantOid");

-- CreateIndex
CREATE INDEX "BillingPayment_userId_idx" ON "BillingPayment"("userId");

-- CreateIndex
CREATE INDEX "BillingPayment_status_idx" ON "BillingPayment"("status");

-- CreateIndex
CREATE INDEX "BillingPayment_merchantOid_idx" ON "BillingPayment"("merchantOid");

-- CreateIndex
CREATE INDEX "BillingPayment_subscriptionId_idx" ON "BillingPayment"("subscriptionId");

-- CreateIndex (Unique non-null renewalKey for duplicate renewal prevention)
CREATE UNIQUE INDEX "BillingPayment_renewalKey_key" ON "BillingPayment"("renewalKey") WHERE "renewalKey" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_merchantOid_payloadHash_key" ON "BillingWebhookEvent"("provider", "merchantOid", "payloadHash");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_merchantOid_idx" ON "BillingWebhookEvent"("merchantOid");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_receivedAt_idx" ON "BillingWebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_status_idx" ON "BillingWebhookEvent"("status");

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;