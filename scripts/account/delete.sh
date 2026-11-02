#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/account/delete.sh [-y]
# 삭제 대상: 데모 계정 (username user###, email user###@example.com) 과 그 소속·추천·칭찬·선정·포인트 데이터
# 그룹과 팀은 지우지 않습니다 (group-team/delete.sh).

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/../_lib/db.sh"

CONFIRM="${1:-}"
db_require_container

DEMO_WHERE="username ~ '^user[0-9]{3}$' AND email = username || '@example.com'"
echo "데모 계정 수:"
db_psql -tA -c "SELECT count(*) FROM \"User\" WHERE $DEMO_WHERE"

if [ "$CONFIRM" != "-y" ]; then
  read -r -p "데모 계정을 모두 삭제할까요? 되돌릴 수 없습니다. (y/N) " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "취소했습니다."
    exit 0
  fi
fi

db_psql -q <<SQL
BEGIN;

CREATE TEMP TABLE _del AS SELECT id FROM "User" WHERE $DEMO_WHERE;

DELETE FROM "ComplimentReaction" WHERE "userId" IN (SELECT id FROM _del)
   OR "cardId" IN (SELECT id FROM "ComplimentCard" WHERE "senderId" IN (SELECT id FROM _del) OR "receiverId" IN (SELECT id FROM _del));
DELETE FROM "ComplimentCard" WHERE "senderId" IN (SELECT id FROM _del) OR "receiverId" IN (SELECT id FROM _del);
DELETE FROM "EmployeeOfTheMonthComment" WHERE "authorId" IN (SELECT id FROM _del) OR "targetUserId" IN (SELECT id FROM _del);
DELETE FROM "EmployeeOfTheMonthNomination" WHERE "nominatorId" IN (SELECT id FROM _del) OR "nomineeId" IN (SELECT id FROM _del);
DELETE FROM "EmployeeOfTheMonth" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "PointAdjustment" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "ManittoMessage" WHERE "senderId" IN (SELECT id FROM _del)
   OR "assignmentId" IN (SELECT id FROM "ManittoAssignment" WHERE "giverId" IN (SELECT id FROM _del) OR "receiverId" IN (SELECT id FROM _del));
DELETE FROM "ManittoAssignment" WHERE "giverId" IN (SELECT id FROM _del) OR "receiverId" IN (SELECT id FROM _del);
DELETE FROM "RollingPaperNote" WHERE "authorId" IN (SELECT id FROM _del) OR "paperId" IN (SELECT id FROM "RollingPaper" WHERE "targetUserId" IN (SELECT id FROM _del));
DELETE FROM "RollingPaper" WHERE "targetUserId" IN (SELECT id FROM _del);
DELETE FROM "PhotoSubmission" WHERE "authorId" IN (SELECT id FROM _del) OR "missionId" IN (SELECT id FROM "PhotoMission" WHERE "hostId" IN (SELECT id FROM _del));
DELETE FROM "PhotoMission" WHERE "hostId" IN (SELECT id FROM _del);
DELETE FROM "DinnerVote" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "SurveyResponse" WHERE "userId" IN (SELECT id FROM _del) OR "surveyId" IN (SELECT id FROM "Survey" WHERE "authorId" IN (SELECT id FROM _del));
DELETE FROM "SurveyQuestion" WHERE "surveyId" IN (SELECT id FROM "Survey" WHERE "authorId" IN (SELECT id FROM _del));
DELETE FROM "Survey" WHERE "authorId" IN (SELECT id FROM _del);
UPDATE "SnackSlot" SET "drawnById" = NULL WHERE "drawnById" IN (SELECT id FROM _del);
DELETE FROM "SnackParticipant" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "BoardComment" WHERE "authorId" IN (SELECT id FROM _del) OR "postId" IN (SELECT id FROM "BoardPost" WHERE "authorId" IN (SELECT id FROM _del));
DELETE FROM "BoardPost" WHERE "authorId" IN (SELECT id FROM _del);
DELETE FROM "GameScore" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "PointLedger" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "TurnEntry" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "TurnParticipant" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "BingoCell" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "DutyLog" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "SuggestionVote" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "Suggestion" WHERE "authorId" IN (SELECT id FROM _del);
DELETE FROM "NoticeRead" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "Notice" WHERE "authorId" IN (SELECT id FROM _del);
DELETE FROM "DailyPick" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "GamePhoto" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "ProfileFact" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "TermsAgreement" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "InquiryReply" WHERE "inquiryId" IN (SELECT id FROM "Inquiry" WHERE "userId" IN (SELECT id FROM _del));
DELETE FROM "Inquiry" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "MembershipRequestTeam" WHERE "requestId" IN (
  SELECT id FROM "GroupMembershipRequest" WHERE "userId" IN (SELECT id FROM _del) OR "reviewerId" IN (SELECT id FROM _del));
DELETE FROM "GroupMembershipRequest" WHERE "userId" IN (SELECT id FROM _del) OR "reviewerId" IN (SELECT id FROM _del);
DELETE FROM "TeamMember" WHERE "userId" IN (SELECT id FROM _del);
DELETE FROM "GroupMembership" WHERE "userId" IN (SELECT id FROM _del);
UPDATE "Team" SET "primaryAdminId" = NULL WHERE "primaryAdminId" IN (SELECT id FROM _del);
UPDATE "Group" SET "primaryAdminId" = NULL WHERE "primaryAdminId" IN (SELECT id FROM _del);
DELETE FROM "User" WHERE id IN (SELECT id FROM _del);

COMMIT;
SQL

echo "삭제 완료: 데모 계정"
