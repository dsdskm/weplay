'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, Badge, Button, cn, Logo } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { LAST_COMPANY_KEY, logout, useCompany, useMe, useMyCompanies, useRequireAuth } from '@/lib/hooks';

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const { companyId } = useParams<{ companyId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const { data: companies } = useMyCompanies();
  const { data: company, error } = useCompany();

  useEffect(() => {
    if (company) localStorage.setItem(LAST_COMPANY_KEY, company.id);
  }, [company]);
  useEffect(() => {
    if (error instanceof ApiError && error.status === 403) router.replace('/');
  }, [error, router]);

  const base = `/c/${companyId}`;
  const nav = [
    { href: base, label: '홈', icon: '🏠' },
    { href: `${base}/groups`, label: '그룹', icon: '👥' },
    { href: `${base}/members`, label: '구성원', icon: '🧑‍🤝‍🧑' },
    { href: `${base}/join`, label: '그룹 가입', icon: '➕' },
  ];
  const adminNav = company?.me.role === 'ADMIN' ? [{ href: `${base}/admin/requests`, label: '가입 요청', icon: '📨', badge: company.pendingCount }] : [];
  const approved = companies?.filter((c) => c.joinStatus === 'APPROVED') ?? [];

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-slate-100 bg-white p-5 md:flex">
        <Link href="/">
          <Logo />
        </Link>
        {approved.length > 1 ? (
          <select
            className="rounded-xl border border-slate-200 px-2 py-2 text-sm"
            value={companyId}
            onChange={(e) => router.push(`/c/${e.target.value}`)}
          >
            {approved.map((c) => (
              <option key={c.company.id} value={c.company.id}>
                {c.company.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="font-semibold text-slate-700">{company?.name}</p>
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
        <span className="text-sm font-semibold">{company?.name}</span>
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
