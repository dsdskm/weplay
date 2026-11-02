'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DUTY_PERIODS, DUTY_PRESETS, labelOf } from '@weplay/shared';
import { Avatar, Badge, Button, Card, cn, Empty, ErrorText, Input } from '@/components/ui';
import { Confetti } from '@/components/games/fx';
import { MemberCombobox } from '@/components/member-combobox';
import { MemberPicker } from '@/components/member-picker';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { Tabs } from '@/components/tabs';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { fmtDate, pagesOf } from '@/lib/format';
import { useGroupId } from '@/lib/hooks';
import type { Member, Paginated } from '@/lib/types';

type U = { id: string; name: string; avatarUrl: string | null };
interface Duty {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  teamId: string | null;
  teamName: string | null;
  mode: 'FIXED' | 'ROTATION';
  period: string;
  active: boolean;
  members: U[];
  current: { periodKey: string; periodEnd: string; assignees: U[]; status: 'ASSIGNED' | 'DONE'; memo: string | null; doneBy: U | null; original: U | null };
  upcoming: { periodKey: string; user: U | null }[];
  isMine: boolean;
  canDone: boolean;
  canVolunteer: boolean;
  canManage: boolean;
}
type Data = Paginated<Duty> & { enabled: boolean; canCreate: boolean; teams: { id: string; name: string }[]; doneReward: number };

const ICONS = ['📌', '📦', '🍪', '☕', '🪑', '📮', '🪴', '♻️', '🧹', '📝', '💳', '🎂', '🤝', '🔑', '🖨️', '🧾', '🎤', '🚗', '💻', '🧯'];
const EMPTY = { name: '', icon: '📌', description: '', teamId: '', mode: 'ROTATION' as 'FIXED' | 'ROTATION', period: 'WEEKLY', memberIds: [] as string[], active: true };
const periodLabel = (p: string) => labelOf(DUTY_PERIODS, p);
const rangeText = (start: string, end: string, period: string) => (period === 'DAILY' ? fmtDate(start) : `${fmtDate(start)} ~ ${fmtDate(new Date(Date.parse(`${end}T00:00:00Z`) - 86_400_000))}`);

