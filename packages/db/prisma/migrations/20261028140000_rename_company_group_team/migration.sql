-- 용어 변경: 회사(Company)→그룹(Group), 그룹(Group)→팀(Team)

-- enum
ALTER TYPE "GroupRole" RENAME TO "TeamRole";
ALTER TYPE "GroupVisibility" RENAME TO "TeamVisibility";
ALTER TYPE "CompanyRole" RENAME TO "GroupRole";
ALTER TYPE "CompanyStatus" RENAME TO "GroupStatus";
ALTER TYPE "MembershipStatus" RENAME TO "GroupMembershipStatus";
ALTER TYPE "RequestType" RENAME VALUE 'GROUP_JOIN' TO 'TEAM_JOIN';
ALTER TYPE "RequestType" RENAME VALUE 'COMPANY_JOIN' TO 'GROUP_JOIN';

-- tables
ALTER TABLE "Group" RENAME TO "Team";
ALTER TABLE "Company" RENAME TO "Group";
ALTER TABLE "GroupMember" RENAME TO "TeamMember";
ALTER TABLE "Membership" RENAME TO "GroupMembership";
ALTER TABLE "MembershipRequest" RENAME TO "GroupMembershipRequest";
ALTER TABLE "MembershipRequestGroup" RENAME TO "MembershipRequestTeam";

-- columns
ALTER TABLE "Team" RENAME COLUMN "companyId" TO "groupId";
ALTER TABLE "TeamMember" RENAME COLUMN "groupId" TO "teamId";
ALTER TABLE "TeamMember" RENAME COLUMN "companyId" TO "groupId";
ALTER TABLE "MembershipRequestTeam" RENAME COLUMN "groupId" TO "teamId";
ALTER TABLE "GroupMembership" RENAME COLUMN "companyId" TO "groupId";
ALTER TABLE "GroupMembershipRequest" RENAME COLUMN "companyId" TO "groupId";
ALTER TABLE "AuditLog" RENAME COLUMN "companyId" TO "groupId";

