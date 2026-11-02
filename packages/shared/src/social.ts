/** 동료 게임·관계형 콘텐츠용 문제 은행과 템플릿. AI 없이도 항상 동작하도록 기본 콘텐츠를 둠 */

/** AI 사용 수준: 필요 없음 / 선택사항(없어도 됨) / 핵심(없으면 못 함) */
export type AiLevel = 'NONE' | 'OPTIONAL' | 'CORE';
/** AI 호출 비용 위험도 */
export type AiCost = 'NONE' | 'LOW' | 'MID' | 'HIGH';

export const AI_LEVEL_LABEL: Record<AiLevel, string> = { NONE: 'AI 필요 없음', OPTIONAL: 'AI 선택사항', CORE: 'AI 핵심' };
export const AI_COST_LABEL: Record<AiCost, string> = { NONE: '비용 없음', LOW: '비용 낮음', MID: '비용 중간', HIGH: '비용 높음' };

/** 팀 퍼즐 그림 (16칸, 순서대로 완성) */
export const PUZZLE_THEMES = [
  { key: 'SPACE', name: '우주 탐험', tiles: ['🌌', '🌠', '🌙', '⭐', '🪐', '🌍', '🚀', '🛸', '☄️', '🌟', '🌑', '🌕', '🛰️', '👽', '🌏', '✨'] },
  { key: 'SPRING', name: '봄 소풍', tiles: ['🌸', '🌷', '🌼', '🌱', '🐝', '🦋', '🌳', '🌿', '🍃', '🌺', '☀️', '🌈', '🐞', '🌞', '🏞️', '🍀'] },
  { key: 'OCEAN', name: '바다 여행', tiles: ['🌊', '🐬', '🐠', '🐙', '🦀', '🐚', '⛵', '🏝️', '🪸', '🐳', '🌅', '🦑', '🐡', '🌴', '🦭', '🏖️'] },
  { key: 'PARTY', name: '맛있는 파티', tiles: ['🍕', '🍔', '🍟', '🌭', '🥗', '🍣', '🍜', '🥟', '🍰', '🧁', '🍩', '🥤', '🍺', '🍗', '🍦', '🎂'] },
] as const;

/** 매일 한 번 답하는 팀 게임 문제 (선택형: 팀 텔레파시 / A·B: 밸런스 게임) */
export const TELEPATHY_PROMPTS = [
  { key: 'T1', question: '오늘 점심 메뉴를 하나 고른다면?', options: ['한식', '중식', '일식', '양식', '분식'] },
  { key: 'T2', question: '회식 장소로 가장 끌리는 곳은?', options: ['고깃집', '치킨집', '포차', '이자카야', '파스타집'] },
  { key: 'T3', question: '출근길 간식으로 고른다면?', options: ['김밥', '샌드위치', '빵', '커피만', '안 먹어요'] },
  { key: 'T4', question: '주말에 가장 하고 싶은 것은?', options: ['집콕', '여행', '운동', '맛집 투어', '친구 만나기'] },
  { key: 'T5', question: '팀 회의에서 가장 기다리는 순간은?', options: ['회의 끝', '간식 시간', '아이디어 나올 때', '조용한 정리', '발표 성공'] },
  { key: 'T6', question: '내 자리에서 가장 중요한 물건은?', options: ['키보드', '모니터', '텀블러', '이어폰', '담요'] },
  { key: 'T7', question: '오후 3시에 가장 필요한 것은?', options: ['커피', '간식', '산책', '스트레칭', '낮잠'] },
  { key: 'T8', question: '요즘 자주 듣는 음악 장르는?', options: ['발라드', '힙합', '팝', '재즈', '록'] },
] as const;

export const BALANCE_PROMPTS = [
  { key: 'B1', question: '야근 없이 월급은 적게 vs 야근 많고 월급은 많이', a: '야근 없이 적게', b: '야근 많고 많이' },
  { key: 'B2', question: '평생 재택근무 vs 평생 사무실 출근', a: '재택', b: '사무실' },
  { key: 'B3', question: '점심 메뉴 평생 한 가지 vs 매일 바뀜', a: '한 가지 고정', b: '매일 바뀜' },
  { key: 'B4', question: '회의 1시간 줄이기 vs 점심 30분 늘리기', a: '회의 1시간 줄이기', b: '점심 30분 늘리기' },
  { key: 'B5', question: '팀장 맡기 vs 팀장 피하기', a: '팀장 맡기', b: '팀장 피하기' },
  { key: 'B6', question: '칼퇴 보장 vs 연봉 10% 인상', a: '칼퇴 보장', b: '연봉 10% 인상' },
  { key: 'B7', question: '회식 매달 vs 분기에 한 번', a: '매달 회식', b: '분기 1회 회식' },
  { key: 'B8', question: '메신저 알림 끄기 vs 켜기', a: '알림 끄기', b: '알림 켜기' },
] as const;

