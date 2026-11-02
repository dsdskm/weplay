'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { MemberCombobox } from '@/components/member-combobox';
import { COMPLIMENT_REACTIONS } from '@weplay/shared';
import { api, errorMessage } from '@/lib/api';
import { useGroupId, useMe } from '@/lib/hooks';
import type { ComplimentCard, ComplimentOverview, Member, Paginated, Paged } from '@/lib/types';

const PAGE_SIZE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

interface Filters {
  q: string;
  senderId: string;
  receiverId: string;
  from: string;
  to: string;
}
const EMPTY_FILTERS: Filters = { q: '', senderId: '', receiverId: '', from: '', to: '' };

export default function ComplimentsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const key = ['group', groupId, 'compliments'];

  const [feedPage, setFeedPage] = useState(1);
  const [recvPage, setRecvPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const [editing, setEditing] = useState<{ id: string; body: string }>();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState<string>();
  const [receiver, setReceiver] = useState<Member | null>(null);
  const [senderFilter, setSenderFilter] = useState<Member | null>(null);
  const [receiverFilter, setReceiverFilter] = useState<Member | null>(null);
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const updateFilter = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setFeedPage(1);
  };

  const { data: overview } = useQuery({
    queryKey: [...key, 'overview'],
    queryFn: () => api<ComplimentOverview>(`/groups/${groupId}/compliments`),
  });
  const enabled = !!overview?.enabled;

  const feedParams = new URLSearchParams({ page: String(feedPage), pageSize: String(PAGE_SIZE) });
  (Object.keys(filters) as (keyof Filters)[]).forEach((k) => {
    if (filters[k]) feedParams.set(k, filters[k]);
  });
  const { data: feed } = useQuery({
    queryKey: [...key, 'feed', feedPage, filters],
    queryFn: () => api<Paginated<ComplimentCard>>(`/groups/${groupId}/compliments/feed?${feedParams.toString()}`),
    enabled,
  });
  const { data: sent } = useQuery({
    queryKey: [...key, 'sent', sentPage],
    queryFn: () => api<Paginated<ComplimentCard>>(`/groups/${groupId}/compliments/sent?page=${sentPage}&pageSize=${PAGE_SIZE}`),
    enabled,
  });
  const { data: received } = useQuery({
    queryKey: [...key, 'received', recvPage],
    queryFn: () => api<Paginated<ComplimentCard>>(`/groups/${groupId}/compliments/received?page=${recvPage}&pageSize=${PAGE_SIZE}`),
    enabled,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) => setError(errorMessage(e));

  const send = useMutation({
    mutationFn: () => api(`/groups/${groupId}/compliments`, { body: { receiverId: receiver?.id, body: body.trim(), anonymous } }),
    onSuccess: () => {
      setError(undefined);
      setBody('');
      setReceiver(null);
      setAnonymous(false);
      setFeedPage(1);
      refresh();
    },
    onError,
  });
  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string | null }) =>
      emoji
        ? api(`/groups/${groupId}/compliments/${id}/reaction`, { method: 'PUT', body: { emoji } })
        : api(`/groups/${groupId}/compliments/${id}/reaction`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });

  const update = useMutation({
    mutationFn: (v: { id: string; body: string }) => api(`/groups/${groupId}/compliments/${v.id}`, { method: 'PATCH', body: { body: v.body.trim() } }),
    onSuccess: () => {
      setError(undefined);
      setEditing(undefined);
      refresh();
    },
    onError,
  });

  if (!overview) return <p className="text-slate-400">불러오는 중…</p>;

  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">칭찬 카드</h1>
      <ErrorText>{error}</ErrorText>

      {!enabled ? (
        <Card>
          <p className="text-slate-600">이 기능은 아직 그룹에서 사용할 수 없어요.</p>
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-brand-600">{overview.receivedTotal}</p>
              <p className="text-xs text-slate-500">받은 칭찬</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brand-600">{overview.sentTotal}</p>
              <p className="text-xs text-slate-500">보낸 칭찬</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brand-600">
                {overview.remainingToday}/{overview.dailyLimit}
              </p>
              <p className="text-xs text-slate-500">오늘 남은 칭찬</p>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-bold">칭찬 보내기</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <MemberCombobox groupId={groupId} value={receiver} onChange={setReceiver} excludeId={me?.id} placeholder="받을 구성원 선택" />
              <Input placeholder="칭찬 내용 (필수)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                익명으로 보내기
              </label>
              <Button variant="ghost" disabled title="준비 중">
                📎 사진·영상 첨부 (준비 중)
              </Button>
            </div>
            <Button onClick={() => send.mutate()} disabled={!receiver || !body.trim() || overview.remainingToday === 0 || send.isPending}>
              보내기
            </Button>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">칭찬 피드</h2>
            <Card className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="내용 검색" value={filters.q} onChange={(e) => updateFilter({ q: e.target.value })} />
              <MemberCombobox groupId={groupId} value={receiverFilter} onChange={(m) => { setReceiverFilter(m); updateFilter({ receiverId: m?.id ?? '' }); }} placeholder="받은 사람: 전체" clearable />
              <MemberCombobox groupId={groupId} value={senderFilter} onChange={(m) => { setSenderFilter(m); updateFilter({ senderId: m?.id ?? '' }); }} placeholder="보낸 사람: 전체" clearable />
              <div className="flex items-center gap-2 text-sm">
                <input type="date" className="flex-1 rounded-xl border border-slate-200 px-2 py-2" value={filters.from} onChange={(e) => updateFilter({ from: e.target.value })} />
                <span className="text-slate-400">~</span>
                <input type="date" className="flex-1 rounded-xl border border-slate-200 px-2 py-2" value={filters.to} onChange={(e) => updateFilter({ to: e.target.value })} />
              </div>
              {hasFilter && (
                <div className="sm:col-span-2">
                  <Button variant="ghost" onClick={() => { setSenderFilter(null); setReceiverFilter(null); updateFilter(EMPTY_FILTERS); }}>
                    필터 초기화
                  </Button>
                </div>
              )}
            </Card>
            {!feed || feed.total === 0 ? (
              <Empty>{hasFilter ? '조건에 맞는 칭찬이 없어요.' : '아직 칭찬이 없어요.'}</Empty>
            ) : (
              <Card className="divide-y divide-slate-100 p-0">
                {feed.items.map((c) => (
                  <CardRow key={c.id} card={c} onReact={(emoji) => react.mutate({ id: c.id, emoji })} />
                ))}
                <div className="px-5 py-3">
                  <Pager page={feedPage} pages={pagesOf(feed.total)} setPage={setFeedPage} total={feed.total} />
                </div>
              </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">내가 보낸 칭찬</h2>
            {!sent || sent.total === 0 ? (
              <Empty>아직 보낸 칭찬이 없어요.</Empty>
            ) : (
              <Card className="divide-y divide-slate-100 p-0">
                {sent.items.map((c) => (
                  <CardRow
                    key={c.id}
                    card={c}
                    onReact={(emoji) => react.mutate({ id: c.id, emoji })}
                    editing={editing?.id === c.id ? editing : undefined}
                    onEditStart={() => setEditing({ id: c.id, body: c.body })}
                    onEditChange={(body) => setEditing({ id: c.id, body })}
                    onEditCancel={() => setEditing(undefined)}
                    onEditSave={() => editing && update.mutate(editing)}
                    saving={update.isPending}
                  />
                ))}
                <div className="px-5 py-3">
                  <Pager page={sentPage} pages={pagesOf(sent.total)} setPage={setSentPage} total={sent.total} />
                </div>
              </Card>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">내가 받은 칭찬</h2>
            {!received || received.total === 0 ? (
              <Empty>아직 받은 칭찬이 없어요.</Empty>
            ) : (
              <Card className="divide-y divide-slate-100 p-0">
                {received.items.map((c) => (
                  <CardRow key={c.id} card={c} onReact={(emoji) => react.mutate({ id: c.id, emoji })} />
                ))}
                <div className="px-5 py-3">
                  <Pager page={recvPage} pages={pagesOf(received.total)} setPage={setRecvPage} total={received.total} />
                </div>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CardRow({
  card,
  onReact,
  editing,
  onEditStart,
  onEditChange,
  onEditCancel,
  onEditSave,
  saving,
}: {
  card: ComplimentCard;
  onReact: (emoji: string | null) => void;
  editing?: { id: string; body: string };
  onEditStart?: () => void;
  onEditChange?: (body: string) => void;
  onEditCancel?: () => void;
  onEditSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Avatar name={card.sender?.name ?? '익명'} url={card.sender?.avatarUrl ?? null} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{card.sender?.name ?? '익명'}</span>
          <span className="text-slate-400"> → </span>
          <span className="font-semibold">{card.receiver.name}</span>
          <span className="ml-2 text-xs text-slate-400">{new Date(card.createdAt).toLocaleDateString('ko-KR')}</span>
        </p>
        {editing ? (
          <div className="mt-1 flex gap-2">
            <Input
              className="flex-1"
              value={editing.body}
              maxLength={300}
              onChange={(e) => onEditChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && editing.body.trim()) onEditSave?.();
              }}
            />
            <Button variant="secondary" onClick={() => onEditSave?.()} disabled={!editing.body.trim() || saving}>
              저장
            </Button>
            <Button variant="ghost" onClick={() => onEditCancel?.()}>
              취소
            </Button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-600">{card.body}</p>
        )}
        {(card.canReact || card.reactions.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {COMPLIMENT_REACTIONS.map((emoji) => {
              const count = card.reactions.find((r) => r.emoji === emoji)?.count ?? 0;
              const mine = card.myReaction === emoji;
              if (!card.canReact && count === 0) return null;
              return (
                <button
                  key={emoji}
                  type="button"
                  disabled={!card.canReact}
                  onClick={() => onReact(mine ? null : emoji)}
                  className={`rounded-full px-2 py-0.5 text-xs ${mine ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300' : 'bg-slate-100 text-slate-600'} disabled:opacity-60`}
                >
                  {emoji} {count > 0 ? count : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {card.canEdit && !editing && onEditStart && (
        <Button variant="ghost" onClick={onEditStart}>
          수정
        </Button>
      )}
    </div>
  );
}