-- constraints and indexes (temp names avoid collisions)
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "Membership_companyId_fkey" TO "tmp_Membership_companyId_fkey";
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "Membership_userId_fkey" TO "tmp_Membership_userId_fkey";
ALTER TABLE "TeamMember" RENAME CONSTRAINT "GroupMember_userId_fkey" TO "tmp_GroupMember_userId_fkey";
ALTER TABLE "TeamMember" RENAME CONSTRAINT "GroupMember_groupId_fkey" TO "tmp_GroupMember_groupId_fkey";
ALTER TABLE "GroupMembershipRequest" RENAME CONSTRAINT "MembershipRequest_companyId_fkey" TO "tmp_MembershipRequest_companyId_fkey";
ALTER TABLE "GroupMembershipRequest" RENAME CONSTRAINT "MembershipRequest_reviewerId_fkey" TO "tmp_MembershipRequest_reviewerId_fkey";
ALTER TABLE "GroupMembershipRequest" RENAME CONSTRAINT "MembershipRequest_userId_fkey" TO "tmp_MembershipRequest_userId_fkey";
ALTER TABLE "MembershipRequestTeam" RENAME CONSTRAINT "MembershipRequestGroup_groupId_fkey" TO "tmp_MembershipRequestGroup_groupId_fkey";
ALTER TABLE "MembershipRequestTeam" RENAME CONSTRAINT "MembershipRequestGroup_requestId_fkey" TO "tmp_MembershipRequestGroup_requestId_fkey";
ALTER TABLE "Team" RENAME CONSTRAINT "Group_companyId_fkey" TO "tmp_Group_companyId_fkey";
ALTER INDEX "Company_pkey" RENAME TO "tmp_Company_pkey";
ALTER INDEX "Membership_pkey" RENAME TO "tmp_Membership_pkey";
ALTER INDEX "Group_pkey" RENAME TO "tmp_Group_pkey";
ALTER INDEX "GroupMember_pkey" RENAME TO "tmp_GroupMember_pkey";
ALTER INDEX "MembershipRequest_pkey" RENAME TO "tmp_MembershipRequest_pkey";
ALTER INDEX "MembershipRequestGroup_pkey" RENAME TO "tmp_MembershipRequestGroup_pkey";
ALTER INDEX "Company_joinCode_key" RENAME TO "tmp_Company_joinCode_key";
ALTER INDEX "Membership_companyId_status_role_idx" RENAME TO "tmp_Membership_companyId_status_role_idx";
ALTER INDEX "Membership_userId_companyId_key" RENAME TO "tmp_Membership_userId_companyId_key";
ALTER INDEX "Group_joinCode_key" RENAME TO "tmp_Group_joinCode_key";
ALTER INDEX "Group_companyId_deletedAt_idx" RENAME TO "tmp_Group_companyId_deletedAt_idx";
ALTER INDEX "GroupMember_companyId_userId_idx" RENAME TO "tmp_GroupMember_companyId_userId_idx";
ALTER INDEX "GroupMember_groupId_userId_key" RENAME TO "tmp_GroupMember_groupId_userId_key";
ALTER INDEX "MembershipRequest_companyId_status_createdAt_idx" RENAME TO "tmp_MembershipRequest_companyId_status_createdAt_idx";
ALTER INDEX "MembershipRequest_userId_status_idx" RENAME TO "tmp_MembershipRequest_userId_status_idx";
ALTER INDEX "AuditLog_companyId_createdAt_idx" RENAME TO "tmp_AuditLog_companyId_createdAt_idx";
ALTER INDEX "Company_name_key" RENAME TO "tmp_Company_name_key";
ALTER INDEX "Group_companyId_name_key" RENAME TO "tmp_Group_companyId_name_key";
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "tmp_Membership_companyId_fkey" TO "GroupMembership_groupId_fkey";
ALTER TABLE "GroupMembership" RENAME CONSTRAINT "tmp_Membership_userId_fkey" TO "GroupMembership_userId_fkey";
ALTER TABLE "TeamMember" RENAME CONSTRAINT "tmp_GroupMember_userId_fkey" TO "TeamMember_userId_fkey";
ALTER TABLE "TeamMember" RENAME CONSTRAINT "tmp_GroupMember_groupId_fkey" TO "TeamMember_teamId_fkey";
ALTER TABLE "GroupMembershipRequest" RENAME CONSTRAINT "tmp_MembershipRequest_companyId_fkey" TO "GroupMembershipRequest_groupId_fkey";
ALTER TABLE "GroupMembershipRequest" RENAME CONSTRAINT "tmp_MembershipRequest_reviewerId_fkey" TO "GroupMembershipRequest_reviewerId_fkey";
ALTER TABLE "GroupMembershipRequest" RENAME CONSTRAINT "tmp_MembershipRequest_userId_fkey" TO "GroupMembershipRequest_userId_fkey";
ALTER TABLE "MembershipRequestTeam" RENAME CONSTRAINT "tmp_MembershipRequestGroup_groupId_fkey" TO "MembershipRequestTeam_teamId_fkey";
ALTER TABLE "MembershipRequestTeam" RENAME CONSTRAINT "tmp_MembershipRequestGroup_requestId_fkey" TO "MembershipRequestTeam_requestId_fkey";
ALTER TABLE "Team" RENAME CONSTRAINT "tmp_Group_companyId_fkey" TO "Team_groupId_fkey";
ALTER INDEX "tmp_Company_pkey" RENAME TO "Group_pkey";
ALTER INDEX "tmp_Membership_pkey" RENAME TO "GroupMembership_pkey";
ALTER INDEX "tmp_Group_pkey" RENAME TO "Team_pkey";
ALTER INDEX "tmp_GroupMember_pkey" RENAME TO "TeamMember_pkey";
ALTER INDEX "tmp_MembershipRequest_pkey" RENAME TO "GroupMembershipRequest_pkey";
ALTER INDEX "tmp_MembershipRequestGroup_pkey" RENAME TO "MembershipRequestTeam_pkey";
ALTER INDEX "tmp_Company_joinCode_key" RENAME TO "Group_joinCode_key";
ALTER INDEX "tmp_Membership_companyId_status_role_idx" RENAME TO "GroupMembership_groupId_status_role_idx";
ALTER INDEX "tmp_Membership_userId_companyId_key" RENAME TO "GroupMembership_userId_groupId_key";
ALTER INDEX "tmp_Group_joinCode_key" RENAME TO "Team_joinCode_key";
ALTER INDEX "tmp_Group_companyId_deletedAt_idx" RENAME TO "Team_groupId_deletedAt_idx";
ALTER INDEX "tmp_GroupMember_companyId_userId_idx" RENAME TO "TeamMember_groupId_userId_idx";
ALTER INDEX "tmp_GroupMember_groupId_userId_key" RENAME TO "TeamMember_teamId_userId_key";
ALTER INDEX "tmp_MembershipRequest_companyId_status_createdAt_idx" RENAME TO "GroupMembershipRequest_groupId_status_createdAt_idx";
ALTER INDEX "tmp_MembershipRequest_userId_status_idx" RENAME TO "GroupMembershipRequest_userId_status_idx";
ALTER INDEX "tmp_AuditLog_companyId_createdAt_idx" RENAME TO "AuditLog_groupId_createdAt_idx";
ALTER INDEX "tmp_Company_name_key" RENAME TO "Group_name_key";
ALTER INDEX "tmp_Group_companyId_name_key" RENAME TO "Team_groupId_name_key";
