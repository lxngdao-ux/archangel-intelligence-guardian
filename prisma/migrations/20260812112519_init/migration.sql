-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ANALYST', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "InvestigationType" AS ENUM ('URL', 'SCREENSHOT', 'PDF', 'IMAGE', 'TEXT', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('PENDING', 'COLLECTING_EVIDENCE', 'ANALYZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('TEXT_EXTRACT', 'OCR_RESULT', 'WEBPAGE_CONTENT', 'METADATA', 'WHOIS_RECORD', 'DNS_RECORD', 'SCREENSHOT_ANALYSIS');

-- CreateEnum
CREATE TYPE "ScamCategory" AS ENUM ('PONZI', 'MLM', 'ADVANCE_FEE', 'ROMANCE_SCAM', 'PHISHING', 'FAKE_JOB', 'FAKE_INVESTMENT', 'URGENCY_TACTIC', 'GUARANTEED_RETURN', 'RECRUITMENT_DEPENDENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('TRANSPARENCY', 'IDENTITY_VERIFICATION', 'REGULATORY_EVIDENCE', 'REPUTATION', 'TECHNICAL_SECURITY', 'SUSTAINABILITY', 'SCAM_PATTERN_MATCH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVESTIGATION_COMPLETED', 'INVESTIGATION_FAILED', 'WATCHLIST_ALERT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "InvestigationType" NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'PENDING',
    "inputText" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "content" JSONB NOT NULL,
    "sourceRef" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "knownAliases" TEXT[],
    "registrationInfo" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "companyId" TEXT,
    "registeredAt" TIMESTAMP(3),
    "registrar" TEXT,
    "sslValid" BOOLEAN,
    "whoisData" JSONB,
    "riskFlags" TEXT[],
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityReference" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "companyId" TEXT,
    "domainId" TEXT,

    CONSTRAINT "EntityReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3),
    "excerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "confidenceType" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskDelta" INTEGER,
    "observationIds" TEXT[],
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "supportingFindingIds" TEXT[],
    "reasoning" TEXT NOT NULL,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutstandingQuestion" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutstandingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScamPattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ScamCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "indicators" JSONB NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScamPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "findings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "rawOutput" JSONB NOT NULL,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "confidenceLevel" "ConfidenceLevel" NOT NULL,
    "summary" TEXT NOT NULL,
    "positiveSignals" JSONB NOT NULL,
    "warningSigns" JSONB NOT NULL,
    "missingInformation" JSONB NOT NULL,
    "detailedFindings" JSONB NOT NULL,
    "recommendedActions" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Investigation_userId_status_idx" ON "Investigation"("userId", "status");

-- CreateIndex
CREATE INDEX "Investigation_organizationId_idx" ON "Investigation"("organizationId");

-- CreateIndex
CREATE INDEX "File_investigationId_idx" ON "File"("investigationId");

-- CreateIndex
CREATE INDEX "Evidence_investigationId_kind_idx" ON "Evidence"("investigationId", "kind");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");

-- CreateIndex
CREATE INDEX "Domain_companyId_idx" ON "Domain"("companyId");

-- CreateIndex
CREATE INDEX "Entity_investigationId_type_idx" ON "Entity"("investigationId", "type");

-- CreateIndex
CREATE INDEX "Entity_investigationId_canonicalKey_idx" ON "Entity"("investigationId", "canonicalKey");

-- CreateIndex
CREATE INDEX "EntityReference_entityId_idx" ON "EntityReference"("entityId");

-- CreateIndex
CREATE INDEX "EntityReference_companyId_idx" ON "EntityReference"("companyId");

-- CreateIndex
CREATE INDEX "EntityReference_domainId_idx" ON "EntityReference"("domainId");

-- CreateIndex
CREATE INDEX "Observation_investigationId_idx" ON "Observation"("investigationId");

-- CreateIndex
CREATE INDEX "Observation_evidenceId_idx" ON "Observation"("evidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_supersedesId_key" ON "Finding"("supersedesId");

-- CreateIndex
CREATE INDEX "Finding_investigationId_idx" ON "Finding"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "Hypothesis_supersedesId_key" ON "Hypothesis"("supersedesId");

-- CreateIndex
CREATE INDEX "Hypothesis_investigationId_idx" ON "Hypothesis"("investigationId");

-- CreateIndex
CREATE INDEX "OutstandingQuestion_investigationId_idx" ON "OutstandingQuestion"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "ScamPattern_name_key" ON "ScamPattern"("name");

-- CreateIndex
CREATE INDEX "ScamPattern_category_idx" ON "ScamPattern"("category");

-- CreateIndex
CREATE INDEX "RiskSignal_investigationId_category_idx" ON "RiskSignal"("investigationId", "category");

-- CreateIndex
CREATE INDEX "AIAnalysis_investigationId_agentName_idx" ON "AIAnalysis"("investigationId", "agentName");

-- CreateIndex
CREATE UNIQUE INDEX "Report_investigationId_key" ON "Report"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportNumber_key" ON "Report"("reportNumber");

-- CreateIndex
CREATE INDEX "Report_reportNumber_idx" ON "Report"("reportNumber");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_createdAt_idx" ON "ActivityLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityReference" ADD CONSTRAINT "EntityReference_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityReference" ADD CONSTRAINT "EntityReference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityReference" ADD CONSTRAINT "EntityReference_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Hypothesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutstandingQuestion" ADD CONSTRAINT "OutstandingQuestion_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