/** AI 협동 추리 사건 (AI 키가 없을 때 쓰는 기본 사건). 단서를 모두 보면 범인이 하나로 좁혀짐 */
export interface CaseFile {
  title: string;
  setup: string;
  suspects: string[];
  culprit: string;
  clues: string[];
}
export const CASE_BANK: CaseFile[] = [
  {
    title: '사라진 간식 사건',
    setup: '매주 금요일 탕비실의 과자 한 박스가 사라졌다. 어제 저녁 마지막으로 탕비실에 있던 사람은 네 명이었다.',
    suspects: ['지현(개발)', '민호(디자인)', '수진(영업)', '재원(인사)'],
    culprit: '민호(디자인)',
    clues: [
      'CCTV에 검은 가방을 든 사람이 탕비실에서 나가는 모습이 찍혔다.',
      '과자 봉지는 휴지통이 아니라 회의실 쓰레기통에서 발견됐다.',
      '범인은 키가 크고 안경을 쓰지 않았다.',
      '어제 저녁 회의실 예약은 디자인팀 이름으로 되어 있었다.',
      '수진은 어제 저녁 6시에 이미 퇴근했다는 출입 기록이 있다.',
    ],
  },
  {
    title: '회의록 파일 삭제 사건',
    setup: '공유 폴더에서 이번 주 회의록 파일이 감쪽같이 지워졌다. 파일 삭제는 어제 오후 4시 이후에 일어났다.',
    suspects: ['준호(기획)', '소연(마케팅)', '태민(개발)', '아린(총무)'],
    culprit: '소연(마케팅)',
    clues: [
      '삭제된 파일은 어제 오후 4시 이후에 지워졌다.',
      '범인은 공용 PC를 쓸 수 있는 사람이다. 공용 PC는 기획실과 마케팅실에만 있다.',
      '회의록 작성 담당은 준호였다.',
      '태민은 어제 오후 4시 이전에 외근을 나갔다.',
      '아린은 이 폴더의 쓰기 권한이 없어서 파일을 지울 수 없다.',
    ],
  },
  {
    title: '커피머신 고장 사건',
    setup: '오후 내내 커피머신이 멈춰 있었다. 필터 통에서 이물질이 나왔고, 기계 앞에 있던 사람은 여럿이었다.',
    suspects: ['도윤(영업)', '하늘(개발)', '승우(디자인)'],
    culprit: '승우(디자인)',
    clues: [
      '커피머신 필터 통에 이물질이 가득 들어 있었다.',
      '사건 시간에 커피머신 근처에 있던 사람은 셋이었다.',
      '도윤은 카페인을 먹지 않는다고 했다.',
      '하늘은 사건 직전 회의실에서 발표 중이었다는 기록이 있다.',
      '커피머신을 마지막으로 켠 사람은 승우였다.',
    ],
  },
];

/** AI 퀴즈 기본 문제 은행 (사내 상식). 키가 없으면 이 중에서 뽑음 */
export const AI_QUIZ_BANK: { question: string; choices: string[]; answer: number }[] = [
  { question: '회의에서 "레드팀"의 역할은?', choices: ['회의 진행', '반대 의견 내기', '회의록 작성', '간식 주문'], answer: 1 },
  { question: '"번아웃"을 뜻하는 말로 알맞은 것은?', choices: ['과도한 피로로 지침', '열정 과잉', '업무 몰입', '휴식 준비'], answer: 0 },
  { question: '칸반 보드에서 "진행 중" 카드를 두는 곳은?', choices: ['Backlog', 'In Progress', 'Done', 'Archive'], answer: 1 },
  { question: '"스탠드업 미팅"은 보통 얼마나 길까?', choices: ['5~15분', '1시간', '반나절', '하루 종일'], answer: 0 },
  { question: '"OKR"에서 KR은 무엇의 약자일까?', choices: ['Key Result', 'Key Role', 'Know Rule', 'Kind Reward'], answer: 0 },
  { question: '"워라밸"은 무엇의 줄임말일까?', choices: ['Work-Life Balance', 'Work-Love Balance', 'Win-Loss Balance', 'Walk-Life Balance'], answer: 0 },
  { question: '"파킹랏"은 보통 무엇을 뜻할까?', choices: ['주차장', '회의실', '휴게실', '창고'], answer: 0 },
  { question: '"온보딩"은 무엇을 뜻할까?', choices: ['새 구성원이 적응하도록 돕기', '퇴사 절차', '회식 장소 고르기', '장비 반납'], answer: 0 },
  { question: '"피드백 샌드위치"의 가운데 재료는?', choices: ['칭찬', '개선할 점', '인사', '결론'], answer: 1 },
  { question: '"데드라인"의 원래 뜻은?', choices: ['최종 마감 시한', '사무실 입구', '점심 시간', '월급날'], answer: 0 },
  { question: '"포모도로 기법"은 보통 몇 분 단위로 일할까?', choices: ['25분', '90분', '5시간', '10초'], answer: 0 },
  { question: '"백로그"는 무엇을 말할까?', choices: ['앞으로 할 일 목록', '지난 회의록', '신입 사원', '야근 수당'], answer: 0 },
  { question: '"스프린트"는 보통 몇 주 단위일까?', choices: ['1~4주', '1년', '하루', '반나절'], answer: 0 },
  { question: '"풀 리퀘스트"는 무엇을 요청하는 것일까?', choices: ['코드 병합 검토', '휴가 신청', '장비 구매', '회식 참석'], answer: 0 },
  { question: '"이모지 리액션"으로 보통 쓰는 것은?', choices: ['메시지에 가볍게 반응하기', '결재 승인', '파일 삭제', '계정 잠금'], answer: 0 },
];

