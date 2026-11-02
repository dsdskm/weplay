/** 홍보 사이트는 로그인 없이 공개 API만 읽음 (서버 컴포넌트에서 호출, 1분마다 갱신) */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
export const AD_SLOT_ENABLED = process.env.NEXT_PUBLIC_AD_SLOT_ENABLED === 'true';

export async function publicGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
