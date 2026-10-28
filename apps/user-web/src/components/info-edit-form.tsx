'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

/** 그룹/팀 이름과 소개 수정 카드 (관리자 전용으로 호출하는 쪽에서 감싼다) */
export function InfoEditForm({
  path,
  queryKey,
  name,
  description,
}: {
  path: string;
  queryKey: unknown[];
  name: string;
  description: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name, description: description ?? '' });
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () => api(path, { method: 'PATCH', body: { name: form.name.trim(), description: form.description.trim() || null } }),
    onSuccess: () => {
      setError(undefined);
      setSaved(true);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Card className="space-y-3">
      <h2 className="font-bold">정보 수정</h2>
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <textarea
        className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        placeholder="소개"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="flex items-center gap-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
          저장
        </Button>
        {saved && <span className="text-sm text-emerald-600">저장했습니다</span>}
      </div>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
