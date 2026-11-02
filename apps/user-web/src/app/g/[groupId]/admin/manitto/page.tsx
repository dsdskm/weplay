'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Member, Paged } from '@/lib/types';

interface ManittoStatus {
  enabled: boolean;
  round?: { id: string; startAt: string; endAt: string | null } | null;
  participantCount?: number;
  isParticipant?: boolean;
  canViewAll?: boolean;
  windowOpen?: boolean;
}

interface Pair {
  giver: { id: string; name: string; avatarUrl: string | null };
  receiver: { id: string; name: string; avatarUrl: string | null };
}

const PAGE_SIZE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));
const dateTime = (iso: string) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** 관리자: 마니또 시작(참가자 선택), 기간 변경, 종료. 참가하지 않은 회차에서는 전체 현황 */
export default function AdminManittoPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const key = ['group', groupId, 'manitto'];
  const [error, setError] = useState<string>();
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allParticipants, setAllParticipants] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [pairPage, setPairPage] = useState(1);

  const { data: status } = useQuery({
    queryKey: key,
    queryFn: () => api<ManittoStatus>(`/groups/${groupId}/manitto`),
  });

  const { data: members } = useQuery({
    queryKey: ['group', groupId, 'manitto', 'members', q, memberPage],
    queryFn: () => api<Paged<Member>>(`/groups/${groupId}/members?${new URLSearchParams({ page: String(memberPage), pageSize: String(PAGE_SIZE), ...(q ? { q } : {}) })}`),
    enabled: !!status?.enabled && !status.round && !allParticipants,
  });

  const { data: pairs } = useQuery({
    queryKey: ['group', groupId, 'manitto', 'overview', pairPage],
    queryFn: () => api<Paged<Pair>>(`/groups/${groupId}/manitto/overview?page=${pairPage}&pageSize=${PAGE_SIZE}`),
    enabled: !!status?.canViewAll,
  });

  const run = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) => api(`/groups/${groupId}/manitto${path}`, { method, body: body ?? {} }),
    onSuccess: () => {
      setError(undefined);
      setPicked(new Set());
      qc.invalidateQueries({ queryKey: ['group', groupId, 'manitto'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!status) return <p className="text-slate-400">불러오는 중…</p>;

  if (!status.enabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">마니또 관리</h1>
        <Card>
          <p className="text-slate-600">이 기능은 아직 승인되지 않았어요.</p>
        </Card>
      </div>
    );
  }

  const round = status.round;
  const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined);
  const togglePick = (id: string, checked: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">마니또 관리</h1>
      <ErrorText>{error}</ErrorText>

      {!round ? (
        <Card className="space-y-4">
          <p className="text-slate-600">진행 중인 마니또가 없어요.</p>
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold">마니또 시작</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllParticipants(true)}
                className={allParticipants ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
              >
                전체 구성원
              </button>
              <button
                type="button"
                onClick={() => setAllParticipants(false)}
                className={!allParticipants ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white' : 'rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200'}
              >
                직접 선택
              </button>
            </div>

            {!allParticipants && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="이름·이메일 검색"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setMemberPage(1);
                    }}
                  />
                  <span className="text-xs text-slate-400">선택 {picked.size}명</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="w-10 px-3 py-2" />
                        <th className="px-3 py-2">이름</th>
                        <th className="px-3 py-2">팀</th>
                        <th className="px-3 py-2">이메일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members?.items.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={picked.has(m.id)} onChange={(e) => togglePick(m.id, e.target.checked)} />
                          </td>
                          <td className="px-3 py-2 font-semibold">{m.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{m.teams.map((t) => t.name).join(', ') || '-'}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{m.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {members && members.total > 0 && <Pager page={memberPage} pages={pagesOf(members.total)} setPage={setMemberPage} total={members.total} />}
                <p className="text-xs text-slate-400">나도 참가하려면 내 이름을 체크하세요. 체크하지 않으면 관리자는 전체 현황만 봅니다.</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-500">
                시작 시각 (비우면 지금)
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                종료 시각 (비우면 직접 종료)
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </label>
            </div>
            <Button
              disabled={run.isPending || (!allParticipants && picked.size < 2)}
              onClick={async () => {
                if (!(await confirm({ message: `마니또를 시작할까요? ${allParticipants ? '전체 구성원' : `${picked.size}명`}에게 무작위로 마니또가 배정됩니다.` }))) return;
                run.mutate({
                  path: '/start',
                  method: 'POST',
                  body: {
                    startAt: toIso(startAt),
                    endAt: toIso(endAt) ?? null,
                    ...(allParticipants ? {} : { participantIds: [...picked] }),
                  },
                });
              }}
            >
              마니또 시작
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-3">
            <Badge tone={status.windowOpen ? 'green' : 'amber'}>{status.windowOpen ? '진행 중' : '시작 전'}</Badge>
            <span className="text-sm text-slate-500">
              {dateTime(round.startAt)} ~ {round.endAt ? dateTime(round.endAt) : '직접 종료 전까지'}
            </span>
            <span className="text-xs text-slate-400">
              참가 {status.participantCount}명 · 관리자 {status.isParticipant ? '참가 중' : '미참가'}
            </span>
          </Card>

          {status.canViewAll && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">전체 마니또 현황</h2>
              <p className="text-xs text-slate-400">관리자가 참가하지 않은 회차라서 전체 현황을 볼 수 있어요.</p>
              {!pairs || pairs.total === 0 ? (
                <Card>
                  <p className="text-sm text-slate-400">배정 내역이 없어요.</p>
                </Card>
              ) : (
                <Card className="divide-y divide-slate-100 p-0">
                  {pairs.items.map((p, i) => (
                    <div key={`${p.giver.id}-${p.receiver.id}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <span className="w-8 text-xs text-slate-400">{(pairs.page - 1) * pairs.pageSize + i + 1}</span>
                      <span className="flex-1 font-semibold">{p.giver.name}</span>
                      <span className="text-slate-400">→</span>
                      <span className="flex-1 font-semibold">{p.receiver.name}</span>
                    </div>
                  ))}
                  <div className="px-5 py-3">
                    <Pager page={pairPage} pages={pagesOf(pairs.total)} setPage={setPairPage} total={pairs.total} />
                  </div>
                </Card>
              )}
            </section>
          )}

          <Card className="space-y-4">
            <h2 className="font-bold">회차 관리</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-500">
                시작 시각
                <Input type="datetime-local" defaultValue={toLocalInput(round.startAt)} onChange={(e) => setStartAt(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                종료 시각 (비우면 직접 종료)
                <Input type="datetime-local" defaultValue={toLocalInput(round.endAt)} onChange={(e) => setEndAt(e.target.value)} />
              </label>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => run.mutate({ path: '/period', method: 'PATCH', body: { startAt: toIso(startAt), endAt: endAt ? toIso(endAt) : null } })}
                disabled={run.isPending}
              >
                기간 저장
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (await confirm({ message: '마니또를 종료할까요? 종료 후에는 메시지를 보낼 수 없어요.', danger: true })) run.mutate({ path: '/end', method: 'POST' });
                }}
                disabled={run.isPending}
              >
                마니또 종료
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
