import { AI_COST_LABEL, AI_LEVEL_LABEL, FEATURE_CATALOG, GAMES, groupByCategory, SOCIAL_GAMES, TEAM_METHODS, TURN_GAMES } from '@weplay/shared';
import { AdSlot } from '@/components/ad-slot';
import { Reveal } from '@/components/reveal';
import { SiteHeader } from '@/components/site-header';
import { APP_URL, publicGet } from '@/lib/public-api';

type Notice = { id: string; title: string; body: string; level: string; createdAt: string };

const FAQ = [
  { q: '무료로 쓸 수 있나요?', a: '그룹 구성원은 기본 기능을 무료로 쓸 수 있어요. 기능은 그룹 관리자가 신청하고 운영자가 승인하면 열려요.' },
  { q: '게임 점수가 실제 돈이 되나요?', a: '아니요. 포인트는 회사 안에서만 쓰는 활동 점수예요. 상품권이나 현금으로 바꿀 수 없어요.' },
  { q: '팀 인원이 달라도 공정한가요?', a: '팀 점수는 상위 기록 평균과 참여율을 함께 보고, 인원이 많은 팀도 같은 기준으로 겨뤄요.' },
  { q: '사진이나 영상은 어디에 저장되나요?', a: '업로드한 파일은 그룹 안에서만 보여요. 저장 용량은 운영자가 그룹별로 정해요.' },
  { q: 'AI 기능은 꼭 써야 하나요?', a: '아니요. AI 없이도 모든 게임이 돌아가요. AI 기능은 켜 두면 더 다양한 문제와 그림을 만들어 줘요.' },
];

