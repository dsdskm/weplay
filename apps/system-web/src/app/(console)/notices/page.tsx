'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SYSTEM_NOTICE_LEVELS } from '@weplay/shared';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage, fromLocalInput, toLocalInput } from '@/lib/api';

interface Row {
  id: string;
  title: string;
  body: string;
  level: string;
  pinned: boolean;
  banner: boolean;
  published: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}
type Form = { title: string; body: string; level: string; pinned: boolean; banner: boolean; published: boolean; startsAt: string; endsAt: string };
const EMPTY: Form = { title: '', body: '', level: 'INFO', pinned: false, banner: false, published: true, startsAt: '', endsAt: '' };
const PAGE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE));

/** 서비스 공지: 모든 사용자에게 보이는 공지. 배너·고정·게시 기간을 설정 */
export default function SystemNoticesPage() {
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ id?: string; form: Form }>();
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['admin', 'system-notices', page], queryFn: () => api<{ items: Row[]; total: number }>(`/admin/system-notices?page=${page}&pageSize=${PAGE}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'system-notices'] });

  const save = useMutation({
    mutationFn: () => {
      const f = editing!.form;
      const body = { title: f.title.trim(), body: f.body.trim(), level: f.level, pinned: f.pinned, banner: f.banner, published: f.published, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt) };
      return editing!.id ? api(`/admin/system-notices/${editing!.id}`, { method: 'PATCH', body }) : api('/admin/system-notices', { body });
    },
    onSuccess: () => {
      setEditing(undefined);
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/system-notices/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e)),
  });
  const set = (patch: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });
  const f = editing?.form;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">서비스 공지</h1>
          <p className="text-sm text-slate-500">모든 사용자에게 보이는 공지예요. 배너로 지정하면 상단에 띠로 떠요.</p>
        </div>
        <Button onClick={() => setEditing({ form: { ...EMPTY } })}>새 공지</Button>
      </div>
      <ErrorText>{error}</ErrorText>

      {!data ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <Empty>등록된 서비스 공지가 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((n) => {
            const level = SYSTEM_NOTICE_LEVELS.find((l) => l.key === n.level);
            return (
              <Card key={n.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-bold">
                    <span>{level?.icon}</span>
                    <span className="truncate">{n.title}</span>
                  </p>
                  <p className="flex flex-wrap gap-1.5 text-xs">
                    <Badge tone={n.level === 'URGENT' ? 'rose' : 'brand'}>{level?.name}</Badge>
                    {n.published ? <Badge tone="green">게시</Badge> : <Badge tone="slate">비공개</Badge>}
                    {n.banner && <Badge tone="amber">배너</Badge>}
                    {n.pinned && <Badge tone="slate">고정</Badge>}
                    {(n.startsAt || n.endsAt) && <span className="text-slate-400">{n.startsAt ? toLocalInput(n.startsAt).replace('T', ' ') : '즉시'} ~ {n.endsAt ? toLocalInput(n.endsAt).replace('T', ' ') : '무기한'}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing({ id: n.id, form: { title: n.title, body: n.body, level: n.level, pinned: n.pinned, banner: n.banner, published: n.published, startsAt: toLocalInput(n.startsAt), endsAt: toLocalInput(n.endsAt) } })}>
                    수정
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (await confirm({ message: `"${n.title}" 공지를 삭제할까요?`, danger: true })) remove.mutate(n.id);
                    }}
                  >
                    삭제
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data?.total ?? 0)} setPage={setPage} total={data?.total ?? 0} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        wide
        title={editing?.id ? '공지 수정' : '새 공지'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)}>
              취소
            </Button>
            <Button onClick={() => save.mutate()} disabled={!f?.title.trim() || !f?.body.trim() || save.isPending}>
              저장
            </Button>
          </>
        }
      >
        {f && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="제목" value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={100} />
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={f.level} onChange={(e) => set({ level: e.target.value })}>
                {SYSTEM_NOTICE_LEVELS.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.icon} {l.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea className="min-h-40 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="내용" value={f.body} onChange={(e) => set({ body: e.target.value })} maxLength={10000} />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                게시 시작 (비우면 즉시)
                <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                게시 종료 (비우면 무기한)
                <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={f.published} onChange={(e) => set({ published: e.target.checked })} /> 게시
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={f.banner} onChange={(e) => set({ banner: e.target.checked })} /> 상단 배너로
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={f.pinned} onChange={(e) => set({ pinned: e.target.checked })} /> 맨 위 고정
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
