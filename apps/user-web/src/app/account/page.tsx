'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, ErrorText, Input } from '@/components/ui';
import { api, errorMessage, tokenStore } from '@/lib/api';

interface Me {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  hasPassword: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') });
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setError(undefined);
    setMessage(undefined);
    try {
      await fn();
      setMessage(done);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };

  const logout = () => {
    tokenStore.clear();
    qc.clear();
    router.replace('/login');
  };

  if (!me) return <p className="p-8 text-slate-400">불러오는 중…</p>;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <Link href="/" className="text-sm text-slate-500">
        ← 돌아가기
      </Link>

      <Card className="space-y-3">
        <h2 className="font-bold">프로필</h2>
        <p className="text-sm text-slate-500">{me.email ?? me.username ?? '-'}</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => run(() => api('/me', { method: 'PATCH', body: { name } }), '이름을 저장했습니다')}>저장</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">{me.hasPassword ? '비밀번호 변경' : '비밀번호 설정'}</h2>
        {!me.hasPassword && <p className="text-xs text-slate-500">Google로 가입한 계정입니다. 비밀번호를 설정하면 아이디로도 로그인할 수 있습니다.</p>}
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pw.newPassword !== pw.confirm) return setError('새 비밀번호가 일치하지 않습니다');
            run(
              () => api('/auth/change-password', { body: { currentPassword: pw.currentPassword || undefined, newPassword: pw.newPassword } }),
              '비밀번호를 변경했습니다',
            ).then((ok) => {
              if (!ok) return;
              setPw({ currentPassword: '', newPassword: '', confirm: '' });
              qc.invalidateQueries({ queryKey: ['me'] });
            });
          }}
        >
          {me.hasPassword && (
            <Input type="password" placeholder="현재 비밀번호" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          )}
          <Input type="password" placeholder="새 비밀번호 (8자 이상)" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
          <Input type="password" placeholder="새 비밀번호 확인" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
          <Button type="submit">{me.hasPassword ? '변경' : '설정'}</Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">계정</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={logout}>
            로그아웃
          </Button>
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">계정을 비활성화하면 로그인할 수 없습니다. 관리자가 다시 활성화할 수 있습니다.</p>
          {me.hasPassword && (
            <Input type="password" placeholder="비밀번호 확인" value={deactivatePassword} onChange={(e) => setDeactivatePassword(e.target.value)} />
          )}
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm('계정을 비활성화할까요?')) return;
              const ok = await run(() => api('/auth/deactivate', { body: { password: deactivatePassword || undefined } }), '계정을 비활성화했습니다');
              if (!ok) return;
              tokenStore.clear();
              qc.clear();
              router.replace('/login');
            }}
          >
            계정 비활성화
          </Button>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </main>
  );
}
