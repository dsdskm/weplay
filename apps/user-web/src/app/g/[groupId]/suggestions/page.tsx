'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { labelOf, SUGGESTION_CATEGORIES, SUGGESTION_STATUS } from '@weplay/shared';
import { Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { Tabs } from '@/components/tabs';
import { api, errorMessage } from '@/lib/api';
import { pagesOf, timeAgo } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';
import type { Paginated } from '@/lib/types';

interface Item {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  status: string;
  teamName: string | null;
  author: { name: string } | null;
  mine: boolean;
  votes: number | null;
  voted: boolean;
  answered: boolean;
  createdAt: string;
}
type Data = Paginated<Item> & { enabled: boolean; anonymousAllowed: boolean; showVotes: boolean; isManager: boolean; teams: { id: string; name: string }[]; counts: Record<string, number> };

const statusTone = (s: string) => (SUGGESTION_STATUS.find((x) => x.key === s)?.tone ?? 'slate') as 'slate' | 'amber' | 'brand' | 'green' | 'rose';

/** 건의사항: 올리고, 공감하고, 관리자가 답변 */
export default function SuggestionsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'ETC', anonymous: false, teamId: '' });
  const [error, setError] = useState<string>();

  const { data } = useQuery({
    queryKey: ['group', groupId, 'suggestions', status, sort, mine, page],
    queryFn: () => api<Data>(`/groups/${groupId}/suggestions?page=${page}&pageSize=10&sort=${sort}${status ? `&status=${status}` : ''}${mine ? '&mine=1' : ''}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'suggestions'] });
  const create = useMutation({
    mutationFn: () => api(`/groups/${groupId}/suggestions`, { body: { ...form, title: form.title.trim(), body: form.body.trim(), teamId: form.teamId || null } }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: '', body: '', category: 'ETC', anonymous: false, teamId: '' });
      setError(undefined);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const vote = useMutation({ mutationFn: (id: string) => api(`/groups/${groupId}/suggestions/${id}/vote`, { body: {} }), onSuccess: refresh });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="wp-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-6 text-white">
        <span className="wp-float pointer-events-none absolute -right-4 -top-4 text-8xl opacity-30">💡</span>
        <h1 className="text-2xl font-black">건의사항</h1>
        <p className="mt-1 text-sm opacity-90">작은 불편도 괜찮아요. 공감이 많을수록 먼저 검토돼요.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          {SUGGESTION_STATUS.map((s) => (
            <span key={s.key} className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              {s.name} {data.counts[s.key] ?? 0}
            </span>
          ))}
        </div>
        <Button className="mt-4 bg-white text-orange-600 hover:bg-white/90" onClick={() => setOpen(true)}>
          건의하기
        </Button>
      </div>

      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        items={[{ key: '', label: '전체', count: total }, ...SUGGESTION_STATUS.map((s) => ({ key: s.key as string, label: s.name, count: data.counts[s.key] ?? 0 }))]}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 font-semibold">
          {([
            ['recent', '최신순'],
            ['popular', '공감순'],
          ] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setSort(k)} className={cn('rounded-full px-3 py-1 transition', sort === k ? 'bg-white shadow' : 'text-slate-500')}>
              {l}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-slate-600">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> 내 건의만
        </label>
      </div>

      {data.items.length === 0 ? (
        <Empty>건의가 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((s, i) => (
            <Card key={s.id} className="wp-pop-in flex gap-3" >
              <button
                type="button"
                onClick={() => vote.mutate(s.id)}
                style={{ animationDelay: `${i * 30}ms` }}
                className={cn('flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl py-2 text-xs font-bold transition active:scale-90', s.voted ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')}
              >
                <span className={cn('text-xl transition-transform', s.voted && 'scale-125')}>{s.voted ? '❤️' : '🤍'}</span>
                {s.votes ?? ''}
              </button>
              <Link href={`/g/${groupId}/suggestions/${s.id}`} className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={statusTone(s.status)}>{labelOf(SUGGESTION_STATUS, s.status)}</Badge>
                  <Badge tone="slate">{labelOf(SUGGESTION_CATEGORIES, s.category)}</Badge>
                  {s.teamName && <Badge tone="brand">{s.teamName} 팀</Badge>}
                  {s.answered && <Badge tone="green">답변 있음</Badge>}
                </p>
                <p className="mt-1 truncate font-bold">{s.title}</p>
                <p className="line-clamp-2 text-sm text-slate-500">{s.excerpt}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {s.author ? s.author.name : '익명'}
                  {s.mine && ' (나)'} · {timeAgo(s.createdAt)}
                </p>
              </Link>
            </Card>
          ))}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="건의하기"
        footer={
          <Button onClick={() => create.mutate()} disabled={!form.title.trim() || !form.body.trim() || create.isPending}>
            올리기
          </Button>
        }
      >
        <div className="space-y-3">
          <ErrorText>{error}</ErrorText>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {SUGGESTION_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">그룹 전체에</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} 팀에
                </option>
              ))}
            </select>
          </div>
          <Input placeholder="한 줄로 요약해 주세요" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
          <textarea className="min-h-36 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="불편한 점과 바라는 점을 자유롭게 적어 주세요" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          {data.anonymousAllowed && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} /> 익명으로 올리기 (관리자에게도 이름이 보이지 않아요)
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
