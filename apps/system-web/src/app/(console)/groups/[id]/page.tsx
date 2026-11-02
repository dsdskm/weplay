'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequestList } from '@/components/request-list';
import { TeamEditDialog } from '@/components/team-edit-dialog';
import { MemberDialog } from '@/components/member-dialog';
import { SortTh, sortRows, useSort } from '@/components/sort';
import { Pager } from '@/components/pager';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { GroupDetail, GroupMember, Paged, TeamRow } from '@/lib/types';
import { useDialog } from '@/components/confirm-dialog';

export default function GroupDetailPage() {
  const { confirm } = useDialog();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const [editingTeam, setEditingTeam] = useState<TeamRow>();
  const { data: c } = useQuery({ queryKey: ['group', id], queryFn: () => api<GroupDetail>(`/admin/groups/${id}`) });

  const run = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method?: string; body?: unknown }) => api(path, { method, body: body ?? {} }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (c) {
      setName(c.name);
      setDescription(c.description ?? '');
    }
  }, [c]);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamPublic, setTeamPublic] = useState(true);
  const [teamApproval, setTeamApproval] = useState(true);

  const [teamFilter, setTeamFilter] = useState('');
  const [memberQ, setMemberQ] = useState('');
  const [editingMember, setEditingMember] = useState<GroupMember>();
  const teamSort = useSort();
  const memberSort = useSort();
  const [teamPage, setTeamPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const teamsQ = useQuery({
    queryKey: ['group', id, 'teams-page', teamPage],
    queryFn: () => api<Paged<TeamRow>>(`/admin/groups/${id}/teams?${new URLSearchParams({ page: String(teamPage), pageSize: '10' })}`),
  });
  const membersQ = useQuery({
    queryKey: ['group', id, 'members-page', teamFilter, memberQ, memberPage],
    queryFn: () =>
      api<Paged<GroupMember>>(
        `/admin/groups/${id}/members?${new URLSearchParams({ page: String(memberPage), pageSize: '10', ...(teamFilter ? { teamId: teamFilter } : {}), ...(memberQ ? { q: memberQ } : {}) })}`,
      ),
  });
  const adminsQ = useQuery({
    queryKey: ['group', id, 'admins'],
    queryFn: () => api<Paged<GroupMember>>(`/admin/groups/${id}/members?${new URLSearchParams({ role: 'ADMIN', pageSize: '100' })}`),
  });
  const teamRows = sortRows(teamsQ.data?.items ?? [], teamSort.sort, {
    name: (t) => t.name,
    joinCode: (t) => t.joinCode,
    memberCount: (t) => t.memberCount,
    admins: (t) => t.admins.map((a) => a.name).join(', '),
  });
  const memberRows = sortRows(membersQ.data?.items ?? [], memberSort.sort, {
    name: (m) => m.name,
    email: (m) => m.email,
    role: (m) => (m.isPrimaryAdmin ? '대표 ADMIN' : m.role),
    joinedAt: (m) => m.joinedAt,
  });
  const teamPg = {
    items: teamRows,
    page: teamPage,
    pages: Math.max(1, Math.ceil((teamsQ.data?.total ?? 0) / 10)),
    setPage: setTeamPage,
    total: teamsQ.data?.total ?? 0,
  };
  const memberPg = {
    items: memberRows,
    page: memberPage,
    pages: Math.max(1, Math.ceil((membersQ.data?.total ?? 0) / 10)),
    setPage: setMemberPage,
    total: membersQ.data?.total ?? 0,
  };
  if (!c) return <p className="text-slate-400">불러오는 중…</p>;
  const groupAdmins = (adminsQ.data?.items ?? []).filter((m) => m.status === 'APPROVED');
  const editing = editingTeam && c.teams.find((t) => t.id === editingTeam.id);

  return (
    <div className="space-y-6">
      <Link href="/groups" className="text-sm text-slate-500">
        ← 그룹 목록
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <Badge tone={c.status === 'ACTIVE' ? 'green' : 'rose'}>{c.status}</Badge>
        {!c.primaryAdminId && <Badge tone="amber">대표 GROUP_ADMIN 미지정</Badge>}
      </div>
      <ErrorText>{error}</ErrorText>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-bold">기본 정보</h2>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="그룹 소개"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run.mutate({ path: `/admin/groups/${id}`, method: 'PATCH', body: { name, description: description || null } })}>
              저장
            </Button>
            <Button
              variant="secondary"
              onClick={() => run.mutate({ path: `/admin/groups/${id}`, method: 'PATCH', body: { status: c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}
            >
              {c.status === 'ACTIVE' ? '정지' : '활성화'}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!(await confirm({ message: `${c.name}을(를) 삭제할까요? 되돌릴 수 없습니다.`, danger: true }))) return;
                await run.mutateAsync({ path: `/admin/groups/${id}`, method: 'DELETE' });
                router.replace('/groups');
              }}
            >
              삭제
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">그룹 코드</h2>
          <div className="flex items-center gap-3">
            <p className="font-mono text-3xl font-black tracking-widest">{c.joinCode}</p>
            {!c.joinCodeEnabled && <Badge tone="rose">비활성</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(c.joinCode)}>
              복사
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (await confirm({ message: '코드를 재발급하면 이전 코드는 즉시 무효화되고, 이 그룹의 모든 계정의 그룹·팀 소속이 초기화됩니다.', danger: true }))
                  run.mutate({ path: `/admin/groups/${id}/join-code/rotate` });
              }}
            >
              재발급
            </Button>
            <Button variant="secondary" onClick={() => run.mutate({ path: `/admin/groups/${id}`, method: 'PATCH', body: { joinCodeEnabled: !c.joinCodeEnabled } })}>
              {c.joinCodeEnabled ? '비활성화' : '활성화'}
            </Button>
          </div>
          <p className="text-xs text-slate-400">직원에게 이 코드를 공유하면 user-web에서 가입 요청을 보낼 수 있습니다.</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-bold">그룹 ADMIN ({groupAdmins.length})</h2>
          {groupAdmins.length === 0 ? (
            <Empty>지정된 그룹 ADMIN이 없습니다.</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">이메일</th>
                  <th className="px-3 py-2">역할</th>
                  <th className="px-3 py-2">소속 팀</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupAdmins.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-semibold">{m.name}</td>
                    <td className="px-3 py-2 text-slate-500">{m.email}</td>
                    <td className="px-3 py-2">{m.isPrimaryAdmin ? <Badge tone="brand">대표 ADMIN</Badge> : <Badge tone="amber">ADMIN</Badge>}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{m.teams.map((t) => t.name).join(', ') || '없음'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" onClick={() => setEditingMember(m)}>
                        수정
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="font-bold">팀 ({c.teams.length})</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate(
              { path: `/admin/groups/${id}/teams`, body: { name: teamName, description: teamDesc || undefined, visibility: teamPublic ? 'PUBLIC' : 'PRIVATE', requireApproval: teamApproval } },
              {
                onSuccess: () => {
                  setTeamName('');
                  setTeamDesc('');
                },
              },
            );
          }}
        >
          <Input className="max-w-xs" placeholder="팀 이름 (예: 로봇제어팀)" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          <Input className="flex-1" placeholder="설명 (선택)" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={teamPublic ? 'PUBLIC' : 'PRIVATE'} onChange={(e) => setTeamPublic(e.target.value === 'PUBLIC')}>
            <option value="PUBLIC">공개 (그룹 코드 후 목록 노출)</option>
            <option value="PRIVATE">비공개 (팀 코드로만 가입)</option>
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={teamApproval ? 'APPROVAL' : 'AUTO'} onChange={(e) => setTeamApproval(e.target.value === 'APPROVAL')}>
            <option value="APPROVAL">승인 후 가입</option>
            <option value="AUTO">자동 승인</option>
          </select>
          <Button type="submit">팀 생성</Button>
        </form>
        {c.teams.length === 0 ? (
          <Empty>팀이 없습니다.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <SortTh k="name" sort={teamSort.sort} onSort={teamSort.toggle}>팀</SortTh>
                  <SortTh k="joinCode" sort={teamSort.sort} onSort={teamSort.toggle}>팀 코드</SortTh>
                  <SortTh k="memberCount" sort={teamSort.sort} onSort={teamSort.toggle} className="text-right">멤버</SortTh>
                  <SortTh k="admins" sort={teamSort.sort} onSort={teamSort.toggle}>팀 ADMIN</SortTh>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamPg.items.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.description}</p>
                      <div className="mt-1 flex gap-1">
                        <Badge tone={t.visibility === 'PUBLIC' ? 'brand' : 'slate'}>{t.visibility === 'PUBLIC' ? '공개' : '비공개'}</Badge>
                        <Badge tone={t.requireApproval ? 'amber' : 'green'}>{t.requireApproval ? '승인 후 가입' : '자동 승인'}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono">{t.joinCode}</td>
                    <td className="px-3 py-2 text-right">{t.memberCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {t.admins.length === 0 && <span className="text-slate-400">미지정</span>}
                        {t.admins.length > 0 && !t.primaryAdminId && <Badge tone="amber">대표 미지정</Badge>}
                        {t.admins.map((a) => (
                          <Badge key={a.id} tone={a.id === t.primaryAdminId ? 'brand' : 'amber'}>
                            {a.name}
                            {a.id === t.primaryAdminId && ' (대표)'}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" onClick={() => setEditingTeam(t)}>
                        수정
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3"><Pager page={teamPg.page} pages={teamPg.pages} setPage={teamPg.setPage} total={teamPg.total} /></div>
          </div>
        )}
      </Card>

      {editing && <TeamEditDialog team={editing} onClose={() => setEditingTeam(undefined)} />}

      <Card className="space-y-4">
        <h2 className="font-bold">구성원 ({c.memberCount})</h2>
        <Input
          className="max-w-xs"
          placeholder="이름 또는 이메일 검색"
          value={memberQ}
          onChange={(e) => {
            setMemberQ(e.target.value);
            setMemberPage(1);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Chip active={!teamFilter} onClick={() => {
              setTeamFilter('');
              setMemberPage(1);
            }}>
            전체 ({c.memberCount})
          </Chip>
          {c.teams.map((t) => (
            <Chip key={t.id} active={teamFilter === t.id} onClick={() => {
                setTeamFilter(t.id);
                setMemberPage(1);
              }}>
              {t.name} ({t.memberCount})
            </Chip>
          ))}
        </div>
        {memberRows.length === 0 ? (
          <Empty>
            {memberQ
              ? '검색 결과가 없습니다.'
              : teamFilter
                ? '이 팀에 소속된 구성원이 없습니다.'
                : '구성원이 없습니다. 그룹 코드로 가입 요청을 받고 승인하세요.'}
          </Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <SortTh k="name" sort={memberSort.sort} onSort={memberSort.toggle}>이름</SortTh>
                <SortTh k="email" sort={memberSort.sort} onSort={memberSort.toggle}>이메일</SortTh>
                <SortTh k="role" sort={memberSort.sort} onSort={memberSort.toggle}>{teamFilter ? '팀 역할' : '역할'}</SortTh>
                <SortTh k="joinedAt" sort={memberSort.sort} onSort={memberSort.toggle}>가입일</SortTh>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberPg.items.map((m) => {
                const teamRole = teamFilter ? m.teams.find((t) => t.id === teamFilter)?.role : undefined;
                const isTeamPrimary = teamFilter ? c.teams.find((t) => t.id === teamFilter)?.primaryAdminId === m.id : false;
                return (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-semibold">{m.name}</td>
                    <td className="px-3 py-2 text-slate-500">{m.email}</td>
                    <td className="space-x-1 px-3 py-2">
                      {teamFilter ? (
                        isTeamPrimary ? <Badge tone="brand">대표 팀 ADMIN</Badge> : <Badge tone={teamRole === 'ADMIN' ? 'amber' : 'slate'}>{teamRole === 'ADMIN' ? '팀 ADMIN' : 'USER'}</Badge>
                      ) : (
                        <>
                          {m.isPrimaryAdmin ? <Badge tone="brand">대표 ADMIN</Badge> : <Badge tone={m.role === 'ADMIN' ? 'amber' : 'slate'}>{m.role}</Badge>}
                          {m.status === 'BLOCKED' && <Badge tone="rose">차단</Badge>}
                          {m.teams.length > 0 && <span className="text-xs text-slate-400">{m.teams.map((t) => t.name).join(', ')}</span>}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{new Date(m.joinedAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" onClick={() => setEditingMember(m)}>
                        수정
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pager page={memberPg.page} pages={memberPg.pages} setPage={memberPg.setPage} total={memberPg.total} />
      </Card>

      {editingMember && (
        <MemberDialog
          member={memberRows.find((m) => m.id === editingMember.id) ?? editingMember}
          groupId={id}
          teams={c.teams}
          onClose={() => setEditingMember(undefined)}
        />
      )}

      <section className="space-y-3">
        <h2 className="font-bold">대기 중 가입 요청</h2>
        <RequestList groupId={id} />
      </section>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={active ? 'rounded-full bg-brand-600 px-3 py-1 text-xs text-white' : 'rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200'}
    >
      {children}
    </button>
  );
}
