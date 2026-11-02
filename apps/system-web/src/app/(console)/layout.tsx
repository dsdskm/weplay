'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, cn, Logo } from '@/components/ui';
import { api, tokenStore } from '@/lib/api';

const nav = [
  { href: '/', label: '대시보드' },
  { href: '/groups', label: '그룹 관리' },
  { href: '/features', label: '기능 관리' },
  { href: '/notices', label: '서비스 공지' },
  { href: '/support', label: '시스템 문의' },
  { href: '/terms', label: '약관 관리' },
  { href: '/storage', label: '스토리지 할당' },
  { href: '/points', label: '포인트 기본값' },
  { href: '/settings', label: '내 설정' },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  const sidebar = (
    <>
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
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn('rounded-lg px-3 py-2 text-sm', active ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5')}
            >
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
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* 데스크톱: 고정 사이드바 */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-slate-900 p-5 text-slate-200 md:flex">{sidebar}</aside>

      {/* 모바일: 상단 바 + 드로어 */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-slate-900 px-4 text-white md:hidden">
        <button type="button" aria-label="메뉴 열기" onClick={() => setOpen(true)} className="rounded-lg px-2 py-1 text-xl hover:bg-white/10">
          ☰
        </button>
        <Logo />
        <span className="text-xs text-slate-400">System Console</span>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-slate-900 p-5 text-slate-200 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-x-auto p-4 pt-20 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}
