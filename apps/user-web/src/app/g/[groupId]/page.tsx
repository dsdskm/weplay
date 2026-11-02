'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { CancelRequestButton } from '@/components/cancel-request-button';
import { Avatar, Badge, Card, Empty } from '@/components/ui';
import { BadgeIcons } from '@/components/badge-icons';
import { Pager, usePaging } from '@/components/pager';
import { api } from '@/lib/api';
import { useGroup, useGroupId, useMe } from '@/lib/hooks';
import type { EotmOverview, Paginated, PointHistoryItem, PointsMe, TeamItem } from '@/lib/types';

export default function HomePage() {
  const groupId = useGroupId();
  const { data: me } = useMe();
  const { data: group } = useGroup();
  const { data: teams } = useQuery({
    queryKey: ['group', groupId, 'teams'],
    queryFn: () => api<TeamItem[]>(`/groups/${groupId}/teams`),
  });
  const myTeams = teams?.filter((g) => g.isMine || g.joinStatus === 'PENDING') ?? [];
  const { data: points } = useQuery({
    queryKey: ['group', groupId, 'points', 'me'],
    queryFn: () => api<PointsMe>(`/groups/${groupId}/points/me`),
    enabled: !!group,
  });
  const { data: eotm } = useQuery({
    queryKey: ['group', groupId, 'employee-of-the-month', 'overview', ''],
    queryFn: () => api<EotmOverview>(`/groups/${groupId}/employee-of-the-month`),
    enabled: !!group,
  });

  const pg = usePaging(myTeams);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

      {points?.enabled && <MyPointsCard groupId={groupId} />}

      {eotm?.enabled && (
        <Card className="flex items-center gap-4">
          {eotm.publishedWinners.length > 0 && (
            <div className="flex -space-x-2">
              {eotm.publishedWinners.map((w) => (
                <Avatar key={w.user.id} name={w.user.name} url={w.user.avatarUrl} size={48} />
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-400">
              🏅 {eotm.publishedWinners.length > 0 ? `${eotm.publishedMonth} 이달의 사원` : '이달의 사원'}
            </p>
            {eotm.publishedWinners.length > 0 && <p className="font-bold">{eotm.publishedWinners.map((w) => w.user.name).join(', ')}</p>}
            {eotm.nextPublishDate && (
              <p className="text-sm text-slate-500">
                다음 공개 {dDayLabel(eotm.nextPublishDate)} <span className="text-xs text-slate-400">({dateLabel(eotm.nextPublishDate)})</span>
              </p>
            )}
          </div>
          <Link href={`/g/${groupId}/employee-of-the-month`} className="text-sm text-brand-600">
            보러 가기
          </Link>
        </Card>
      )}

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

/** 오늘(KST)부터 목표 날짜(YYYY-MM-DD)까지 D-N 문자열 */
function dDayLabel(target: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const diff = Math.round((Date.parse(target) - Date.parse(today)) / 86_400_000);
  return diff <= 0 ? 'D-Day' : `D-${diff}`;
}

function dateLabel(ymd: string) {
  return `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일`;
}

/** 내 포인트·배지·최근 포인트 내역 (홈에 함께 표시) */
function MyPointsCard({ groupId }: { groupId: string }) {
  const [page, setPage] = useState(1);
  const { data: mine } = useQuery({
    queryKey: ['group', groupId, 'points', 'me'],
    queryFn: () => api<PointsMe>(`/groups/${groupId}/points/me`),
  });
  const { data: history } = useQuery({
    queryKey: ['group', groupId, 'points', 'history', page],
    queryFn: () => api<Paginated<PointHistoryItem>>(`/groups/${groupId}/points/me/history?page=${page}&pageSize=5`),
  });
  const earned = mine?.badges?.filter((b) => b.earned) ?? [];
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400">내 포인트</p>
          <p className="text-3xl font-black text-brand-600">{mine?.points ?? 0}</p>
        </div>
        <BadgeIcons badges={earned} />
      </div>
      {!history || history.total === 0 ? (
        <Empty>아직 포인트 내역이 없어요.</Empty>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400">최근 포인트 내역</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {history.items.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2">
                <span className={`w-14 shrink-0 font-bold ${h.points >= 0 ? 'text-brand-600' : 'text-rose-600'}`}>{h.points > 0 ? `+${h.points}` : h.points}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{h.label}</span>
                <span className="shrink-0 text-xs text-slate-400">{new Date(h.at).toLocaleDateString('ko-KR')}</span>
              </li>
            ))}
          </ul>
          <Pager page={page} pages={Math.max(1, Math.ceil(history.total / history.pageSize))} setPage={setPage} total={history.total} />
        </div>
      )}
    </Card>
  );
}
