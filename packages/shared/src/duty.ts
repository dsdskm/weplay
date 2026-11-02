/** 공통 업무 담당: 추천 목록 (직접 입력도 가능) */
export const DUTY_PRESETS = [
  { name: '비품 담당', icon: '📦', description: '사무용품·비품 재고를 확인하고 주문해요' },
  { name: '간식 담당', icon: '🍪', description: '간식을 고르고 채워 둬요' },
  { name: '커피머신 관리', icon: '☕', description: '원두·우유를 채우고 청소해요' },
  { name: '회의실 정리', icon: '🪑', description: '회의실 정리와 화이트보드 지우기' },
  { name: '택배 수령', icon: '📮', description: '팀 택배를 받아 전달해요' },
  { name: '화분 물주기', icon: '🪴', description: '사무실 식물에 물을 줘요' },
  { name: '분리수거', icon: '♻️', description: '분리수거와 쓰레기 정리' },
  { name: '청소 당번', icon: '🧹', description: '공용 공간 청소' },
  { name: '회의록 작성', icon: '📝', description: '주간 회의록을 정리해 공유해요' },
  { name: '회식 총무', icon: '💳', description: '회식 예약과 정산을 맡아요' },
  { name: '생일 챙기기', icon: '🎂', description: '팀원 생일 케이크·카드를 준비해요' },
  { name: '신규 입사자 버디', icon: '🤝', description: '새로 온 동료의 적응을 도와요' },
] as const;

export const DUTY_PERIODS = [
  { key: 'DAILY', name: '매일' },
  { key: 'WEEKLY', name: '매주' },
  { key: 'BIWEEKLY', name: '2주마다' },
  { key: 'MONTHLY', name: '매달' },
] as const;
export type DutyPeriod = (typeof DUTY_PERIODS)[number]['key'];

const DAY = 86_400_000;
const toDate = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 날짜(KST YYYY-MM-DD)가 속한 기간의 시작일 */
export function periodStart(date: string, period: DutyPeriod, anchor: string) {
  if (period === 'DAILY') return date;
  if (period === 'MONTHLY') return `${date.slice(0, 8)}01`;
  const monday = (d: string) => {
    const dow = new Date(toDate(d)).getUTCDay();
    return toDate(d) - ((dow + 6) % 7) * DAY;
  };
  const start = monday(date);
  if (period === 'WEEKLY') return fmt(start);
  // 2주: 기준일이 속한 주부터 2주 단위
  const base = monday(anchor);
  const weeks = Math.floor((start - base) / (7 * DAY));
  return fmt(start - (((weeks % 2) + 2) % 2) * 7 * DAY);
}

/** 기준일부터 몇 번째 기간인지 (순번 계산용, 음수 가능) */
export function periodIndex(date: string, period: DutyPeriod, anchor: string) {
  const a = periodStart(anchor, period, anchor);
  const d = periodStart(date, period, anchor);
  if (period === 'MONTHLY') return (Number(d.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(d.slice(5, 7)) - Number(a.slice(5, 7)));
  const len = period === 'DAILY' ? 1 : period === 'WEEKLY' ? 7 : 14;
  return Math.round((toDate(d) - toDate(a)) / (len * DAY));
}

/** n번째 다음 기간의 시작일 */
export function nextPeriod(start: string, period: DutyPeriod, n = 1) {
  if (period === 'MONTHLY') {
    const y = Number(start.slice(0, 4));
    const m = Number(start.slice(5, 7)) - 1 + n;
    return fmt(Date.UTC(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1));
  }
  const len = period === 'DAILY' ? 1 : period === 'WEEKLY' ? 7 : 14;
  return fmt(toDate(start) + len * n * DAY);
}
