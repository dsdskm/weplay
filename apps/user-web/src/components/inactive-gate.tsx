'use client';

import { useMe, logout } from '@/lib/hooks';
import { Button, Card, Logo } from './ui';

/** 정지/비활성 계정은 로그인 후 아무 화면도 보지 못하고 안내만 본다 */
export function InactiveGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  if (me?.status && me.status !== 'ACTIVE') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm space-y-4 text-center">
          <Logo />
          <p className="text-4xl">🔒</p>
          <h1 className="text-lg font-bold">이용할 수 없는 계정입니다</h1>
          <p className="text-sm text-slate-500">계정이 정지되었거나 비활성화되어 있습니다. 관리자에게 문의하세요.</p>
          <Button variant="secondary" className="w-full" onClick={logout}>
            로그아웃
          </Button>
        </Card>
      </main>
    );
  }
  return <>{children}</>;
}
