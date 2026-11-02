'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { INQUIRY_CATEGORIES, INQUIRY_STATUS, labelOf } from '@weplay/shared';
import { Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';

interface Row {
  id: string;
  category: string;
  title: string;
  status: string;
  user: { name: string; email: string | null } | null;
  replyCount: number;
  updatedAt: string;
}
interface Detail {
  id: string;
  category: string;
  title: string;
  body: string;
  status: string;
  user: { name: string; email: string | null } | null;
  group: { name: string } | null;
  createdAt: string;
  replies: { id: string; body: string; fromMaster: boolean; author: string; createdAt: string }[];
}
const PAGE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE));
const tone = (s: string) => (s === 'ANSWERED' ? 'green' : s === 'OPEN' ? 'amber' : 'slate') as 'green' | 'amber' | 'slate';

/** 시스템 문의: 사용자 문의에 답하고 상태를 관리 */
export default function SupportAdminPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string>();
  const [reply, setReply] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [error, setError] = useState<string>();
  const { data } = useQuery({
    queryKey: ['admin', 'inquiries', status, q, page],
    queryFn: () => api<{ counts: Record<string, number>; items: Row[]; total: number }>(`/admin/inquiries?${status ? `status=${status}&` : ''}${q ? `q=${encodeURIComponent(q)}&` : ''}page=${page}&pageSize=${PAGE}`),
  });
  const { data: detail } = useQuery({ queryKey: ['admin', 'inquiry', openId], queryFn: () => api<Detail>(`/admin/inquiries/${openId}`), enabled: !!openId });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] });
    qc.invalidateQueries({ queryKey: ['admin', 'inquiry', openId] });
  };
  const send = useMutation({
    mutationFn: () => api(`/admin/inquiries/${openId}/replies`, { body: { body: reply.trim() } }),
    onSuccess: () => {
      setReply('');
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const saveStatus = useMutation({
    mutationFn: () => api(`/admin/inquiries/${openId}/status`, { method: 'PUT', body: { status: nextStatus } }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">시스템 문의</h1>
        <p className="text-sm text-slate-500">사용자가 보낸 문의에 답하고 상태를 관리해요.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[{ key: '', label: '전체' }, ...INQUIRY_STATUS.map((s) => ({ key: s.key, label: s.name }))].map((t) => (
          <button
            key={t.key || 'ALL'}
            type="button"
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', status === t.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {t.label} <span className="opacity-60">{t.key ? (data?.counts[t.key] ?? 0) : data?.total ?? 0}</span>
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim());
          setPage(1);
        }}
      >
        <Input placeholder="제목·작성자 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>

      {!data ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <Empty>문의가 없어요.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.items.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setOpenId(r.id);
                setReply('');
                setNextStatus('');
              }}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.title}</p>
                <p className="text-xs text-slate-400">
                  {labelOf(INQUIRY_CATEGORIES, r.category)} · {r.user?.name ?? '탈퇴 사용자'} · 답글 {r.replyCount}
                </p>
              </div>
              <Badge tone={tone(r.status)}>{labelOf(INQUIRY_STATUS, r.status)}</Badge>
            </button>
          ))}
        </Card>
      )}
      <Pager page={page} pages={pagesOf(data?.total ?? 0)} setPage={setPage} total={data?.total ?? 0} />

      <Modal open={!!openId} onClose={() => setOpenId(undefined)} wide title={detail?.title ?? '문의'}>
        {!detail ? (
          <p className="text-slate-400">불러오는 중…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone="slate">{labelOf(INQUIRY_CATEGORIES, detail.category)}</Badge>
              <Badge tone={tone(detail.status)}>{labelOf(INQUIRY_STATUS, detail.status)}</Badge>
              <span>
                {detail.user?.name} {detail.user?.email && `(${detail.user.email})`}
              </span>
              {detail.group && <span>· 그룹 {detail.group.name}</span>}
            </div>
            <Card className="whitespace-pre-wrap bg-slate-50 text-sm leading-relaxed">{detail.body}</Card>
            <div className="space-y-2">
              {detail.replies.map((r) => (
                <div key={r.id} className={cn('flex', r.fromMaster ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-2 text-sm', r.fromMaster ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200')}>
                    <p className={cn('mb-1 text-xs font-semibold', r.fromMaster ? 'text-white/70' : 'text-slate-500')}>{r.fromMaster ? '운영자' : r.author || '사용자'}</p>
                    <p className="whitespace-pre-wrap">{r.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-sm font-bold">답변 보내기</p>
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="답변을 입력하세요 (보내면 답변 완료로 바뀌어요)" />
              <div className="flex justify-end">
                <Button disabled={!reply.trim() || send.isPending} onClick={() => send.mutate()}>
                  답변 보내기
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-sm font-bold">상태</span>
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={nextStatus || detail.status} onChange={(e) => setNextStatus(e.target.value)}>
                {INQUIRY_STATUS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button variant="secondary" disabled={!nextStatus || nextStatus === detail.status || saveStatus.isPending} onClick={() => saveStatus.mutate()}>
                상태 저장
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
