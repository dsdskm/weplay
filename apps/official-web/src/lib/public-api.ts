/** 홍보 사이트는 로그인 없이 공개 API만 읽음 (서버 컴포넌트에서 호출, 1분마다 갱신) */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
export const AD_SLOT_ENABLED = process.env.NEXT_PUBLIC_AD_SLOT_ENABLED === 'true';

export const assetUrl = (url: string) => /^https?:\/\//.test(url) ? url : `${API_URL.replace(/\/api\/v1\/?$/, '')}${url}`;

export async function publicLegalGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('약관을 불러오지 못했습니다.');
  return response.json() as Promise<T>;
}

export async function publicGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
