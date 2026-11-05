'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ErrorText, Input, Logo } from '@/components/ui';
import { LegalDocumentBody, type LegalDocument } from '@/components/legal-document';
import { ApiError, api, errorMessage, tokenStore } from '@/lib/api';
import { hasRequiredConsent, selectedTermsIds } from '@/lib/legal-consent';

export default function SignupPage() {
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number>();
  const [resendAvailableAt, setResendAvailableAt] = useState<number>();
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [resendSecondsRemaining, setResendSecondsRemaining] = useState(0);
  const [verifiedCode, setVerifiedCode] = useState<string>();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const terms = useQuery({ queryKey: ['terms', 'signup'], queryFn: () => api<LegalDocument[]>('/terms'), refetchOnWindowFocus: true, refetchInterval: 60_000 });
  const canAgree = terms.isSuccess && !terms.isFetching && hasRequiredConsent(terms.data, checked);
  const [form, setForm] = useState({ email: '', emailCode: '', name: '', birthDate: '', phone: '', password: '', passwordConfirm: '' });
  const verificationKey = `${form.email}:${form.emailCode}`;
  const codeVerified = verifiedCode === verificationKey;

  useEffect(() => {
    if (!codeExpiresAt && !resendAvailableAt) return;
    const updateCountdown = () => {
      const now = Date.now();
      if (codeExpiresAt) {
        const remaining = Math.max(0, Math.ceil((codeExpiresAt - now) / 1000));
        setSecondsRemaining(remaining);
        if (remaining === 0) setVerifiedCode(undefined);
      }
      if (resendAvailableAt) setResendSecondsRemaining(Math.max(0, Math.ceil((resendAvailableAt - now) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [codeExpiresAt, resendAvailableAt]);

  const formatCountdown = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const sendCode = async () => {
    setError(undefined);
    setInfo(undefined);
    setBusy(true);
    try {
      const result = await api<{ expiresAt: string; resendAvailableAt: string }>('/auth/signup/email-code', { body: { email: form.email } });
      const expiresAt = Date.parse(result.expiresAt);
      const resendAt = Date.parse(result.resendAvailableAt);
      if (!Number.isFinite(expiresAt) || !Number.isFinite(resendAt)) throw new Error('인증번호 발송 응답을 확인할 수 없습니다. 다시 시도해 주세요.');
      setCodeSent(true);
      setCodeExpiresAt(expiresAt);
      setResendAvailableAt(resendAt);
      setSecondsRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      setResendSecondsRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
      setVerifiedCode(undefined);
      setInfo('인증번호를 메일로 보냈습니다. 5분 안에 입력해 주세요.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_CODE_COOLDOWN') {
        const details = err.details as { resendAvailableAt?: unknown } | undefined;
        const resendAt = typeof details?.resendAvailableAt === 'string' ? Date.parse(details.resendAvailableAt) : NaN;
        if (Number.isFinite(resendAt)) {
          setResendAvailableAt(resendAt);
          setResendSecondsRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
        }
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (busy || !codeSent || secondsRemaining === 0 || form.emailCode.length !== 6 || codeVerified) return;
    setError(undefined);
    setInfo(undefined);
    setBusy(true);
    try {
      await api('/auth/signup/email-code/verify', { body: { email: form.email, emailCode: form.emailCode } });
      setVerifiedCode(verificationKey);
      setInfo('이메일 인증이 완료되었습니다.');
    } catch (err) {
      setVerifiedCode(undefined);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-start justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50 p-3 sm:p-6 lg:items-center lg:p-8">
      <Card className="w-full max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="space-y-2 text-center">
          <Logo />
          <p className="text-sm text-slate-500">회원가입</p>
        </div>
        <form
          className="mx-auto w-full max-w-xl space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
            if (!codeVerified) return setError('이메일 인증번호를 확인해 주세요.');
            if (!canAgree) return setError('현재 필수 약관을 확인하고 동의해 주세요.');
            setBusy(true);
            setError(undefined);
            try {
              const res = await api<{ accessToken: string }>('/auth/signup', {
                body: {
                  email: form.email,
                  emailCode: form.emailCode,
                  name: form.name,
                  password: form.password,
                  birthDate: form.birthDate || null,
                  phone: form.phone || null,
                  termsIds: selectedTermsIds(terms.data ?? [], checked),
                },
              });
              tokenStore.set(res.accessToken);
              window.location.replace('/');
            } catch (err) {
              setError(errorMessage(err));
              setChecked({});
              await terms.refetch();
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="아이디 (이메일)"
                  autoComplete="username"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value, emailCode: '' });
                    setCodeSent(false);
                    setCodeExpiresAt(undefined);
                    setResendAvailableAt(undefined);
                    setSecondsRemaining(0);
                    setResendSecondsRemaining(0);
                    setVerifiedCode(undefined);
                    setError(undefined);
                    setInfo(undefined);
                  }}
                  required
                />
                <Button type="button" variant="secondary" onClick={sendCode} disabled={busy || !form.email || resendSecondsRemaining > 0} className="shrink-0">
                  {!codeSent ? '인증번호 전송' : resendSecondsRemaining > 0 ? `재전송 ${formatCountdown(resendSecondsRemaining)}` : '인증번호 재전송'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="인증번호 6자리"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={form.emailCode}
                  onChange={(e) => {
                    setForm({ ...form, emailCode: e.target.value.replace(/\D/g, '') });
                    setVerifiedCode(undefined);
                    setError(undefined);
                    setInfo(undefined);
                  }}
                  required
                />
                <Button type="button" variant="secondary" onClick={verifyCode} disabled={busy || !codeSent || secondsRemaining === 0 || form.emailCode.length !== 6 || codeVerified} className="shrink-0">
                  {codeVerified ? '인증 완료' : '확인'}
                </Button>
              </div>
              {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
              {codeSent && <p role="status" className={`text-xs ${secondsRemaining === 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {secondsRemaining === 0 ? '인증번호가 만료되었습니다. 새 인증번호를 요청해 주세요.' : `인증번호 남은 시간 ${formatCountdown(secondsRemaining)}`}
              </p>}
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input type="date" aria-label="생년월일" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </div>
              <Input placeholder="전화번호 (선택)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input type="password" placeholder="비밀번호 (8자 이상)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <Input type="password" placeholder="비밀번호 확인" autoComplete="new-password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required />
            </div>
            <fieldset className="min-w-0 space-y-3" disabled={busy}>
              <legend className="text-sm font-semibold">약관 동의</legend>
              <div className="h-72 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-4 lg:h-[min(65vh,44rem)]">
                {terms.isPending && <p role="status" className="text-sm text-slate-500">약관을 불러오는 중입니다.</p>}
                {terms.isError && <p role="alert" className="text-sm text-rose-600">약관을 불러오지 못했습니다. <button type="button" className="underline" onClick={() => terms.refetch()}>다시 시도</button></p>}
                {terms.data?.length === 0 && <p className="text-sm text-slate-500">현재 게시된 약관이 없습니다.</p>}
                <div className="divide-y divide-slate-200">
                  {terms.data?.map((document) => <div key={document.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                    <label className="flex items-start gap-2 text-sm font-semibold">
                      <input type="checkbox" required={document.required} checked={!!checked[document.id]} onChange={(event) => setChecked((previous) => ({ ...previous, [document.id]: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0" />
                      <span>[{document.required ? '필수' : '선택'}] {document.title} v{document.version} 동의</span>
                    </label>
                    <LegalDocumentBody document={document} />
                  </div>)}
                </div>
              </div>
            </fieldset>
          </div>
          <Button type="submit" className="w-full" disabled={busy || !codeVerified || !canAgree}>
            가입하기
          </Button>
          <p className="text-center text-xs text-slate-500">
            이미 계정이 있나요?{' '}
            <Link href="/login" className="font-semibold text-brand-600">
              로그인
            </Link>
          </p>
        </form>
        {info && <p className="text-center text-sm text-emerald-600">{info}</p>}
        <ErrorText>{error && codeSent ? undefined : error}</ErrorText>
      </Card>
    </main>
  );
}
