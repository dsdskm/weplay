'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AI_LEVEL_LABEL, TURN_GAMES } from '@weplay/shared';
import { Avatar, Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { Tabs } from '@/components/tabs';
import { api, errorMessage } from '@/lib/api';
import { pagesOf, timeAgo, timeLeft } from '@/lib/format';
import type { Paginated } from '@/lib/types';

interface Item {
  id: string;
  type: string;
  title: string;
  status: 'RECRUITING' | 'PLAYING' | 'DONE' | 'CANCELED';
  teamName: string | null;
  participantCount: number;
  entryCount: number;
  joined: boolean;
  isMyTurn: boolean;
  currentUser: { name: string; avatarUrl: string | null } | null;
  turnDeadline: string | null;
  createdAt: string;
}
type Data = Paginated<Item> & { enabled: boolean; myTurnCount: number; teams: { id: string; name: string }[] };
const STATUS = { RECRUITING: ['모집 중', 'green'], PLAYING: ['진행 중', 'brand'], DONE: ['끝', 'slate'], CANCELED: ['취소', 'slate'] } as const;
const def = (k: string) => TURN_GAMES.find((g) => g.key === k);

/** 턴제 게임 목록 + 만들기 */
export function TurnGameList({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState<'open' | 'mine' | 'done'>('open');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('TELEPHONE');
  const [form, setForm] = useState({ title: '', teamId: '', rounds: 1, secret: '', hint: '', question: '' });
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['group', groupId, 'turn-games', status, page], queryFn: () => api<Data>(`/groups/${groupId}/turn-games?status=${status}&page=${page}&pageSize=10`), refetchInterval: 30_000 });
  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>(`/groups/${groupId}/turn-games`, {
        body: {
          type,
          title: form.title.trim() || def(type)?.name,
          teamId: form.teamId || null,
          ...(type === 'STORY' ? { rounds: form.rounds } : {}),
          ...(type === 'TWENTY_Q' ? { secret: form.secret.trim(), hint: form.hint.trim() || undefined } : {}),
          ...(type === 'NOMINATE' || type === 'PRAISE' ? { question: form.question.trim() || undefined } : {}),
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['group', groupId, 'turn-games'] });
      router.push(`/g/${groupId}/games/turn/${r.id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  const d = def(type);
  const needs = type === 'TWENTY_Q' ? !!form.secret.trim() : type === 'NOMINATE' ? !!form.question.trim() : true;
  return (
    <div className="space-y-4">
      {data.myTurnCount > 0 && (
        <button type="button" onClick={() => setStatus('mine')} className="wp-pop-in wp-glow flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-4 text-left font-bold text-amber-950 shadow-lg">
          <span className="wp-float text-3xl">🔔</span>
          내 턴이 {data.myTurnCount}개 기다리고 있어요!
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={[
            ['open', '모집·진행 중'],
            ['mine', '내가 참가 중'],
            ['done', '끝난 게임'],
          ]}
        />
        <Button onClick={() => setOpen(true)}>턴제 게임 만들기</Button>
      </div>
      {data.items.length === 0 ? (
        <Empty>게임이 없어요. 하나 만들어서 동료를 불러 보세요!</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((g, i) => {
            const [label, tone] = STATUS[g.status];
            return (
              <Link key={g.id} href={`/g/${groupId}/games/turn/${g.id}`} style={{ animationDelay: `${i * 40}ms` }} className="wp-pop-in block">
                <Card className={cn('h-full space-y-2 transition hover:-translate-y-0.5 hover:shadow-md', g.isMyTurn && 'wp-glow ring-2 ring-amber-400')}>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{def(g.type)?.icon ?? '🎲'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{g.title}</p>
                      <p className="text-xs text-slate-500">
                        {def(g.type)?.name} · {g.teamName ? `${g.teamName} 팀` : '그룹'} · {g.participantCount}명
                      </p>
                    </div>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  {g.isMyTurn ? (
                    <p className="text-sm font-black text-amber-600">👉 내 차례예요! {g.turnDeadline && <span className="text-xs font-normal text-slate-400">({timeLeft(g.turnDeadline)})</span>}</p>
                  ) : g.currentUser ? (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Avatar name={g.currentUser.name} url={g.currentUser.avatarUrl} size={18} /> {g.currentUser.name}님 차례 {g.turnDeadline && `· ${timeLeft(g.turnDeadline)}`}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {g.status === 'RECRUITING' ? (g.joined ? '참가 완료 · 시작을 기다려요' : '참가할 수 있어요') : `${timeAgo(g.createdAt)} 시작`}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        wide
        title="턴제 게임 만들기"
        footer={
          <Button onClick={() => create.mutate()} disabled={!needs || create.isPending}>
            만들기
          </Button>
        }
      >
        <div className="space-y-4">
          <ErrorText>{error}</ErrorText>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TURN_GAMES.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setType(g.key)}
                className={cn('flex flex-col items-start gap-1 rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5', type === g.key ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-100 hover:bg-slate-50')}
              >
                <span className="text-3xl">{g.icon}</span>
                <span className="text-sm font-bold">{g.name}</span>
                <span className="text-[11px] leading-snug text-slate-500">{g.tagline}</span>
                <span className="text-[10px] text-slate-400">{g.min}명 이상 · {AI_LEVEL_LABEL[g.ai]}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder={`제목 (비우면 '${d?.name}')`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={60} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">그룹 전체</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} 팀만
                </option>
              ))}
            </select>
          </div>
          {type === 'STORY' && (
            <label className="flex items-center gap-2 text-sm">
              한 사람이 쓰는 횟수
              <select className="rounded-lg border border-slate-200 px-2 py-1" value={form.rounds} onChange={(e) => setForm({ ...form, rounds: Number(e.target.value) })}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}번
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === 'TWENTY_Q' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="정답 (다른 사람에게 안 보여요)" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} maxLength={40} />
              <Input placeholder="힌트 분류 (예: 동물, 회사 물건)" value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} maxLength={60} />
            </div>
          )}
          {type === 'NOMINATE' && (
            <div className="space-y-2">
              <Input placeholder="릴레이 질문 (예: 요즘 가장 빠져 있는 것은?)" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} maxLength={100} />
              <div className="flex flex-wrap gap-1.5">
                {['요즘 가장 빠져 있는 것은?', '회사 근처 최애 점심 메뉴는?', '나만 아는 꿀팁 하나!', '올해 꼭 해 보고 싶은 것은?', '최근 가장 웃겼던 일은?', '칭찬 릴레이: 앞사람의 장점을 한 줄로 칭찬해 주세요'].map((qq) => (
                  <button key={qq} type="button" className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200" onClick={() => setForm({ ...form, question: qq })}>
                    {qq}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400">참가할 때 참가비가 들고, 끝까지 하면 보상을 받아요. 제한 시간 안에 차례를 넘기지 않으면 다음 사람으로 넘어가요.</p>
        </div>
      </Modal>
    </div>
  );
}
