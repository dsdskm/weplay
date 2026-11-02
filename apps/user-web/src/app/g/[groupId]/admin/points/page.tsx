'use client';

import { BADGES, POINT_LABELS, POINT_RULES } from '@weplay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { Pager } from '@/components/pager';
import { useDialog } from '@/components/confirm-dialog';
import { MemberCombobox } from '@/components/member-combobox';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { Paged, PointAdjustmentRow, PointConfig, PointMetric, Member } from '@/lib/types';

const METRIC_LABEL: Record<string, string> = Object.fromEntries(Object.entries(POINT_LABELS).map(([k, v]) => [k, `${v} (1회당)`]));
const METRICS = Object.keys(POINT_RULES) as PointMetric[];
const BADGE_METRIC: Record<string, PointMetric> = Object.fromEntries(BADGES.map((b) => [b.key, b.metric])) as Record<string, PointMetric>;
const PAGE_SIZE = 10;
const pagesOf = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

/** 관리자: 포인트 점수·배지 설정, 수동 부여·차감 */
export default function AdminPointsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const { confirm } = useDialog();
  const key = ['group', groupId, 'points'];
  const [error, setError] = useState<string>();
  const [histPage, setHistPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [target, setTarget] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data: config } = useQuery({ queryKey: [...key, 'config'], queryFn: () => api<PointConfig>(`/groups/${groupId}/points/config`) });
  const { data: history } = useQuery({
    queryKey: [...key, 'adjustments', histPage],
    queryFn: () => api<Paged<PointAdjustmentRow>>(`/groups/${groupId}/points/adjustments?page=${histPage}&pageSize=${PAGE_SIZE}`),
  });

  // 설정 편집은 임시 값으로 두고 [저장]을 눌러야 반영
  const [draftRules, setDraftRules] = useState<Record<PointMetric, number> | null>(null);
  const [draftBadges, setDraftBadges] = useState<PointConfig['badges'] | null>(null);
  const rules = draftRules ?? config?.rules;
  const badges = draftBadges ?? config?.badges;

  const onError = (e: unknown) => setError(errorMessage(e));
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const saveConfig = useMutation({
    mutationFn: () =>
      api(`/groups/${groupId}/points/config`, {
        method: 'PUT',
        body: {
          rules,
          badges: badges?.map((b) => ({ key: b.key, target: b.target, enabled: b.enabled })),
        },
      }),
    onSuccess: () => {
      setError(undefined);
      setDraftRules(null);
      setDraftBadges(null);
      refresh();
    },
    onError,
  });
  const resetConfig = useMutation({
    mutationFn: () => api(`/groups/${groupId}/points/config`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      setDraftRules(null);
      setDraftBadges(null);
      refresh();
    },
    onError,
  });
  const adjust = useMutation({
    mutationFn: (v: { userId: string; amount: number; reason: string }) => api(`/groups/${groupId}/points/adjustments`, { body: v }),
    onSuccess: () => {
      setError(undefined);
      setAmount('');
      setReason('');
      setUserId('');
      setTarget(null);
      setHistPage(1);
      refresh();
    },
    onError,
  });

  if (!config || !rules || !badges) return <p className="text-slate-400">불러오는 중…</p>;

  const parsedAmount = Number(amount);
  const amountValid = Number.isInteger(parsedAmount) && parsedAmount !== 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">포인트 관리</h1>
      <ErrorText>{error}</ErrorText>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">점수 기준</h2>
          {config.customized ? <Badge tone="brand">그룹 설정 적용 중</Badge> : <Badge tone="slate">MASTER 기본값 적용 중</Badge>}
        </div>
        <div className="space-y-3">
          {METRICS.map((m) => (
            <div key={m} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="whitespace-nowrap font-semibold text-slate-700">{METRIC_LABEL[m]}</span>
                <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                  1회당
                  <Input type="number" min={0} max={100} className="w-20" value={rules[m]} onChange={(e) => setDraftRules({ ...rules, [m]: Number(e.target.value) })} />
                  점
                </label>
              </div>
              {badges
                .filter((b) => BADGE_METRIC[b.key] === m)
                .map((b) => (
                  <div key={b.key} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={b.enabled}
                        onChange={(e) => setDraftBadges(badges.map((x) => (x.key === b.key ? { ...x, enabled: e.target.checked } : x)))}
                      />
                      <span className="font-semibold">
                        {b.icon} {b.name}
                      </span>
                    </label>
                    <span className="flex-1 text-xs text-slate-400">{b.description}</span>
                    <label className="flex items-center gap-2 whitespace-nowrap text-slate-600">
                      활동
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        className="w-20"
                        value={b.target}
                        onChange={(e) => setDraftBadges(badges.map((x) => (x.key === b.key ? { ...x, target: Number(e.target.value) } : x)))}
                      />
                      회 이상이면 획득
                    </label>
                  </div>
                ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={async () => {
              if (await confirm({ message: 'MASTER 기본값으로 되돌릴까요? 그룹에서 바꾼 점수와 배지 설정이 사라집니다.', danger: true })) resetConfig.mutate();
            }}
          >
            기본값으로 되돌리기
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setDraftRules(null); setDraftBadges(null); }}>
              취소
            </Button>
            <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
              저장
            </Button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">포인트 직접 부여·차감</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <MemberCombobox groupId={groupId} value={target} onChange={(m) => { setTarget(m); setUserId(m?.id ?? ''); }} placeholder="구성원 선택" />
          <Input type="number" placeholder="점수 (예: 10, -5)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <Input placeholder="사유 (필수, 구성원에게 내역으로 남아요)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        <Button
          disabled={!userId || !amountValid || !reason.trim() || adjust.isPending}
          onClick={async () => {
            const ok = await confirm({
              message: `${target?.name ?? ''}님에게 ${parsedAmount > 0 ? `+${parsedAmount}점 부여` : `${parsedAmount}점 차감`}할까요?`,
              danger: parsedAmount < 0,
            });
            if (ok) adjust.mutate({ userId, amount: parsedAmount, reason: reason.trim() });
          }}
        >
          적용
        </Button>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">부여·차감 내역</h2>
        {!history || history.total === 0 ? (
          <Empty>아직 내역이 없어요.</Empty>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {history.items.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span className={`w-16 shrink-0 font-bold ${r.amount > 0 ? 'text-brand-600' : 'text-rose-600'}`}>{r.amount > 0 ? `+${r.amount}` : r.amount}</span>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold">{r.user.name}</span>
                    <span className="text-xs text-slate-400"> · 처리 {r.actorName} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
                  </p>
                  <p className="text-slate-600">{r.reason}</p>
                </div>
              </div>
            ))}
            <div className="px-5 py-3">
              <Pager page={histPage} pages={pagesOf(history.total)} setPage={setHistPage} total={history.total} />
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
