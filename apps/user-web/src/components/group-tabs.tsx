'use client';

import Link from 'next/link';
import { cn } from '@/components/ui';

/** 팀·구성원 공통 탭 (같은 메뉴 안에서 전환) */
export function GroupTabs({ groupId, active }: { groupId: string; active: 'teams' | 'members' }) {
  const tabs = [
    { key: 'teams', label: '팀', href: `/g/${groupId}/teams` },
    { key: 'members', label: '구성원', href: `/g/${groupId}/members` },
  ] as const;
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn('rounded-full px-4 py-1.5 text-sm', active === t.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
