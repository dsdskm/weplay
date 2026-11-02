/** 미니게임 정의. 원래 기록(value)을 0~100점(score)으로 바꾸는 규칙은 서버가 최종 판단 */
export interface GameDef {
  key: string;
  name: string;
  icon: string;
  tagline: string;
  /** 원래 기록 단위 표시 */
  unit: string;
  /** 허용 범위 (벗어나면 부정 기록으로 거절) */
  min: number;
  max: number;
  /** 한 판 소요 시간 안내 */
  duration: string;
  /** 카드 배경 그라데이션 (tailwind) */
  gradient: string;
  /** 게임 분류 (화면 묶음) */
  kind: 'REFLEX' | 'BRAIN' | 'QUIZ' | 'SOCIAL';
  /** AI 사용 수준 (점수형 게임은 모두 NONE) */
  ai: 'NONE' | 'OPTIONAL' | 'CORE';
  toScore: (value: number) => number;
  format: (value: number) => string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export const GAMES: GameDef[] = [
  {
    key: 'TEN_SECONDS',
    kind: 'REFLEX',
    ai: 'NONE' as const,
    name: '감으로 10초',
    icon: '⏱️',
    tagline: '화면 없이 마음속으로 10초를 세고 멈춰요',
    unit: '초',
    min: 0,
    max: 60000,
    duration: '약 10초',
    gradient: 'from-violet-500 to-fuchsia-500',
    toScore: (ms) => round2(clamp(100 - Math.abs(ms - 10000) / 50)),
    format: (ms) => `${(ms / 1000).toFixed(2)}초`,
  },
  {
    key: 'REACTION',
    kind: 'REFLEX',
    ai: 'NONE' as const,
    name: '반응속도',
    icon: '⚡',
    tagline: '초록색으로 바뀌는 순간 가장 빨리 눌러요',
    unit: 'ms',
    min: 90,
    max: 3000,
    duration: '약 10초',
    gradient: 'from-emerald-400 to-teal-500',
    toScore: (ms) => round2(clamp(((600 - ms) / 450) * 100)),
    format: (ms) => `${Math.round(ms)}ms`,
  },
  {
    key: 'NUMBER_TOUCH',
    kind: 'BRAIN',
    ai: 'NONE' as const,
    name: '숫자 순서 터치',
    icon: '🔢',
    tagline: '1부터 16까지 순서대로 가장 빨리 눌러요',
    unit: '초',
    min: 4000,
    max: 180000,
    duration: '약 20초',
    gradient: 'from-sky-400 to-indigo-500',
    toScore: (ms) => round2(clamp(((40000 - ms) / 32000) * 100)),
    format: (ms) => `${(ms / 1000).toFixed(2)}초`,
  },
  {
    key: 'MEMORY',
    kind: 'BRAIN',
    ai: 'NONE' as const,
    name: '기억력 시퀀스',
    icon: '🧠',
    tagline: '반짝이는 순서를 기억해서 그대로 따라 눌러요',
    unit: '단계',
    min: 1,
    max: 40,
    duration: '1~2분',
    gradient: 'from-amber-400 to-orange-500',
    toScore: (level) => round2(clamp(level * 8)),
    format: (level) => `${Math.round(level)}단계`,
  },
  {
    key: 'COLOR_TRAP',
    kind: 'BRAIN',
    ai: 'NONE' as const,
    name: '색깔 함정',
    icon: '🎨',
    tagline: '글자 뜻이 아니라 글자 색을 맞혀요. 30초 안에 최대한 많이!',
    unit: '개',
    min: 0,
    max: 80,
    duration: '30초',
    gradient: 'from-rose-400 to-pink-500',
    toScore: (n) => round2(clamp((n / 25) * 100)),
    format: (n) => `${Math.round(n)}개`,
  },
  {
    key: 'PERFECT_STOP',
    kind: 'REFLEX',
    ai: 'NONE' as const,
    name: 'Perfect Stop',
    icon: '🎯',
    tagline: '움직이는 막대를 정중앙에서 멈춰요 (5번)',
    unit: '%',
    min: 0,
    max: 50,
    duration: '약 15초',
    gradient: 'from-cyan-400 to-blue-600',
    toScore: (dev) => round2(clamp(100 - dev * 3)),
    format: (dev) => `평균 ${dev.toFixed(2)}% 빗나감`,
  },
  {
    key: 'STACK',
    kind: 'REFLEX',
    ai: 'NONE' as const,
    name: '블록 쌓기',
    icon: '🧱',
    tagline: '흔들리는 블록을 딱 맞게 떨어뜨려 높이 쌓아요',
    unit: '층',
    min: 0,
    max: 100,
    duration: '30초~1분',
    gradient: 'from-orange-400 to-red-500',
    toScore: (h) => round2(clamp(h * 5)),
    format: (h) => `${Math.round(h)}층`,
  },
  {
    key: 'QUICK_MATH',
    kind: 'BRAIN',
    ai: 'NONE' as const,
    name: '번개 계산',
    icon: '➗',
    tagline: '30초 동안 간단한 계산을 최대한 많이!',
    unit: '개',
    min: 0,
    max: 80,
    duration: '30초',
    gradient: 'from-lime-400 to-emerald-600',
    toScore: (n) => round2(clamp((n / 20) * 100)),
    format: (n) => `${Math.round(n)}문제`,
  },
  {
    key: 'HIGH_LOW',
    kind: 'BRAIN',
    ai: 'NONE' as const,
    name: 'High / Low',
    icon: '🃏',
    tagline: '다음 카드가 높을지 낮을지, 연속으로 맞혀요',
    unit: '연속',
    min: 0,
    max: 52,
    duration: '1분 안팎',
    gradient: 'from-slate-600 to-slate-900',
    toScore: (n) => round2(clamp(n * 10)),
    format: (n) => `${Math.round(n)}연속`,
  },
  {
    key: 'CHOSUNG',
    kind: 'QUIZ',
    ai: 'NONE' as const,
    name: '초성 퀴즈',
    icon: 'ㅊㅅ',
    tagline: '초성만 보고 단어를 맞혀요. 60초!',
    unit: '개',
    min: 0,
    max: 60,
    duration: '60초',
    gradient: 'from-teal-400 to-cyan-600',
    toScore: (n) => round2(clamp(n * 10)),
    format: (n) => `${Math.round(n)}개`,
  },
  {
    key: 'EMOJI_QUIZ',
    kind: 'QUIZ',
    ai: 'NONE' as const,
    name: '이모지 퀴즈',
    icon: '🤔',
    tagline: '이모지가 뜻하는 말을 골라요 (10문제)',
    unit: '개',
    min: 0,
    max: 10,
    duration: '약 1분',
    gradient: 'from-yellow-300 to-orange-400',
    toScore: (n) => round2(clamp(n * 10)),
    format: (n) => `${Math.round(n)}/10`,
  },
  {
    key: 'PHOTO_WHO',
    kind: 'SOCIAL',
    ai: 'NONE' as const,
    name: '이 사진 누구 거?',
    icon: '🔍',
    tagline: '동료가 올린 사진을 확대해서 보여 줘요. 누가 올렸을까?',
    unit: '개',
    min: 0,
    max: 5,
    duration: '약 1분',
    gradient: 'from-purple-500 to-indigo-600',
    toScore: (n) => round2(clamp(n * 20)),
    format: (n) => `${Math.round(n)}/5`,
  },
];

export const gameByKey = (key: string) => GAMES.find((g) => g.key === key);

export const GAME_KINDS = [
  { key: 'REFLEX', name: '순발력', icon: '⚡' },
  { key: 'BRAIN', name: '두뇌', icon: '🧠' },
  { key: 'QUIZ', name: '퀴즈', icon: '❓' },
  { key: 'SOCIAL', name: '동료', icon: '👀' },
] as const;

const dayIndex = (dateKST: string) => Math.floor(Date.parse(`${dateKST}T00:00:00Z`) / 86_400_000);
const at = <T>(list: T[], n: number) => list[((n % list.length) + list.length) % list.length];

/** 오늘의 챌린지: 날짜(YYYY-MM-DD)로 정해지는 게임 (동료 사진 게임 제외) */
export function dailyGameKey(dateKST: string) {
  return at(GAMES.filter((g) => g.kind !== 'SOCIAL'), dayIndex(dateKST)).key;
}

/** 주간 챌린지: 주 시작일로 정해지는 게임 (오늘의 챌린지와 다른 순서) */
export function weeklyGameKey(weekStartKST: string) {
  return at(GAMES.filter((g) => g.kind !== 'SOCIAL'), Math.floor(dayIndex(weekStartKST) / 7) * 3 + 1).key;
}

/** 주간 팀 보스 (주마다 바뀜) */
export const BOSSES = [
  { key: 'MONDAY_DRAGON', name: '월요병 드래곤', icon: '🐉', line: '월요일은 영원하다…' },
  { key: 'OVERTIME_GOLEM', name: '야근 골렘', icon: '🗿', line: '퇴근은 없다!' },
  { key: 'MEETING_KRAKEN', name: '회의 지옥 크라켄', icon: '🐙', line: '회의 하나만 더…' },
  { key: 'BUG_SLIME', name: '버그 슬라임', icon: '🦠', line: '고치면 두 마리가 된다' },
  { key: 'DEADLINE_LICH', name: '마감 리치', icon: '💀', line: '마감은 오늘까지…' },
  { key: 'EMAIL_HYDRA', name: '메일 히드라', icon: '🐍', line: '답장 하나에 메일 셋' },
];
export const bossOfWeek = (weekStartKST: string) => at(BOSSES, Math.floor(dayIndex(weekStartKST) / 7));

/** 사진 빙고 미션 풀 */
export const BINGO_MISSIONS = [
  '빨간 물건', '파란 물건', '둥근 물건', '세상에서 제일 이상한 물건', '오늘의 점심', '창밖 풍경', '내 책상 위', '귀여운 것',
  '초록 식물', '숫자 7이 보이는 것', '하트 모양', '오늘 마신 음료', '팀원과 하이파이브', '가장 오래된 물건', '노란 물건', '줄무늬',
  '그림자 놀이', '거울 셀카', '반짝이는 것', '키보드 클로즈업', '좋아하는 간식', '사무실 숨은 명소', '하늘', '손글씨 한 줄',
  '동물 사진', '세 가지 색이 한 컷에', '웃긴 표정', '퇴근길', '계단', '알파벳 W',
];

/** 팀 순위 방식 */
export const TEAM_METHODS = [
  {
    key: 'HYBRID',
    name: '실력+참여',
    description: '상위 K명 평균과 참여율을 섞어요. 기본 방식',
    weakness: '참여율 비중이 크면 작은 팀이 참여율 100%를 채우기 쉬워요',
  },
  {
    key: 'MEDIAN',
    name: '상위 중앙값',
    description: '상위 K명(빈 자리 0점) 기록의 중앙값. 한 명의 초고득점에 흔들리지 않아요',
    weakness: '상위권이 고르게 잘하는 팀만 유리하고, 참여 노력은 덜 반영돼요',
  },
  {
    key: 'PARTICIPATION',
    name: '참여율',
    description: '이번 주 한 번이라도 한 팀원 비율. 실력과 무관하게 다 같이 하면 이겨요',
    weakness: '실력 차이는 전혀 반영되지 않아요',
  },
  {
    key: 'GOAL',
    name: '목표 달성률',
    description: '팀 인원 × 목표 일수만큼 플레이한 날(사람·날짜)을 채운 비율',
    weakness: '잘하는 것보다 자주 하는 것이 중요해요',
  },
  {
    key: 'BOSS',
    name: '보스 레이드',
    description: '팀 인원에 맞춰 체력이 정해진 주간 보스에게 준 피해 비율',
    weakness: '하루 최고 기록 합산이라 꾸준히 여러 게임을 해야 해요',
  },
] as const;
export type TeamMethod = (typeof TEAM_METHODS)[number]['key'];

/** 턴제 게임 종류 (비동기: 차례가 오면 하고 다음 사람에게 넘김) */
export const TURN_GAMES = [
  { key: 'TELEPHONE', name: '그림 전화게임', icon: '🖍️', min: 3, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '문장 → 그림 → 문장… 앞사람 것만 보고 이어가요. 마지막에 전체 공개!' },
  { key: 'STORY', name: '릴레이 소설', icon: '📖', min: 2, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '바로 앞 문장만 보고 한두 문장을 이어 써요. 끝나면 전체 이야기 공개' },
  { key: 'BOMB', name: '폭탄 돌리기', icon: '💣', min: 3, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '폭탄을 받으면 다른 사람에게 넘겨요. 언제 터질지는 아무도 몰라요!' },
  { key: 'TWENTY_Q', name: '스무고개', icon: '❓', min: 1, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '출제자가 정한 정답을 예/아니오 질문 20번 안에 맞혀요' },
  { key: 'NOMINATE', name: '지목 릴레이 · 칭찬 릴레이', icon: '👉', min: 1, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '질문에 답하고 다음 사람을 지목해요. 칭찬 릴레이는 앞사람을 칭찬하는 질문으로' },
  { key: 'DRAW_RELAY', name: '그림 이어그리기', icon: '🎨', min: 2, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '앞사람 그림 위에 이어서 그려요. 마지막 그림이 완성작!' },
  { key: 'VIDEO_RELAY', name: '영상 릴레이', icon: '🎬', min: 2, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '짧은 영상을 한 명씩 이어 찍어 팀 콘텐츠 하나를 완성해요' },
  { key: 'CHAIN_QUIZ', name: '체인 퀴즈', icon: '🔗', min: 2, ai: 'NONE' as const, cost: 'NONE' as const, tagline: '앞사람 퀴즈를 맞히고, 다음 사람에게 새 퀴즈를 넘겨요' },
  { key: 'DETECTIVE', name: 'AI 협동 추리', icon: '🕵️', min: 2, ai: 'OPTIONAL' as const, cost: 'LOW' as const, tagline: '사건과 단서는 AI가 만들어요. 한 명씩 단서를 열고 범인을 찾아요' },
  { key: 'AI_TELEPHONE', name: 'AI 그림 전화', icon: '🤖', min: 3, ai: 'CORE' as const, cost: 'HIGH' as const, tagline: 'AI가 문장을 그림으로, 그림을 다시 문장으로 바꿔 이어가요' },
] as const;
export type TurnGameType = (typeof TURN_GAMES)[number]['key'];
export const turnGameDef = (key: string) => TURN_GAMES.find((g) => g.key === key);

/** 상위 K명(빈 자리 0점) 정렬 목록 */
function topK(bests: number[], size: number, topN: number) {
  const k = Math.max(1, Math.min(topN, Math.ceil(size / 2)));
  const top = [...bests].sort((a, b) => b - a).slice(0, k);
  while (top.length < k) top.push(0);
  return { k, top };
}

/** 팀 상위 중앙값 (빈 자리 0점) */
export function teamMedian(bests: number[], size: number, topN: number) {
  const { k, top } = topK(bests, size, topN);
  const sorted = [...top].sort((a, b) => a - b);
  const mid = Math.floor(k / 2);
  return { k, median: round2(k % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) };
}

/**
 * 팀 점수 = (1-w) × 상위 K명 평균 + w × 참여율
 * - K = min(topN, ceil(팀 인원 / 2)), 기록이 K개 미만이면 빈 자리는 0점으로 채움
 *   → 1~2명만 플레이해서 고득점을 내도 소수 정예 전략이 통하지 않고, 인원이 달라도 같은 기준
 */
export function teamScore(bests: number[], size: number, topN: number, participationWeight: number) {
  const w = Math.max(0, Math.min(80, participationWeight)) / 100;
  const k = Math.max(1, Math.min(topN, Math.ceil(size / 2)));
  const top = [...bests].sort((a, b) => b - a).slice(0, k);
  while (top.length < k) top.push(0);
  const performance = top.reduce((a, b) => a + b, 0) / k;
  const participation = size > 0 ? (Math.min(bests.length, size) / size) * 100 : 0;
  return {
    k,
    performance: round2(performance),
    participation: round2(participation),
    score: round2((1 - w) * performance + w * participation),
  };
}
