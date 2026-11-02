/** 포인트 규칙: 활동 1건당 점수. 포인트는 원장이 아니라 활동 기록에서 계산 */
export const POINT_RULES = {
  sentCard: 2,
  receivedCard: 3,
  nomination: 1,
  win: 10,
  comment: 1,
  rollingPaperNote: 1,
  missionSubmission: 2,
  missionHost: 3,
  missionBest: 5,
  dinnerVote: 1,
  surveyResponse: 1,
  surveyCreate: 2,
  snackJoin: 1,
  snackTreat: 3,
  boardPost: 2,
  boardComment: 1,
  gameDay: 1,
} as const;

export type PointMetricKey = keyof typeof POINT_RULES;

/** 활동 이름 (설정 화면·내역 표시용) */
export const POINT_LABELS: Record<PointMetricKey, string> = {
  sentCard: '칭찬 보내기',
  receivedCard: '칭찬 받기',
  nomination: '이달의 사원 추천',
  win: '이달의 사원 선정',
  comment: '이달의 사원 댓글',
  rollingPaperNote: '롤링페이퍼 작성',
  missionSubmission: '미션 사진·영상 제출',
  missionHost: '미션 주최',
  missionBest: '미션 베스트 컷 선정',
  dinnerVote: '회식 투표 참여',
  surveyResponse: '설문 응답',
  surveyCreate: '설문 등록',
  snackJoin: '간식 쏘기 참여',
  snackTreat: '간식 쏘기 당첨(쏘기)',
  boardPost: '게시글 작성',
  boardComment: '게시판 댓글',
  gameDay: '게임 플레이(하루 1회)',
};

/** 배지: 활동 수가 목표에 도달하면 획득 */
export const BADGES: { key: string; name: string; icon: string; description: string; metric: keyof typeof POINT_RULES; target: number; repeatable?: boolean }[] = [
  { key: 'FIRST_COMPLIMENT', name: '첫 칭찬', icon: '💌', description: '칭찬 카드를 처음 보냈어요', metric: 'sentCard', target: 1 },
  { key: 'COMPLIMENT_MAKER', name: '칭찬 메이커', icon: '🎁', description: '칭찬 카드를 10장 보냈어요', metric: 'sentCard', target: 10 },
  { key: 'POPULAR', name: '인기쟁이', icon: '⭐', description: '칭찬 카드를 10장 받았어요', metric: 'receivedCard', target: 10 },
  { key: 'NOMINATOR', name: '추천 요정', icon: '🧚', description: '이달의 사원을 5번 추천했어요', metric: 'nomination', target: 5 },
  { key: 'MVP', name: '이달의 사원', icon: '🏅', description: '이달의 사원으로 선정될 때마다 받아요', metric: 'win', target: 1, repeatable: true },
  { key: 'TALKER', name: '소통왕', icon: '💬', description: '댓글을 10개 남겼어요', metric: 'comment', target: 10 },
  { key: 'PAPER_WRITER', name: '롤링페이퍼 작가', icon: '📝', description: '롤링페이퍼에 메시지를 5번 남겼어요', metric: 'rollingPaperNote', target: 5 },
  { key: 'PHOTO_ROOKIE', name: '미션 도전자', icon: '📸', description: '미션에 사진·영상을 5번 올렸어요', metric: 'missionSubmission', target: 5 },
  { key: 'MISSION_HOST', name: '미션 주최자', icon: '🎬', description: '미션을 주최했어요', metric: 'missionHost', target: 1 },
  { key: 'BEST_CUT', name: '베스트 컷', icon: '🏆', description: '미션 베스트 컷에 뽑힐 때마다 받아요', metric: 'missionBest', target: 1, repeatable: true },
  { key: 'VOTER', name: '투표왕', icon: '🗳️', description: '회식 투표에 5번 참여했어요', metric: 'dinnerVote', target: 5 },
  { key: 'SURVEYOR', name: '설문 응답가', icon: '📋', description: '설문에 5번 응답했어요', metric: 'surveyResponse', target: 5 },
  { key: 'SURVEY_MAKER', name: '설문 기획자', icon: '🧪', description: '설문을 3개 등록했어요', metric: 'surveyCreate', target: 3 },
  { key: 'SNACK_ANGEL', name: '간식 기부천사', icon: '🍪', description: '간식 쏘기에 당첨될 때마다 받아요', metric: 'snackTreat', target: 1, repeatable: true },
  { key: 'WRITER', name: '글쓴이', icon: '✍️', description: '게시글을 5개 썼어요', metric: 'boardPost', target: 5 },
  { key: 'COMMENTER', name: '댓글러', icon: '🗨️', description: '게시판 댓글을 20개 남겼어요', metric: 'boardComment', target: 20 },
  { key: 'GAMER', name: '게임 메이트', icon: '🎮', description: '미니게임을 7일 플레이했어요', metric: 'gameDay', target: 7 },
];
