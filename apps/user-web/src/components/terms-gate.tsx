'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, ErrorText } from './ui';
import { Modal } from './modal';
import { api, errorMessage, tokenStore } from '@/lib/api';

interface PendingTerms {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  required: boolean;
}

/** 새로 게시된 약관에 아직 동의하지 않았으면 동의 창을 띄움 (필수 약관은 동의해야 닫힘) */
export function TermsGate() {
  const qc = useQueryClient();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string>();
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['me', 'terms', 'pending'], queryFn: () => api<PendingTerms[]>('/me/terms/pending'), enabled: !!tokenStore.get(), staleTime: 600_000 });
  const agree = useMutation({
    mutationFn: (ids: string[]) => api('/me/terms/agree', { body: { termsIds: ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'terms'] }),
    onError: (e) => setError(errorMessage(e)),
  });
  if (!data || data.length === 0) return null;
  const required = data.filter((t) => t.required);
  if (required.length === 0 && skipped) return null;
  const ok = required.every((t) => checked[t.id]);
  return (
    <Modal open onClose={() => (required.length ? undefined : setSkipped(true))} title="약관이 새로 바뀌었어요">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">서비스를 계속 이용하려면 아래 약관에 동의해 주세요.</p>
        {data.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-100">
            <label className="flex items-center gap-3 px-4 py-3">
              <input type="checkbox" className="h-5 w-5" checked={!!checked[t.id]} onChange={(e) => setChecked({ ...checked, [t.id]: e.target.checked })} />
              <span className="flex-1 text-sm font-semibold">
                {t.required ? <span className="text-rose-500">[필수]</span> : <span className="text-slate-400">[선택]</span>} {t.title} <span className="text-xs font-normal text-slate-400">v{t.version}</span>
              </span>
              <button type="button" className="text-xs text-brand-600" onClick={() => setOpen(open === t.id ? undefined : t.id)}>
                {open === t.id ? '접기' : '보기'}
              </button>
            </label>
            {open === t.id && <div className="max-h-56 overflow-y-auto whitespace-pre-wrap border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">{t.content}</div>}
          </div>
        ))}
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setChecked(Object.fromEntries(data.map((t) => [t.id, true])))}>
            모두 동의
          </Button>
          <Button disabled={!ok || agree.isPending} onClick={() => agree.mutate(data.filter((t) => checked[t.id]).map((t) => t.id))}>
            동의하고 계속하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
