'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, Badge, Card, Empty, ErrorText } from '@/components/ui';
import { Pager, usePaging } from '@/components/pager';
import { api, errorMessage } from '@/lib/api';
import { useGroupId } from '@/lib/hooks';
import type { EarnedBadge, UserLite } from '@/lib/types';
import { BadgeIcons } from '@/components/badge-icons';

interface TeamDetail {
  team: {
    id: string;
    name: string;
    description: string | null;
    primaryAdminId: string | null;
  };
  members: (UserLite & { teamRole: 'ADMIN' | 'USER'; joinedAt: string; badges?: EarnedBadge[] })[];
  locked: boolean;
}

/** 팀 상세: 구성원 모두 같은 화면. 팀 정보 수정과 역할 관리는 관리자 화면에서 */
export default function TeamDetailPage() {
  const groupId = useGroupId();
  const { teamId } = useParams<{ teamId: string }>();
  const { data, error } = useQuery({
    queryKey: ['group', groupId, 'teams', teamId],
    queryFn: () => api<TeamDetail>(`/groups/${groupId}/teams/${teamId}/members`),
  });

  const team = data?.team;
  const pg = usePaging(data?.members ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/g/${groupId}/teams`} className="text-sm text-slate-500">
        ← 팀 목록
      </Link>
      <Card>
        <h1 className="text-2xl font-bold">{team?.name}</h1>
        <p className="mt-2 text-sm text-slate-600">{team?.description || '설명 없음'}</p>
        {data?.locked ? (
          <p className="mt-3 text-sm text-slate-500">팀 가입이 승인되면 구성원을 볼 수 있어요.</p>
        ) : (
          <p className="mt-3 text-xs text-slate-400">멤버 {data?.members.length ?? 0}명</p>
        )}
        <ErrorText>{error ? errorMessage(error) : undefined}</ErrorText>
      </Card>

      {data?.locked ? null : data?.members.length === 0 ? (
        <Empty>구성원이 없습니다.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {pg.items.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={m.name} url={m.avatarUrl} />
              <div className="min-w-40 flex-1">
                <p className="font-medium">
                  {m.name} <BadgeIcons badges={m.badges} />
                </p>
                <p className="text-xs text-slate-400">{m.email}</p>
              </div>
              {team?.primaryAdminId === m.id ? (
                <Badge tone="brand">대표 팀 ADMIN</Badge>
              ) : (
                m.teamRole === 'ADMIN' && <Badge tone="amber">팀 ADMIN</Badge>
              )}
            </div>
          ))}
          <div className="px-5 py-3">
            <Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} />
          </div>
        </Card>
      )}
    </div>
  );
}
