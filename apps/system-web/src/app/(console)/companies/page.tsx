'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, Empty, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { CompanyRow } from '@/lib/types';

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>();
  const { data } = useQuery({ queryKey: ['companies'], queryFn: () => api<CompanyRow[]>('/admin/companies') });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/companies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: () => api('/admin/companies', { body: { name, description: description || undefined } }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setError(undefined);
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">고객사 · 코드 관리</h1>
      <Card>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Input className="max-w-xs" placeholder="고객사 이름 (예: LG전자)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input className="flex-1" placeholder="소개 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" disabled={create.isPending}>
            고객사 생성
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
      {data?.length === 0 ? (
        <Empty>고객사가 없습니다. 먼저 생성하세요.</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">고객사</th>
                <th className="px-4 py-3">회사 코드</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3 text-right">구성원</th>
                <th className="px-4 py-3 text-right">그룹</th>
                <th className="px-4 py-3 text-right">대기</th>
                <th className="px-4 py-3">생성일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/companies/${c.id}`} className="text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {c.joinCode} {!c.joinCodeEnabled && <Badge tone="rose">비활성</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.status === 'ACTIVE' ? 'green' : 'rose'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{c.memberCount}</td>
                  <td className="px-4 py-3 text-right">{c.groupCount}</td>
                  <td className="px-4 py-3 text-right">{c.pendingCount > 0 ? <Badge tone="amber">{c.pendingCount}</Badge> : 0}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="space-x-1 whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/companies/${c.id}`} className="inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                      수정
                    </Link>
                    <Button
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => confirm(`${c.name}을(를) 삭제할까요?`) && remove.mutate(c.id)}
                      disabled={remove.isPending}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
