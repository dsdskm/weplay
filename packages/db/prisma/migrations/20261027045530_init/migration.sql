-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'MASTER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('APPROVED', 'LEFT', 'REMOVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('COMPANY_JOIN', 'GROUP_JOIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "googleSub" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "joinCode" TEXT NOT NULL,
    "joinCodeRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinCodeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "primaryAdminId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'USER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'APPROVED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "joinCode" TEXT NOT NULL,
    "joinCodeRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinCodeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipRequest" (
    "id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipRequestGroup" (
    "requestId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "approved" BOOLEAN,

    CONSTRAINT "MembershipRequestGroup_pkey" PRIMARY KEY ("requestId","groupId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "Company_joinCode_key" ON "Company"("joinCode");

-- CreateIndex
CREATE INDEX "Membership_companyId_status_role_idx" ON "Membership"("companyId", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_companyId_key" ON "Membership"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_joinCode_key" ON "Group"("joinCode");

-- CreateIndex
CREATE INDEX "Group_companyId_deletedAt_idx" ON "Group"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "GroupMember_companyId_userId_idx" ON "GroupMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "MembershipRequest_companyId_status_createdAt_idx" ON "MembershipRequest"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MembershipRequest_userId_status_idx" ON "MembershipRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequestGroup" ADD CONSTRAINT "MembershipRequestGroup_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MembershipRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequestGroup" ADD CONSTRAINT "MembershipRequestGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 그룹 담당 ADMIN은 그룹당 1명 (PLAN §4.1)
CREATE UNIQUE INDEX "uniq_group_admin" ON "GroupMember"("groupId") WHERE "role" = 'ADMIN';

-- 회사별 PENDING 요청은 사용자당 1건
CREATE UNIQUE INDEX "uniq_pending_request" ON "MembershipRequest"("userId", "companyId") WHERE "status" = 'PENDING';
