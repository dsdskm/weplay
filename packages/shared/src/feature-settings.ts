import { FeatureKey } from './enums';

/** 기능별 관리자 설정 항목. 설정이 없으면 default 사용 */
export interface SettingField {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  help?: string;
}

export type SettingValues = Record<string, number | boolean | string>;

export const FEATURE_SETTINGS: Partial<Record<FeatureKey, SettingField[]>> = {
  ROLLING_PAPER: [
    { key: 'memberCanCreate', label: '구성원도 롤링페이퍼 만들기', type: 'boolean', default: true, help: '끄면 관리자만 만들 수 있어요' },
    { key: 'maxNotesPerMember', label: '한 사람당 최대 메시지 수 (페이퍼당)', type: 'number', default: 3, min: 1, max: 20 },
    { key: 'maxNoteLength', label: '메시지 최대 글자 수', type: 'number', default: 200, min: 20, max: 500 },
    { key: 'anonymousAllowed', label: '익명으로 쓰기 허용', type: 'boolean', default: true },
  ],
  PHOTO_MISSION: [
    {
      key: 'rotationMode',
      label: '주최 방식',
      type: 'select',
      default: 'ROTATION',
      options: [
        { value: 'ROTATION', label: '돌아가며 (가장 적게 주최한 사람 차례)' },
        { value: 'ANYONE', label: '누구나' },
        { value: 'ADMIN_ONLY', label: '관리자만' },
      ],
    },
    { key: 'maxSubmissionsPerMember', label: '한 사람당 최대 제출 수 (미션당)', type: 'number', default: 3, min: 1, max: 10 },
    { key: 'bestCount', label: '베스트 컷 개수', type: 'number', default: 1, min: 1, max: 3 },
    { key: 'durationHours', label: '기본 진행 시간(시간)', type: 'number', default: 72, min: 1, max: 720 },
    { key: 'allowVideo', label: '영상 업로드 허용', type: 'boolean', default: true },
    { key: 'entryFee', label: '사진·영상 1개 올릴 때 참가비(포인트)', type: 'number', default: 1, min: 0, max: 100, help: '잔액이 0이어도 올릴 수 있고 마이너스가 될 수 있어요. 지우면 돌려받아요' },
  ],
  DINNER_VOTE: [
    { key: 'memberCanCreatePoll', label: '구성원도 투표 만들기', type: 'boolean', default: false, help: '끄면 관리자(팀 투표는 팀 ADMIN)만 만들 수 있어요' },
    { key: 'memberCanAddPlace', label: '구성원도 후보 장소 등록', type: 'boolean', default: true },
    { key: 'multiDateVote', label: '날짜 복수 선택', type: 'boolean', default: true },
    { key: 'multiPlaceVote', label: '장소 복수 선택', type: 'boolean', default: false },
    { key: 'pollDurationHours', label: '기본 투표 기간(시간)', type: 'number', default: 72, min: 1, max: 720 },
  ],
  RANDOM_SURVEY: [
    { key: 'requireApproval', label: '등록한 설문은 관리자 승인 후 진행', type: 'boolean', default: true },
    { key: 'randomWindowDays', label: '랜덤 시작 범위(일)', type: 'number', default: 7, min: 1, max: 60, help: '등록(승인) 후 이 기간 안의 무작위 시각에 시작해요' },
    { key: 'durationHours', label: '설문 진행 시간(시간)', type: 'number', default: 48, min: 1, max: 720 },
    { key: 'maxQuestions', label: '설문당 최대 질문 수', type: 'number', default: 10, min: 1, max: 30 },
    {
      key: 'resultsVisibility',
      label: '결과 공개',
      type: 'select',
      default: 'AFTER_CLOSE',
      options: [
        { value: 'AFTER_CLOSE', label: '종료 후 공개' },
        { value: 'ALWAYS', label: '진행 중에도 공개' },
      ],
    },
  ],
  SNACK_DRAW: [
    { key: 'memberCanCreate', label: '구성원도 게임 만들기', type: 'boolean', default: true },
    { key: 'defaultWinnerCount', label: '기본 당첨자 수', type: 'number', default: 1, min: 1, max: 10 },
    { key: 'entryFee', label: '참가비(포인트)', type: 'number', default: 1, min: 0, max: 100, help: '참가를 취소하거나 게임이 취소되면 돌려받아요' },
    {
      key: 'drawTheme',
      label: '뽑기 모양',
      type: 'select',
      default: 'CARD',
      options: [
        { value: 'CARD', label: '카드 뒤집기' },
        { value: 'CAPSULE', label: '캡슐 뽑기' },
      ],
    },
  ],
  BOARD: [
    { key: 'groupBoardEnabled', label: '그룹 전체 게시판 사용', type: 'boolean', default: true },
    { key: 'anonymousAllowed', label: '익명 글쓰기 허용', type: 'boolean', default: false },
    { key: 'commentsEnabled', label: '댓글 허용', type: 'boolean', default: true },
    { key: 'maxPostLength', label: '게시글 최대 글자 수', type: 'number', default: 3000, min: 100, max: 10000 },
  ],
  SUGGESTION_BOX: [
    { key: 'anonymousAllowed', label: '익명 건의 허용', type: 'boolean', default: true },
    { key: 'showVotes', label: '공감 수 공개', type: 'boolean', default: true },
    { key: 'acceptReward', label: '건의가 반영되면 작성자 보상(포인트)', type: 'number', default: 5, min: 0, max: 100 },
  ],
  DUTY_ROSTER: [
    { key: 'memberCanCreate', label: '구성원도 업무 만들기', type: 'boolean', default: false, help: '끄면 관리자(팀 업무는 팀 ADMIN 포함)만 만들 수 있어요' },
    { key: 'doneReward', label: '담당 완료 보상(포인트)', type: 'number', default: 2, min: 0, max: 100, help: '기간마다 담당자가 완료 체크하면 받아요' },
    { key: 'volunteerReward', label: '대신 맡기 보너스(포인트)', type: 'number', default: 1, min: 0, max: 100, help: '다른 사람 차례를 대신 맡아 완료하면 더 받아요' },
    { key: 'upcomingCount', label: '다음 담당자 미리 보기 수', type: 'number', default: 4, min: 1, max: 12 },
  ],
  MINI_GAMES: [
    { key: 'dailyLimit', label: '게임별 하루 최대 플레이 수', type: 'number', default: 5, min: 1, max: 50 },
    { key: 'participationWeight', label: '팀 점수에서 참여율 비중(%)', type: 'number', default: 30, min: 0, max: 80, help: '나머지는 상위 기록 평균이에요. 높을수록 인원이 적어도 다 같이 하는 팀이 유리해요' },
    { key: 'topN', label: '팀 점수에 쓰는 상위 인원(최대)', type: 'number', default: 5, min: 1, max: 20, help: '실제 인원은 팀 인원의 절반(올림)과 이 값 중 작은 쪽이에요. 기록이 부족한 자리는 0점으로 채워요' },
    { key: 'dailyChallengeEnabled', label: '오늘의 챌린지 표시', type: 'boolean', default: true },
    { key: 'playFee', label: '개인전 한 판 참가비(포인트)', type: 'number', default: 1, min: 0, max: 100, help: '포인트가 0이어도 할 수 있고, 잔액은 마이너스가 될 수 있어요' },
    { key: 'maxPlayReward', label: '개인전 한 판 최대 보상(포인트)', type: 'number', default: 3, min: 0, max: 100, help: '점수에 비례해 받아요 (100점 = 최대)' },
    { key: 'challengeReward', label: '오늘의·주간 챌린지 보너스', type: 'number', default: 2, min: 0, max: 100, help: '챌린지 게임을 하면 하루(주) 한 번 받아요' },
    { key: 'teamMethod', label: '팀 대결 기본 순위 방식', type: 'select', default: 'HYBRID', options: [
      { value: 'HYBRID', label: '실력+참여' },
      { value: 'MEDIAN', label: '상위 중앙값' },
      { value: 'PARTICIPATION', label: '참여율' },
      { value: 'GOAL', label: '목표 달성률' },
      { value: 'BOSS', label: '보스 레이드' },
    ] },
    { key: 'goalDaysPerWeek', label: '목표 달성률: 한 사람당 주간 목표 일수', type: 'number', default: 3, min: 1, max: 7 },
    { key: 'bossHpPerMember', label: '보스 체력(팀원 1명당)', type: 'number', default: 800, min: 100, max: 10000, help: '팀원이 하루에 게임별 최고 점수만큼 피해를 줘요' },
    { key: 'bossReward', label: '보스 처치 보상(참여자 1명당)', type: 'number', default: 5, min: 0, max: 100 },
    { key: 'bingoLineReward', label: '빙고 한 줄 완성 보상(팀원 1명당)', type: 'number', default: 3, min: 0, max: 100 },
    { key: 'bingoSize', label: '빙고판 크기', type: 'select', default: '3', options: [
      { value: '3', label: '3×3' },
      { value: '4', label: '4×4' },
    ] },
    { key: 'turnEntryFee', label: '턴제 게임 참가비', type: 'number', default: 2, min: 0, max: 100 },
    { key: 'turnCompleteReward', label: '턴제 게임 완주 보상(참가자 1명당)', type: 'number', default: 4, min: 0, max: 100 },
    { key: 'bombPenalty', label: '폭탄 터진 사람 벌점', type: 'number', default: 10, min: 0, max: 100 },
    { key: 'twentyQReward', label: '스무고개 정답 보상', type: 'number', default: 8, min: 0, max: 100 },
    { key: 'turnHours', label: '턴 제한 시간(시간)', type: 'number', default: 24, min: 1, max: 168, help: '시간 안에 안 하면 다음 사람에게 넘어가요 (폭탄은 그 자리에서 터져요)' },
    { key: 'puzzleReward', label: '팀 퍼즐 완성 보상(팀원 1명당)', type: 'number', default: 5, min: 0, max: 100, help: '16조각을 모두 열면 팀원 모두 받아요' },
    { key: 'dailyPickReward', label: '오늘의 질문 참여 보상', type: 'number', default: 1, min: 0, max: 100 },
    { key: 'telepathyBonus', label: '팀 텔레파시 같은 답 보너스', type: 'number', default: 2, min: 0, max: 100, help: '팀의 가장 많은 답과 같으면 받아요' },
    { key: 'belongingReward', label: '물건 주인 맞히기 보상', type: 'number', default: 1, min: 0, max: 100 },
    { key: 'tmiReward', label: 'TMI 맞히기 보상', type: 'number', default: 1, min: 0, max: 100 },
    { key: 'chainQuizReward', label: '체인 퀴즈 정답 보상', type: 'number', default: 1, min: 0, max: 100 },
    { key: 'detectiveReward', label: 'AI 협동 추리 해결 보상(참가자 1명당)', type: 'number', default: 6, min: 0, max: 100 },
    { key: 'aiMissions', label: '빙고 미션을 AI가 만들기', type: 'boolean', default: false, help: 'AI 키가 설정돼 있을 때만 동작해요 (비용 낮음)' },
    { key: 'aiVerify', label: '빙고 사진을 AI가 확인하기', type: 'boolean', default: false, help: 'AI 키가 설정돼 있을 때만 동작해요. 미션과 맞지 않으면 다시 올리게 해요 (비용 중간)' },
    { key: 'aiQuizEnabled', label: 'AI 퀴즈 사용', type: 'boolean', default: true },
    { key: 'aiImageDaily', label: 'AI 그림·사진 변환 하루 최대(1인)', type: 'number', default: 3, min: 0, max: 20, help: '그림 생성은 비용이 커요' },
    { key: 'aiQuizReward', label: 'AI 퀴즈 정답 보상', type: 'number', default: 1, min: 0, max: 100 },
    { key: 'aiWordReward', label: 'AI 제시어 정답 보상', type: 'number', default: 2, min: 0, max: 100 },
  ],
};

/** 기본값만 모은 설정 */
export function defaultSettings(feature: FeatureKey): SettingValues {
  const values: SettingValues = {};
  for (const f of FEATURE_SETTINGS[feature] ?? []) values[f.key] = f.default;
  return values;
}

/** 저장된 값을 정의에 맞게 정리 (알 수 없는 키 제거, 범위 보정, 누락은 기본값) */
export function normalizeSettings(feature: FeatureKey, raw: unknown): SettingValues {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const values: SettingValues = {};
  for (const f of FEATURE_SETTINGS[feature] ?? []) {
    const v = input[f.key];
    if (f.type === 'boolean') values[f.key] = typeof v === 'boolean' ? v : (f.default as boolean);
    else if (f.type === 'number') {
      const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : (f.default as number);
      values[f.key] = Math.min(f.max ?? n, Math.max(f.min ?? n, n));
    } else {
      values[f.key] = f.options?.some((o) => o.value === v) ? (v as string) : (f.default as string);
    }
  }
  return values;
}
