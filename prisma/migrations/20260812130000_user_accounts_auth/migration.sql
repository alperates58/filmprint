-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ANONYMOUS', 'REGISTERED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('ANONYMOUS', 'GOOGLE', 'EMAIL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'ANONYMOUS',
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'ANONYMOUS';

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
