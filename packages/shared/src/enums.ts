export const PlatformRole = { USER: 'USER', MASTER: 'MASTER' } as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

export const GroupRole = { ADMIN: 'ADMIN', USER: 'USER' } as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

export const TeamRole = { ADMIN: 'ADMIN', USER: 'USER' } as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

export const RequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const TeamVisibility = { PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE' } as const;
export type TeamVisibility = (typeof TeamVisibility)[keyof typeof TeamVisibility];

/** 사용자 관점 통합 가입 상태 (PLAN §2.4) */
export const JoinStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
} as const;
export type JoinStatus = (typeof JoinStatus)[keyof typeof JoinStatus];

/** 그룹이 MASTER 승인 후 쓸 수 있는 기능 */
export const FeatureKey = { EMPLOYEE_OF_THE_MONTH: 'EMPLOYEE_OF_THE_MONTH', COMPLIMENT_CARD: 'COMPLIMENT_CARD', POINTS_BADGE: 'POINTS_BADGE', MANITTO: 'MANITTO',
  ROLLING_PAPER: 'ROLLING_PAPER',
  PHOTO_MISSION: 'PHOTO_MISSION',
  DINNER_VOTE: 'DINNER_VOTE',
  RANDOM_SURVEY: 'RANDOM_SURVEY',
  SNACK_DRAW: 'SNACK_DRAW',
  BOARD: 'BOARD',
  MINI_GAMES: 'MINI_GAMES',
  DUTY_ROSTER: 'DUTY_ROSTER',
  SUGGESTION_BOX: 'SUGGESTION_BOX',
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

export const FeatureStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' } as const;
export type FeatureStatus = (typeof FeatureStatus)[keyof typeof FeatureStatus];

/** 기능 카테고리 (메뉴·기능 관리 화면 묶음 순서) */
export const FEATURE_CATEGORIES = [
  { key: 'WORK', name: '공통 업무', icon: '🗂️', description: '담당·당번을 함께 정하고 챙겨요' },
  { key: 'RECOGNITION', name: '인정·보상', icon: '🏅', description: '칭찬하고 인정하고 보상해요' },
  { key: 'COMMUNICATION', name: '소통', icon: '💬', description: '글과 의견으로 이야기해요' },
  { key: 'TEAM_EVENT', name: '모임·이벤트', icon: '🎉', description: '함께 정하고 함께 즐겨요' },
  { key: 'GAME', name: '게임', icon: '🎮', description: '가볍게 겨루고 함께 도전해요' },
] as const;
export type FeatureCategory = (typeof FEATURE_CATEGORIES)[number]['key'];

/** 기능 카탈로그 (화면 표시용 이름·설명·카테고리) */
export const FEATURE_CATALOG: { key: FeatureKey; category: FeatureCategory; name: string; description: string }[] = [
  { key: FeatureKey.EMPLOYEE_OF_THE_MONTH, category: 'RECOGNITION', name: '이달의 사원', description: '매달 우수 구성원을 선정해 그룹 홈에 게시합니다.' },
  { key: FeatureKey.COMPLIMENT_CARD, category: 'RECOGNITION', name: '칭찬 카드', description: '동료에게 칭찬 카드를 보내고 월별 칭찬왕을 확인합니다.' },
  { key: FeatureKey.POINTS_BADGE, category: 'RECOGNITION', name: '포인트·배지', description: '칭찬·추천·선정·댓글 활동으로 포인트를 모으고 배지를 얻습니다.' },
  { key: FeatureKey.MANITTO, category: 'TEAM_EVENT', name: '마니또', description: '무작위로 정해진 마니또에게 익명으로 메시지를 보냅니다.' },
  { key: FeatureKey.ROLLING_PAPER, category: 'COMMUNICATION', name: '롤링페이퍼', description: '한 사람을 위한 공개 롤링페이퍼에 포스트잇 메시지를 남깁니다.' },
  { key: FeatureKey.PHOTO_MISSION, category: 'GAME', name: '사진·영상 미션', description: '돌아가며 주제를 던지고, 어울리는 사진·영상을 올려 베스트 컷을 뽑습니다.' },
  { key: FeatureKey.DINNER_VOTE, category: 'TEAM_EVENT', name: '회식 투표', description: '지도에서 회식 후보 장소를 보고 날짜와 장소에 투표합니다.' },
  { key: FeatureKey.RANDOM_SURVEY, category: 'COMMUNICATION', name: '랜덤 설문', description: '누구나 설문을 등록하고, 직접 또는 랜덤한 시점에 진행합니다.' },
  { key: FeatureKey.SNACK_DRAW, category: 'TEAM_EVENT', name: '간식 쏘기 랜덤', description: '카드를 한 장씩 뽑아 간식을 쏘는 당첨자를 정합니다.' },
  { key: FeatureKey.BOARD, category: 'COMMUNICATION', name: '자유 게시판', description: '팀별·그룹 자유 게시판과 댓글입니다.' },
  { key: FeatureKey.SUGGESTION_BOX, category: 'WORK', name: '건의사항', description: '구성원이 건의를 올리고 공감하면, 관리자가 검토 상태와 답변을 남깁니다.' },
  { key: FeatureKey.DUTY_ROSTER, category: 'WORK', name: '공통 업무 담당', description: '비품·간식·청소 같은 공통 업무 담당자를 정하고 순번대로 돌아가며 챙깁니다.' },
  { key: FeatureKey.MINI_GAMES, category: 'GAME', name: '게임', description: '개인전 미니게임, 팀 협동(보스 레이드·사진 빙고), 팀 대결, 비동기 턴제 게임을 포인트로 즐깁니다.' },
];

/** 기능 키 → 카테고리 */
export const featureCategory = (key: string): FeatureCategory | undefined => FEATURE_CATALOG.find((f) => f.key === key)?.category;

/** 카테고리 순서대로 묶기 (빈 카테고리는 제외) */
export function groupByCategory<T>(items: T[], keyOf: (item: T) => string) {
  return FEATURE_CATEGORIES.map((c) => ({ category: c, items: items.filter((i) => featureCategory(keyOf(i)) === c.key) })).filter((g) => g.items.length > 0);
}
