'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, ErrorText, Input, Logo } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function PasswordResetPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'confirm' | 'done'>('email');
  const [form, setForm] = useState({ email: '', emailCode: '', password: '', passwordConfirm: '' });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string>();
  const [error, setError] = useState<string>();

  const requestCode = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api('/auth/password-reset/email-code', { body: { email: form.email } });
      setInfo('가입된 이메일이라면 인증번호를 보냈습니다. 10분 안에 입력해 주세요.');
      setStep('confirm');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
    setBusy(true);
    setError(undefined);
    try {
      await api('/auth/password-reset/confirm', { body: { email: form.email, emailCode: form.emailCode, password: form.password } });
      setStep('done');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4">
      <Card className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <Logo />
          <p className="text-sm text-slate-500">비밀번호 찾기</p>
        </div>

        {step === 'done' ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">새 비밀번호로 변경했습니다. 이제 로그인해 주세요.</p>
            <Button className="w-full" onClick={() => router.replace('/login')}>
              로그인하기
            </Button>
          </div>
        ) : step === 'email' ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              requestCode();
            }}
          >
            <Input type="email" placeholder="아이디 (이메일)" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Button type="submit" className="w-full" disabled={busy}>
              인증번호 받기
            </Button>
          </form>
        ) : (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <p className="text-xs text-slate-500">{form.email}으로 보낸 인증번호를 입력하세요.</p>
            <Input
              placeholder="인증번호 6자리"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={form.emailCode}
              onChange={(e) => setForm({ ...form, emailCode: e.target.value.replace(/\D/g, '') })}
              required
            />
            <Input type="password" placeholder="새 비밀번호 (8자 이상)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Input type="password" placeholder="새 비밀번호 확인" autoComplete="new-password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required />
            <Button type="submit" className="w-full" disabled={busy || form.emailCode.length !== 6}>
              비밀번호 변경
            </Button>
            <button type="button" className="w-full text-center text-xs text-slate-500 underline" onClick={requestCode} disabled={busy}>
              인증번호 다시 받기
            </button>
          </form>
        )}

        {info && step === 'confirm' && <p className="text-center text-sm text-emerald-600">{info}</p>}
        <ErrorText>{error}</ErrorText>
        <p className="text-center text-xs text-slate-500">
          <Link href="/login" className="font-semibold text-brand-600">
            로그인으로 돌아가기
          </Link>
        </p>
      </Card>
    </main>
  );
}
