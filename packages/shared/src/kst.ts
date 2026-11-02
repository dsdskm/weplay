/** 한국 시간(KST) 날짜 계산. 서버·화면이 같은 기준을 쓰도록 한 곳에 둠 */
export const DAY_MS = 86_400_000;

/** 현재 KST 날짜 YYYY-MM-DD */
export function kstDate(d: Date = new Date()): string {
  return new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 날짜에 n일 더하기 */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** 해당 날짜가 속한 주의 월요일 */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

/** 날짜 → 정수 인덱스 (순번·오늘의 게임 계산용) */
export const dayIndex = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
