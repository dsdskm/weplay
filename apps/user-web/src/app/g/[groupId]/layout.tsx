'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GAMES, groupByCategory } from '@weplay/shared';
import { Avatar, Badge, Button, cn, Logo } from '@/components/ui';
import { SystemBanner } from '@/components/system-banner';
import { TermsGate } from '@/components/terms-gate';
import { ApiError, api } from '@/lib/api';
import { LAST_GROUP_KEY, logout, useFeatureFlags, useGroup, useMe, useMyGroups, useRequireAuth } from '@/lib/hooks';
import type { ComplimentOverview, EotmOverview, PointsMe, TeamItem } from '@/lib/types';

type NavItem = { href: string; label: string; icon: string; children?: NavItem[]; aliases?: string[]; badge?: number };

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const { groupId } = useParams<{ groupId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const { data: me } = useMe();
  const { data: groups } = useMyGroups();
  const { data: group, error } = useGroup();
  const { data: teams } = useQuery({
    queryKey: ['group', groupId, 'teams'],
    queryFn: () => api<TeamItem[]>(`/groups/${groupId}/teams`),
    enabled: !!group,
  });

  // 기능이 승인된 그룹에만 메뉴 노출 (캐시는 각 화면과 공유)
  const { data: points } = useQuery({ queryKey: ['group', groupId, 'points', 'me'], queryFn: () => api<PointsMe>(`/groups/${groupId}/points/me`), enabled: !!group });
  const { data: manitto } = useQuery({ queryKey: ['group', groupId, 'manitto'], queryFn: () => api<{ enabled: boolean }>(`/groups/${groupId}/manitto`), enabled: !!group });
  const { data: compliments } = useQuery({
    queryKey: ['group', groupId, 'compliments', 'overview', ''],
    queryFn: () => api<ComplimentOverview>(`/groups/${groupId}/compliments`),
    enabled: !!group,
  });
  const { data: eotm } = useQuery({
    queryKey: ['group', groupId, 'employee-of-the-month', 'overview', ''],
    queryFn: () => api<EotmOverview>(`/groups/${groupId}/employee-of-the-month`),
    enabled: !!group,
  });
  // 안 읽은 공지 수, 내 차례인 턴제 게임 수 (메뉴 배지)
  const { data: notices } = useQuery({
    queryKey: ['group', groupId, 'notices', 'badge'],
    queryFn: () => api<{ unread: number }>(`/groups/${groupId}/notices?pageSize=1`),
    enabled: !!group,
    refetchInterval: 60_000,
  });
  const flags = useFeatureFlags(groupId, !!group);
  const { data: turns } = useQuery({
    queryKey: ['group', groupId, 'turn-games', 'badge'],
    queryFn: () => api<{ myTurnCount: number }>(`/groups/${groupId}/turn-games?pageSize=1`),
    enabled: !!group && flags.isOn('MINI_GAMES'),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (group) localStorage.setItem(LAST_GROUP_KEY, group.id);
  }, [group]);
  useEffect(() => {
    if (error instanceof ApiError && error.status === 403) router.replace('/');
  }, [error, router]);
  // 화면을 옮기면 모바일 메뉴 닫기
  useEffect(() => setDrawer(false), [pathname]);

  const base = `/g/${groupId}`;
  const hasTeam = !!teams?.some((t) => t.isMine);
  const nav: NavItem[] = [
    { href: base, label: '홈', icon: '🏠' },
    { href: `${base}/notices`, label: '공지사항', icon: '📢', badge: notices?.unread || undefined },
    {
      href: `${base}/teams`,
      label: '팀·구성원',
      icon: '👥',
      aliases: [`${base}/members`],
      // 팀 가입은 '팀' 메뉴 하위에 두고, 이미 소속 팀이 있으면 숨김
      children: hasTeam ? [] : [{ href: `${base}/join`, label: '팀 가입', icon: '➕' }],
    },
  ];
  // 기능 메뉴: 카테고리별로 묶어서 표시
  const featureNav: (NavItem & { feature: string })[] = [
    ...(flags.isOn('DUTY_ROSTER') ? [{ feature: 'DUTY_ROSTER', href: `${base}/duties`, label: '공통 업무', icon: '🗂️' }] : []),
    ...(flags.isOn('SUGGESTION_BOX') ? [{ feature: 'SUGGESTION_BOX', href: `${base}/suggestions`, label: '건의사항', icon: '💡' }] : []),
    ...(eotm?.enabled ? [{ feature: 'EMPLOYEE_OF_THE_MONTH', href: `${base}/employee-of-the-month`, label: '이달의 사원', icon: '🏅' }] : []),
    ...(compliments?.enabled ? [{ feature: 'COMPLIMENT_CARD', href: `${base}/compliments`, label: '칭찬 카드', icon: '💌' }] : []),
    ...(flags.isOn('BOARD') ? [{ feature: 'BOARD', href: `${base}/board`, label: '자유 게시판', icon: '💬' }] : []),
    ...(flags.isOn('ROLLING_PAPER') ? [{ feature: 'ROLLING_PAPER', href: `${base}/rolling-paper`, label: '롤링페이퍼', icon: '📝' }] : []),
    ...(flags.isOn('RANDOM_SURVEY') ? [{ feature: 'RANDOM_SURVEY', href: `${base}/surveys`, label: '랜덤 설문', icon: '📊' }] : []),
    ...(flags.isOn('DINNER_VOTE') ? [{ feature: 'DINNER_VOTE', href: `${base}/dinner`, label: '회식 투표', icon: '🍻' }] : []),
    ...(flags.isOn('SNACK_DRAW') ? [{ feature: 'SNACK_DRAW', href: `${base}/snack`, label: '간식 쏘기', icon: '🍩' }] : []),
    ...(manitto?.enabled ? [{ feature: 'MANITTO', href: `${base}/manitto`, label: '마니또', icon: '🤫' }] : []),
    ...(flags.isOn('MINI_GAMES')
      ? [{ feature: 'MINI_GAMES', href: `${base}/games`, label: '게임', icon: '🎮', badge: turns?.myTurnCount || undefined, aliases: GAMES.map((g) => `${base}/games/${g.key}`) }]
      : []),
    ...(flags.isOn('PHOTO_MISSION') ? [{ feature: 'PHOTO_MISSION', href: `${base}/photo-mission`, label: '사진·영상 미션', icon: '📸' }] : []),
  ];
  const featureSections = groupByCategory(featureNav, (n) => n.feature);
  const isActive = (n: NavItem) => (n.href === base ? pathname === base : pathname === n.href || pathname.startsWith(`${n.href}/`) || !!n.aliases?.includes(pathname));

  // 관리 메뉴: 그룹 ADMIN 또는 담당 팀이 있는 팀 ADMIN. 관리자 전용 화면은 하단 '관리자' 영역에만 노출
  const isGroupAdmin = group?.me.role === 'ADMIN';
  const managesTeam = !!teams?.some((t) => t.myRole === 'ADMIN');
  const manager = isGroupAdmin || managesTeam;
  const adminNav: NavItem[] = [
    ...(manager
      ? [
          { href: `${base}/admin/requests`, label: '가입 요청', icon: '📨', badge: isGroupAdmin ? group?.pendingCount || undefined : undefined },
          { href: `${base}/admin/teams`, label: '팀 관리', icon: '👥' },
        ]
      : []),
    ...(isGroupAdmin ? [{ href: `${base}/admin/settings`, label: '그룹 설정', icon: '🛠️' }] : []),
    ...(manager ? [{ href: `${base}/admin/features`, label: '기능 신청', icon: '🧩' }] : []),
    ...(eotm?.enabled && manager ? [{ href: `${base}/admin/employee-of-the-month`, label: '이달의 사원 관리', icon: '🏅' }] : []),
    ...(points?.enabled && manager ? [{ href: `${base}/admin/points`, label: '포인트 관리', icon: '🏆' }] : []),
    ...(manitto?.enabled && manager ? [{ href: `${base}/admin/manitto`, label: '마니또 관리', icon: '🤫' }] : []),
    ...(manager && ['ROLLING_PAPER', 'PHOTO_MISSION', 'DINNER_VOTE', 'RANDOM_SURVEY', 'SNACK_DRAW', 'BOARD', 'MINI_GAMES', 'DUTY_ROSTER', 'SUGGESTION_BOX'].some((k) => flags.isOn(k))
      ? [{ href: `${base}/admin/activities`, label: '기능별 설정', icon: '🎲' }]
      : []),
    ...(compliments?.enabled && manager
      ? [
          { href: `${base}/admin/compliments`, label: '칭찬 카드 설정', icon: '💌' },
          { href: `${base}/admin/compliment-cards`, label: '칭찬 관리', icon: '📋' },
        ]
      : []),
  ];
  const approved = groups?.filter((c) => c.joinStatus === 'APPROVED') ?? [];

  const sidebar = (
    <>
      <Link href="/" className="shrink-0">
        <Logo />
      </Link>
      {approved.length > 1 ? (
        <select className="rounded-xl border border-slate-200 px-2 py-2 text-sm" value={groupId} onChange={(e) => router.push(`/g/${e.target.value}`)}>
          {approved.map((c) => (
            <option key={c.group.id} value={c.group.id}>
              {c.group.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="font-semibold text-slate-700">{group?.name}</p>
      )}
      <nav className="flex flex-col gap-1">
        {nav.map((n) => (
          <div key={n.href} className="flex flex-col gap-1">
            <NavLink href={n.href} label={n.label} icon={n.icon} badge={n.badge} active={isActive(n)} />
            {n.children?.map((c) => (
              <NavLink key={c.href} href={c.href} label={c.label} icon={c.icon} active={pathname === c.href} indent />
            ))}
          </div>
        ))}
        {featureSections.map((sec) => (
          <div key={sec.category.key} className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-3">
            <p className="px-3 pb-1 text-xs font-semibold text-slate-400">{sec.category.name}</p>
            {sec.items.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} badge={n.badge} active={isActive(n)} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-4">
        {adminNav.length > 0 && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 pt-4">
            <p className="px-3 pb-1 text-xs font-semibold text-slate-400">관리자</p>
            {adminNav.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} badge={n.badge} active={pathname.startsWith(n.href)} />
            ))}
          </nav>
        )}
        <nav className="flex flex-col gap-1 border-t border-slate-100 pt-4">
          <NavLink href="/support" label="시스템 문의" icon="🙋" active={pathname.startsWith('/support')} />
          <NavLink href="/terms" label="약관·정책" icon="📄" active={pathname.startsWith('/terms')} />
        </nav>
        <Link href="/account" className="flex items-center gap-2 rounded-xl border-t border-slate-100 pt-4 hover:opacity-80">
          {me && <Avatar name={me.name} url={me.avatarUrl} size={32} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{me?.name}</p>
            <p className="truncate text-xs text-slate-400">{me?.email}</p>
          </div>
        </Link>
        <Button variant="ghost" onClick={logout}>
          로그아웃
        </Button>
      </div>
    </>
  );

  // 모바일 하단 탭: 홈·공지·(게임 또는 팀)·(공통 업무 또는 칭찬)·메뉴
  const gameItem = featureNav.find((n) => n.feature === 'MINI_GAMES');
  const tabs: NavItem[] = [
    nav[0],
    nav[1],
    gameItem ?? nav[2],
    featureNav.find((n) => n.feature === 'DUTY_ROSTER') ?? featureNav.find((n) => n.feature === 'COMPLIMENT_CARD') ?? (gameItem ? nav[2] : featureNav[0]) ?? nav[2],
  ].filter((n, i, arr) => n && arr.findIndex((x) => x?.href === n.href) === i);

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-100 bg-white p-5 md:flex">{sidebar}</aside>

      {/* 모바일 상단 */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <button type="button" aria-label="메뉴 열기" onClick={() => setDrawer(true)} className="relative -ml-1 rounded-xl p-1.5 text-xl active:scale-90">
          ☰
          {!!(notices?.unread || turns?.myTurnCount) && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-rose-500" />}
        </button>
        <Logo />
        <span className="ml-auto max-w-[45%] truncate text-sm font-semibold text-slate-600">{group?.name}</span>
      </header>

      {/* 모바일 메뉴 (왼쪽에서 밀려 나옴) */}
      <div className={cn('fixed inset-0 z-50 md:hidden', drawer ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!drawer}>
        <div className={cn('absolute inset-0 bg-slate-900/40 transition-opacity duration-300', drawer ? 'opacity-100' : 'opacity-0')} onClick={() => setDrawer(false)} />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-white p-5 shadow-2xl transition-transform duration-300 ease-out',
            drawer ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button type="button" aria-label="메뉴 닫기" onClick={() => setDrawer(false)} className="absolute right-3 top-3 rounded-full px-2 py-1 text-slate-400">
            ✕
          </button>
          {sidebar}
        </aside>
      </div>

      <div className="min-w-0 flex-1">
        <SystemBanner />
        <main className="p-4 pb-28 md:p-8">{children}</main>
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.slice(0, 4).map((n) => (
          <Link key={n.href} href={n.href} className={cn('relative flex flex-col items-center py-2 text-[11px] transition', isActive(n) ? 'text-brand-600' : 'text-slate-500')}>
            <span className={cn('text-lg transition-transform', isActive(n) && 'scale-110')}>{n.icon}</span>
            <span className="max-w-full truncate px-1">{n.label}</span>
            {!!n.badge && <span className="absolute right-[22%] top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{n.badge}</span>}
          </Link>
        ))}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center py-2 text-[11px] text-slate-500">
          <span className="text-lg">☰</span>
          전체 메뉴
        </button>
      </nav>

      <TermsGate />
    </div>
  );
}

function NavLink({ href, label, icon, active, badge, indent }: { href: string; label: string; icon: string; active: boolean; badge?: number; indent?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-xl py-2 pr-3 text-sm transition',
        indent ? 'pl-8 text-xs' : 'px-3',
        active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-50',
      )}
    >
      <span>{icon}</span>
      <span className="flex-1">{label}</span>
      {!!badge && <Badge tone="rose">{badge}</Badge>}
    </Link>
  );
}
