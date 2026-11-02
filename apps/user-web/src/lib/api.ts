const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'wp_user_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? '요청에 실패했습니다');
  }
  return data as T;
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : '알 수 없는 오류';
}

/** 업로드된 파일 경로(/uploads/..)를 서버 주소를 붙인 URL로 */
export function assetUrl(path: string | null | undefined) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL.replace(/\/api\/v1\/?$/, '')}${path}`;
}

/** 사진·영상 업로드 (그룹 구성원). 성공하면 저장된 파일 경로와 종류를 돌려줌 */
export async function uploadFile(groupId: string, file: File) {
  const token = tokenStore.get();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/groups/${groupId}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? '업로드에 실패했습니다');
  return data as { url: string; mediaType: 'IMAGE' | 'VIDEO' };
}
