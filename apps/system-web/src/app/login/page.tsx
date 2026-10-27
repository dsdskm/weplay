'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, ErrorText, Input, Logo } from '@/components/ui';
import { api, errorMessage, tokenStore } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('master');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-sm space-y-5 p-8">
        <div className="text-center">
          <Logo />
          <p className="mt-1 text-sm font-semibold text-slate-500">System Console</p>
        </div>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            try {
              const res = await api<{ accessToken: string }>('/auth/master/login', { body: { username, password } });
              tokenStore.set(res.accessToken);
              router.replace('/');
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input placeholder="아이디" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <Input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Button type="submit" className="w-full" disabled={busy}>
            로그인
          </Button>
          <ErrorText>{error}</ErrorText>
        </form>
      </Card>
    </main>
  );
}
