'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function SettingsPage() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [msg, setMsg] = useState<string>();
  const [error, setError] = useState<string>();
  const change = useMutation({
    mutationFn: () => api('/auth/change-password', { body: { currentPassword, newPassword } }),
    onSuccess: () => {
      setMsg('비밀번호가 변경되었습니다.');
      setError(undefined);
      setCurrent('');
      setNew('');
    },
    onError: (e) => {
      setMsg(undefined);
      setError(errorMessage(e));
    },
  });
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">내 설정</h1>
      <Card className="space-y-3">
        <h2 className="font-bold">비밀번호 변경</h2>
        <p className="text-xs text-amber-700">초기 비밀번호(1234)를 사용 중이라면 반드시 변경하세요.</p>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate();
          }}
        >
          <Input type="password" placeholder="현재 비밀번호" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
          <Input type="password" placeholder="새 비밀번호 (4자 이상)" value={newPassword} onChange={(e) => setNew(e.target.value)} minLength={4} required />
          <Button type="submit" disabled={change.isPending}>
            변경
          </Button>
        </form>
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        <ErrorText>{error}</ErrorText>
      </Card>
    </div>
  );
}
