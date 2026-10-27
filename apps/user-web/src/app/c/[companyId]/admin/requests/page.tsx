'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Badge, Button, Card, cn, Empty, ErrorText } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useCompany, useCompanyId } from '@/lib/hooks';
import type { JoinRequest } from '@/lib/types';

export default function AdminRequestsPage() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const [tab, setTab] = useState<'PENDING' | 'DONE'>('PENDING');
  const [error, setError] = useState<string>();
  const { data: requests } = useQuery({
    queryKey: ['company', companyId, 'requests'],
    queryFn: () => api<JoinRequest[]>(`/companies/${companyId}/requests`),
    enabled: company?.me.role === 'ADMIN',
    refetchInterval: 15_000,
  });

  const review = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      api(`/companies/${companyId}/requests/${id}/${action}`, { body: action === 'reject' ? { reason } : {} }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['company', companyId] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (company && company.me.role !== 'ADMIN') return <Empty>ADMIN만 접근할 수 있습니다.</Empty>;
  const list = (requests ?? []).filter((r) => (tab === 'PENDING' ? r.status === 'PENDING' : r.status !== 'PENDING'));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">가입 요청 관리</h1>
      <div className="flex gap-2">
        {(['PENDING', 'DONE'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('rounded-full px-4 py-1.5 text-sm', tab === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {t === 'PENDING' ? '대기' : '처리 완료'}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      {list.length === 0 && <Empty>요청이 없습니다.</Empty>}
      {list.map((r) => (
        <Card key={r.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={r.user.name} url={r.user.avatarUrl} />
            <div className="flex-1">
              <p className="font-semibold">{r.user.name}</p>
              <p className="text-xs text-slate-400">{r.user.email}</p>
            </div>
            <Badge tone={r.type === 'COMPANY_JOIN' ? 'brand' : 'amber'}>{r.type === 'COMPANY_JOIN' ? '회사 가입' : '그룹 가입'}</Badge>
          </div>
          {r.groups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.groups.map((g) => (
                <Badge key={g.groupId} tone={g.approved === false ? 'rose' : 'slate'}>
                  {g.group.name}
                </Badge>
              ))}
            </div>
          )}
          {r.message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">“{r.message}”</p>}
          <p className="text-xs text-slate-400">
            {new Date(r.createdAt).toLocaleString('ko-KR')}
            {r.reviewer && ` · ${r.reviewer.name} 처리 (${r.status})`}
            {r.reviewNote && ` · 사유: ${r.reviewNote}`}
          </p>
          {r.status === 'PENDING' && (
            <div className="flex gap-2">
              <Button onClick={() => review.mutate({ id: r.id, action: 'approve' })} disabled={review.isPending}>
                승인
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const reason = prompt('거절 사유 (선택)') ?? undefined;
                  review.mutate({ id: r.id, action: 'reject', reason: reason || undefined });
                }}
                disabled={review.isPending}
              >
                거절
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
