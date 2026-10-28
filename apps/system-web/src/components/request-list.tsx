'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { JoinRequest } from '@/lib/types';
import { Badge, Button, Card, Empty, ErrorText } from './ui';
import { Pager } from './pager';
import type { Paged } from '@/lib/types';

const tone = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'rose', CANCELED: 'slate', EXPIRED: 'slate' } as const;

export function RequestList({ groupId, status = 'PENDING' }: { groupId?: string; status?: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    ...(status ? { status } : {}),
    ...(groupId ? { groupId } : {}),
    page: String(page),
    pageSize: '10',
  });
  const { data: paged } = useQuery({
    queryKey: ['requests', groupId ?? 'all', status, page],
    queryFn: () => api<Paged<JoinRequest>>(`/admin/requests?${params}`),
  });
  const data = paged?.items;
  const review = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'approve' | 'reject'; body: unknown }) =>
      api(`/admin/requests/${id}/${action}`, { body }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const pg = { items: data ?? [], page, pages: Math.max(1, Math.ceil((paged?.total ?? 0) / 10)), setPage, total: paged?.total ?? 0 };
  if (paged?.total === 0) return <Empty>요청이 없습니다.</Empty>;
  return (
    <div className="space-y-3">
      <ErrorText>{error}</ErrorText>
      {pg.items.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center gap-4">
          <div className="min-w-48 flex-1">
            <p className="font-semibold">
              {r.user.name} <span className="text-xs font-normal text-slate-400">{r.user.email}</span>
            </p>
            <p className="text-sm text-slate-500">
              {r.group.name}
              {r.teams.length > 0 && ` · ${r.teams.map((g) => g.team.name).join(', ')}`}
            </p>
            {r.message && <p className="mt-1 text-sm text-slate-600">“{r.message}”</p>}
            <p className="mt-1 text-xs text-slate-400">
              {new Date(r.createdAt).toLocaleString('ko-KR')}
              {r.reviewer && ` · ${r.reviewer.name} 처리`}
              {r.reviewNote && ` · 사유: ${r.reviewNote}`}
            </p>
          </div>
          <Badge tone={r.type === 'GROUP_JOIN' ? 'brand' : 'amber'}>{r.type === 'GROUP_JOIN' ? '그룹 가입' : '팀 가입'}</Badge>
          <Badge tone={tone[r.status]}>{r.status}</Badge>
          {r.status === 'PENDING' && (
            <div className="flex gap-2">
              {r.type === 'GROUP_JOIN' && (
                <Button variant="secondary" onClick={() => review.mutate({ id: r.id, action: 'approve', body: { role: 'ADMIN' } })} disabled={review.isPending}>
                  ADMIN으로 승인
                </Button>
              )}
              <Button onClick={() => review.mutate({ id: r.id, action: 'approve', body: {} })} disabled={review.isPending}>
                승인
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = prompt('거절 사유를 입력하세요');
                  if (reason?.trim()) review.mutate({ id: r.id, action: 'reject', body: { reason: reason.trim() } });
                }}
                disabled={review.isPending}
              >
                거절
              </Button>
            </div>
          )}
        </Card>
      ))}
      <Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} />
    </div>
  );
}