/** 홍보 메인: 기능 소개, 게임 소개, 공정한 팀 순위, 공지, FAQ */
export default async function HomePage() {
  const notices = await publicGet<{ items: Notice[] }>('/system-notices?pageSize=3', { items: [] });
  const sections = groupByCategory(FEATURE_CATALOG, (f) => f.key);
  const gameCount = GAMES.length + TURN_GAMES.length + SOCIAL_GAMES.length;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="wp-blob absolute -left-20 top-10 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl" />
        <div className="wp-blob absolute right-0 top-64 h-[28rem] w-[28rem] rounded-full bg-amber-200/50 blur-3xl" style={{ animationDelay: '-4s' }} />
        <div className="wp-blob absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl" style={{ animationDelay: '-8s' }} />
      </div>
      <SiteHeader />

      {/* 히어로 */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-16 md:grid-cols-2 md:pt-24">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-violet-700 shadow-sm ring-1 ring-violet-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> 우리 팀을 가깝게 만드는 가벼운 게임
          </p>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            회사 생활을
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">게임처럼</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-slate-600">
            한 판 1분짜리 미니게임, 팀이 함께 깨는 보스 레이드, 차례대로 이어 가는 턴제 게임. 칭찬 카드와 이달의 사원까지, 같은 자리에 없어도 웃으며 함께하는 문화를 만들어요.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={APP_URL} className="rounded-2xl bg-slate-900 px-6 py-3.5 font-bold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5">
              무료로 시작하기 →
            </a>
            <a href="#games" className="rounded-2xl bg-white px-6 py-3.5 font-bold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
              게임 둘러보기
            </a>
          </div>
          <dl className="grid max-w-md grid-cols-3 gap-4 pt-4 text-center">
            <Stat value={`${gameCount}+`} label="게임" />
            <Stat value={`${TEAM_METHODS.length}`} label="팀 순위 방식" />
            <Stat value={`${FEATURE_CATALOG.length}`} label="기능" />
          </dl>
        </div>

        {/* 떠 있는 카드 장식 */}
        <div className="relative mx-auto h-[26rem] w-full max-w-md">
          {[
            { icon: '🎯', name: 'Perfect Stop', x: 'left-0 top-6', d: '0s', c: 'from-cyan-400 to-blue-600' },
            { icon: '🧱', name: '블록 쌓기', x: 'right-4 top-0', d: '-1s', c: 'from-orange-400 to-red-500' },
            { icon: '🕵️', name: 'AI 협동 추리', x: 'left-10 bottom-10', d: '-2s', c: 'from-slate-700 to-slate-900' },
            { icon: '🧩', name: '팀 퍼즐', x: 'right-0 bottom-20', d: '-3s', c: 'from-sky-500 to-indigo-700' },
            { icon: '🐉', name: '팀 보스 레이드', x: 'left-1/3 top-1/2', d: '-1.5s', c: 'from-rose-500 to-purple-700' },
          ].map((card) => (
            <div key={card.name} className={`wp-float absolute ${card.x} w-44 rounded-3xl bg-gradient-to-br ${card.c} p-4 text-white shadow-2xl`} style={{ animationDelay: card.d }}>
              <span className="text-4xl">{card.icon}</span>
              <p className="mt-2 font-black leading-tight">{card.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 기능 */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <p className="text-sm font-bold text-violet-600">기능</p>
          <h2 className="mt-1 text-3xl font-black md:text-4xl">필요한 것만 골라 켜는 팀 문화 도구</h2>
          <p className="mt-2 text-slate-600">그룹 관리자가 필요한 기능을 신청하면 운영자가 승인해요. 기본으로 제공되는 기능도 있어요.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {sections.map((sec, i) => (
            <Reveal key={sec.category.key} delay={i * 80}>
              <div className="h-full rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-100 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sec.category.icon}</span>
                  <div>
                    <p className="font-black">{sec.category.name}</p>
                    <p className="text-xs text-slate-500">{sec.category.description}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {sec.items.map((f) => (
                    <li key={f.key} className="text-sm">
                      <span className="font-bold text-slate-800">{f.name}</span>
                      <span className="text-slate-500"> · {f.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <AdSlot />

      {/* 게임 */}
      <section id="games" className="mx-auto max-w-6xl space-y-12 px-5 py-16">
        <Reveal>
          <p className="text-sm font-bold text-violet-600">게임</p>
          <h2 className="mt-1 text-3xl font-black md:text-4xl">짧게 한 판, 길게 이어서</h2>
          <p className="mt-2 text-slate-600">점수로 겨루는 미니게임, 차례를 넘기며 하는 턴제 게임, 동료와 함께하는 게임까지.</p>
        </Reveal>
        <GameGroup title="⚡ 미니게임 · 점수로 겨뤄요" items={GAMES.map((g) => ({ key: g.key, icon: g.icon, name: g.name, tagline: g.tagline, gradient: g.gradient, ai: g.ai, cost: 'NONE' as const }))} />
        <GameGroup title="🔁 턴제 게임 · 나중에 접속해도 OK" items={TURN_GAMES.map((g) => ({ key: g.key, icon: g.icon, name: g.name, tagline: g.tagline, gradient: 'from-indigo-500 to-fuchsia-600', ai: g.ai, cost: g.cost }))} />
        <GameGroup title="👀 동료 게임 · 함께 웃는 게임" items={SOCIAL_GAMES.map((g) => ({ key: g.key, icon: g.icon, name: g.name, tagline: g.tagline, gradient: g.gradient, ai: g.ai, cost: g.cost }))} />
      </section>

      {/* 공정한 팀 순위 */}
      <section id="fair" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-8 text-white md:p-12">
            <p className="text-sm font-bold text-amber-300">공정한 팀 순위</p>
            <h2 className="mt-1 text-3xl font-black md:text-4xl">팀이 커도, 작아도 같은 기준으로</h2>
            <p className="mt-3 max-w-2xl text-white/70">
              총점으로 줄을 세우면 인원이 많은 팀이 늘 이겨요. 그래서 우리는 상위 기록의 평균과 참여율을 함께 봐요. 팀 크기의 절반(최대 5명)만 실력에 반영하고, 빈 자리는 0점으로 채워요.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {TEAM_METHODS.map((m) => (
                <div key={m.key} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/10">
                  <p className="font-black">{m.name}</p>
                  <p className="mt-1 text-sm text-white/70">{m.description}</p>
                  <p className="mt-2 text-xs text-amber-200/80">허점: {m.weakness}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* 공지 */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black">📢 최근 소식</h2>
          <a href="/notices" className="text-sm font-bold text-violet-600 hover:underline">
            전체 보기
          </a>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {notices.items.length === 0 && <p className="text-sm text-slate-500">아직 새 소식이 없어요.</p>}
          {notices.items.map((n, i) => (
            <Reveal key={n.id} delay={i * 80}>
              <a href={`/notices#${n.id}`} className="block h-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs font-bold text-violet-600">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</p>
                <p className="mt-1 font-bold">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.body}</p>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-center text-3xl font-black">자주 묻는 질문</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                {f.q}
                <span className="text-violet-600 transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 마무리 CTA */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <Reveal>
          <h2 className="text-4xl font-black">오늘 점심, 우리 팀이 같이 고르게 해요</h2>
          <p className="mt-3 text-slate-600">그룹을 만들고 동료를 초대하면 5분 안에 첫 게임을 시작할 수 있어요.</p>
          <a href={APP_URL} className="mt-8 inline-block rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-lg font-black text-white shadow-2xl shadow-violet-500/30 transition hover:-translate-y-1">
            지금 시작하기
          </a>
        </Reveal>
      </section>

    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="text-3xl font-black tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function GameGroup({ title, items }: { title: string; items: { key: string; icon: string; name: string; tagline: string; gradient: string; ai: string; cost: string }[] }) {
  return (
    <div className="space-y-4">
      <Reveal>
        <h3 className="text-xl font-black">{title}</h3>
      </Reveal>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((g, i) => (
          <Reveal key={g.key} delay={(i % 4) * 60}>
            <div className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${g.gradient} p-5 text-white shadow-lg transition hover:-translate-y-1.5 hover:shadow-2xl`}>
              <span className="block text-4xl">{g.icon}</span>
              <p className="mt-2 font-black leading-tight">{g.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-white/80">{g.tagline}</p>
              <p className="mt-3 flex flex-wrap gap-1">
                <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold">{AI_LEVEL_LABEL[g.ai as keyof typeof AI_LEVEL_LABEL]}</span>
                {g.cost !== 'NONE' && <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold">{AI_COST_LABEL[g.cost as keyof typeof AI_COST_LABEL]}</span>}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
