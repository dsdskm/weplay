import { SiteHeader } from '@/components/site-header';
import { publicGet } from '@/lib/public-api';

type Terms = { id: string; type: string; version: number; title: string; content: string; required: boolean; effectiveAt: string | null };

export const metadata = { title: '약관·정책 · WePlay' };

/** 현재 게시된 약관 (로그인 없이 볼 수 있음) */
export default async function TermsPage() {
  const list = await publicGet<Terms[]>('/terms', []);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-12">
        <h1 className="text-3xl font-black">📄 약관·정책</h1>
        {list.length === 0 && <p className="text-slate-500">게시된 약관이 없어요.</p>}
        {list.map((t) => (
          <section key={t.id} id={t.type.toLowerCase()} className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">{t.title}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">v{t.version}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.required ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{t.required ? '필수' : '선택'}</span>
            </div>
            {t.effectiveAt && <p className="mt-1 text-xs text-slate-400">시행일 {new Date(t.effectiveAt).toLocaleDateString('ko-KR')}</p>}
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{t.content}</div>
          </section>
        ))}
      </main>
    </div>
  );
}
