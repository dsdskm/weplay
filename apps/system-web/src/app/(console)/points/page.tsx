'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BADGES, POINT_LABELS, POINT_RULES } from '@weplay/shared';
import { useState } from 'react';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

type Metric = 'sentCard' | 'receivedCard' | 'nomination' | 'win' | 'comment';
interface Defaults {
  rules: Record<string, number>;
  badges: { key: string; name: string; icon: string; description: string; target: number; enabled: boolean }[];
}

const METRIC_LABEL: Record<string, string> = Object.fromEntries(Object.entries(POINT_LABELS).map(([k, v]) => [k, `${v} (1회당)`]));
const METRICS = Object.keys(POINT_RULES) as Metric[];
const BADGE_METRIC: Record<string, Metric> = Object.fromEntries(BADGES.map((b) => [b.key, b.metric])) as Record<string, Metric>;

/** MASTER: 포인트·배지 기본값. 그룹이 따로 설정하지 않으면 이 값이 적용됨 */
export default function PointDefaultsPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['admin', 'points', 'defaults'], queryFn: () => api<Defaults>('/admin/points/defaults') });
  const [draftRules, setDraftRules] = useState<Record<string, number>>();
  const [draftBadges, setDraftBadges] = useState<Defaults['badges']>();

  const rules = draftRules ?? data?.rules;
  const badges = draftBadges ?? data?.badges;

  const save = useMutation({
    mutationFn: () =>
      api('/admin/points/defaults', {
        method: 'PUT',
        body: { rules, badges: badges?.map((b) => ({ key: b.key, target: b.target, enabled: b.enabled })) },
      }),
    onSuccess: () => {
      setError(undefined);
      setDraftRules(undefined);
      setDraftBadges(undefined);
      qc.invalidateQueries({ queryKey: ['admin', 'points'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!rules || !badges) return <p className="text-slate-400">불러오는 중…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">포인트·배지 기본값</h1>
      <p className="text-sm text-slate-500">그룹 관리자가 따로 설정하지 않은 그룹에 적용되는 값입니다.</p>
      <ErrorText>{error}</ErrorText>

      <Card className="space-y-4">
        <h2 className="font-bold">점수 기준</h2>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => {
              setDraftRules(undefined);
              setDraftBadges(undefined);
            }}
          >
            취소
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            저장
          </Button>
        </div>
      </Card>
    </div>
  );
}
