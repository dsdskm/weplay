-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FeatureKey" ADD VALUE 'ROLLING_PAPER';
ALTER TYPE "FeatureKey" ADD VALUE 'PHOTO_MISSION';
ALTER TYPE "FeatureKey" ADD VALUE 'DINNER_VOTE';
ALTER TYPE "FeatureKey" ADD VALUE 'RANDOM_SURVEY';
ALTER TYPE "FeatureKey" ADD VALUE 'SNACK_DRAW';
ALTER TYPE "FeatureKey" ADD VALUE 'BOARD';

-- CreateTable
CREATE TABLE "FeatureSetting" (
    "groupId" TEXT NOT NULL,
    "feature" "FeatureKey" NOT NULL,
    "values" JSONB NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureSetting_pkey" PRIMARY KEY ("groupId","feature")
);

-- CreateTable
CREATE TABLE "RollingPaper" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'YELLOW',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closeAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollingPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollingPaperNote" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollingPaperNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoMission" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT,
    "referenceUrl" TEXT,
    "referenceType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "PhotoMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoSubmission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinnerPlace" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "category" TEXT,
    "link" TEXT,
    "note" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DinnerPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinnerPoll" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DinnerPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinnerPollDate" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "DinnerPollDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinnerPollPlace" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "DinnerPollPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DinnerVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DinnerVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "launchMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "rejectReason" TEXT,
    "launchAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnackGame" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECRUITING',
    "winnerCount" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "SnackGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnackParticipant" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnackParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnackSlot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isWinner" BOOLEAN NOT NULL,
    "drawnById" TEXT,
    "drawnAt" TIMESTAMP(3),

    CONSTRAINT "SnackSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardPost" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RollingPaper_groupId_status_createdAt_idx" ON "RollingPaper"("groupId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RollingPaper_targetUserId_idx" ON "RollingPaper"("targetUserId");

-- CreateIndex
CREATE INDEX "RollingPaperNote_paperId_createdAt_idx" ON "RollingPaperNote"("paperId", "createdAt");

-- CreateIndex
CREATE INDEX "RollingPaperNote_authorId_idx" ON "RollingPaperNote"("authorId");

-- CreateIndex
CREATE INDEX "PhotoMission_groupId_status_createdAt_idx" ON "PhotoMission"("groupId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoMission_hostId_idx" ON "PhotoMission"("hostId");

-- CreateIndex
CREATE INDEX "PhotoSubmission_missionId_createdAt_idx" ON "PhotoSubmission"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoSubmission_authorId_idx" ON "PhotoSubmission"("authorId");

-- CreateIndex
CREATE INDEX "DinnerPlace_groupId_teamId_idx" ON "DinnerPlace"("groupId", "teamId");

-- CreateIndex
CREATE INDEX "DinnerPoll_groupId_status_createdAt_idx" ON "DinnerPoll"("groupId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DinnerPollDate_pollId_date_key" ON "DinnerPollDate"("pollId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DinnerPollPlace_pollId_placeId_key" ON "DinnerPollPlace"("pollId", "placeId");

-- CreateIndex
CREATE INDEX "DinnerVote_pollId_kind_optionId_idx" ON "DinnerVote"("pollId", "kind", "optionId");

-- CreateIndex
CREATE INDEX "DinnerVote_userId_idx" ON "DinnerVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DinnerVote_pollId_userId_kind_optionId_key" ON "DinnerVote"("pollId", "userId", "kind", "optionId");

-- CreateIndex
CREATE INDEX "Survey_groupId_status_createdAt_idx" ON "Survey"("groupId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyId_position_idx" ON "SurveyQuestion"("surveyId", "position");

-- CreateIndex
CREATE INDEX "SurveyResponse_userId_idx" ON "SurveyResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_surveyId_userId_key" ON "SurveyResponse"("surveyId", "userId");

-- CreateIndex
CREATE INDEX "SnackGame_groupId_status_createdAt_idx" ON "SnackGame"("groupId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SnackParticipant_userId_idx" ON "SnackParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SnackParticipant_gameId_userId_key" ON "SnackParticipant"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SnackSlot_gameId_position_key" ON "SnackSlot"("gameId", "position");

-- CreateIndex
CREATE INDEX "BoardPost_groupId_teamId_createdAt_idx" ON "BoardPost"("groupId", "teamId", "createdAt");

-- CreateIndex
CREATE INDEX "BoardPost_authorId_idx" ON "BoardPost"("authorId");

-- CreateIndex
CREATE INDEX "BoardComment_postId_createdAt_idx" ON "BoardComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "BoardComment_authorId_idx" ON "BoardComment"("authorId");

-- AddForeignKey
ALTER TABLE "FeatureSetting" ADD CONSTRAINT "FeatureSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollingPaper" ADD CONSTRAINT "RollingPaper_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollingPaper" ADD CONSTRAINT "RollingPaper_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollingPaperNote" ADD CONSTRAINT "RollingPaperNote_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "RollingPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollingPaperNote" ADD CONSTRAINT "RollingPaperNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoMission" ADD CONSTRAINT "PhotoMission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoMission" ADD CONSTRAINT "PhotoMission_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSubmission" ADD CONSTRAINT "PhotoSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "PhotoMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSubmission" ADD CONSTRAINT "PhotoSubmission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerPlace" ADD CONSTRAINT "DinnerPlace_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerPoll" ADD CONSTRAINT "DinnerPoll_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerPollDate" ADD CONSTRAINT "DinnerPollDate_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DinnerPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerPollPlace" ADD CONSTRAINT "DinnerPollPlace_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DinnerPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerPollPlace" ADD CONSTRAINT "DinnerPollPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "DinnerPlace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerVote" ADD CONSTRAINT "DinnerVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DinnerPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DinnerVote" ADD CONSTRAINT "DinnerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnackGame" ADD CONSTRAINT "SnackGame_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnackParticipant" ADD CONSTRAINT "SnackParticipant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SnackGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnackParticipant" ADD CONSTRAINT "SnackParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnackSlot" ADD CONSTRAINT "SnackSlot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SnackGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPost" ADD CONSTRAINT "BoardPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPost" ADD CONSTRAINT "BoardPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardComment" ADD CONSTRAINT "BoardComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BoardPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardComment" ADD CONSTRAINT "BoardComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 포인트 기본값 (새 활동)
INSERT INTO "PointRuleDefault" ("metric", "points") VALUES
    ('rollingPaperNote', 1), ('missionSubmission', 2), ('missionHost', 3), ('missionBest', 5),
    ('dinnerVote', 1), ('surveyResponse', 1), ('surveyCreate', 2), ('snackJoin', 1),
    ('snackTreat', 3), ('boardPost', 2), ('boardComment', 1);

-- 배지 기본값 (새 활동)
INSERT INTO "BadgeDefault" ("key", "target", "enabled") VALUES
    ('PAPER_WRITER', 5, true), ('PHOTO_ROOKIE', 5, true), ('MISSION_HOST', 1, true), ('BEST_CUT', 1, true),
    ('VOTER', 5, true), ('SURVEYOR', 5, true), ('SURVEY_MAKER', 3, true), ('SNACK_ANGEL', 1, true),
    ('WRITER', 5, true), ('COMMENTER', 20, true);

