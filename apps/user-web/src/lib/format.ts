/** 날짜·시간 표시 공통 */
export const fmtDateTime = (d: string | Date) => new Date(d).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

/** "3분 전", "2일 전" 같은 상대 시간 */
export function timeAgo(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return fmtDate(d);
}

/** 남은 시간 "3시간 12분 남음" */
export function timeLeft(d: string | Date | null | undefined) {
  if (!d) return null;
  const s = (new Date(d).getTime() - Date.now()) / 1000;
  if (s <= 0) return '시간 끝';
  if (s < 3600) return `${Math.ceil(s / 60)}분 남음`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분 남음`;
  return `${Math.floor(s / 86400)}일 ${Math.floor((s % 86400) / 3600)}시간 남음`;
}

export const pagesOf = (total: number, size: number) => Math.max(1, Math.ceil(total / size));
