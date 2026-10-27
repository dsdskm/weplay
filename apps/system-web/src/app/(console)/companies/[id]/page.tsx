'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequestList } from '@/components/request-list';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { CompanyDetail } from '@/lib/types';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const { data: c } = useQuery({ queryKey: ['company', id], queryFn: () => api<CompanyDetail>(`/admin/companies/${id}`) });

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
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPublic, setGroupPublic] = useState(true);
  const [groupApproval, setGroupApproval] = useState(true);

  if (!c) return <p className="text-slate-400">불러오는 중…</p>;
  const approvedMembers = c.members.filter((m) => m.status === 'APPROVED');

  return (
    <div className="space-y-6">
      <Link href="/companies" className="text-sm text-slate-500">
        ← 고객사 목록
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <Badge tone={c.status === 'ACTIVE' ? 'green' : 'rose'}>{c.status}</Badge>
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
            placeholder="회사 소개"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run.mutate({ path: `/admin/companies/${id}`, method: 'PATCH', body: { name, description: description || null } })}>
              저장
            </Button>
            <Button
              variant="secondary"
              onClick={() => run.mutate({ path: `/admin/companies/${id}`, method: 'PATCH', body: { status: c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}
            >
              {c.status === 'ACTIVE' ? '정지' : '활성화'}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm(`${c.name}을(를) 삭제할까요?`)) return;
                await run.mutateAsync({ path: `/admin/companies/${id}`, method: 'DELETE' });
                router.replace('/companies');
              }}
            >
              삭제
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">회사 코드</h2>
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
              onClick={() => confirm('코드를 재발급하면 이전 코드는 즉시 무효화됩니다.') && run.mutate({ path: `/admin/companies/${id}/join-code/rotate` })}
            >
              재발급
            </Button>
            <Button variant="secondary" onClick={() => run.mutate({ path: `/admin/companies/${id}`, method: 'PATCH', body: { joinCodeEnabled: !c.joinCodeEnabled } })}>
              {c.joinCodeEnabled ? '비활성화' : '활성화'}
            </Button>
          </div>
          <p className="text-xs text-slate-400">직원에게 이 코드를 공유하면 user-web에서 가입 요청을 보낼 수 있습니다.</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="font-bold">그룹 ({c.groups.length})</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate(
              { path: `/admin/companies/${id}/groups`, body: { name: groupName, description: groupDesc || undefined, visibility: groupPublic ? 'PUBLIC' : 'PRIVATE', requireApproval: groupApproval } },
              {
                onSuccess: () => {
                  setGroupName('');
                  setGroupDesc('');
                },
              },
            );
          }}
        >
          <Input className="max-w-xs" placeholder="그룹 이름 (예: 로봇제어팀)" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
          <Input className="flex-1" placeholder="설명 (선택)" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={groupPublic ? 'PUBLIC' : 'PRIVATE'} onChange={(e) => setGroupPublic(e.target.value === 'PUBLIC')}>
            <option value="PUBLIC">공개 (회사 코드 후 목록 노출)</option>
            <option value="PRIVATE">비공개 (그룹 코드로만 가입)</option>
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={groupApproval ? 'APPROVAL' : 'AUTO'} onChange={(e) => setGroupApproval(e.target.value === 'APPROVAL')}>
            <option value="APPROVAL">승인 후 가입</option>
            <option value="AUTO">자동 승인</option>
          </select>
          <Button type="submit">그룹 생성</Button>
        </form>
        {c.groups.length === 0 ? (
          <Empty>그룹이 없습니다.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">그룹</th>
                  <th className="px-3 py-2">그룹 코드</th>
                  <th className="px-3 py-2 text-right">멤버</th>
                  <th className="px-3 py-2">담당 ADMIN</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {c.groups.map((g) => (
                  <tr key={g.id}>
                    <td className="px-3 py-2">
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-slate-400">{g.description}</p>
                      <div className="mt-1 flex gap-1">
                        <Badge tone={g.visibility === 'PUBLIC' ? 'brand' : 'slate'}>{g.visibility === 'PUBLIC' ? '공개' : '비공개'}</Badge>
                        <Badge tone={g.requireApproval ? 'amber' : 'green'}>{g.requireApproval ? '승인 후 가입' : '자동 승인'}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {g.joinCode} {!g.joinCodeEnabled && <Badge tone="rose">비활성</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right">{g.memberCount}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        value={g.admin?.id ?? ''}
                        onChange={(e) => e.target.value && run.mutate({ path: `/admin/groups/${g.id}/admin`, method: 'PUT', body: { userId: e.target.value } })}
                      >
                        <option value="">— 미지정 —</option>
                        {approvedMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="space-x-1 whitespace-nowrap px-3 py-2 text-right">
                      <Button variant="ghost" onClick={() => navigator.clipboard.writeText(g.joinCode)}>
                        복사
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => confirm('그룹 코드를 재발급할까요?') && run.mutate({ path: `/admin/groups/${g.id}/join-code/rotate` })}
                      >
                        재발급
                      </Button>
                      <Button variant="ghost" onClick={() => run.mutate({ path: `/admin/groups/${g.id}`, method: 'PATCH', body: { joinCodeEnabled: !g.joinCodeEnabled } })}>
                        {g.joinCodeEnabled ? '코드 끄기' : '코드 켜기'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => run.mutate({ path: `/admin/groups/${g.id}`, method: 'PATCH', body: { visibility: g.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' } })}
                      >
                        {g.visibility === 'PUBLIC' ? '비공개로' : '공개로'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => run.mutate({ path: `/admin/groups/${g.id}`, method: 'PATCH', body: { requireApproval: !g.requireApproval } })}
                      >
                        {g.requireApproval ? '자동 승인으로' : '승인제로'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-rose-600"
                        onClick={() => confirm(`${g.name} 그룹을 삭제할까요?`) && run.mutate({ path: `/admin/groups/${g.id}`, method: 'DELETE' })}
                      >
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">구성원 ({approvedMembers.length})</h2>
        {c.members.length === 0 ? (
          <Empty>구성원이 없습니다. 회사 코드로 가입 요청을 받고 승인하세요.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">이메일</th>
                <th className="px-3 py-2">역할</th>
                <th className="px-3 py-2">가입일</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {c.members.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 font-semibold">{m.name}</td>
                  <td className="px-3 py-2 text-slate-500">{m.email}</td>
                  <td className="space-x-1 px-3 py-2">
                    {m.isPrimaryAdmin ? <Badge tone="brand">대표 ADMIN</Badge> : <Badge tone={m.role === 'ADMIN' ? 'amber' : 'slate'}>{m.role}</Badge>}
                    {m.status === 'BLOCKED' && <Badge tone="rose">차단</Badge>}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{new Date(m.joinedAt).toLocaleDateString('ko-KR')}</td>
                  <td className="space-x-1 whitespace-nowrap px-3 py-2 text-right">
                    {m.status === 'APPROVED' && !m.isPrimaryAdmin && (
                      <>
                        <Button variant="ghost" onClick={() => run.mutate({ path: `/admin/companies/${id}/primary-admin`, method: 'PUT', body: { userId: m.id } })}>
                          대표 ADMIN 지정
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            run.mutate({ path: `/admin/companies/${id}/members/${m.id}/role`, method: 'PATCH', body: { role: m.role === 'ADMIN' ? 'USER' : 'ADMIN' } })
                          }
                        >
                          {m.role === 'ADMIN' ? 'USER로 변경' : 'ADMIN으로 변경'}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="font-bold">대기 중 가입 요청</h2>
        <RequestList companyId={id} />
      </section>
    </div>
  );
}
