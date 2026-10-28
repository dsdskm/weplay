'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CancelRequestButton } from '@/components/cancel-request-button';
import { InfoEditForm } from '@/components/info-edit-form';
import { Badge, Card, Empty } from '@/components/ui';
import { Pager, usePaging } from '@/components/pager';
import { api } from '@/lib/api';
import { useGroup, useGroupId, useMe } from '@/lib/hooks';
import type { TeamItem } from '@/lib/types';

export default function HomePage() {
  const groupId = useGroupId();
  const { data: me } = useMe();
  const { data: group } = useGroup();
  const { data: teams } = useQuery({
    queryKey: ['group', groupId, 'teams'],
    queryFn: () => api<TeamItem[]>(`/groups/${groupId}/teams`),
  });
  const myTeams = teams?.filter((g) => g.isMine || g.joinStatus === 'PENDING') ?? [];

  const pg = usePaging(myTeams);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {group?.me.role === 'ADMIN' && group && (
        <InfoEditForm path={`/groups/${groupId}`} queryKey={['group', groupId]} name={group.name} description={group.description} />
      )}
      <Card className="bg-gradient-to-r from-brand-600 to-brand-500 text-white ring-0">
        <p className="text-sm opacity-80">오늘도 즐거운 하루 🎉</p>
        <h1 className="mt-1 text-2xl font-bold">{me?.name}님, 환영해요!</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/20 px-3 py-1">{me?.email}</span>
          <span className="rounded-full bg-white/20 px-3 py-1">
            {group?.me.isPrimaryAdmin ? '대표 ADMIN' : group?.me.role === 'ADMIN' ? 'ADMIN' : '구성원'}
          </span>
          {group && <span className="rounded-full bg-white/20 px-3 py-1">가입일 {new Date(group.me.joinedAt).toLocaleDateString('ko-KR')}</span>}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <p className="text-xs font-semibold text-slate-400">그룹</p>
          <h2 className="mt-1 text-xl font-bold">{group?.name}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{group?.description || '그룹 소개가 아직 없어요.'}</p>
        </Card>
        <Card className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-brand-600">{group?.memberCount ?? '-'}</p>
            <p className="text-xs text-slate-500">구성원</p>
          </div>
          <div>
            <p className="text-2xl font-black text-brand-600">{group?.teamCount ?? '-'}</p>
            <p className="text-xs text-slate-500">팀</p>
          </div>
          {group?.joinCode && (
            <div className="col-span-2 rounded-xl bg-slate-50 p-2">
              <p className="text-xs text-slate-500">그룹 코드</p>
              <p className="font-mono font-bold tracking-widest">{group.joinCode}</p>
            </div>
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">내 팀</h2>
          <Link href={`/g/${groupId}/teams`} className="text-sm text-brand-600">
            전체 보기
          </Link>
        </div>
        {myTeams.length === 0 ? (
          <Empty>
            아직 소속된 팀이 없어요.{' '}
            <Link href={`/g/${groupId}/join`} className="text-brand-600 underline">
              팀 코드로 가입하기
            </Link>
          </Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pg.items.map((g) => (
              <Link key={g.id} href={`/g/${groupId}/teams/${g.id}`}>
                <Card className="h-full transition hover:ring-brand-200">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{g.name}</p>
                    {g.myRole === 'ADMIN' && <Badge tone="brand">담당</Badge>}
                    {g.joinStatus === 'PENDING' && <Badge tone="amber">승인 대기 중</Badge>}
                    {g.joinStatus === 'PENDING' && g.pendingRequestId && <CancelRequestButton requestId={g.pendingRequestId} />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{g.description || '설명 없음'}</p>
                  <p className="mt-3 text-xs text-slate-400">멤버 {g.memberCount}명</p>
                </Card>
              </Link>
            ))}
              <div className="col-span-full"><Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} /></div>
          </div>
        )}
      </section>

      <Card className="border border-dashed border-amber-200 bg-amber-50/50 ring-0">
        <p className="font-semibold">🎮 곧 만나요</p>
        <p className="mt-1 text-sm text-slate-600">칭찬하기 · 우수사원 투표 · 마니또 · 럭키드로우 · 챌린지가 준비 중이에요.</p>
      </Card>
    </div>
  );
}
