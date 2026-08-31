-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'BOTH');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'SOLD_OUT', 'UPCOMING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PORTAL_WEBHOOK', 'WHATSAPP', 'GMAIL', 'WEBSITE_FORM', 'MANUAL', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('PORTAL_99ACRES', 'PORTAL_MAGICBRICKS', 'PORTAL_HOUSING', 'PORTAL_NOBROKER', 'PORTAL_OTHER', 'WHATSAPP_BUSINESS', 'GMAIL', 'WEBSITE_FORM', 'MANUAL', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "InboundStatus" AS ENUM ('CREATED', 'DUPLICATE', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "StageKey" AS ENUM ('INITIAL_CONTACT', 'NEEDS_ASSESSMENT', 'SITE_VISIT', 'PROPOSAL_SENT', 'NEGOTIATION', 'LEGAL_REVIEW', 'BOOKING_AMOUNT', 'AGREEMENT_SIGNED', 'CLOSURE');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BuyerPersona" AS ENUM ('FIRST_TIME_BUYER', 'NRI_INVESTOR', 'LAND_SPECULATOR', 'RETIREMENT_PLANNER', 'HNI_PORTFOLIO_BUILDER', 'PROFESSIONAL_FIRST_HOME');

-- CreateEnum
CREATE TYPE "ScoreGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "WATrigger" AS ENUM ('LEAD_CREATED', 'STAGE_INITIAL_CONTACT', 'STAGE_NEEDS_ASSESSMENT', 'SITE_VISIT_REMINDER', 'SITE_VISIT_FOLLOWUP', 'PROPOSAL_SENT', 'NEGOTIATION_START', 'STALE_LEAD_7DAYS', 'STALE_LEAD_14DAYS', 'PROJECT_MATCH_FOUND', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WAStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('WEST', 'NORTHWEST', 'NORTH', 'NORTHEAST', 'EAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST');

-- CreateEnum
CREATE TYPE "HeatRating" AS ENUM ('FIRE', 'VERY_HOT', 'HOT', 'WARM', 'EMERGING', 'EARLY');

-- CreateEnum
CREATE TYPE "InvCycle" AS ENUM ('ACT_NOW', 'MID_CYCLE', 'WATCH_AND_BUY', 'PATIENT_CAPITAL');

-- CreateEnum
CREATE TYPE "RRRAlignment" AS ENUM ('NORTH_CORRIDOR', 'SOUTH_CORRIDOR', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('BULLISH', 'NEUTRAL', 'CAUTIOUS');

-- CreateEnum
CREATE TYPE "BroadcastChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('PERSONA', 'LEAD_STATUS', 'PIPELINE_STAGE', 'SCORE_GRADE', 'CORRIDOR_INTEREST', 'BUDGET_RANGE', 'MANUAL_PICK', 'ALL_LEADS');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "InfraCategory" AS ENUM ('ROAD_HIGHWAY', 'METRO_RAIL', 'INDUSTRIAL_ZONE', 'PHARMA_BIOTECH', 'LOGISTICS_PARK', 'AIRPORT_AVIATION', 'GOVT_APPROVAL', 'TOWNSHIP', 'IT_TECH_PARK', 'UTILITY');

-- CreateEnum
CREATE TYPE "InfraStatus" AS ENUM ('ANNOUNCED', 'APPROVED', 'LAND_ACQUISITION', 'UNDER_CONSTRUCTION', 'PARTIALLY_COMPLETE', 'COMPLETE', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'UPCOMING');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('LAYOUT_APPROVAL', 'BUILDING_PERMISSION', 'RERA_REGISTRATION', 'ENVIRONMENTAL_CLEARANCE', 'SEZ_APPROVAL', 'INDUSTRIAL_ALLOTMENT', 'TOWNSHIP_APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalAuth" AS ENUM ('HMDA', 'DTCP', 'GHMC', 'RERA_TELANGANA', 'TSIIC', 'NHAI', 'MOEF', 'GOT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN');

-- CreateEnum
CREATE TYPE "LegalCategory" AS ENUM ('LAND_RECORDS', 'APPROVALS', 'RERA', 'ENCUMBRANCE', 'RESTRICTIONS', 'STAMP_DUTY', 'AGRICULTURAL', 'FRAUD_PATTERN');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('BOOKING_RECEIVED', 'AGREEMENT_SIGNED', 'REGISTERED', 'POSSESSION_RECEIVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SALE_AGREEMENT', 'REGISTRATION', 'PAYMENT_RECEIPT', 'ALLOTMENT_LETTER', 'POSSESSION_LETTER', 'TAX_RECEIPT', 'ENCUMBRANCE_CERT', 'OTHER');

-- CreateEnum
CREATE TYPE "CompareType" AS ENUM ('PROJECT', 'CORRIDOR');

-- CreateEnum
CREATE TYPE "GeomQuality" AS ENUM ('NONE', 'CENTROID_ONLY', 'APPROX_POLYGON', 'SURVEYED');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('EXACT_LGD', 'EXACT_NAME', 'GEOMETRY', 'FUZZY_HIGH', 'FUZZY_REVIEWED', 'MANUAL');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED', 'NO_MATCH');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('CIRCLE_RATE', 'REGISTERED_MEDIAN', 'REGISTERED_MEAN', 'ASKING_MEDIAN', 'BROKER_QUOTE', 'TRANSACTION_ACTUAL');

-- CreateEnum
CREATE TYPE "EntryWindow" AS ENUM ('ACT_NOW', 'ACCUMULATE', 'WATCH', 'FAIRLY_PRICED', 'AVOID');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('INFRASTRUCTURE', 'POLICY_REGULATION', 'MARKET_PRICES', 'PROJECT_LAUNCH', 'INDUSTRIAL_JOBS', 'LEGAL_DISPUTES', 'CIVIC_UTILITIES', 'MACRO_FINANCE');

-- CreateEnum
CREATE TYPE "NewsSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_ATTENTION', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectSource" AS ENUM ('MANUAL', 'BROCHURE_PDF', 'BROCHURE_IMAGES', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "SourceFormat" AS ENUM ('PDF', 'IMAGE_SET', 'MIXED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PARSING', 'RASTERISING', 'EXTRACTING_IMAGES', 'OCR', 'ANALYSING', 'CLASSIFYING', 'NORMALISING', 'VALIDATING', 'READY_FOR_REVIEW', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityVerdict" AS ENUM ('GOOD', 'USABLE', 'POOR', 'UNUSABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ImageRole" AS ENUM ('BROCHURE_PAGE', 'PRICE_LIST', 'MASTER_PLAN', 'FLOOR_PLAN', 'UNIT_PLAN', 'ELEVATION_RENDER', 'AMENITY_LIST', 'SPECIFICATION', 'LOCATION_MAP', 'SITE_PHOTO', 'LISTING_SCREENSHOT', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitCategory" AS ENUM ('APARTMENT', 'PLOT', 'VILLA', 'ROWHOUSE', 'COMMERCIAL', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('SQFT', 'SQYD', 'SQM', 'ACRE', 'GUNTHA', 'CENT', 'ANKANAM');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MASTER_PLAN', 'FLOOR_PLAN', 'UNIT_PLAN', 'ELEVATION', 'INTERIOR_RENDER', 'AMENITY', 'LOCATION_MAP', 'SITE_PHOTO', 'SPECIFICATION_TABLE', 'PRICE_TABLE', 'LOGO', 'DECORATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ExtractMethod" AS ENUM ('EMBEDDED_IMAGE', 'PAGE_RASTER', 'PAGE_CROP', 'DIRECT_UPLOAD');

-- CreateEnum
CREATE TYPE "RightsStatus" AS ENUM ('UNVERIFIED', 'CLEARED', 'RESTRICTED', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "ListingSource" AS ENUM ('ADMIN', 'SELLER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PAUSED', 'EXPIRED', 'SOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('OWNER', 'AGENT', 'BUILDER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'VIEWED', 'RESPONDED', 'CLOSED', 'SPAM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "googleId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "budget" DOUBLE PRECISION,
    "horizon" INTEGER,
    "preferredCity" TEXT DEFAULT 'Hyderabad',
    "riskAppetite" "RiskLevel",
    "profileScore" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "lastDashboardVisitAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "developer" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Hyderabad',
    "minBudgetLakhs" DOUBLE PRECISION NOT NULL,
    "maxBudgetLakhs" DOUBLE PRECISION NOT NULL,
    "minHorizonYears" INTEGER NOT NULL,
    "maxHorizonYears" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "propertyType" TEXT NOT NULL,
    "infraHighlights" TEXT[],
    "exitOpportunities" TEXT[],
    "comparables" TEXT[],
    "description" TEXT NOT NULL,
    "brochureUrl" TEXT,
    "imageUrls" TEXT[],
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewState" "ReviewState" NOT NULL DEFAULT 'PUBLISHED',
    "sourceType" "ProjectSource" NOT NULL DEFAULT 'MANUAL',
    "extractionJobId" TEXT,
    "reraNumber" TEXT,
    "reraUrl" TEXT,
    "possessionDate" TIMESTAMP(3),
    "possessionText" TEXT,
    "totalLandAcres" DOUBLE PRECISION,
    "totalUnits" INTEGER,
    "openSpacePct" DOUBLE PRECISION,
    "towerCount" INTEGER,
    "floorsPerTower" TEXT,
    "amenities" TEXT[],
    "specifications" JSONB,
    "paymentPlan" JSONB,
    "addressLine" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "approvals" TEXT[],
    "ownerId" TEXT,
    "listingSource" "ListingSource" NOT NULL DEFAULT 'ADMIN',
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'APPROVED',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "sellerFeedback" TEXT,
    "rejectReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "villageId" TEXT,
    "surveyNumbers" TEXT[],
    "pinInsideVillage" BOOLEAN,
    "totalAreaSqYd" DOUBLE PRECISION,
    "totalPlots" INTEGER,
    "availablePlots" INTEGER,
    "plotSizesSqYd" DOUBLE PRECISION[],
    "facingOptions" TEXT[],
    "roadWidthFeet" INTEGER,
    "ownershipType" TEXT,
    "landClassification" TEXT,
    "approvalStatus" TEXT,
    "approvalNumber" TEXT,
    "approvalVerified" BOOLEAN NOT NULL DEFAULT false,
    "reraVerified" BOOLEAN NOT NULL DEFAULT false,
    "listingScore" INTEGER,
    "scoreBreakdown" JSONB,
    "scoredAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "enquiryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "horizon" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'portal',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "persona" "BuyerPersona",
    "personaScore" INTEGER,
    "personaUpdatedAt" TIMESTAMP(3),
    "personaReason" TEXT,
    "leadScore" INTEGER DEFAULT 0,
    "leadScoreGrade" "ScoreGrade",
    "leadScoreUpdatedAt" TIMESTAMP(3),
    "leadScoreFactors" JSONB,
    "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptOut" BOOLEAN NOT NULL DEFAULT false,
    "sourceChannel" "SourceChannel",
    "sourceMessageId" TEXT,
    "rawEnquiryText" TEXT,
    "aiExtractedBudget" DOUBLE PRECISION,
    "aiExtractedHorizon" INTEGER,
    "aiExtractedProperty" TEXT,
    "aiConfidenceScore" INTEGER,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fieldMapping" JSONB,
    "autoAssignTo" TEXT,
    "defaultStatus" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "dedupeWindow" INTEGER NOT NULL DEFAULT 24,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "totalDupes" INTEGER NOT NULL DEFAULT 0,
    "lastReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "parsedData" JSONB,
    "status" "InboundStatus" NOT NULL,
    "leadId" TEXT,
    "duplicateOfId" TEXT,
    "failureReason" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailWatchConfig" (
    "id" TEXT NOT NULL,
    "gmailAddress" TEXT NOT NULL,
    "historyId" TEXT,
    "watchExpiry" TIMESTAMP(3),
    "pubSubTopic" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "lastRenewedAt" TIMESTAMP(3),
    "lastEmailAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailWatchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "budget" DOUBLE PRECISION NOT NULL,
    "horizon" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "aiResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadRoadmap" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "targetCloseDate" TIMESTAMP(3),
    "estimatedValue" DOUBLE PRECISION,
    "probability" INTEGER NOT NULL,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapStage" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "stageKey" "StageKey" NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RoadmapStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaConfig" (
    "id" TEXT NOT NULL,
    "persona" "BuyerPersona" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minBudgetLakhs" DOUBLE PRECISION,
    "maxBudgetLakhs" DOUBLE PRECISION,
    "minHorizon" INTEGER,
    "maxHorizon" INTEGER,
    "riskLevels" "RiskLevel"[],
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "defaultProjects" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLeadMatch" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchReasons" TEXT[],
    "isManualTag" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLeadMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "WATrigger" NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "WAStatus" NOT NULL DEFAULT 'PENDING',
    "waMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorridorProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "zone" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heatRating" "HeatRating" NOT NULL,
    "investmentCycle" "InvCycle" NOT NULL,
    "ghmc2025" BOOLEAN NOT NULL DEFAULT false,
    "hmdaJurisdiction" BOOLEAN NOT NULL DEFAULT true,
    "fcdaZone" BOOLEAN NOT NULL DEFAULT false,
    "centroidLat" DOUBLE PRECISION,
    "centroidLng" DOUBLE PRECISION,
    "defaultZoom" INTEGER,
    "rrrAlignment" "RRRAlignment",
    "plotPriceMinSqYd" DOUBLE PRECISION,
    "plotPriceMidSqYd" DOUBLE PRECISION,
    "plotPriceMaxSqYd" DOUBLE PRECISION,
    "aptPriceMinSqFt" DOUBLE PRECISION,
    "aptPriceMaxSqFt" DOUBLE PRECISION,
    "price2020SqYd" DOUBLE PRECISION,
    "price2022SqYd" DOUBLE PRECISION,
    "price2024SqYd" DOUBLE PRECISION,
    "price2026SqYd" DOUBLE PRECISION,
    "appreciationSince2020" DOUBLE PRECISION,
    "historicalCAGR" DOUBLE PRECISION,
    "projectedCAGRMin" DOUBLE PRECISION,
    "projectedCAGRMax" DOUBLE PRECISION,
    "rentalYieldMin" DOUBLE PRECISION,
    "rentalYieldMax" DOUBLE PRECISION,
    "bestHorizonYearsMin" INTEGER,
    "bestHorizonYearsMax" INTEGER,
    "riskLevel" "RiskLevel" NOT NULL,
    "forecast3yrMin" DOUBLE PRECISION,
    "forecast3yrMax" DOUBLE PRECISION,
    "forecast5yrMin" DOUBLE PRECISION,
    "forecast5yrMax" DOUBLE PRECISION,
    "forecast10yrMin" DOUBLE PRECISION,
    "forecast10yrMax" DOUBLE PRECISION,
    "priceIndex2031" INTEGER,
    "overallScore" INTEGER,
    "infraScore" INTEGER,
    "approvalScore" INTEGER,
    "demandScore" INTEGER,
    "appreciationScore" INTEGER,
    "sentiment" "Sentiment",
    "keyDrivers" TEXT[],
    "keyRisks" TEXT[],
    "bestFor" TEXT[],
    "historicalAnalog" TEXT,
    "adminNote" TEXT,
    "subAreas" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorridorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "BroadcastChannel" NOT NULL,
    "templateId" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "whatsappMessage" TEXT,
    "groupType" "GroupType" NOT NULL,
    "groupFilters" JSONB NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "whatsappStatus" "WAStatus",
    "emailStatus" "EmailStatus",
    "whatsappSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "whatsappMessageId" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfraProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "category" "InfraCategory" NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "status" "InfraStatus" NOT NULL,
    "completionPct" INTEGER NOT NULL DEFAULT 0,
    "estimatedCompletion" TEXT,
    "totalLengthKm" DOUBLE PRECISION,
    "totalInvestmentCr" DOUBLE PRECISION,
    "fundingModel" TEXT,
    "expectedJobs" INTEGER,
    "sourceGO" TEXT,
    "sourceTender" TEXT,
    "sourceAuthority" TEXT,
    "sourceUrl" TEXT,
    "lastVerifiedDate" TIMESTAMP(3),
    "lastVerifiedSource" TEXT,
    "routeDescription" TEXT,
    "affectedCorridorSlugs" TEXT[],
    "impactRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "coordinates" JSONB,
    "reImpactScore" INTEGER NOT NULL DEFAULT 0,
    "reImpactNarrative" TEXT,
    "historicalAnalog" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "affectedCorridors" TEXT[],
    "impactRadius" DOUBLE PRECISION NOT NULL DEFAULT 10,

    CONSTRAINT "InfraProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfraMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "description" TEXT,
    "sourceUrl" TEXT,

    CONSTRAINT "InfraMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppreciationHistory" (
    "id" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "pricePerSqFt" DOUBLE PRECISION NOT NULL,
    "pricePerSqYd" DOUBLE PRECISION,
    "yoyChange" DOUBLE PRECISION NOT NULL,
    "qoqChange" DOUBLE PRECISION,
    "sampleSize" INTEGER,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "corridorProfileSlug" TEXT,

    CONSTRAINT "AppreciationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandTrend" (
    "id" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "searchVolume" INTEGER,
    "inquiryCount" INTEGER,
    "siteVisits" INTEGER,
    "newListings" INTEGER,
    "inventoryUnits" INTEGER,
    "soldUnits" INTEGER,
    "absorptionRate" DOUBLE PRECISION,
    "medianDaysOnMkt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "corridorProfileSlug" TEXT,

    CONSTRAINT "DemandTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "developerName" TEXT,
    "approvalType" "ApprovalType" NOT NULL,
    "authority" "ApprovalAuth" NOT NULL,
    "approvalNumber" TEXT,
    "approvalDate" TIMESTAMP(3),
    "corridor" TEXT,
    "areaAcres" DOUBLE PRECISION,
    "surveyNumbers" TEXT[],
    "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "reraNumber" TEXT,
    "reraUrl" TEXT,
    "notes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "corridorProfileSlug" TEXT,

    CONSTRAINT "ApprovalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorridorIntelligence" (
    "id" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "infraScore" INTEGER NOT NULL,
    "approvalScore" INTEGER NOT NULL,
    "demandScore" INTEGER NOT NULL,
    "appreciationScore" INTEGER NOT NULL,
    "investorSentiment" TEXT NOT NULL,
    "adminNote" TEXT,
    "keyDrivers" TEXT[],
    "keyRisks" TEXT[],
    "bestFor" TEXT[],
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "corridorProfileSlug" TEXT,

    CONSTRAINT "CorridorIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalRisk" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "category" "LegalCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "affectedZones" TEXT[],
    "checkUrl" TEXT,
    "checkMethod" TEXT,
    "govReference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPulse" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalRegistrations" INTEGER,
    "totalValueCr" DOUBLE PRECISION,
    "yoyGrowthPct" DOUBLE PRECISION,
    "avgAskingPriceSqFt" DOUBLE PRECISION,
    "avgGovtCircleRateSqFt" DOUBLE PRECISION,
    "gccNewCount" INTEGER,
    "gccTotalPct" DOUBLE PRECISION,
    "officeAbsorptionMSqFt" DOUBLE PRECISION,
    "gccShareOfOffice" DOUBLE PRECISION,
    "source" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "projectId" TEXT NOT NULL,
    "unitNumber" TEXT,
    "areaSqYd" DOUBLE PRECISION,
    "areaSqFt" DOUBLE PRECISION,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "pricePerSqYd" DOUBLE PRECISION,
    "pricePerSqFt" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "registrationDate" TIMESTAMP(3),
    "possessionDate" TIMESTAMP(3),
    "loanAmount" DOUBLE PRECISION,
    "loanBank" TEXT,
    "stampDutyPaid" DOUBLE PRECISION,
    "registrationFee" DOUBLE PRECISION,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'BOOKING_RECEIVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVisibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "sizeBytes" INTEGER,
    "uploadedBy" TEXT,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "searchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "savedProjectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "watchedCorridors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mergedIntoUserId" TEXT,
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "note" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorridorWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "corridorSlug" TEXT NOT NULL,
    "priceAtWatchSqYd" DOUBLE PRECISION,
    "scoreAtWatch" INTEGER,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CorridorWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompareItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "CompareType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompareItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lgdCode" TEXT NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "lgdCode" TEXT NOT NULL,
    "censusCode" TEXT,
    "formedOn" TIMESTAMP(3),
    "supersededOn" TIMESTAMP(3),
    "parentDistrictLgd" TEXT,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandal" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lgdCode" TEXT NOT NULL,
    "censusCode" TEXT,
    "formedOn" TIMESTAMP(3),
    "supersededOn" TIMESTAMP(3),

    CONSTRAINT "Mandal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueVillage" (
    "id" TEXT NOT NULL,
    "mandalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTelugu" TEXT,
    "lgdCode" TEXT NOT NULL,
    "censusCode2011" TEXT,
    "nameNormalised" TEXT NOT NULL,
    "namePhonetic" TEXT NOT NULL,
    "nameTranslit" TEXT,
    "centroidLat" DOUBLE PRECISION,
    "centroidLng" DOUBLE PRECISION,
    "areaHectare" DOUBLE PRECISION,
    "boundaryGeoJSON" JSONB,
    "geomSource" TEXT,
    "geomQuality" "GeomQuality" NOT NULL DEFAULT 'NONE',
    "landUseClass" TEXT,
    "urbanRuralClass" TEXT,
    "underHMDA" BOOLEAN NOT NULL DEFAULT false,
    "underGHMC" BOOLEAN NOT NULL DEFAULT false,
    "underDTCP" BOOLEAN NOT NULL DEFAULT false,
    "underFCDA" BOOLEAN NOT NULL DEFAULT false,
    "underUDA" TEXT,
    "masterPlanZone" TEXT,
    "landIQScore" INTEGER,
    "momentum90d" DOUBLE PRECISION,
    "convictionScore" INTEGER,
    "fairValueSqYd" DOUBLE PRECISION,
    "entryWindow" "EntryWindow",
    "lastScoredAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supersededBy" TEXT,
    "supersededOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueVillage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageAlias" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceIdent" TEXT,
    "rawName" TEXT NOT NULL,
    "rawDistrict" TEXT,
    "rawMandal" TEXT,
    "matchMethod" "MatchMethod" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VillageAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBoundaryHistory" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "districtLgd" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "mandalLgd" TEXT NOT NULL,
    "mandalName" TEXT NOT NULL,
    "changeReason" TEXT,
    "sourceGO" TEXT,

    CONSTRAINT "AdminBoundaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionQueue" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "rawDistrict" TEXT,
    "rawMandal" TEXT,
    "rawPayload" JSONB NOT NULL,
    "candidates" JSONB NOT NULL,
    "topScore" DOUBLE PRECISION,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedToId" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolutionQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldenTestCase" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "rawDistrict" TEXT,
    "rawMandal" TEXT,
    "expectedLgd" TEXT,
    "labelledBy" TEXT NOT NULL,
    "labelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "GoldenTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolverEvalRun" (
    "id" TEXT NOT NULL,
    "resolverVersion" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCases" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "incorrect" INTEGER NOT NULL,
    "unresolved" INTEGER NOT NULL,
    "precision" DOUBLE PRECISION NOT NULL,
    "recall" DOUBLE PRECISION NOT NULL,
    "f1" DOUBLE PRECISION NOT NULL,
    "failureDetail" JSONB NOT NULL,

    CONSTRAINT "ResolverEvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "knownAt" TIMESTAMP(3) NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER,
    "periodQuarter" INTEGER,
    "priceType" "PriceType" NOT NULL,
    "pricePerSqYd" DOUBLE PRECISION,
    "pricePerAcre" DOUBLE PRECISION,
    "sampleSize" INTEGER,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationStat" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "knownAt" TIMESTAMP(3) NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "docCount" INTEGER NOT NULL,
    "saleDeedCount" INTEGER,
    "totalValueLakh" DOUBLE PRECISION,
    "medianPriceSqYd" DOUBLE PRECISION,
    "p25PriceSqYd" DOUBLE PRECISION,
    "p75PriceSqYd" DOUBLE PRECISION,
    "totalExtentSqYd" DOUBLE PRECISION,
    "source" TEXT NOT NULL,

    CONSTRAINT "RegistrationStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfraStatusHistory" (
    "id" TEXT NOT NULL,
    "infraProjectId" TEXT NOT NULL,
    "status" "InfraStatus" NOT NULL,
    "completionPct" INTEGER,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "knownAt" TIMESTAMP(3) NOT NULL,
    "sourceRef" TEXT,
    "sourceUrl" TEXT,

    CONSTRAINT "InfraStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageInfraProximity" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "infraProjectId" TEXT NOT NULL,
    "straightLineKm" DOUBLE PRECISION NOT NULL,
    "roadDistanceKm" DOUBLE PRECISION,
    "commuteMinutes" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VillageInfraProximity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageFeature" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "knownAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "VillageFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorridorVillage" (
    "id" TEXT NOT NULL,
    "corridorSlug" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "CorridorVillage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageRiskFlag" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "detail" TEXT,
    "surveyNumbers" TEXT[],
    "source" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VillageRiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageScore" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "weightProfile" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landIQScore" INTEGER NOT NULL,
    "ippScore" INTEGER NOT NULL,
    "pmvScore" INTEGER NOT NULL,
    "tvlScore" INTEGER NOT NULL,
    "eegScore" INTEGER NOT NULL,
    "devScore" INTEGER NOT NULL,
    "rztScore" INTEGER NOT NULL,
    "demScore" INTEGER NOT NULL,
    "rskScore" INTEGER NOT NULL,
    "convictionScore" INTEGER NOT NULL,
    "momentum90d" DOUBLE PRECISION,
    "momentum365d" DOUBLE PRECISION,
    "fairValueP25" DOUBLE PRECISION,
    "fairValueP50" DOUBLE PRECISION,
    "fairValueP75" DOUBLE PRECISION,
    "valuationGap" DOUBLE PRECISION,
    "return3yP10" DOUBLE PRECISION,
    "return3yP50" DOUBLE PRECISION,
    "return3yP90" DOUBLE PRECISION,
    "return5yP50" DOUBLE PRECISION,
    "return10yP50" DOUBLE PRECISION,
    "entryWindow" "EntryWindow" NOT NULL,
    "topDrivers" JSONB NOT NULL,
    "topRisks" JSONB NOT NULL,
    "aiNarrative" TEXT,

    CONSTRAINT "VillageScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringWeightProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "horizonYearsMin" INTEGER NOT NULL,
    "horizonYearsMax" INTEGER,
    "wIPP" DOUBLE PRECISION NOT NULL,
    "wPMV" DOUBLE PRECISION NOT NULL,
    "wTVL" DOUBLE PRECISION NOT NULL,
    "wEEG" DOUBLE PRECISION NOT NULL,
    "wDEV" DOUBLE PRECISION NOT NULL,
    "wRZT" DOUBLE PRECISION NOT NULL,
    "wDEM" DOUBLE PRECISION NOT NULL,
    "rskExponent" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringWeightProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceDomain" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "providerBlurb" TEXT,
    "cityScope" TEXT NOT NULL,
    "stateScope" TEXT,
    "ourAnalysis" TEXT,
    "category" "NewsCategory" NOT NULL,
    "sentiment" "NewsSentiment" NOT NULL,
    "impactScore" INTEGER NOT NULL DEFAULT 5,
    "corridorSlugs" TEXT[],
    "infraProjectIds" TEXT[],
    "authorities" TEXT[],
    "goReferences" TEXT[],
    "visualSeed" TEXT NOT NULL,
    "visualPalette" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "dedupeHash" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "suppressedAt" TIMESTAMP(3),
    "suppressReason" TEXT,
    "enrichedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsCity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "queryTerms" TEXT[],
    "excludeTerms" TEXT[],
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "articleCount" INTEGER NOT NULL DEFAULT 0,
    "lastIngestAt" TIMESTAMP(3),

    CONSTRAINT "NewsCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "trustTier" INTEGER NOT NULL DEFAULT 2,
    "articleCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsIngestRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cityScope" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "filteredOut" INTEGER NOT NULL DEFAULT 0,
    "enriched" INTEGER NOT NULL DEFAULT 0,
    "stored" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "NewsIngestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL,
    "sourceFormat" "SourceFormat" NOT NULL DEFAULT 'PDF',
    "inputFileCount" INTEGER NOT NULL DEFAULT 1,
    "pageCount" INTEGER,
    "hasTextLayer" BOOLEAN,
    "usedOCR" BOOLEAN NOT NULL DEFAULT false,
    "detectedLanguages" TEXT[],
    "qualityScore" DOUBLE PRECISION,
    "qualityIssues" TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "rawExtraction" JSONB,
    "normalised" JSONB,
    "validation" JSONB,
    "overallConfidence" DOUBLE PRECISION,
    "fieldsExtracted" INTEGER,
    "fieldsLowConfidence" INTEGER,
    "tokensUsed" INTEGER,
    "costEstimateUsd" DOUBLE PRECISION,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "errorStage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionInput" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeKb" INTEGER NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "processedUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "exifOrientation" INTEGER,
    "wasHeicConverted" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION,
    "blurScore" DOUBLE PRECISION,
    "brightnessMean" DOUBLE PRECISION,
    "skewAngleDeg" DOUBLE PRECISION,
    "qualityIssues" TEXT[],
    "qualityVerdict" "QualityVerdict" NOT NULL DEFAULT 'UNKNOWN',
    "declaredRole" "ImageRole",
    "cropRegion" JSONB,
    "rotationDeg" INTEGER NOT NULL DEFAULT 0,
    "enhanceApplied" BOOLEAN NOT NULL DEFAULT false,
    "pageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionPage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "textContent" TEXT,
    "inputId" TEXT,
    "originFormat" "SourceFormat" NOT NULL DEFAULT 'PDF',

    CONSTRAINT "ExtractionPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUnitType" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitCategory" "UnitCategory" NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "balconies" INTEGER,
    "areaValue" DOUBLE PRECISION,
    "areaUnit" "AreaUnit",
    "areaSqFt" DOUBLE PRECISION,
    "areaSqYd" DOUBLE PRECISION,
    "carpetAreaSqFt" DOUBLE PRECISION,
    "builtUpSqFt" DOUBLE PRECISION,
    "superBuiltUpSqFt" DOUBLE PRECISION,
    "priceValue" DOUBLE PRECISION,
    "priceLakh" DOUBLE PRECISION,
    "ratePerSqFt" DOUBLE PRECISION,
    "ratePerSqYd" DOUBLE PRECISION,
    "priceNote" TEXT,
    "facing" TEXT,
    "availableUnits" INTEGER,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "floorPlanMediaId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "sourcePage" INTEGER,
    "sourceSnippet" TEXT,

    CONSTRAINT "ProjectUnitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMedia" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "jobId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "fileSizeKb" INTEGER,
    "perceptualHash" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "typeConfidence" DOUBLE PRECISION,
    "aiCaption" TEXT,
    "altText" TEXT,
    "sourcePage" INTEGER,
    "extractMethod" "ExtractMethod" NOT NULL,
    "rightsStatus" "RightsStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "rightsNote" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFieldAudit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT,
    "fieldPath" TEXT NOT NULL,
    "extractedValue" TEXT,
    "finalValue" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourcePage" INTEGER,
    "sourceSnippet" TEXT,
    "wasCorrected" BOOLEAN NOT NULL DEFAULT false,
    "correctedBy" TEXT,
    "correctedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectFieldAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerType" "SellerType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "firmName" TEXT,
    "reraAgentNumber" TEXT,
    "logoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendReason" TEXT,
    "maxActiveListings" INTEGER NOT NULL DEFAULT 10,
    "totalEnquiries" INTEGER NOT NULL DEFAULT 0,
    "respondedEnquiries" INTEGER NOT NULL DEFAULT 0,
    "avgResponseHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingEnquiry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buyerUserId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "message" TEXT,
    "budgetLakh" DOUBLE PRECISION,
    "leadId" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "sellerViewedAt" TIMESTAMP(3),
    "sellerRespondedAt" TIMESTAMP(3),
    "contactReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingScoreSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingScore" INTEGER NOT NULL,
    "locationScore" INTEGER NOT NULL,
    "priceScore" INTEGER NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "freshnessScore" INTEGER NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "enquiryCount" INTEGER NOT NULL,
    "localityAvgViews" DOUBLE PRECISION,
    "localityAvgEnquiries" DOUBLE PRECISION,

    CONSTRAINT "ListingScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CorridorProfileToInfraProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CorridorProfileToInfraProject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Project_listingStatus_listingScore_idx" ON "Project"("listingStatus", "listingScore");

-- CreateIndex
CREATE INDEX "Project_ownerId_listingStatus_idx" ON "Project"("ownerId", "listingStatus");

-- CreateIndex
CREATE INDEX "Project_listingStatus_latitude_longitude_idx" ON "Project"("listingStatus", "latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "InboundSource_webhookToken_key" ON "InboundSource"("webhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "GmailWatchConfig_gmailAddress_key" ON "GmailWatchConfig"("gmailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LeadRoadmap_leadId_key" ON "LeadRoadmap"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaConfig_persona_key" ON "PersonaConfig"("persona");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLeadMatch_projectId_leadId_key" ON "ProjectLeadMatch"("projectId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_key" ON "WhatsAppTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CorridorProfile_slug_key" ON "CorridorProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DemandTrend_corridor_month_year_key" ON "DemandTrend"("corridor", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CorridorIntelligence_corridor_key" ON "CorridorIntelligence"("corridor");

-- CreateIndex
CREATE UNIQUE INDEX "CorridorIntelligence_corridorProfileSlug_key" ON "CorridorIntelligence"("corridorProfileSlug");

-- CreateIndex
CREATE INDEX "PropertyPurchase_userId_idx" ON "PropertyPurchase"("userId");

-- CreateIndex
CREATE INDEX "PropertyPurchase_projectId_idx" ON "PropertyPurchase"("projectId");

-- CreateIndex
CREATE INDEX "PropertyPurchase_leadId_idx" ON "PropertyPurchase"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousSession_token_key" ON "AnonymousSession"("token");

-- CreateIndex
CREATE INDEX "SavedProject_userId_idx" ON "SavedProject"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedProject_userId_projectId_key" ON "SavedProject"("userId", "projectId");

-- CreateIndex
CREATE INDEX "CorridorWatch_userId_idx" ON "CorridorWatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CorridorWatch_userId_corridorSlug_key" ON "CorridorWatch"("userId", "corridorSlug");

-- CreateIndex
CREATE UNIQUE INDEX "SavedReport_searchId_key" ON "SavedReport"("searchId");

-- CreateIndex
CREATE INDEX "SavedReport_userId_idx" ON "SavedReport"("userId");

-- CreateIndex
CREATE INDEX "CompareItem_userId_idx" ON "CompareItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_userId_itemType_itemId_key" ON "CompareItem"("userId", "itemType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE UNIQUE INDEX "State_lgdCode_key" ON "State"("lgdCode");

-- CreateIndex
CREATE UNIQUE INDEX "District_lgdCode_key" ON "District"("lgdCode");

-- CreateIndex
CREATE INDEX "District_stateId_idx" ON "District"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "District_stateId_code_key" ON "District"("stateId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Mandal_lgdCode_key" ON "Mandal"("lgdCode");

-- CreateIndex
CREATE INDEX "Mandal_districtId_idx" ON "Mandal"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueVillage_lgdCode_key" ON "RevenueVillage"("lgdCode");

-- CreateIndex
CREATE INDEX "RevenueVillage_mandalId_idx" ON "RevenueVillage"("mandalId");

-- CreateIndex
CREATE INDEX "RevenueVillage_nameNormalised_idx" ON "RevenueVillage"("nameNormalised");

-- CreateIndex
CREATE INDEX "RevenueVillage_namePhonetic_idx" ON "RevenueVillage"("namePhonetic");

-- CreateIndex
CREATE INDEX "VillageAlias_source_rawName_idx" ON "VillageAlias"("source", "rawName");

-- CreateIndex
CREATE INDEX "VillageAlias_villageId_idx" ON "VillageAlias"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "VillageAlias_source_rawName_rawDistrict_rawMandal_key" ON "VillageAlias"("source", "rawName", "rawDistrict", "rawMandal");

-- CreateIndex
CREATE INDEX "AdminBoundaryHistory_villageId_effectiveFrom_idx" ON "AdminBoundaryHistory"("villageId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ResolutionQueue_status_topScore_idx" ON "ResolutionQueue"("status", "topScore");

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionQueue_source_rawName_rawDistrict_rawMandal_key" ON "ResolutionQueue"("source", "rawName", "rawDistrict", "rawMandal");

-- CreateIndex
CREATE INDEX "PriceObservation_villageId_observedAt_idx" ON "PriceObservation"("villageId", "observedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_knownAt_idx" ON "PriceObservation"("knownAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceObservation_villageId_periodYear_periodMonth_priceType_key" ON "PriceObservation"("villageId", "periodYear", "periodMonth", "priceType", "source");

-- CreateIndex
CREATE INDEX "RegistrationStat_villageId_observedAt_idx" ON "RegistrationStat"("villageId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationStat_villageId_periodYear_periodMonth_source_key" ON "RegistrationStat"("villageId", "periodYear", "periodMonth", "source");

-- CreateIndex
CREATE INDEX "InfraStatusHistory_infraProjectId_observedAt_idx" ON "InfraStatusHistory"("infraProjectId", "observedAt");

-- CreateIndex
CREATE INDEX "VillageInfraProximity_villageId_idx" ON "VillageInfraProximity"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "VillageInfraProximity_villageId_infraProjectId_key" ON "VillageInfraProximity"("villageId", "infraProjectId");

-- CreateIndex
CREATE INDEX "VillageFeature_villageId_featureKey_observedAt_idx" ON "VillageFeature"("villageId", "featureKey", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VillageFeature_villageId_featureKey_observedAt_source_key" ON "VillageFeature"("villageId", "featureKey", "observedAt", "source");

-- CreateIndex
CREATE INDEX "CorridorVillage_villageId_idx" ON "CorridorVillage"("villageId");

-- CreateIndex
CREATE UNIQUE INDEX "CorridorVillage_corridorSlug_villageId_key" ON "CorridorVillage"("corridorSlug", "villageId");

-- CreateIndex
CREATE INDEX "VillageRiskFlag_villageId_isActive_idx" ON "VillageRiskFlag"("villageId", "isActive");

-- CreateIndex
CREATE INDEX "VillageScore_villageId_weightProfile_scoredAt_idx" ON "VillageScore"("villageId", "weightProfile", "scoredAt");

-- CreateIndex
CREATE INDEX "VillageScore_landIQScore_idx" ON "VillageScore"("landIQScore");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringWeightProfile_name_key" ON "ScoringWeightProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_canonicalUrl_key" ON "NewsArticle"("canonicalUrl");

-- CreateIndex
CREATE INDEX "NewsArticle_cityScope_publishedAt_idx" ON "NewsArticle"("cityScope", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_dedupeHash_idx" ON "NewsArticle"("dedupeHash");

-- CreateIndex
CREATE INDEX "NewsArticle_impactScore_publishedAt_idx" ON "NewsArticle"("impactScore", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_suppressedAt_idx" ON "NewsArticle"("suppressedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsCity_slug_key" ON "NewsCity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_name_key" ON "NewsSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_domain_key" ON "NewsSource"("domain");

-- CreateIndex
CREATE INDEX "ExtractionInput_jobId_displayOrder_idx" ON "ExtractionInput"("jobId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionPage_jobId_pageNumber_key" ON "ExtractionPage"("jobId", "pageNumber");

-- CreateIndex
CREATE INDEX "ProjectUnitType_projectId_idx" ON "ProjectUnitType"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMedia_projectId_mediaType_idx" ON "ProjectMedia"("projectId", "mediaType");

-- CreateIndex
CREATE INDEX "ProjectMedia_jobId_idx" ON "ProjectMedia"("jobId");

-- CreateIndex
CREATE INDEX "ProjectFieldAudit_projectId_idx" ON "ProjectFieldAudit"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFieldAudit_fieldPath_wasCorrected_idx" ON "ProjectFieldAudit"("fieldPath", "wasCorrected");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "ListingEnquiry_projectId_createdAt_idx" ON "ListingEnquiry"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingActivity_projectId_createdAt_idx" ON "ListingActivity"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingScoreSnapshot_projectId_capturedAt_idx" ON "ListingScoreSnapshot"("projectId", "capturedAt");

-- CreateIndex
CREATE INDEX "_CorridorProfileToInfraProject_B_index" ON "_CorridorProfileToInfraProject"("B");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_extractionJobId_fkey" FOREIGN KEY ("extractionJobId") REFERENCES "ExtractionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundLog" ADD CONSTRAINT "InboundLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "InboundSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRoadmap" ADD CONSTRAINT "LeadRoadmap_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapStage" ADD CONSTRAINT "RoadmapStage_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "LeadRoadmap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RoadmapStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLeadMatch" ADD CONSTRAINT "ProjectLeadMatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLeadMatch" ADD CONSTRAINT "ProjectLeadMatch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfraMilestone" ADD CONSTRAINT "InfraMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InfraProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationHistory" ADD CONSTRAINT "AppreciationHistory_corridorProfileSlug_fkey" FOREIGN KEY ("corridorProfileSlug") REFERENCES "CorridorProfile"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandTrend" ADD CONSTRAINT "DemandTrend_corridorProfileSlug_fkey" FOREIGN KEY ("corridorProfileSlug") REFERENCES "CorridorProfile"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRecord" ADD CONSTRAINT "ApprovalRecord_corridorProfileSlug_fkey" FOREIGN KEY ("corridorProfileSlug") REFERENCES "CorridorProfile"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorridorIntelligence" ADD CONSTRAINT "CorridorIntelligence_corridorProfileSlug_fkey" FOREIGN KEY ("corridorProfileSlug") REFERENCES "CorridorProfile"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPurchase" ADD CONSTRAINT "PropertyPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPurchase" ADD CONSTRAINT "PropertyPurchase_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPurchase" ADD CONSTRAINT "PropertyPurchase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PropertyPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PropertyPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProject" ADD CONSTRAINT "SavedProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProject" ADD CONSTRAINT "SavedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorridorWatch" ADD CONSTRAINT "CorridorWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompareItem" ADD CONSTRAINT "CompareItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandal" ADD CONSTRAINT "Mandal_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueVillage" ADD CONSTRAINT "RevenueVillage_mandalId_fkey" FOREIGN KEY ("mandalId") REFERENCES "Mandal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageAlias" ADD CONSTRAINT "VillageAlias_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminBoundaryHistory" ADD CONSTRAINT "AdminBoundaryHistory_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationStat" ADD CONSTRAINT "RegistrationStat_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageInfraProximity" ADD CONSTRAINT "VillageInfraProximity_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageFeature" ADD CONSTRAINT "VillageFeature_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorridorVillage" ADD CONSTRAINT "CorridorVillage_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageRiskFlag" ADD CONSTRAINT "VillageRiskFlag_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageScore" ADD CONSTRAINT "VillageScore_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "RevenueVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionInput" ADD CONSTRAINT "ExtractionInput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionPage" ADD CONSTRAINT "ExtractionPage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUnitType" ADD CONSTRAINT "ProjectUnitType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ExtractionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFieldAudit" ADD CONSTRAINT "ProjectFieldAudit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingEnquiry" ADD CONSTRAINT "ListingEnquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingActivity" ADD CONSTRAINT "ListingActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingScoreSnapshot" ADD CONSTRAINT "ListingScoreSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CorridorProfileToInfraProject" ADD CONSTRAINT "_CorridorProfileToInfraProject_A_fkey" FOREIGN KEY ("A") REFERENCES "CorridorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CorridorProfileToInfraProject" ADD CONSTRAINT "_CorridorProfileToInfraProject_B_fkey" FOREIGN KEY ("B") REFERENCES "InfraProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
