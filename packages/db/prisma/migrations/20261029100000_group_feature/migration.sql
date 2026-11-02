-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('MONTHLY_EMPLOYEE');

-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "GroupFeature" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "feature" "FeatureKey" NOT NULL,
    "status" "FeatureStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupFeature_status_idx" ON "GroupFeature"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupFeature_groupId_feature_key" ON "GroupFeature"("groupId", "feature");

-- AddForeignKey
ALTER TABLE "GroupFeature" ADD CONSTRAINT "GroupFeature_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
