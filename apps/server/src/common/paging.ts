/** 목록 페이지네이션 공통 처리 (쿼리 page, pageSize → skip/take) */
export interface PageQuery {
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePaging(page?: string, pageSize?: string, defaultSize = 10, maxSize = 50): PageQuery {
  const size = Math.min(Math.max(Number(pageSize) || defaultSize, 1), maxSize);
  const current = Math.max(Number(page) || 1, 1);
  return { page: current, pageSize: size, skip: (current - 1) * size };
}

export function paged<T>(items: T[], total: number, q: PageQuery) {
  return { items, total, page: q.page, pageSize: q.pageSize };
}
