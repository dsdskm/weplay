'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ErrorText } from './ui';
import { LegalDocumentBody, type LegalDocument } from './legal-document';
import { api, AUTH_CHANGED_EVENT, errorMessage, TERMS_REQUIRED_EVENT, tokenStore } from '@/lib/api';
import { logout } from '@/lib/hooks';
import { hasRequiredConsent, selectedTermsIds } from '@/lib/legal-consent';

/** 새로 게시된 약관에 아직 동의하지 않았으면 동의 창을 띄움 (필수 약관은 동의해야 닫힘) */
export function TermsGate({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string>();
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string>();
  const exempt = ['/terms', '/account', '/login', '/signup', '/password-reset'].includes(pathname);
  useEffect(() => {
    const sync = () => { setToken(tokenStore.get()); setReady(true); setChecked({}); setSkipped(false); };
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(AUTH_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const pending = useQuery({ queryKey: ['me', 'terms', 'pending', token], queryFn: () => api<LegalDocument[]>('/me/terms/pending'), enabled: ready && !!token && !exempt, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: 'always', refetchInterval: 60_000 });
  useEffect(() => {
    const refresh = () => {
      setChecking(true);
      setSkipped(false);
      void qc.invalidateQueries({ queryKey: ['me', 'terms'] }).finally(() => setChecking(false));
    };
    window.addEventListener(TERMS_REQUIRED_EVENT, refresh);
    return () => window.removeEventListener(TERMS_REQUIRED_EVENT, refresh);
  }, [qc]);
  const agree = useMutation({
    mutationFn: (ids: string[]) => api('/me/terms/agree', { body: { termsIds: ids } }),
    onSuccess: async () => { setChecked({}); setSkipped(true); await qc.invalidateQueries(); },
    onError: async (e) => { setError(errorMessage(e)); setChecked({}); await pending.refetch(); },
  });
  if (exempt || (ready && !token)) return <>{children}</>;
  if (!ready || pending.isPending || checking) return <div className="p-8" role="status">필수 약관을 확인하는 중입니다.</div>;
  if (pending.isError) return <section className="mx-auto max-w-lg space-y-4 p-8" role="alert"><h1 className="text-lg font-bold">약관을 확인하지 못했습니다</h1><p>연결 상태를 확인한 후 다시 시도해 주세요.</p><Button onClick={() => pending.refetch()}>다시 시도</Button> <Button variant="ghost" onClick={logout}>동의하지 않고 로그아웃</Button><Link className="block underline" href="/account">계정 관리</Link></section>;
  const data = pending.data ?? [];
  if (data.length === 0) return <>{children}</>;
  const required = data.filter((t) => t.required);
  if (required.length === 0 && skipped) return <>{children}</>;
  const ok = hasRequiredConsent(data, checked);
  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8" aria-label="약관 동의">
      <h1 className="text-xl font-bold">약관 동의</h1>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">서비스를 계속 이용하려면 아래 약관에 동의해 주세요.</p>
        {data.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-100">
            <label className="flex items-center gap-3 px-4 py-3">
              <input type="checkbox" className="h-5 w-5 shrink-0" checked={!!checked[t.id]} onChange={(e) => setChecked({ ...checked, [t.id]: e.target.checked })} />
              <span className="flex-1 text-sm font-semibold">
                {t.required ? <span className="text-rose-500">[필수]</span> : <span className="text-slate-400">[선택]</span>} {t.title} <span className="text-xs font-normal text-slate-400">v{t.version}</span>
              </span>
              <button type="button" className="text-xs text-brand-600" onClick={() => setOpen(open === t.id ? undefined : t.id)}>
                {open === t.id ? '접기' : '보기'}
              </button>
            </label>
            <div className="px-4 pb-3 text-xs text-slate-500">시행일: {t.effectiveAt ? new Date(t.effectiveAt).toLocaleString('ko-KR') : '미정'}{t.changeSummary && <p className="mt-1 whitespace-pre-wrap">변경 사항: {t.changeSummary}</p>}</div>
            {open === t.id && <div className="border-t border-slate-100 px-4 py-3"><LegalDocumentBody document={t} /></div>}
          </div>
        ))}
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={logout}>동의하지 않고 로그아웃</Button>
          {required.length === 0 && <Button variant="ghost" onClick={() => setSkipped(true)}>나중에</Button>}
          <Button variant="ghost" onClick={() => setChecked(Object.fromEntries(data.map((t) => [t.id, true])))}>
            모두 동의
          </Button>
          <Button disabled={!ok || agree.isPending || pending.isFetching} onClick={() => agree.mutate(selectedTermsIds(data, checked))}>
            동의하고 계속하기
          </Button>
        </div>
      </div>
      <Link href="/account" className="block text-sm underline">계정 관리 및 비활성화</Link>
    </section>
  );
}
