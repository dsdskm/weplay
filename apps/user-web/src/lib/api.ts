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
