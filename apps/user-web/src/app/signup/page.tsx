'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ErrorText, Input, Logo } from '@/components/ui';
import { LegalDocumentBody, type LegalDocument } from '@/components/legal-document';
import { api, errorMessage, tokenStore } from '@/lib/api';
import { hasRequiredConsent, selectedTermsIds } from '@/lib/legal-consent';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string>();
  const terms = useQuery({ queryKey: ['terms', 'signup'], queryFn: () => api<LegalDocument[]>('/terms'), refetchOnWindowFocus: true, refetchInterval: 60_000 });
  const canAgree = terms.isSuccess && !terms.isFetching && hasRequiredConsent(terms.data, checked);
  const [form, setForm] = useState({ email: '', emailCode: '', name: '', birthDate: '', phone: '', password: '', passwordConfirm: '' });

  const sendCode = async () => {
    setError(undefined);
    setInfo(undefined);
    setBusy(true);
    try {
      await api('/auth/signup/email-code', { body: { email: form.email } });
      setCodeSent(true);
      setInfo('인증번호를 메일로 보냈습니다. 10분 안에 입력해 주세요.');
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
          <p className="text-sm text-slate-500">회원가입</p>
        </div>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
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
              router.replace('/');
            } catch (err) {
              setError(errorMessage(err));
              setChecked({});
              await terms.refetch();
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="아이디 (이메일)"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Button type="button" variant="secondary" onClick={sendCode} disabled={busy || !form.email} className="shrink-0">
              {codeSent ? '재발송' : '인증번호'}
            </Button>
          </div>
          <Input
            placeholder="인증번호 6자리"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={form.emailCode}
            onChange={(e) => setForm({ ...form, emailCode: e.target.value.replace(/\D/g, '') })}
            required
          />
          <Input placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input type="date" placeholder="생일" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input placeholder="전화번호 (선택)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="password" placeholder="비밀번호 (8자 이상)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input type="password" placeholder="비밀번호 확인" autoComplete="new-password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required />
          <fieldset className="space-y-3 py-3" disabled={busy}>
            <legend className="text-sm font-semibold">약관 동의</legend>
            {terms.isPending && <p role="status" className="text-sm text-slate-500">약관을 불러오는 중입니다.</p>}
            {terms.isError && <p role="alert" className="text-sm text-rose-600">약관을 불러오지 못했습니다. <button type="button" className="underline" onClick={() => terms.refetch()}>다시 시도</button></p>}
            {terms.data?.length === 0 && <p className="text-sm text-slate-500">현재 게시된 약관이 없습니다.</p>}
            {terms.data?.map((document) => <div key={document.id} className="space-y-2">
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" required={document.required} checked={!!checked[document.id]} onChange={(event) => setChecked((previous) => ({ ...previous, [document.id]: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0" /><span>[{document.required ? '필수' : '선택'}] {document.title} v{document.version}</span></label>
              <button type="button" className="text-xs text-brand-700 underline" onClick={() => setExpanded(expanded === document.id ? undefined : document.id)}>{expanded === document.id ? '접기' : '전문 및 첨부 문서 읽기'}</button>
              {expanded === document.id && <LegalDocumentBody document={document} />}
            </div>)}
          </fieldset>
          <Button type="submit" className="w-full" disabled={busy || !codeSent || !canAgree}>
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
        <ErrorText>{error}</ErrorText>
      </Card>
    </main>
  );
}
