'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type {
  EotmAdminComment,
  EotmCandidate,
  EotmDashboard,
  EotmMonthDetail,
  EotmNomination,
  EotmOverview,
  EotmRank,
  EotmUser,
  Paginated,
} from '@/lib/types';
import { useDialog } from '@/components/confirm-dialog';

const monthLabel = (ym: string) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`;
const dateLabel = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일`;
const pagesOf = (total: number, size: number) => Math.max(1, Math.ceil(total / size));

export default function AdminEmployeeOfTheMonthPage() {
  const { confirm } = useDialog();
  const groupId = useGroupId();
  const qc = useQueryClient();
  const key = ['group', groupId, 'employee-of-the-month'];

  const [error, setError] = useState<string>();
  const [selMonth, setSelMonth] = useState<string>();
  // 선정 후보: userId → 한 줄 소개
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [nomPage, setNomPage] = useState(1);
  const [candPage, setCandPage] = useState(1);
  const [cmtPage, setCmtPage] = useState(1);
  const [rankPage, setRankPage] = useState(1);
  const [missPage, setMissPage] = useState(1);

  const { data: eotm } = useQuery({
    queryKey: [...key, 'overview', ''],
    queryFn: () => api<EotmOverview>(`/groups/${groupId}/employee-of-the-month`),
  });
  const enabled = !!eotm?.enabled;

  const { data: dashboard } = useQuery({
    queryKey: [...key, 'dashboard'],
    queryFn: () => api<EotmDashboard>(`/groups/${groupId}/employee-of-the-month/admin/dashboard`),
    enabled,
  });
  const target = selMonth ?? eotm?.month ?? '';
  const base = `/groups/${groupId}/employee-of-the-month/admin/months/${target}`;
  const { data: detail } = useQuery({
    queryKey: [...key, 'month', target],
    queryFn: () => api<EotmMonthDetail>(base),
    enabled: enabled && !!target,
  });
  const { data: nominations } = useQuery({
    queryKey: [...key, 'month', target, 'nominations', nomPage],
    queryFn: () => api<Paginated<EotmNomination>>(`${base}/nominations?page=${nomPage}&pageSize=5`),
    enabled: enabled && !!target,
  });
  const { data: candidates } = useQuery({
    queryKey: [...key, 'month', target, 'candidates', candPage],
    queryFn: () => api<Paginated<EotmCandidate>>(`${base}/candidates?page=${candPage}&pageSize=10`),
    enabled: enabled && !!target,
  });
  const { data: comments } = useQuery({
    queryKey: [...key, 'month', target, 'comments', cmtPage],
    queryFn: () => api<Paginated<EotmAdminComment>>(`${base}/comments?page=${cmtPage}&pageSize=5`),
    enabled: enabled && !!target,
  });
  const { data: compliments } = useQuery({
    queryKey: [...key, 'month', target, 'compliments', rankPage],
    queryFn: () => api<Paginated<EotmRank>>(`${base}/compliments?page=${rankPage}&pageSize=5`),
    enabled: enabled && !!target,
  });
  const { data: missing } = useQuery({
    queryKey: [...key, 'month', target, 'missing', missPage],
    queryFn: () => api<Paginated<EotmUser>>(`${base}/missing?page=${missPage}&pageSize=10`),
    enabled: enabled && !!target,
  });

  // 월이 바뀌거나 저장 후 갱신되면 서버 선정 목록으로 맞춤
  useEffect(() => {
    if (detail) setPicked(Object.fromEntries(detail.winners.map((w) => [w.user.id, w.note ?? ''])));
  }, [detail]);

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) => setError(errorMessage(e));

  const saveWinners = useMutation({
    mutationFn: () =>
      api(`/groups/${groupId}/employee-of-the-month/admin/months/${target}/winners`, {
        method: 'PUT',
        body: { winners: Object.entries(picked).map(([userId, note]) => ({ userId, note: note.trim() || null })) },
      }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });
  const saveSettings = useMutation({
    mutationFn: (body: { publishDay?: number; winnerCount?: number }) =>
      api(`/groups/${groupId}/employee-of-the-month/admin/settings`, { method: 'PUT', body }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });
  const deleteNomination = useMutation({
    mutationFn: (id: string) => api(`/groups/${groupId}/employee-of-the-month/admin/nominations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });
  const deleteComment = useMutation({
    mutationFn: (id: string) => api(`/groups/${groupId}/employee-of-the-month/comments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      refresh();
    },
    onError,
  });

  if (!eotm) return <p className="text-slate-400">불러오는 중…</p>;

  const pickedCount = Object.keys(picked).length;
  const limit = eotm.winnerCount;

  const toggle = (userId: string, checked: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (checked) next[userId] = '';
      else delete next[userId];
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">이달의 사원 관리</h1>
      <ErrorText>{error}</ErrorText>

      {!enabled ? (
        <Card className="space-y-3">
          <p className="text-slate-600">이 기능은 아직 승인되지 않았어요.</p>
          <Link href={`/g/${groupId}/admin/features`} className="text-sm text-brand-600 underline">
            기능 신청하러 가기
          </Link>
        </Card>
      ) : (
        <>
          <Card className="space-y-3">
            <h2 className="font-bold">월별 집계</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">월</th>
                    <th className="px-3 py-2">추천 수</th>
                    <th className="px-3 py-2">상위 후보</th>
                    <th className="px-3 py-2">선정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard?.months.map((m) => (
                    <tr
                      key={m.month}
                      onClick={() => {
                        setSelMonth(m.month);
                        setNomPage(1);
                        setCandPage(1);
                        setCmtPage(1);
                        setRankPage(1);
                        setMissPage(1);
                      }}
                      className={`cursor-pointer hover:bg-slate-50 ${target === m.month ? 'bg-brand-50' : ''}`}
                    >
                      <td className="px-3 py-2 font-semibold">{monthLabel(m.month)}</td>
                      <td className="px-3 py-2">{m.total}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {m.top.length === 0 ? '없음' : m.top.map((t) => `${t.user.name} ${t.count}`).join(' · ')}
                      </td>
                      <td className="px-3 py-2">
                        {m.winners.length > 0 ? (
                          <Badge tone={m.published ? 'green' : 'amber'}>
                            {m.winners.map((w) => w.user.name).join(', ')}
                            {!m.published && ' (미공개)'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">미선정</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {detail && (
            <>
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">{monthLabel(detail.month)} 추천 내역</h2>
                  <span className="text-xs text-slate-400">
                    추천 참여 {detail.participation.nominated}/{detail.participation.total}명 · 선정 {pickedCount}/{limit}명
                  </span>
                </div>
                {!nominations || nominations.total === 0 ? (
                  <Empty>추천 내역이 없습니다.</Empty>
                ) : (
                  <>
                    <ul className="divide-y divide-slate-100 text-sm">
                      {nominations.items.map((n) => (
                        <li key={n.id} className="flex items-start gap-3 py-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold">{n.nominee.name}</span>
                            <span className="text-slate-400"> ← {n.nominator.name}</span>
                            <p className="text-slate-600">{n.reason}</p>
                          </div>
                          <Button variant="ghost" onClick={async () => { if (await confirm({ message: '이 추천을 삭제할까요? 되돌릴 수 없습니다.', danger: true })) deleteNomination.mutate(n.id); }} disabled={deleteNomination.isPending}>
                            삭제
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <Pager page={nomPage} pages={pagesOf(nominations.total, nominations.pageSize)} setPage={setNomPage} total={nominations.total} />
                  </>
                )}
                {missing && missing.total > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-400">미추천 구성원 {missing.total}명</p>
                    <ul className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {missing.items.map((u) => (
                        <li key={u.id} className="rounded-full bg-slate-100 px-2 py-1">
                          {u.name}
                        </li>
                      ))}
                    </ul>
                    <Pager page={missPage} pages={pagesOf(missing.total, missing.pageSize)} setPage={setMissPage} total={missing.total} />
                  </div>
                )}

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold">선정 (추천받은 구성원 중에서 최대 {limit}명)</p>
                  {!candidates || candidates.total === 0 ? (
                    <p className="text-sm text-slate-400">추천받은 구성원이 없습니다.</p>
                  ) : (
                    <>
                      {candidates.items.map((a) => {
                        const checked = a.user.id in picked;
                        return (
                          <div key={a.user.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && pickedCount >= limit}
                                onChange={(e) => toggle(a.user.id, e.target.checked)}
                              />
                              <span className="font-semibold">{a.user.name}</span>
                              <span className="text-xs text-slate-400">추천 {a.count}</span>
                              <Badge tone="brand">칭찬 {a.complimentCount}장</Badge>
                            </label>
                            {checked && (
                              <Input
                                className="flex-1"
                                placeholder="한 줄 소개 (선택)"
                                value={picked[a.user.id]}
                                maxLength={300}
                                onChange={(e) => setPicked((prev) => ({ ...prev, [a.user.id]: e.target.value }))}
                              />
                            )}
                          </div>
                        );
                      })}
                      <Pager page={candPage} pages={pagesOf(candidates.total, candidates.pageSize)} setPage={setCandPage} total={candidates.total} />
                    </>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={() => saveWinners.mutate()} disabled={saveWinners.isPending}>
                      선정 저장
                    </Button>
                    <p className="text-xs text-slate-400">
                      {detail.published ? '이미 공개된 월입니다.' : `${dateLabel(`${detail.month}-${String(detail.publishDay).padStart(2, '0')}`)}에 공개됩니다.`}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="space-y-3">
                <p className="text-sm font-semibold">칭찬 카드 현황 (이번 달 받은 수)</p>
                {!compliments || compliments.total === 0 ? (
                  <p className="text-sm text-slate-400">칭찬 카드 기록이 없습니다.</p>
                ) : (
                  <>
                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                      {compliments.items.map((c, i) => (
                        <li key={c.user.id} className="flex items-center gap-2">
                          <span className="w-8 text-xs font-bold text-slate-400">{(compliments.page - 1) * compliments.pageSize + i + 1}</span>
                          <span className="flex-1">{c.user.name}</span>
                          <Badge tone="brand">{c.count}장</Badge>
                        </li>
                      ))}
                    </ul>
                    <Pager page={rankPage} pages={pagesOf(compliments.total, compliments.pageSize)} setPage={setRankPage} total={compliments.total} />
                  </>
                )}
              </Card>

              <Card className="space-y-3">
                <p className="text-sm font-semibold">댓글 ({comments?.total ?? 0})</p>
                {!comments || comments.total === 0 ? (
                  <p className="text-sm text-slate-400">댓글이 없습니다.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-slate-100 text-sm">
                      {comments.items.map((c) => (
                        <li key={c.id} className="flex items-start gap-3 py-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold">{c.author.name}</span>
                            <span className="text-slate-400"> → {c.target.name}</span>
                            <p className="whitespace-pre-wrap text-slate-600">{c.body}</p>
                          </div>
                          <Button variant="ghost" onClick={async () => { if (await confirm({ message: '이 댓글을 삭제할까요? 되돌릴 수 없습니다.', danger: true })) deleteComment.mutate(c.id); }} disabled={deleteComment.isPending}>
                            삭제
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <Pager page={cmtPage} pages={pagesOf(comments.total, comments.pageSize)} setPage={setCmtPage} total={comments.total} />
                  </>
                )}
              </Card>
            </>
          )}

          <Card className="space-y-4">
            <h2 className="font-bold">이달의 사원 설정</h2>
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 font-semibold">선정 인원</span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={eotm.winnerCount}
                onChange={(e) => saveSettings.mutate({ winnerCount: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    매월 {n}명
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 font-semibold">공개일</span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={eotm.publishDay}
                onChange={(e) => saveSettings.mutate({ publishDay: Number(e.target.value) })}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    매월 {d}일
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-400">
              추천은 공개일 0시에 마감됩니다. 공개일이 지나도 선정하지 않은 달은 추천 상위 {eotm.winnerCount}명이 자동 선정됩니다.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
