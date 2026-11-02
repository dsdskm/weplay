'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { TERMS_TYPES } from '@weplay/shared';
import { Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useDialog } from '@/components/confirm-dialog';
import { Pager } from '@/components/pager';
import { api, errorMessage, fromLocalInput, toLocalInput } from '@/lib/api';

interface Row {
  id: string;
  type: string;
  version: number;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  required: boolean;
  effectiveAt: string | null;
  publishedAt: string | null;
  length: number;
  agreements: number;
}
type Form = { id?: string; type: string; title: string; content: string; required: boolean; effectiveAt: string };
const PAGE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE));
const STATUS = { DRAFT: ['초안', 'amber'], PUBLISHED: ['게시 중', 'green'], ARCHIVED: ['보관', 'slate'] } as const;

/** 약관 관리: 종류별 버전. 초안 → 게시(이전 버전은 보관, 사용자는 다시 동의) */
export default function TermsAdminPage() {
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [type, setType] = useState<string>(TERMS_TYPES[0].key);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Form>();
  const [error, setError] = useState<string>();
  const { data } = useQuery({
    queryKey: ['admin', 'terms', type, page],
    queryFn: () => api<{ userCount: number; items: Row[]; total: number }>(`/admin/terms?type=${type}&page=${page}&pageSize=${PAGE}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'terms'] });
  const save = useMutation({
    mutationFn: () => {
      const f = editing!;
      const body = { type: f.type, title: f.title.trim(), content: f.content, required: f.required, effectiveAt: fromLocalInput(f.effectiveAt) };
      return f.id ? api(`/admin/terms/${f.id}`, { method: 'PATCH', body }) : api('/admin/terms', { body });
    },
    onSuccess: () => {
      setEditing(undefined);
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: (id: string) => api(`/admin/terms/${id}/publish`, { body: {} }),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/terms/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e)),
  });
  const f = editing;
  const set = (patch: Partial<Form>) => f && setEditing({ ...f, ...patch });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">약관 관리</h1>
          <p className="text-sm text-slate-500">종류별로 버전을 만들고, 초안을 게시하면 사용자에게 다시 동의를 받아요.</p>
        </div>
        <Button onClick={() => setEditing({ type, title: '', content: '', required: TERMS_TYPES.find((t) => t.key === type)?.required ?? true, effectiveAt: '' })}>새 초안</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TERMS_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setType(t.key);
              setPage(1);
            }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', type === t.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {t.name}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>

      {!data ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <Empty>아직 이 종류의 약관이 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((r) => {
            const [label, tone] = STATUS[r.status];
            const rate = data.userCount ? Math.round((r.agreements / data.userCount) * 100) : 0;
            return (
              <Card key={r.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    v{r.version} · {r.title}
                    <Badge tone={tone}>{label}</Badge>
                    {r.required ? <Badge tone="rose">필수</Badge> : <Badge tone="slate">선택</Badge>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.publishedAt ? `게시 ${toLocalInput(r.publishedAt).replace('T', ' ')}` : '게시 전'} · {r.length.toLocaleString()}자
                    {r.status !== 'DRAFT' && ` · 동의 ${r.agreements}명 (${rate}%)`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'DRAFT' && (
                    <>
                      <Button variant="secondary" onClick={async () => setEditing({ id: r.id, type: r.type, title: r.title, content: await loadContent(r.id), required: r.required, effectiveAt: toLocalInput(r.effectiveAt) })}>
                        수정
                      </Button>
                      <Button
                        onClick={async () => {
                          if (await confirm({ message: `v${r.version}을(를) 게시할까요? 이전 버전은 보관되고, 모든 사용자가 다시 동의해야 해요.` })) publish.mutate(r.id);
                        }}
                      >
                        게시
                      </Button>
                      <Button
                        variant="danger"
                        onClick={async () => {
                          if (await confirm({ message: '이 초안을 삭제할까요?', danger: true })) remove.mutate(r.id);
                        }}
                      >
                        삭제
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data?.total ?? 0)} setPage={setPage} total={data?.total ?? 0} />

      <Modal
        open={!!f}
        onClose={() => setEditing(undefined)}
        wide
        title={f?.id ? '초안 수정' : '새 초안'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)}>
              취소
            </Button>
            <Button onClick={() => save.mutate()} disabled={!f?.title.trim() || !f?.content.trim() || save.isPending}>
              저장
            </Button>
          </>
        }
      >
        {f && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={f.type} disabled={!!f.id} onChange={(e) => set({ type: e.target.value })}>
                {TERMS_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Input placeholder="제목" value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={100} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.required} onChange={(e) => set({ required: e.target.checked })} /> 필수 동의
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              시행일 (비우면 게시 시점)
              <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" value={f.effectiveAt} onChange={(e) => set({ effectiveAt: e.target.value })} />
            </label>
            <textarea className="min-h-72 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed" value={f.content} onChange={(e) => set({ content: e.target.value })} placeholder="약관 본문" />
          </div>
        )}
      </Modal>
    </div>
  );
}

/** 초안 본문은 목록에 없으므로 상세에서 가져옴 */
async function loadContent(id: string) {
  const row = await api<{ content: string }>(`/admin/terms/${id}`);
  return row.content;
}
