'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, ErrorText } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { ComplimentOverview } from '@/lib/types';

export default function AdminComplimentsPage() {
  const groupId = useGroupId();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();

  const { data: overview } = useQuery({
    queryKey: ['group', groupId, 'compliments', 'overview'],
    queryFn: () => api<ComplimentOverview>(`/groups/${groupId}/compliments`),
  });

  const save = useMutation({
    mutationFn: (dailyLimit: number) => api(`/groups/${groupId}/compliments/settings`, { method: 'PUT', body: { dailyLimit } }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['group', groupId, 'compliments'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!overview) return <p className="text-slate-400">불러오는 중…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">칭찬 카드 설정</h1>
      <ErrorText>{error}</ErrorText>
      {!overview.enabled ? (
        <Card>
          <p className="text-slate-600">칭찬 카드 기능이 아직 승인되지 않았어요.</p>
        </Card>
      ) : (
        <Card className="space-y-3">
          <label className="flex flex-wrap items-center gap-3 text-sm">
            <span className="w-32 font-semibold">1인당 하루 보낼 수</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={overview.dailyLimit}
              onChange={(e) => save.mutate(Number(e.target.value))}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  하루 {n}개
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-400">구성원 한 명이 하루(KST 0시 기준) 보낼 수 있는 칭찬 카드 수입니다. 관리자(그룹 ADMIN·팀 ADMIN)만 바꿀 수 있어요.</p>
        </Card>
      )}
    </div>
  );
}
