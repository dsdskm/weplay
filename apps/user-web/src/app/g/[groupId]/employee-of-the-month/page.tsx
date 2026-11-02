'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { EotmComments } from '@/components/eotm-comments';
import { Pager } from '@/components/pager';
import { MemberCombobox } from '@/components/member-combobox';
import { api, errorMessage } from '@/lib/api';
import { useGroupId, useMe } from '@/lib/hooks';
import type { EotmHallRow, EotmOverview, EotmTop, Member, Paged, Paginated } from '@/lib/types';

const monthLabel = (ym: string) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`;
const dateLabel = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일`;

export default function EmployeeOfTheMonthPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const key = ['group', groupId, 'employee-of-the-month'];

  const [selMonth, setSelMonth] = useState<string>();
  const [error, setError] = useState<string>();
  const [nominee, setNominee] = useState<Member | null>(null);
  const [reason, setReason] = useState('');

  const { data: eotm } = useQuery({
    queryKey: [...key, 'overview', selMonth ?? ''],
    queryFn: () => api<EotmOverview>(`/groups/${groupId}/employee-of-the-month${selMonth ? `?month=${selMonth}` : ''}`),
  });
  const enabled = !!eotm?.enabled;


  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) => setError(errorMessage(e));

  const nominate = useMutation({
    mutationFn: () => api(`/groups/${groupId}/employee-of-the-month/nomination`, { method: 'PUT', body: { nomineeId: nominee?.id, reason: reason.trim() } }),
    onSuccess: () => {
      setError(undefined);
      setReason('');
      setNominee(null);
      refresh();
    },
    onError,
  });
  const withdraw = useMutation({
    mutationFn: () => api(`/groups/${groupId}/employee-of-the-month/nomination`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });

  if (!eotm) return <p className="text-slate-400">불러오는 중…</p>;

  const my = eotm.myNomination;
  const shownMonth = eotm.selectedMonth;
  const isCurrent = shownMonth === eotm.month;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">이달의 사원</h1>
        {enabled && (
          <input
            type="month"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={shownMonth}
            max={eotm.month}
            onChange={(e) => e.target.value && setSelMonth(e.target.value)}
          />
        )}
      </div>
      <ErrorText>{error}</ErrorText>

      {!enabled ? (
        <Card>
          <p className="text-slate-600">이 기능은 아직 그룹에서 사용할 수 없어요.</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-3">
            <Badge tone="amber">{monthLabel(shownMonth)}</Badge>
            {eotm.selectedWinners.length > 0 ? (
              <div className="space-y-5">
                {eotm.selectedWinners.map((w) => (
                  <div key={w.user.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={w.user.name} url={w.user.avatarUrl} size={56} />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold">
                          {w.user.name} <Badge tone="amber">🏅 이달의 사원</Badge>
                        </p>
                        {w.note && <p className="whitespace-pre-wrap text-sm text-slate-600">{w.note}</p>}
                      </div>
                    </div>
                    <EotmComments groupId={groupId} month={shownMonth} targetUserId={w.user.id} targetName={w.user.name} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">
                {isCurrent && eotm.pendingPublishDate
                  ? `${dateLabel(eotm.pendingPublishDate)}에 공개됩니다.`
                  : '공개된 이달의 사원이 없어요.'}
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <div>
              <h2 className="font-bold">{monthLabel(eotm.nominationMonth)} 이달의 사원 추천</h2>
              <p className="text-xs text-slate-400">아직 공개되지 않은 달을 대상으로 한 달에 한 명을 추천할 수 있어요. 다시 추천하면 바뀝니다.</p>
            </div>
            {my && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <Avatar name={my.nominee.name} url={my.nominee.avatarUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">내 추천: {my.nominee.name}</p>
                  <p className="truncate text-slate-500">{my.reason}</p>
                </div>
                <Button variant="ghost" onClick={() => withdraw.mutate()} disabled={withdraw.isPending}>
                  추천 취소
                </Button>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <MemberCombobox groupId={groupId} value={nominee} onChange={setNominee} excludeId={me?.id} placeholder="추천할 구성원 선택" />
              <Input placeholder="추천 사유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            </div>
            <Button onClick={() => nominate.mutate()} disabled={!nominee || !reason.trim() || nominate.isPending}>
              {my ? '추천 수정' : '추천하기'}
            </Button>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">명예의 전당</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <HallCard title="가장 많이 선정된 사람" unit="회" top={eotm.hallOfFame.mostSelected} />
              <HallCard title="가장 많이 추천받은 사람" unit="회" top={eotm.hallOfFame.mostNominated} />
            </div>
          </section>
          <HallList groupId={groupId} />
        </>
      )}
    </div>
  );
}

function HallCard({ title, unit, top }: { title: string; unit: string; top: EotmTop | null }) {
  return (
    <Card className="space-y-3">
      <p className="text-xs font-semibold text-slate-400">{title}</p>
      {top ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {top.users.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <Avatar name={u.name} url={u.avatarUrl} size={36} />
                <span className="font-bold">{u.name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {top.count}
            {unit}
          </p>
        </>
      ) : (
        <Empty>아직 기록이 없어요.</Empty>
      )}
    </Card>
  );
}

/** 구성원별 이달의 사원 선정 내역: 🏅 배지와 선정 횟수 */
function HallList({ groupId }: { groupId: string }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['group', groupId, 'employee-of-the-month', 'hall', page],
    queryFn: () => api<Paginated<EotmHallRow> & { enabled: boolean }>(`/groups/${groupId}/employee-of-the-month/hall?page=${page}&pageSize=10`),
  });
  if (!data || data.total === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">선정 내역</h2>
      <Card className="divide-y divide-slate-100 p-0">
        {data.items.map((r) => (
          <div key={r.user.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={r.user.name} url={r.user.avatarUrl} size={32} />
            <span className="flex-1 font-semibold">{r.user.name}</span>
            <Badge tone="amber">🏅 이달의 사원 ×{r.count}</Badge>
          </div>
        ))}
        <div className="px-5 py-3">
          <Pager page={page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} setPage={setPage} total={data.total} />
        </div>
      </Card>
    </section>
  );
}
