/** 게임 문제 은행 (AI 없이 동작하는 기본 콘텐츠) */

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** 한글 초성만 뽑기 ("회의실" → "ㅎㅇㅅ") */
export function chosung(s: string) {
  return [...s]
    .map((c) => {
      const code = c.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : c;
    })
    .join('');
}

export const CHOSUNG_WORDS: { word: string; hint: string }[] = [
  ...['회의실', '출근', '퇴근', '야근', '연차', '월급', '보고서', '결재', '프린터', '복사기', '명함', '사원증', '점심시간', '탕비실', '엘리베이터', '모니터', '키보드', '마우스', '노트북', '화이트보드', '회식', '워크숍', '출장', '재택근무', '메신저', '이메일', '마감일', '프로젝트', '팀장님', '신입사원'].map((word) => ({ word, hint: '회사' })),
  ...['김치찌개', '된장찌개', '비빔밥', '떡볶이', '삼겹살', '치킨', '피자', '햄버거', '짜장면', '짬뽕', '라면', '김밥', '순대', '냉면', '불고기', '갈비', '초밥', '돈까스', '샌드위치', '아메리카노'].map((word) => ({ word, hint: '음식' })),
  ...['호랑이', '고양이', '강아지', '코끼리', '기린', '토끼', '거북이', '다람쥐', '펭귄', '판다', '고래', '상어', '독수리', '원숭이', '얼룩말'].map((word) => ({ word, hint: '동물' })),
  ...['사과', '바나나', '딸기', '포도', '수박', '참외', '복숭아', '귤', '망고', '파인애플', '블루베리', '체리'].map((word) => ({ word, hint: '과일' })),
  ...['대한민국', '일본', '중국', '미국', '프랑스', '독일', '영국', '이탈리아', '스페인', '캐나다', '호주', '브라질'].map((word) => ({ word, hint: '나라' })),
  ...['축구', '야구', '농구', '배구', '탁구', '테니스', '골프', '수영', '마라톤', '볼링', '배드민턴'].map((word) => ({ word, hint: '운동' })),
];

export const EMOJI_QUIZ: { emoji: string; answer: string }[] = [
  { emoji: '🐍🍎👸', answer: '백설공주' },
  { emoji: '🦁👑', answer: '라이온 킹' },
  { emoji: '❄️👸⛄', answer: '겨울왕국' },
  { emoji: '🕷️🧑‍🦱🏙️', answer: '스파이더맨' },
  { emoji: '🚢🧊💔', answer: '타이타닉' },
  { emoji: '🦖🏝️🚙', answer: '쥬라기 공원' },
  { emoji: '🐠🔍🌊', answer: '니모를 찾아서' },
  { emoji: '🧸🍯🐝', answer: '곰돌이 푸' },
  { emoji: '🧙‍♂️⚡👓', answer: '해리 포터' },
  { emoji: '🧜‍♀️🐚🌊', answer: '인어공주' },
  { emoji: '☕⏰😵', answer: '월요일 아침' },
  { emoji: '📧📧📧💥', answer: '메일 폭탄' },
  { emoji: '🍗🍺', answer: '치맥' },
  { emoji: '🏃‍♂️💨🏢', answer: '칼퇴근' },
  { emoji: '🍱🕛😋', answer: '점심시간' },
  { emoji: '💸💳😭', answer: '월급 순삭' },
  { emoji: '🧳✈️🏝️', answer: '여름휴가' },
  { emoji: '🌙💻😴', answer: '야근' },
  { emoji: '🍜🌙', answer: '야식' },
  { emoji: '🎂🕯️🎉', answer: '생일 파티' },
  { emoji: '📊🗣️⏳', answer: '긴 회의' },
  { emoji: '🖨️❌😤', answer: '프린터 고장' },
  { emoji: '🧊☕', answer: '아이스 아메리카노' },
  { emoji: '🐔🥚❓', answer: '닭이 먼저냐 달걀이 먼저냐' },
  { emoji: '🐸🕳️', answer: '우물 안 개구리' },
  { emoji: '🐯🏃‍♂️', answer: '호랑이도 제 말 하면 온다' },
  { emoji: '🦶🦶🦶🏔️', answer: '천리 길도 한 걸음부터' },
  { emoji: '🍚🥄🔟', answer: '십시일반' },
  { emoji: '🌧️⛈️☀️🌈', answer: '비 온 뒤에 땅이 굳는다' },
  { emoji: '🐒🌳⬇️', answer: '원숭이도 나무에서 떨어진다' },
  { emoji: '🎤👨‍🎤🇰🇷', answer: '노래방' },
  { emoji: '🎄🎅🎁', answer: '크리스마스' },
  { emoji: '🌸📸👫', answer: '벚꽃 놀이' },
  { emoji: '🧧🙇‍♂️🍲', answer: '설날' },
  { emoji: '🌕🍡🐰', answer: '추석' },
  { emoji: '🏠💻👖', answer: '재택근무' },
  { emoji: '🚇😫👥', answer: '지옥철' },
  { emoji: '🛋️📺🍿', answer: '주말 집콕' },
  { emoji: '🥤🧋', answer: '버블티' },
  { emoji: '🐶🦴🏡', answer: '반려견' },
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
