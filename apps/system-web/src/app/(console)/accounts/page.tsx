'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, Card, cn, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { AdminUser } from '@/lib/types';

export default function AccountsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'' | 'USER' | 'MASTER'>('');
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({ username: '', name: '', password: '' });
  const params = new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}) });
  const { data } = useQuery({ queryKey: ['users', q, role], queryFn: () => api<AdminUser[]>(`/admin/users?${params}`) });

  const run = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method?: string; body?: unknown }) => api(path, { method, body: body ?? {} }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">계정 관리</h1>

      <Card className="space-y-3">
        <h2 className="font-bold">MASTER 계정 추가</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate({ path: '/admin/masters', body: form }, { onSuccess: () => setForm({ username: '', name: '', password: '' }) });
          }}
        >
          <Input className="max-w-40" placeholder="아이디" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <Input className="max-w-40" placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input
            className="max-w-40"
            type="password"
            placeholder="초기 비밀번호"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Button type="submit">추가</Button>
        </form>
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="이름 / 이메일 / 아이디 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        {(['', 'USER', 'MASTER'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn('rounded-full px-4 py-1.5 text-sm', role === r ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {r || '전체'}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">이메일 / 아이디</th>
              <th className="px-4 py-3">구분</th>
              <th className="px-4 py-3">소속</th>
              <th className="px-4 py-3">최근 로그인</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email ?? u.username}</td>
                <td className="px-4 py-3">
                  {u.platformRole === 'MASTER' ? <Badge tone="brand">MASTER</Badge> : <Badge>{u.googleSub ? 'Google' : 'USER'}</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {u.memberships.map((m) => `${m.company.name}${m.role === 'ADMIN' ? '(ADMIN)' : ''}`).join(', ') || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
                <td className="px-4 py-3">
                  <Badge tone={u.status === 'ACTIVE' ? 'green' : 'rose'}>{u.status}</Badge>
                </td>
                <td className="space-x-1 whitespace-nowrap px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    onClick={() => run.mutate({ path: `/admin/users/${u.id}/status`, method: 'PATCH', body: { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}
                  >
                    {u.status === 'ACTIVE' ? '정지' : '해제'}
                  </Button>
                  {u.platformRole === 'MASTER' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const password = prompt('새 비밀번호 (4자 이상)');
                        if (password) run.mutate({ path: `/admin/users/${u.id}/reset-password`, body: { password } });
                      }}
                    >
                      비번 재설정
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
