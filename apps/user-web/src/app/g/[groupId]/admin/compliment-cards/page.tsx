'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, ErrorText } from '@/components/ui';
import { Pager } from '@/components/pager';
import { MemberCombobox } from '@/components/member-combobox';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { AdminComplimentCard, Member, Paginated, Paged } from '@/lib/types';

const PAGE_SIZE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));
const todayKST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

/** 관리자: 일별 전체 칭찬 목록과 숨김 처리 */
export default function AdminComplimentCardsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [date, setDate] = useState(todayKST());
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const [senderId, setSenderId] = useState('');
  const [senderFilter, setSenderFilter] = useState<Member | null>(null);
  const [receiverFilter, setReceiverFilter] = useState<Member | null>(null);
  const [receiverId, setReceiverId] = useState('');
  const [hiddenFilter, setHiddenFilter] = useState<'all' | 'hidden' | 'visible'>('all');

  const params = new URLSearchParams({ date, page: String(page), pageSize: String(PAGE_SIZE), hidden: hiddenFilter });
  if (senderId) params.set('senderId', senderId);
  if (receiverId) params.set('receiverId', receiverId);

  const { data } = useQuery({
    queryKey: ['group', groupId, 'compliments', 'admin', params.toString()],
    queryFn: () => api<Paginated<AdminComplimentCard>>(`/groups/${groupId}/compliments/admin/cards?${params.toString()}`),
  });
  const resetPage = () => setPage(1);

  const setHidden = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      api(`/groups/${groupId}/compliments/admin/cards/${id}/hidden`, { method: 'PUT', body: { hidden } }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'compliments'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">칭찬 관리</h1>
        <input
          type="date"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={date}
          max={todayKST()}
          onChange={(e) => {
            if (!e.target.value) return;
            setDate(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-2 sm:grid-cols-3">
        <MemberCombobox groupId={groupId} value={senderFilter} onChange={(m) => { setSenderFilter(m); setSenderId(m?.id ?? ''); resetPage(); }} placeholder="보낸 사람: 전체" clearable />
        <MemberCombobox groupId={groupId} value={receiverFilter} onChange={(m) => { setReceiverFilter(m); setReceiverId(m?.id ?? ''); resetPage(); }} placeholder="받은 사람: 전체" clearable />
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={hiddenFilter} onChange={(e) => { setHiddenFilter(e.target.value as 'all' | 'hidden' | 'visible'); resetPage(); }}>
          <option value="all">숨김 여부: 전체</option>
          <option value="visible">공개만</option>
          <option value="hidden">숨김만</option>
        </select>
      </div>
      <p className="text-xs text-slate-400">숨긴 칭찬은 구성원 화면 어디에도 보이지 않습니다. 익명 칭찬의 보낸 사람은 관리자에게만 보입니다.</p>

      {!data || data.total === 0 ? (
        <Empty>조건에 맞는 칭찬이 없어요.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.items.map((c) => (
            <div key={c.id} className={`flex items-start gap-3 px-5 py-3 ${c.hidden ? 'opacity-60' : ''}`}>
              <Avatar name={c.sender.name} url={c.sender.avatarUrl} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{c.sender.name}</span>
                  {c.anonymous && <Badge tone="slate">익명</Badge>}
                  <span className="text-slate-400"> → </span>
                  <span className="font-semibold">{c.receiver.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{new Date(c.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {c.hidden && <Badge tone="rose">숨김</Badge>}
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
              </div>
              <Button
                variant={c.hidden ? 'secondary' : 'danger'}
                disabled={setHidden.isPending}
                onClick={async () => {
                  if (!c.hidden && !(await confirm({ message: '이 칭찬을 숨길까요? 구성원 화면에서 모두 보이지 않게 됩니다.', danger: true }))) return;
                  setHidden.mutate({ id: c.id, hidden: !c.hidden });
                }}
              >
                {c.hidden ? '숨김 해제' : '숨김'}
              </Button>
            </div>
          ))}
          <div className="px-5 py-3">
            <Pager page={page} pages={pagesOf(data.total)} setPage={setPage} total={data.total} />
          </div>
        </Card>
      )}
    </div>
  );
}
