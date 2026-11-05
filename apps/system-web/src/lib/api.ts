import { attachmentSchema } from '@weplay/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'wp_system_token';

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

/** MASTER 업로드 (기능 소개 이미지 등). 사진만 허용 */
export async function uploadAdminImage(file: File) {
  const token = tokenStore.get();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/admin/uploads`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? '업로드에 실패했습니다');
  return data as { url: string; mediaType: 'IMAGE' | 'VIDEO' };
}

async function uploadAdminAttachmentTo(file: File, path: string) {
  const token = tokenStore.get();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? '업로드에 실패했습니다');
  }
  const parsed = attachmentSchema.safeParse(data);
  if (!parsed.success) throw new Error('첨부 파일 응답이 올바르지 않습니다');
  return parsed.data;
}

export function uploadAdminAttachment(file: File) {
  return uploadAdminAttachmentTo(file, '/admin/uploads/attachments');
}

export function uploadAdminTermsAttachment(file: File, type: string) {
  if (type !== 'SERVICE' && type !== 'PRIVACY') throw new Error('약관 종류를 확인할 수 없어요');
  return uploadAdminAttachmentTo(file, `/admin/uploads/terms/${type}/attachments`);
}

/** 업로드 주소를 화면에 보여 줄 전체 주소로 */
export const assetUrl = (url: string) => (url.startsWith('http') ? url : `${API_URL.replace(/\/api\/v1\/?$/, '')}${url}`);

/** datetime-local 입력값 ↔ ISO 문자열 (로컬 시간 기준) */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
