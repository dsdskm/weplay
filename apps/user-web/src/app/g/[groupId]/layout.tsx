'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, Badge, Button, cn, Logo } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { api } from '@/lib/api';
import { LAST_GROUP_KEY, logout, useGroup, useMe, useMyGroups, useRequireAuth } from '@/lib/hooks';
import type { TeamItem } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const { groupId } = useParams<{ groupId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const { data: groups } = useMyGroups();
  const { data: group, error } = useGroup();
  const { data: teams } = useQuery({
    queryKey: ['group', groupId, 'teams'],
    queryFn: () => api<TeamItem[]>(`/groups/${groupId}/teams`),
    enabled: !!group,
  });

  useEffect(() => {
    if (group) localStorage.setItem(LAST_GROUP_KEY, group.id);
  }, [group]);
  useEffect(() => {
    if (error instanceof ApiError && error.status === 403) router.replace('/');
  }, [error, router]);

  const base = `/g/${groupId}`;
  // 이미 소속 팀이 있으면 "팀 가입" 메뉴는 숨김
  const hasTeam = !!teams?.some((t) => t.isMine);
  const nav = [
    { href: base, label: '홈', icon: '🏠' },
    { href: `${base}/teams`, label: '팀', icon: '👥' },
    { href: `${base}/members`, label: '구성원', icon: '🧑‍🤝‍🧑' },
    ...(hasTeam ? [] : [{ href: `${base}/join`, label: '팀 가입', icon: '➕' }]),
  ];
  // 관리 메뉴: 그룹 ADMIN 또는 담당 팀이 있는 팀 ADMIN
  const isGroupAdmin = group?.me.role === 'ADMIN';
  const managesTeam = !!teams?.some((t) => t.myRole === 'ADMIN');
  const adminNav =
    isGroupAdmin || managesTeam
      ? [
          { href: `${base}/admin/requests`, label: '가입 요청', icon: '📨', badge: isGroupAdmin ? group?.pendingCount : undefined },
          { href: `${base}/admin/teams`, label: '팀 관리', icon: '⚙️' },
        ]
      : [];
  const approved = groups?.filter((c) => c.joinStatus === 'APPROVED') ?? [];

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-slate-100 bg-white p-5 md:flex">
        <Link href="/">
          <Logo />
        </Link>
        {approved.length > 1 ? (
          <select
            className="rounded-xl border border-slate-200 px-2 py-2 text-sm"
            value={groupId}
            onChange={(e) => router.push(`/g/${e.target.value}`)}
          >
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
            <NavLink key={n.href} {...n} active={pathname === n.href} />
          ))}
          {adminNav.length > 0 && <p className="mt-4 px-3 text-xs font-semibold text-slate-400">관리</p>}
          {adminNav.map((n) => (
            <NavLink key={n.href} {...n} active={pathname.startsWith(n.href)} />
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2">
          {me && <Avatar name={me.name} url={me.avatarUrl} size={32} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{me?.name}</p>
            <p className="truncate text-xs text-slate-400">{me?.email}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={logout}>
          로그아웃
        </Button>
      </aside>

      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 md:hidden">
        <Logo />
        <span className="text-sm font-semibold">{group?.name}</span>
      </header>

      <main className="flex-1 p-4 pb-24 md:p-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-slate-100 bg-white md:hidden">
        {[...nav, ...adminNav].slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className={cn('flex flex-col items-center py-2 text-xs', pathname === n.href ? 'text-brand-600' : 'text-slate-500')}>
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NavLink({ href, label, icon, active, badge }: { href: string; label: string; icon: string; active: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', active ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-50')}
    >
      <span>{icon}</span>
      <span className="flex-1">{label}</span>
      {!!badge && <Badge tone="rose">{badge}</Badge>}
    </Link>
  );
}
