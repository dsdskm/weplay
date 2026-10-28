'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, Badge, Button, Card, Empty, ErrorText } from '@/components/ui';
import { Pager, usePaging } from '@/components/pager';
import { InfoEditForm } from '@/components/info-edit-form';
import { api, errorMessage } from '@/lib/api';
import { useGroup, useGroupId } from '@/lib/hooks';
import type { UserLite } from '@/lib/types';

interface TeamDetail {
  team: {
    id: string;
    name: string;
    description: string | null;
    primaryAdminId: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
    requireApproval: boolean;
    joinCodeEnabled: boolean;
    joinCode?: string;
  };
  members: (UserLite & { teamRole: 'ADMIN' | 'USER'; joinedAt: string })[];
  locked: boolean;
  canManage: boolean;
}

const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';

export default function TeamDetailPage() {
  const groupId = useGroupId();
  const { data: group } = useGroup();
  const { teamId } = useParams<{ teamId: string }>();
  const qc = useQueryClient();
  const key = ['group', groupId, 'teams', teamId];
  const { data, error } = useQuery({
    queryKey: key,
    queryFn: () => api<TeamDetail>(`/groups/${groupId}/teams/${teamId}/members`),
  });

  const run = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) => api(path, { method, body: body ?? {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
    onError: (e) => alert(errorMessage(e)),
  });

  const base = `/groups/${groupId}/teams/${teamId}`;
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

      {data?.canManage && team && (
        <InfoEditForm path={base} queryKey={['group', groupId, 'teams', teamId]} name={team.name} description={team.description} />
      )}

      {data?.canManage && team && (
        <Card className="space-y-3">
          <h2 className="font-bold">팀 설정</h2>
          <div className="flex flex-wrap gap-2">
            <select className={selectCls} value={team.visibility} onChange={(e) => run.mutate({ path: base, method: 'PATCH', body: { visibility: e.target.value } })}>
              <option value="PUBLIC">공개 (팀 목록 노출)</option>
              <option value="PRIVATE">비공개 (코드로만 가입)</option>
            </select>
            <select className={selectCls} value={team.requireApproval ? 'APPROVAL' : 'AUTO'} onChange={(e) => run.mutate({ path: base, method: 'PATCH', body: { requireApproval: e.target.value === 'APPROVAL' } })}>
              <option value="APPROVAL">승인 후 가입</option>
              <option value="AUTO">자동 승인</option>
            </select>
            <Button variant="secondary" onClick={() => run.mutate({ path: base, method: 'PATCH', body: { joinCodeEnabled: !team.joinCodeEnabled } })}>
              {team.joinCodeEnabled ? '코드 사용 중지' : '코드 사용 재개'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">팀 코드</span>
            <span className="font-mono text-lg font-bold tracking-widest">{team.joinCode}</span>
            {!team.joinCodeEnabled && <Badge tone="rose">사용 중지</Badge>}
            <Button
              variant="ghost"
              onClick={() => confirm('코드를 재발급하면 이전 코드는 즉시 무효화되고, 이 팀의 구성원 소속이 모두 초기화됩니다. 그룹 소속은 유지됩니다.') && run.mutate({ path: `${base}/join-code/rotate`, method: 'POST' })}
            >
              재발급
            </Button>
            {group?.me.role === 'ADMIN' && (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirm(`${team?.name} 팀을 삭제할까요? 구성원의 팀 소속이 사라집니다.`)) return;
                  try {
                    await api(base, { method: 'DELETE' });
                    window.location.href = `/g/${groupId}/teams`;
                  } catch (e) {
                    alert(errorMessage(e));
                  }
                }}
              >
                팀 삭제
              </Button>
            )}
          </div>
        </Card>
      )}

      {data?.locked ? null : data?.members.length === 0 ? (
        <Empty>구성원이 없습니다.</Empty>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {pg.items.map((m) => {
            const isPrimary = team?.primaryAdminId === m.id;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar name={m.name} url={m.avatarUrl} />
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
                {isPrimary ? (
                  <Badge tone="brand">대표 팀 ADMIN</Badge>
                ) : data?.canManage ? (
                  <select
                    className={selectCls}
                    value={m.teamRole}
                    onChange={(e) => run.mutate({ path: `/groups/${groupId}/teams/${teamId}/members/${m.id}/role`, method: 'PATCH', body: { role: e.target.value } })}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">팀 ADMIN</option>
                  </select>
                ) : (
                  m.teamRole === 'ADMIN' && <Badge tone="amber">팀 ADMIN</Badge>
                )}
              </div>
            );
          })}
            <div className="col-span-full"><Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} /></div>
        </Card>
      )}
    </div>
  );
}
