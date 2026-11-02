'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, Badge, Button, Card, ErrorText } from '@/components/ui';
import { Pager, usePaging } from '@/components/pager';
import { InfoEditForm } from '@/components/info-edit-form';
import { useDialog } from '@/components/confirm-dialog';
import { api, errorMessage } from '@/lib/api';
import { useGroup, useGroupId } from '@/lib/hooks';
import type { EarnedBadge, UserLite } from '@/lib/types';
import { BadgeIcons } from '@/components/badge-icons';

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
  members: (UserLite & { teamRole: 'ADMIN' | 'USER'; joinedAt: string; badges?: EarnedBadge[] })[];
  locked: boolean;
  canManage: boolean;
}

const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';

/** 팀 관리(관리자 전용): 팀 정보, 가입 설정, 역할, 삭제 */
export default function AdminTeamPage() {
  const { confirm, alert } = useDialog();
  const groupId = useGroupId();
  const { data: group } = useGroup();
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ['group', groupId, 'teams', teamId];
  const { data, error } = useQuery({
    queryKey: key,
    queryFn: () => api<TeamDetail>(`/groups/${groupId}/teams/${teamId}/members`),
  });

  const run = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) => api(path, { method, body: body ?? {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
    onError: (e) => void alert(errorMessage(e)),
  });

  const base = `/groups/${groupId}/teams/${teamId}`;
  const team = data?.team;
  const pg = usePaging(data?.members ?? []);

  if (!data) return <p className="text-slate-400">불러오는 중…</p>;
  if (!data.canManage) return <Card>팀을 관리할 권한이 없어요.</Card>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/g/${groupId}/admin/teams`} className="text-sm text-slate-500">
        ← 팀 관리
      </Link>
      <ErrorText>{error ? errorMessage(error) : undefined}</ErrorText>

      {team && <InfoEditForm path={base} queryKey={key} name={team.name} description={team.description} />}

      {team && (
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
              onClick={async () => {
                if (await confirm({ message: '코드를 재발급하면 이전 코드는 즉시 무효화되고, 이 팀의 구성원 소속이 모두 초기화됩니다. 그룹 소속은 유지됩니다.', danger: true }))
                  run.mutate({ path: `${base}/join-code/rotate`, method: 'POST' });
              }}
            >
              재발급
            </Button>
            {group?.me.role === 'ADMIN' && (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!(await confirm({ message: `${team.name} 팀을 삭제할까요? 구성원의 팀 소속이 사라집니다.`, danger: true }))) return;
                  try {
                    await api(base, { method: 'DELETE' });
                    router.replace(`/g/${groupId}/admin/teams`);
                  } catch (e) {
                    await alert(errorMessage(e));
                  }
                }}
              >
                팀 삭제
              </Button>
            )}
          </div>
        </Card>
      )}

      {!data.locked && data.members.length > 0 && (
        <Card className="divide-y divide-slate-100 p-0">
          <div className="px-5 py-3 text-sm font-semibold text-slate-500">구성원 역할</div>
          {pg.items.map((m) => {
            const isPrimary = team?.primaryAdminId === m.id;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar name={m.name} url={m.avatarUrl} />
                <div className="min-w-40 flex-1">
                  <p className="font-medium">
                    {m.name} <BadgeIcons badges={m.badges} />
                  </p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
                {isPrimary ? (
                  <Badge tone="brand">대표 팀 ADMIN</Badge>
                ) : (
                  <select
                    className={selectCls}
                    value={m.teamRole}
                    onChange={(e) => run.mutate({ path: `${base}/members/${m.id}/role`, method: 'PATCH', body: { role: e.target.value } })}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">팀 ADMIN</option>
                  </select>
                )}
              </div>
            );
          })}
          <div className="px-5 py-3">
            <Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} />
          </div>
        </Card>
      )}
    </div>
  );
}
