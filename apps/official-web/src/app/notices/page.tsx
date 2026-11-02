import { SYSTEM_NOTICE_LEVELS } from '@weplay/shared';
import { SiteHeader } from '@/components/site-header';
import { publicGet } from '@/lib/public-api';

type Notice = { id: string; title: string; body: string; level: string; createdAt: string };

export const metadata = { title: '공지 · WePlay' };

/** 서비스 공지 (로그인 없이 볼 수 있음) */
export default async function NoticesPage() {
  const data = await publicGet<{ items: Notice[] }>('/system-notices?pageSize=50', { items: [] });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-4 px-5 py-12">
        <h1 className="text-3xl font-black">📢 서비스 공지</h1>
        {data.items.length === 0 && <p className="text-slate-500">아직 공지가 없어요.</p>}
        {data.items.map((n) => {
          const level = SYSTEM_NOTICE_LEVELS.find((l) => l.key === n.level);
          return (
            <article key={n.id} id={n.id} className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-bold text-violet-600">
                {level?.icon} {level?.name} · {new Date(n.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <h2 className="mt-1 text-xl font-black">{n.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{n.body}</p>
            </article>
          );
        })}
      </main>
    </div>
  );
}
