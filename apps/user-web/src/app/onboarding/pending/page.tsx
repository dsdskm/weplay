'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Badge, Button, Card, Empty, Logo } from '@/components/ui';
import { api } from '@/lib/api';
import { logout, useMyCompanies, useRequireAuth } from '@/lib/hooks';
import type { JoinRequest } from '@/lib/types';

const statusLabel: Record<JoinRequest['status'], [string, 'amber' | 'green' | 'rose' | 'slate']> = {
  PENDING: ['승인 대기', 'amber'],
  APPROVED: ['승인됨', 'green'],
  REJECTED: ['거절됨', 'rose'],
  CANCELED: ['취소됨', 'slate'],
  EXPIRED: ['만료됨', 'slate'],
};

export default function PendingPage() {
  useRequireAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: companies } = useMyCompanies(10_000);
  const { data: requests } = useQuery({
    queryKey: ['me', 'requests'],
    queryFn: () => api<JoinRequest[]>('/me/requests'),
    refetchInterval: 10_000,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api(`/me/requests/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const approved = companies?.find((c) => c.joinStatus === 'APPROVED');
  const hasPending = requests?.some((r) => r.status === 'PENDING');

  useEffect(() => {
    if (approved && !hasPending) router.replace(`/c/${approved.company.id}`);
  }, [approved, hasPending, router]);

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pt-16">
      <div className="flex items-center justify-between">
        <Logo />
        <Button variant="ghost" onClick={logout}>
          로그아웃
        </Button>
      </div>
      <div className="text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="mt-3 text-2xl font-bold">승인을 기다리고 있어요</h1>
        <p className="mt-1 text-slate-500">관리자가 승인하면 자동으로 홈으로 이동합니다.</p>
      </div>
      <div className="space-y-3">
        {requests?.length === 0 && <Empty>가입 요청이 없습니다.</Empty>}
        {requests?.map((r) => {
          const [label, tone] = statusLabel[r.status];
          return (
            <Card key={r.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.company.name}</p>
                <Badge tone={tone}>{label}</Badge>
              </div>
              {r.groups.length > 0 && (
                <p className="text-sm text-slate-500">그룹: {r.groups.map((g) => g.group.name).join(', ')}</p>
              )}
              {r.reviewNote && <p className="text-sm text-rose-600">사유: {r.reviewNote}</p>}
              <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString('ko-KR')}</p>
              {r.status === 'PENDING' && (
                <Button variant="secondary" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
                  요청 취소
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      <Button variant="secondary" className="w-full" onClick={() => router.push('/onboarding')}>
        다른 코드 입력하기
      </Button>
    </main>
  );
}
