/** 롤링페이퍼 종이 색상 */
export const PAPER_THEMES = [
  { key: 'YELLOW', label: '노랑', bg: 'from-amber-100 to-amber-50' },
  { key: 'PINK', label: '분홍', bg: 'from-pink-100 to-rose-50' },
  { key: 'BLUE', label: '하늘', bg: 'from-sky-100 to-blue-50' },
  { key: 'GREEN', label: '연두', bg: 'from-emerald-100 to-green-50' },
] as const;

export const themeBg = (key: string) => PAPER_THEMES.find((t) => t.key === key)?.bg ?? PAPER_THEMES[0].bg;
