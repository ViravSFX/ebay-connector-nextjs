/*
  Warnings:

  - You are about to drop the column `lastUsed` on the `api_tokens` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `api_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."api_tokens" DROP COLUMN "lastUsed",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."user_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT NOT NULL DEFAULT 'FREE',
    "monthlyApiLimit" INTEGER NOT NULL DEFAULT 1000,
    "allowedEndpoints" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_usage" (
    "id" TEXT NOT NULL,
    "apiTokenId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "requestIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_plans_userId_key" ON "public"."user_plans"("userId");

-- CreateIndex
CREATE INDEX "api_usage_apiTokenId_idx" ON "public"."api_usage"("apiTokenId");

-- CreateIndex
CREATE INDEX "api_usage_createdAt_idx" ON "public"."api_usage"("createdAt");

-- CreateIndex
CREATE INDEX "api_usage_endpoint_idx" ON "public"."api_usage"("endpoint");

-- AddForeignKey
ALTER TABLE "public"."user_plans" ADD CONSTRAINT "user_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_usage" ADD CONSTRAINT "api_usage_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "public"."api_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
