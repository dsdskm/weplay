'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from './ui';
import { LAST_GROUP_KEY, useRequireAuth } from '@/lib/hooks';

/** 그룹 밖 화면(시스템 문의·약관·시스템 공지)용 간단한 상단 바 */
export function SimpleShell({ children, requireAuth = true }: { children: ReactNode; requireAuth?: boolean }) {
  return requireAuth ? <Authed>{children}</Authed> : <Shell>{children}</Shell>;
}

function Authed({ children }: { children: ReactNode }) {
  useRequireAuth();
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => setLast(localStorage.getItem(LAST_GROUP_KEY)), []);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href={last ? `/g/${last}` : '/'}>
          <Logo />
        </Link>
        <nav className="ml-auto flex gap-1 text-sm">
          <Link href="/support" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            문의
          </Link>
          <Link href="/terms" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            약관
          </Link>
          {last && (
            <Link href={`/g/${last}`} className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white">
              내 그룹
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-4 pb-16 md:p-8">{children}</main>
    </div>
  );
}
