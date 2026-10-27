'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, Badge, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useCompanyId } from '@/lib/hooks';
import type { UserLite } from '@/lib/types';

interface GroupDetail {
  group: { id: string; name: string; description: string | null };
  members: (UserLite & { groupRole: 'ADMIN' | 'MEMBER'; joinedAt: string })[];
}

export default function GroupDetailPage() {
  const companyId = useCompanyId();
  const { groupId } = useParams<{ groupId: string }>();
  const { data } = useQuery({
    queryKey: ['company', companyId, 'groups', groupId],
    queryFn: () => api<GroupDetail>(`/companies/${companyId}/groups/${groupId}/members`),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/c/${companyId}/groups`} className="text-sm text-slate-500">
        ← 그룹 목록
      </Link>
      <Card>
        <h1 className="text-2xl font-bold">{data?.group.name}</h1>
        <p className="mt-2 text-sm text-slate-600">{data?.group.description || '설명 없음'}</p>
        <p className="mt-3 text-xs text-slate-400">멤버 {data?.members.length ?? 0}명</p>
      </Card>
      <Card className="divide-y divide-slate-100 p-0">
        {data?.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={m.name} url={m.avatarUrl} />
            <div className="flex-1">
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-slate-400">{m.email}</p>
            </div>
            {m.groupRole === 'ADMIN' && <Badge tone="brand">담당 ADMIN</Badge>}
          </div>
        ))}
      </Card>
    </div>
  );
}
