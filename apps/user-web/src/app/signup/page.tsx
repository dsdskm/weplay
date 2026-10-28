'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, ErrorText, Input, Logo } from '@/components/ui';
import { api, errorMessage, tokenStore } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', birthDate: '', phone: '', password: '', passwordConfirm: '' });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4">
      <Card className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <Logo />
          <p className="text-sm text-slate-500">회원가입</p>
        </div>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
            setBusy(true);
            setError(undefined);
            try {
              const res = await api<{ accessToken: string }>('/auth/signup', {
                body: {
                  email: form.email,
                  name: form.name,
                  password: form.password,
                  birthDate: form.birthDate || null,
                  phone: form.phone || null,
                },
              });
              tokenStore.set(res.accessToken);
              router.replace('/');
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input type="email" placeholder="아이디 (이메일)" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input type="date" placeholder="생일" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input placeholder="전화번호 (선택)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="password" placeholder="비밀번호 (8자 이상)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input type="password" placeholder="비밀번호 확인" autoComplete="new-password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required />
          <Button type="submit" className="w-full" disabled={busy}>
            가입하기
          </Button>
          <p className="text-center text-xs text-slate-500">
            이미 계정이 있나요?{' '}
            <Link href="/login" className="font-semibold text-brand-600">
              로그인
            </Link>
          </p>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>
    </main>
  );
}
