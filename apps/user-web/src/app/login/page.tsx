'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { GoogleButton } from '@/components/google-button';
import { Card, ErrorText, Logo } from '@/components/ui';
import { api, errorMessage, tokenStore } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const finish = useCallback(
    async (path: string, body: unknown) => {
      setBusy(true);
      setError(undefined);
      try {
        const res = await api<{ accessToken: string }>(path, { body });
        tokenStore.set(res.accessToken);
        router.replace('/');
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const onGoogle = useCallback((credential: string) => finish('/auth/google', { credential }), [finish]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4">
      <Card className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <Logo />
          <p className="text-sm text-slate-500">회사 생활을 게임처럼 🎮</p>
        </div>

        <div className="space-y-2">
          <GoogleButton onCredential={onGoogle} />
          <p className="text-center text-xs text-slate-400">처음이면 Google 계정으로 자동 가입됩니다</p>
        </div>

        <ErrorText>{error}</ErrorText>
      </Card>
    </main>
  );
}
