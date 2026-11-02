'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { INQUIRY_CATEGORIES, INQUIRY_STATUS, labelOf } from '@weplay/shared';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { SimpleShell } from '@/components/simple-shell';
import { api, errorMessage } from '@/lib/api';
import { pagesOf, timeAgo } from '@/lib/format';
import { useMyGroups } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface Item {
  id: string;
  category: string;
  title: string;
  status: string;
  replyCount: number;
  updatedAt: string;
}
const tone = (s: string) => (INQUIRY_STATUS.find((x) => x.key === s)?.tone ?? 'slate') as 'amber' | 'green' | 'slate';

/** 시스템 문의: 운영자(MASTER)에게 묻고 답을 받는 곳 */
export default function SupportPage() {
  const qc = useQueryClient();
  const { data: groups } = useMyGroups();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'ETC', title: '', body: '', groupId: '' });
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['support', page], queryFn: () => api<Paginated<Item>>(`/support/inquiries?page=${page}&pageSize=10`) });
  const create = useMutation({
    mutationFn: () => api('/support/inquiries', { body: { ...form, title: form.title.trim(), body: form.body.trim(), groupId: form.groupId || null } }),
    onSuccess: () => {
      setOpen(false);
      setForm({ category: 'ETC', title: '', body: '', groupId: '' });
      qc.invalidateQueries({ queryKey: ['support'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const approved = groups?.filter((g) => g.joinStatus === 'APPROVED') ?? [];

  return (
    <SimpleShell>
      <div className="space-y-5">
        <div className="wp-gradient rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 p-6 text-white">
          <p className="text-sm opacity-80">무엇이든 물어보세요</p>
          <h1 className="text-2xl font-black">🙋 시스템 문의</h1>
          <p className="mt-1 text-sm opacity-90">계정, 오류, 기능 제안까지. 운영자가 확인하고 답을 드려요.</p>
          <Button className="mt-4 bg-white text-indigo-700 hover:bg-white/90" onClick={() => setOpen(true)}>
            문의하기
          </Button>
        </div>
        {!data ? (
          <p className="text-slate-400">불러오는 중…</p>
        ) : data.items.length === 0 ? (
          <Empty>아직 문의한 내역이 없어요.</Empty>
        ) : (
          <div className="space-y-2">
            {data.items.map((r) => (
              <Link key={r.id} href={`/support/${r.id}`} className="block">
                <Card className="flex items-center gap-3 transition hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{r.title}</p>
                    <p className="text-xs text-slate-400">
                      {labelOf(INQUIRY_CATEGORIES, r.category)} · 답글 {r.replyCount} · {timeAgo(r.updatedAt)}
                    </p>
                  </div>
                  <Badge tone={tone(r.status)}>{labelOf(INQUIRY_STATUS, r.status)}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
        {data && <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="문의하기"
        footer={
          <Button onClick={() => create.mutate()} disabled={!form.title.trim() || !form.body.trim() || create.isPending}>
            보내기
          </Button>
        }
      >
        <div className="space-y-3">
          <ErrorText>{error}</ErrorText>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {INQUIRY_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">관련 그룹 없음</option>
              {approved.map((g) => (
                <option key={g.group.id} value={g.group.id}>
                  {g.group.name}
                </option>
              ))}
            </select>
          </div>
          <Input placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
          <textarea className="min-h-40 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="어떤 점이 궁금하신가요? 오류라면 어떤 화면에서 무엇을 했는지 적어 주세요." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
      </Modal>
    </SimpleShell>
  );
}
