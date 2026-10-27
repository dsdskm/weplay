'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<{ users: number; masters: number; companies: number; groups: number; pendingRequests: number }>('/admin/dashboard'),
  });
  const stats = [
    { label: '사용자', value: data?.users, href: '/accounts' },
    { label: 'MASTER', value: data?.masters, href: '/accounts' },
    { label: '고객사', value: data?.companies, href: '/companies' },
    { label: '그룹', value: data?.groups, href: '/companies' },
    { label: '대기 중 가입 요청', value: data?.pendingRequests, href: '/requests' },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition hover:ring-brand-200">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="mt-1 text-3xl font-black">{s.value ?? '-'}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
