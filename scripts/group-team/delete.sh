#!/usr/bin/env bash
set -euo pipefail

# 사용법: ./scripts/group-team/delete.sh <groupId|--all> [-y]
#   --all 은 모든 그룹을 삭제합니다. -y 를 주면 확인을 생략합니다.
# 삭제 대상: 그룹, 팀, 소속(구성원·팀원), 가입 요청, 기능 신청·승인, 이달의 사원·칭찬·포인트 데이터, 감사 로그
# 계정(User)은 지우지 않습니다. 계정 삭제는 ./scripts/account/delete.sh 를 사용하세요.

DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/../_lib/db.sh"

TARGET="${1:-}"
CONFIRM="${2:-}"
if [ -z "$TARGET" ]; then
  echo "사용법: $0 <groupId|--all> [-y]" >&2
  exit 1
fi

db_require_container

if [ "$TARGET" = "--all" ]; then
  SCOPE_ALL=1
  GROUP_ID=""
  SCOPE_LABEL="모든 그룹"
else
  SCOPE_ALL=0
  GROUP_ID="$TARGET"
  db_validate_id "$GROUP_ID"
  SCOPE_LABEL="그룹 $GROUP_ID"
fi

ARGS=(-tA -v all="$SCOPE_ALL" -v gid="$GROUP_ID")
echo "$SCOPE_LABEL 삭제 대상:"
db_psql "${ARGS[@]}" <<'SQL'
SELECT 'groups=' || count(*) FROM "Group" WHERE :all = 1 OR id = :'gid'
UNION ALL SELECT 'teams=' || count(*) FROM "Team" WHERE :all = 1 OR "groupId" = :'gid'
UNION ALL SELECT 'memberships=' || count(*) FROM "GroupMembership" WHERE :all = 1 OR "groupId" = :'gid'
UNION ALL SELECT 'compliments=' || count(*) FROM "ComplimentCard" WHERE :all = 1 OR "groupId" = :'gid';
SQL

if [ "$CONFIRM" != "-y" ]; then
  read -r -p "삭제할까요? 되돌릴 수 없습니다. (y/N) " answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "취소했습니다."
    exit 0
  fi
fi

db_psql -q -v all="$SCOPE_ALL" -v gid="$GROUP_ID" <<'SQL'
BEGIN;

-- 그룹에 속한 대상 목록 (임시)
CREATE TEMP TABLE _g AS SELECT id FROM "Group" WHERE :all = 1 OR id = :'gid';

-- 칭찬·이달의 사원·포인트·기능 데이터
DELETE FROM "ComplimentReaction" WHERE "cardId" IN (SELECT id FROM "ComplimentCard" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "ComplimentCard" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "ComplimentSetting" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "EmployeeOfTheMonthComment" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "EmployeeOfTheMonthNomination" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "EmployeeOfTheMonth" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "EmployeeOfTheMonthSetting" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "GroupPointRule" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "GroupBadgeRule" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "PointAdjustment" WHERE "groupId" IN (SELECT id FROM _g);
-- 활동 기능 데이터 (마니또·롤링페이퍼·사진 미션·회식 투표·설문·간식·게시판)
DELETE FROM "ManittoMessage" WHERE "assignmentId" IN (SELECT a.id FROM "ManittoAssignment" a JOIN "ManittoRound" r ON r.id = a."roundId" WHERE r."groupId" IN (SELECT id FROM _g));
DELETE FROM "ManittoAssignment" WHERE "roundId" IN (SELECT id FROM "ManittoRound" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "ManittoRound" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "RollingPaperNote" WHERE "paperId" IN (SELECT id FROM "RollingPaper" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "RollingPaper" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "PhotoSubmission" WHERE "missionId" IN (SELECT id FROM "PhotoMission" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "PhotoMission" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "DinnerVote" WHERE "pollId" IN (SELECT id FROM "DinnerPoll" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "DinnerPollDate" WHERE "pollId" IN (SELECT id FROM "DinnerPoll" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "DinnerPollPlace" WHERE "pollId" IN (SELECT id FROM "DinnerPoll" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "DinnerPoll" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "DinnerPlace" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "SurveyResponse" WHERE "surveyId" IN (SELECT id FROM "Survey" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "SurveyQuestion" WHERE "surveyId" IN (SELECT id FROM "Survey" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "Survey" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "SnackSlot" WHERE "gameId" IN (SELECT id FROM "SnackGame" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "SnackParticipant" WHERE "gameId" IN (SELECT id FROM "SnackGame" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "SnackGame" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "BoardComment" WHERE "postId" IN (SELECT id FROM "BoardPost" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "BoardPost" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "GameScore" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "FeatureSetting" WHERE "groupId" IN (SELECT id FROM _g);
-- 포인트 원장, 턴제·빙고·업무·공지·건의·게임 부가 데이터
DELETE FROM "PointLedger" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "TurnGame" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "BingoBoard" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "Duty" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "Notice" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "Suggestion" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "DailyPick" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "GamePhoto" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "ProfileFact" WHERE "groupId" IN (SELECT id FROM _g);
UPDATE "Inquiry" SET "groupId" = NULL WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "GroupFeature" WHERE "groupId" IN (SELECT id FROM _g);

-- 가입 요청과 소속
DELETE FROM "MembershipRequestTeam" WHERE "requestId" IN (SELECT id FROM "GroupMembershipRequest" WHERE "groupId" IN (SELECT id FROM _g));
DELETE FROM "GroupMembershipRequest" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "TeamMember" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "GroupMembership" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "Team" WHERE "groupId" IN (SELECT id FROM _g);

-- 감사 로그와 그룹
DELETE FROM "AuditLog" WHERE "groupId" IN (SELECT id FROM _g);
DELETE FROM "Group" WHERE id IN (SELECT id FROM _g);

COMMIT;
SQL

echo "삭제 완료: $SCOPE_LABEL"
