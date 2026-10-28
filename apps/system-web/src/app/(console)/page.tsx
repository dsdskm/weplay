'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, Card, Empty } from '@/components/ui';
import { api } from '@/lib/api';

interface GroupStat {
  id: string;
  name: string;
  memberCount: number;
  teamCount: number;
  pendingCount: number;
  groupAdminCount: number;
  teamAdminCount: number;
  hasPrimary: boolean;
}

interface Dashboard {
  users: number;
  masters: number;
  groups: number;
  teams: number;
  pendingRequests: number;
  groupStats: GroupStat[];
}

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/admin/dashboard') });
  const stats = [
    { label: '사용자', value: data?.users, href: '/groups' },
    { label: 'MASTER', value: data?.masters, href: '/groups' },
    { label: '그룹', value: data?.groups, href: '/groups' },
    { label: '팀', value: data?.teams, href: '/groups' },
    { label: '대기 중 가입 요청', value: data?.pendingRequests, href: '/groups' },
  ];
  return (
    <div className="space-y-8">
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

      <section className="space-y-4">
        <h2 className="text-lg font-bold">그룹별 현황</h2>
        {data?.groupStats.length === 0 && <Empty>그룹이 없습니다.</Empty>}
        {data?.groupStats.map((g) => (
          <Card key={g.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/groups/${g.id}`} className="text-lg font-bold text-brand-700 hover:underline">
                {g.name}
              </Link>
              {!g.hasPrimary && <Badge tone="amber">대표 GROUP_ADMIN 미지정</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Count label="구성원" value={g.memberCount} />
              <Count label="팀" value={g.teamCount} />
              <Count label="GROUP_ADMIN" value={g.groupAdminCount} />
              <Count label="TEAM_ADMIN" value={g.teamAdminCount} />
              <Count label="대기 요청" value={g.pendingCount} highlight={g.pendingCount > 0} />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Count({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={highlight ? 'text-2xl font-black text-amber-600' : 'text-2xl font-black'}>{value}</p>
    </div>
  );
}
