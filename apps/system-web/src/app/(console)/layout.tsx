'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, cn, Logo } from '@/components/ui';
import { api, tokenStore } from '@/lib/api';

const nav = [
  { href: '/', label: '대시보드' },
  { href: '/groups', label: '그룹 관리' },
  { href: '/settings', label: '내 설정' },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ name: string; username: string; platformRole: string }>('/me'),
  });

  useEffect(() => {
    if (!tokenStore.get() || error || (me && me.platformRole !== 'MASTER')) {
      tokenStore.clear();
      router.replace('/login');
    }
  }, [me, error, router]);

  if (!me) return <div className="flex min-h-screen items-center justify-center text-slate-400">불러오는 중…</div>;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-6 bg-slate-900 p-5 text-slate-200">
        <div>
          <span className="text-white">
            <Logo />
          </span>
          <p className="text-xs text-slate-400">System Console</p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={cn('rounded-lg px-3 py-2 text-sm', active ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5')}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 text-sm">
          <p>
            {me.name} <span className="text-slate-400">({me.username})</span>
          </p>
          <Button
            variant="ghost"
            className="w-full text-slate-300 hover:bg-white/10"
            onClick={() => {
              tokenStore.clear();
              router.replace('/login');
            }}
          >
            로그아웃
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