/** 공통 업무 담당: 비품·간식 담당 등 순번·고정 담당자 */
export default function DutiesPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ id?: string; form: typeof EMPTY }>();
  const [doneFor, setDoneFor] = useState<Duty>();
  const [memo, setMemo] = useState('');
  const [handFor, setHandFor] = useState<Duty>();
  const [handTo, setHandTo] = useState<Member | null>(null);
  const [historyFor, setHistoryFor] = useState<Duty>();
  const [party, setParty] = useState(0);
  const [error, setError] = useState<string>();

  const { data } = useQuery({ queryKey: ['group', groupId, 'duties', scope, page], queryFn: () => api<Data>(`/groups/${groupId}/duties?scope=${scope}&page=${page}&pageSize=12`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['group', groupId, 'duties'] });
  const onError = (e: unknown) => setError(errorMessage(e));
  const ok = () => {
    setError(undefined);
    refresh();
  };

  const save = useMutation({
    mutationFn: () => {
      const f = editing!.form;
      const body = { ...f, name: f.name.trim(), description: f.description.trim() || null, teamId: f.teamId || null };
      return editing!.id ? api(`/groups/${groupId}/duties/${editing!.id}`, { method: 'PATCH', body }) : api(`/groups/${groupId}/duties`, { body });
    },
    onSuccess: () => {
      setEditing(undefined);
      ok();
    },
    onError,
  });
  const done = useMutation({
    mutationFn: () => api(`/groups/${groupId}/duties/${doneFor!.id}/done`, { body: { memo: memo.trim() || undefined } }),
    onSuccess: () => {
      setDoneFor(undefined);
      setMemo('');
      setParty((p) => p + 1);
      ok();
      qc.invalidateQueries({ queryKey: ['group', groupId, 'points'] });
    },
    onError,
  });
  const act = useMutation({ mutationFn: ({ id, path, body }: { id: string; path: string; body?: unknown }) => api(`/groups/${groupId}/duties/${id}/${path}`, { body: body ?? {} }), onSuccess: ok, onError });
  const remove = useMutation({ mutationFn: (id: string) => api(`/groups/${groupId}/duties/${id}`, { method: 'DELETE' }), onSuccess: ok, onError });

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.enabled) return <Card>이 기능은 아직 그룹에서 사용할 수 없어요.</Card>;
  const mine = data.items.filter((d) => d.isMine && d.active);
  const f = editing?.form;
  const setF = (patch: Partial<typeof EMPTY>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {party > 0 && <Confetti key={party} count={50} />}
      <div className="wp-gradient relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-500 to-lime-400 p-6 text-white shadow-lg">
        <span className="wp-float pointer-events-none absolute -right-3 -top-3 text-8xl opacity-25">🗂️</span>
        <h1 className="text-2xl font-black">공통 업무</h1>
        <p className="mt-1 text-sm opacity-90">비품·간식·커피머신… 누가 이번 차례인지 한눈에. 완료하면 +{data.doneReward}P</p>
        {data.canCreate && (
          <Button className="mt-4 bg-white text-emerald-700 hover:bg-white/90" onClick={() => setEditing({ form: { ...EMPTY } })}>
            업무 만들기
          </Button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>

      <Tabs
        value={scope}
        onChange={(v) => {
          setScope(v);
          setPage(1);
        }}
        items={[
          ['all', '전체 업무'],
          ['mine', `지금 내 담당${scope === 'all' && mine.length ? ` ${mine.length}` : ''}`],
        ]}
      />

      {data.items.length === 0 ? (
        <Empty>{scope === 'mine' ? '지금 맡은 업무가 없어요 😎' : '아직 등록된 업무가 없어요.'}</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((d, i) => {
            const isDone = d.current.status === 'DONE';
            return (
              <div key={d.id} style={{ animationDelay: `${i * 40}ms` }} className="wp-pop-in">
                <Card className={cn('relative flex h-full flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-md', d.isMine && !isDone && 'ring-2 ring-emerald-400', !d.active && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition', isDone ? 'bg-emerald-100' : 'bg-slate-100')}>{isDone ? '✅' : d.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{d.name}</p>
                      <p className="flex flex-wrap gap-1 text-xs">
                        <Badge tone="slate">{d.mode === 'FIXED' ? '고정' : `${periodLabel(d.period)} 순번`}</Badge>
                        {d.teamName ? <Badge tone="brand">{d.teamName} 팀</Badge> : <Badge tone="slate">그룹</Badge>}
                        {!d.active && <Badge tone="amber">쉬는 중</Badge>}
                      </p>
                    </div>
                  </div>
                  {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">{d.mode === 'FIXED' ? '담당자' : `이번 차례 · ${rangeText(d.current.periodKey, d.current.periodEnd, d.period)}`}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {d.current.assignees.map((u) => (
                        <span key={u.id} className="flex items-center gap-1.5 text-sm font-bold">
                          <Avatar name={u.name} url={u.avatarUrl} size={26} />
                          {u.name}
                        </span>
                      ))}
                      {d.isMine && <Badge tone="green">나</Badge>}
                    </div>
                    {d.current.original && <p className="mt-1 text-[11px] text-slate-500">🙋 {d.current.original.name}님 대신 맡았어요</p>}
                    {isDone && (
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        완료! {d.current.doneBy?.name}
                        {d.current.memo && <span className="font-normal text-slate-500"> · {d.current.memo}</span>}
                      </p>
                    )}
                  </div>
                  {d.upcoming.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      다음 →
                      {d.upcoming.map((u, k) => (
                        <span key={k} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          {u.user?.name ?? '?'}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {d.canDone && (
                      <Button className="flex-1" onClick={() => setDoneFor(d)}>
                        완료 체크
                      </Button>
                    )}
                    {d.canVolunteer && (
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={async () => {
                          if (await confirm({ message: `이번 ${d.name} 차례를 대신 맡을까요?` })) act.mutate({ id: d.id, path: 'volunteer' });
                        }}
                      >
                        대신 맡기
                      </Button>
                    )}
                    {(d.isMine || d.canManage) && d.mode === 'ROTATION' && !isDone && (
                      <Button variant="ghost" onClick={() => setHandFor(d)}>
                        넘기기
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setHistoryFor(d)}>
                      기록
                    </Button>
                    {d.canManage && (
                      <>
                        {d.mode === 'ROTATION' && (
                          <Button
                            variant="ghost"
                            onClick={async () => {
                              if (await confirm({ message: '이번 담당자를 건너뛰고 다음 사람으로 넘길까요? (휴가 등)' })) act.mutate({ id: d.id, path: 'skip' });
                            }}
                          >
                            건너뛰기
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setEditing({ id: d.id, form: { name: d.name, icon: d.icon, description: d.description ?? '', teamId: d.teamId ?? '', mode: d.mode, period: d.period, memberIds: d.members.map((m) => m.id), active: d.active } })
                          }
                        >
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-rose-600"
                          onClick={async () => {
                            if (await confirm({ message: `${d.name} 업무를 삭제할까요? 기록도 함께 지워져요.`, danger: true })) remove.mutate(d.id);
                          }}
                        >
                          삭제
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
      <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />

      {/* 만들기·수정 */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        wide
        title={editing?.id ? '업무 수정' : '업무 만들기'}
        footer={
          <Button onClick={() => save.mutate()} disabled={!f?.name.trim() || !f?.memberIds.length || save.isPending}>
            저장
          </Button>
        }
      >
        {f && (
          <div className="space-y-4">
            {!editing?.id && (
              <div>
                <p className="mb-2 text-sm font-semibold">추천 업무 (누르면 채워져요)</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {DUTY_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setF({ name: p.name, icon: p.icon, description: p.description })}
                      className={cn('flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold ring-1 transition hover:-translate-y-0.5', f.name === p.name ? 'bg-emerald-50 ring-emerald-400' : 'ring-slate-100 hover:bg-slate-50')}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-semibold">직접 입력</p>
              <div className="flex gap-2">
                <select className="w-20 rounded-xl border border-slate-200 px-2 text-center text-xl" value={f.icon} onChange={(e) => setF({ icon: e.target.value })}>
                  {[...new Set([f.icon, ...ICONS])].map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
                <Input placeholder="업무 이름 (예: 정수기 필터 교체)" value={f.name} onChange={(e) => setF({ name: e.target.value })} maxLength={30} />
              </div>
              <Input placeholder="설명 (선택)" value={f.description} onChange={(e) => setF({ description: e.target.value })} maxLength={200} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={f.teamId} disabled={!!editing?.id} onChange={(e) => setF({ teamId: e.target.value, memberIds: [] })}>
                <option value="">그룹 전체 업무</option>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} 팀 업무
                  </option>
                ))}
              </select>
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={f.mode} onChange={(e) => setF({ mode: e.target.value as 'FIXED' | 'ROTATION' })}>
                <option value="ROTATION">돌아가며 (순번)</option>
                <option value="FIXED">고정 담당</option>
              </select>
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={f.period} onChange={(e) => setF({ period: e.target.value })}>
                {DUTY_PERIODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} {f.mode === 'ROTATION' ? '교대' : '체크'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">{f.mode === 'ROTATION' ? '순번 (순서대로 돌아가요)' : '담당자'}</p>
              <MemberPicker groupId={groupId} teamId={f.teamId || null} value={f.memberIds} onChange={(ids) => setF({ memberIds: ids })} ordered={f.mode === 'ROTATION'} />
            </div>
            {editing?.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.active} onChange={(e) => setF({ active: e.target.checked })} /> 사용 중 (끄면 잠시 쉬어요)
              </label>
            )}
            {editing?.id && <p className="text-xs text-slate-400">순번·주기를 바꾸면 오늘부터 첫 번째 사람부터 다시 시작해요.</p>}
          </div>
        )}
      </Modal>

      {/* 완료 */}
      <Modal
        open={!!doneFor}
        onClose={() => setDoneFor(undefined)}
        title={`${doneFor?.icon} ${doneFor?.name} 완료`}
        footer={
          <Button onClick={() => done.mutate()} disabled={done.isPending}>
            완료했어요 (+{data.doneReward}P)
          </Button>
        }
      >
        <Input placeholder="한 줄 메모 (예: A4 용지 5박스 주문)" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} />
      </Modal>

      {/* 넘기기 */}
      <Modal
        open={!!handFor}
        onClose={() => setHandFor(undefined)}
        title="이번 차례 넘기기"
        footer={
          <Button
            disabled={!handTo}
            onClick={() => {
              if (handFor && handTo) act.mutate({ id: handFor.id, path: 'handover', body: { userId: handTo.id } });
              setHandFor(undefined);
              setHandTo(null);
            }}
          >
            넘기기
          </Button>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-slate-500">이번 기간만 다른 사람이 맡고, 순번은 그대로예요.</p>
          <MemberCombobox groupId={groupId} value={handTo} onChange={setHandTo} placeholder="맡아 줄 사람" />
        </div>
      </Modal>

      {historyFor && <HistoryModal groupId={groupId} duty={historyFor} onClose={() => setHistoryFor(undefined)} />}
    </div>
  );
}

function HistoryModal({ groupId, duty, onClose }: { groupId: string; duty: Duty; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['group', groupId, 'duties', 'history', duty.id, page],
    queryFn: () => api<Paginated<{ id: string; periodKey: string; status: string; memo: string | null; doneAt: string | null; user: U | null; original: U | null }>>(`/groups/${groupId}/duties/${duty.id}/history?page=${page}&pageSize=10`),
  });
  return (
    <Modal open onClose={onClose} title={`${duty.icon} ${duty.name} 기록`}>
      {!data ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <Empty>아직 기록이 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-slate-500">{fmtDate(r.periodKey)}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.user?.name}
                {r.original && <span className="text-xs font-normal text-slate-400"> ({r.original.name} 대신)</span>}
                {r.memo && <span className="text-xs font-normal text-slate-500"> · {r.memo}</span>}
              </span>
              <Badge tone={r.status === 'DONE' ? 'green' : 'slate'}>{r.status === 'DONE' ? '완료' : '맡음'}</Badge>
            </div>
          ))}
          <Pager page={page} pages={pagesOf(data.total, data.pageSize)} setPage={setPage} total={data.total} />
        </div>
      )}
    </Modal>
  );
}
