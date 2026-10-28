'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { JoinForm } from '@/components/join-form';
import { Badge, Button, Card, Logo } from '@/components/ui';
import { logout, useMe, useMyGroups, useRequireAuth } from '@/lib/hooks';

export default function OnboardingPage() {
  useRequireAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: groups } = useMyGroups();
  const rejected = groups?.filter((c) => c.joinStatus === 'REJECTED') ?? [];
  const approved = groups?.filter((c) => c.joinStatus === 'APPROVED') ?? [];

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6 pt-16">
      <div className="flex items-center justify-between">
        <Logo />
        <Button variant="ghost" onClick={logout}>
          로그아웃
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold">반가워요{me ? `, ${me.name}님` : ''} 👋</h1>
        <p className="mt-1 text-slate-500">먼저 관리자에게 받은 그룹 코드를 입력하세요. 그룹을 확인한 뒤 팀 코드를 추가할 수 있어요.</p>
      </div>
      <Card>
        <JoinForm
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['me'] });
            router.push('/onboarding/pending');
          }}
        />
      </Card>
      {rejected.map((c) => (
        <Card key={c.group.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{c.group.name}</p>
            {c.reviewNote && <p className="text-sm text-slate-500">사유: {c.reviewNote}</p>}
          </div>
          <Badge tone="rose">거절됨</Badge>
        </Card>
      ))}
      {approved.length > 0 && (
        <Button variant="secondary" className="w-full" onClick={() => router.push(`/g/${approved[0].group.id}`)}>
          {approved[0].group.name} 홈으로
        </Button>
      )}
    </main>
  );
}