/** AI 이미지 제시어 맞히기 단어 */
export const WORD_BANK = ['사과', '자동차', '우산', '고양이', '기차', '커피', '바다', '우주선', '연필', '선인장', '무지개', '자전거', '피아노', '기타', '모자', '안경', '시계', '달팽이', '버섯', '풍선', '배', '토끼', '케이크', '돋보기', '지구본', '당근', '열쇠', '노트북', '화분', '로봇'] as const;

/** 롤링페이퍼 템플릿: 생일·입사·프로젝트 종료·신규 팀원 환영·익명 응원 */
export const ROLLING_TEMPLATES = [
  { key: 'BIRTHDAY', name: '생일 축하', icon: '🎂', title: '생일 축하해요!', message: '생일을 진심으로 축하해요! 올해도 좋은 일만 가득하길 바라요 🎉', theme: 'PINK', anonymous: false },
  { key: 'WELCOME', name: '신규 팀원 환영', icon: '👋', title: '새 동료를 환영해요', message: '함께하게 된 것을 환영해요! 궁금한 게 있으면 언제든 편하게 물어봐 주세요.', theme: 'GREEN', anonymous: false },
  { key: 'ANNIVERSARY', name: '입사 기념', icon: '🎉', title: '입사 기념 롤링페이퍼', message: '함께 일해 줘서 고마워요. 앞으로도 잘 부탁해요!', theme: 'YELLOW', anonymous: false },
  { key: 'PROJECT_END', name: '프로젝트 종료', icon: '🏁', title: '프로젝트 마무리 감사', message: '마무리까지 정말 고생 많았어요. 덕분에 좋은 결과를 냈어요!', theme: 'BLUE', anonymous: false },
  { key: 'ANON', name: '익명 응원', icon: '🤫', title: '익명 응원 메시지', message: '이름 없이 전하는 응원이에요. 마음껏 적어 주세요.', theme: 'BLUE', anonymous: true },
] as const;

/** 동료 게임 허브 카드 (점수형 게임이 아닌 것). path 는 /g/<group>/games/<path> */
export const SOCIAL_GAMES = [
  { key: 'BELONGINGS', name: '이 물건의 주인은?', icon: '🔍', path: 'belongings', tagline: '동료 책상 사진을 보고 누구 물건인지 맞혀요', ai: 'NONE' as AiLevel, cost: 'NONE' as AiCost, gradient: 'from-purple-500 to-indigo-600' },
  { key: 'TMI', name: 'TMI 퀴즈', icon: '🫣', path: 'tmi', tagline: '동료가 쓴 나만 아는 사실, 누구의 TMI일까요?', ai: 'NONE' as AiLevel, cost: 'NONE' as AiCost, gradient: 'from-pink-500 to-rose-600' },
  { key: 'DAILY', name: '팀 텔레파시 · 밸런스', icon: '🔮', path: 'telepathy', tagline: '오늘의 질문에 같은 답을 고르면 팀 싱크로율 상승', ai: 'NONE' as AiLevel, cost: 'NONE' as AiCost, gradient: 'from-fuchsia-500 to-violet-700' },
  { key: 'PUZZLE', name: '팀 퍼즐', icon: '🧩', path: 'puzzle', tagline: '팀원이 게임 한 판씩 할 때마다 조각이 열려요', ai: 'NONE' as AiLevel, cost: 'NONE' as AiCost, gradient: 'from-sky-500 to-indigo-700' },
  { key: 'AI_QUIZ', name: 'AI 퀴즈', icon: '🤖', path: 'ai-quiz', tagline: 'AI가 만든 사내 상식 퀴즈 (AI가 없으면 기본 문제)', ai: 'OPTIONAL' as AiLevel, cost: 'LOW' as AiCost, gradient: 'from-teal-500 to-emerald-700' },
  { key: 'AI_WORD', name: 'AI 제시어 맞히기', icon: '🎨', path: 'ai-word', tagline: 'AI가 그린 그림을 보고 무엇인지 맞혀요', ai: 'CORE' as AiLevel, cost: 'HIGH' as AiCost, gradient: 'from-amber-400 to-rose-500' },
  { key: 'MEME', name: 'AI 밈 만들기', icon: '😂', path: 'meme', tagline: '내 사진에 AI가 쓴 자막 후보를 골라 밈을 만들어요', ai: 'OPTIONAL' as AiLevel, cost: 'LOW' as AiCost, gradient: 'from-yellow-400 to-orange-500' },
  { key: 'TRANSFORM', name: 'AI 사진 변환', icon: '🪄', path: 'transform', tagline: '내 사진을 만화풍·수채화풍으로 바꿔 봐요', ai: 'CORE' as AiLevel, cost: 'HIGH' as AiCost, gradient: 'from-violet-500 to-pink-500' },
] as const;
