'use client';

import { useState } from 'react';
import { Avatar, Badge, Button, Card, cn, Input } from '@/components/ui';
import { useDialog } from '@/components/confirm-dialog';
import { DrawPad } from './draw-pad';
import { Confetti } from './fx';
import { MediaView } from '@/components/media-view';
import { assetUrl, uploadFile, errorMessage } from '@/lib/api';
import { fmtDateTime, timeLeft } from '@/lib/format';

export type U = { id: string; name: string; avatarUrl: string | null } | null;
export interface TurnDetail {
  id: string;
  type: string;
  title: string;
  status: 'RECRUITING' | 'PLAYING' | 'DONE' | 'CANCELED';
  currentUser: U;
  isMyTurn: boolean;
  createdBy: U;
  turnDeadline: string | null;
  turnIndex: number;
  totalTurns: number | null;
  economy: { entryFee: number; completeReward: number; bombPenalty: number; twentyQReward: number; detectiveReward: number; chainQuizReward: number };
  joined?: boolean;
  canJoin?: boolean;
  canManage?: boolean;
  minPlayers?: number;
  participants: { user: U; position: number; done: boolean }[];
  view: any;
}
export type Act = (body: Record<string, unknown>) => Promise<any>;
export interface ViewProps {
  g: TurnDetail;
  groupId: string;
  act: Act;
  busy: boolean;
}

/** 이어 쓰기류: 그림 전화 · 릴레이 소설 · 그림 이어그리기 · 영상 릴레이 · AI 그림 전화 */
export function ChainView({ g, groupId, act, busy }: ViewProps) {
  const v = g.view as {
    expected: 'TEXT' | 'DRAWING' | 'VIDEO' | null;
    previous: { kind: string; text: string | null; mediaUrl: string | null } | null;
    chain: { id: string; kind: string; text: string | null; mediaUrl: string | null; user: U }[] | null;
  };
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [local, setLocal] = useState<string>();
  const [revealed, setRevealed] = useState(0);
  const [err, setErr] = useState<string>();
  const kind = g.type;
  const title = { TELEPHONE: '🖍️ 그림 전화 결과', STORY: '📖 완성된 이야기', DRAW_RELAY: '🎨 이어 그린 그림', VIDEO_RELAY: '🎬 영상 릴레이', AI_TELEPHONE: '🤖 AI 그림 전화 결과' }[kind] ?? '결과';

  const submitFile = async (file: File, asKind: 'DRAWING' | 'VIDEO') => {
    setUploading(true);
    setErr(undefined);
    try {
      const up = await uploadFile(groupId, file);
      await act({ kind: asKind, mediaUrl: up.url });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  if (g.status === 'DONE' && v.chain) {
    const chain = v.chain;
    return (
      <Card className="space-y-4">
        {revealed >= chain.length && chain.length > 0 && <Confetti count={60} />}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">{title}</h2>
          {revealed < chain.length ? (
            <Button onClick={() => setRevealed((r) => r + 1)}>다음 장 보기 ({revealed}/{chain.length})</Button>
          ) : (
            <Button variant="ghost" onClick={() => setRevealed(0)}>
              처음부터
            </Button>
          )}
        </div>
        {revealed === 0 && (
          <button type="button" onClick={() => setRevealed(chain.length)} className="text-xs text-brand-600">
            한 번에 모두 보기
          </button>
        )}
        <div className="space-y-3">
          {chain.slice(0, revealed).map((e, i) => (
            <div key={e.id} className="wp-pop-in flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar name={e.user?.name ?? '?'} url={e.user?.avatarUrl} size={32} />
                {i < revealed - 1 && <span className="mt-1 w-0.5 flex-1 bg-slate-200" />}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <p className="text-xs font-semibold text-slate-500">
                  {i + 1}. {e.user?.name}
                  {e.kind === 'AI_IMAGE' && ' · AI 그림'}
                  {e.kind === 'DRAWING' && ' · 그림'}
                  {e.kind === 'VIDEO' && ' · 영상'}
                </p>
                {(e.kind === 'DRAWING' || e.kind === 'AI_IMAGE') && e.mediaUrl ? (
                  <MediaView url={e.mediaUrl} type="IMAGE" className="mt-1 w-full max-w-sm rounded-2xl ring-1 ring-slate-100" />
                ) : e.kind === 'VIDEO' && e.mediaUrl ? (
                  <MediaView url={e.mediaUrl} type="VIDEO" className="mt-1 w-full max-w-sm rounded-2xl" />
                ) : (
                  <p className={cn('mt-1 rounded-2xl px-4 py-3', kind === 'TELEPHONE' || kind === 'AI_TELEPHONE' ? 'bg-brand-50 text-lg font-bold' : 'bg-amber-50 leading-relaxed')}>{e.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (g.status !== 'PLAYING') return null;
  if (!g.isMyTurn)
    return (
      <Card className="py-10 text-center">
        <p className="wp-float text-5xl">⏳</p>
        <p className="mt-3 font-bold">{g.currentUser?.name}님이 이어 가는 중이에요</p>
        <p className="text-sm text-slate-500">진행 중에는 앞사람 것만 보여요. 끝나면 전체가 공개돼요!</p>
      </Card>
    );

  const prev = v.previous;
  return (
    <Card className="wp-pop-in space-y-4 ring-2 ring-amber-300">
      <p className="text-sm font-black text-amber-600">👉 내 차례!</p>
      {prev ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            {kind === 'TELEPHONE' && (prev.kind === 'DRAWING' ? '앞사람의 그림이에요. 무엇인지 한 문장으로 설명해 주세요.' : '앞사람의 문장이에요. 그림으로 그려 주세요!')}
            {kind === 'STORY' && '바로 앞 문장만 보여요. 이어서 써 주세요.'}
            {kind === 'DRAW_RELAY' && '앞사람 그림 위에 이어서 그려 주세요.'}
            {kind === 'VIDEO_RELAY' && '앞사람 영상을 보고 이어질 짧은 영상을 찍어 주세요.'}
            {kind === 'AI_TELEPHONE' && 'AI가 그린 그림이에요. 무엇을 그린 건지 한 문장으로 설명해 주세요.'}
          </p>
          {prev.kind === 'TEXT' && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-lg font-bold">“{prev.text}”</p>}
          {(prev.kind === 'DRAWING' || prev.kind === 'AI_IMAGE') && prev.mediaUrl && <MediaView url={prev.mediaUrl} type="IMAGE" className="w-full rounded-2xl ring-1 ring-slate-100" />}
          {prev.kind === 'VIDEO' && prev.mediaUrl && <MediaView url={prev.mediaUrl} type="VIDEO" className="w-full rounded-2xl" />}
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {kind === 'TELEPHONE' && '첫 문장을 써 주세요. 다음 사람이 이걸 그림으로 그려요. (예: 회의 중에 몰래 간식 먹는 팀장님)'}
          {kind === 'STORY' && '이야기의 첫 문장을 써 주세요.'}
          {kind === 'DRAW_RELAY' && '자유롭게 첫 그림을 그려 주세요.'}
          {kind === 'VIDEO_RELAY' && '첫 영상을 찍어 올려 주세요.'}
          {kind === 'AI_TELEPHONE' && '첫 문장을 써 주세요. AI가 이 문장을 그림으로 그려요.'}
        </p>
      )}

      {v.expected === 'DRAWING' && <DrawPad busy={uploading || busy} base={prev?.kind === 'DRAWING' && prev.mediaUrl ? assetUrl(prev.mediaUrl) : null} onDone={(blob) => submitFile(new File([blob], 'drawing.png', { type: 'image/png' }), 'DRAWING')} />}

      {v.expected === 'VIDEO' && (
        <VideoPicker busy={uploading || busy} onPick={(f) => submitFile(f, 'VIDEO')} />
      )}

      {v.expected === 'TEXT' && (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim() || busy) return;
            setLocal(kind === 'AI_TELEPHONE' ? 'AI가 그림을 그리는 중… (수십 초 걸려요)' : undefined);
            try {
              await act({ kind: 'TEXT', text: text.trim() });
              setText('');
            } catch (e2) {
              setErr(errorMessage(e2));
            } finally {
              setLocal(undefined);
            }
          }}
        >
          <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'TELEPHONE' ? '한 문장으로 설명' : '한두 문장 쓰기'} />
          <div className="flex items-center justify-end gap-3">
            {local && <span className="text-xs text-slate-500">{local}</span>}
            <Button type="submit" disabled={!text.trim() || busy || !!local}>
              {kind === 'AI_TELEPHONE' ? 'AI에게 그려 달라고 하기' : '다음 사람에게 넘기기 →'}
            </Button>
          </div>
        </form>
      )}
      {(uploading || busy) && v.expected !== 'TEXT' && <p className="text-center text-xs text-slate-500">올리는 중…</p>}
      {err && <p className="text-sm text-rose-600">{err}</p>}
    </Card>
  );
}

function VideoPicker({ busy, onPick }: { busy: boolean; onPick: (f: File) => void }) {
  return (
    <label className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50', busy && 'pointer-events-none opacity-60')}>
      <span className="wp-float text-4xl">🎬</span>
      <span className="font-bold">{busy ? '올리는 중…' : '영상 고르기 또는 촬영'}</span>
      <span className="text-xs text-slate-500">짧은 영상일수록 좋아요 (MP4·WEBM·MOV)</span>
      <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  );
}

/** 체인 퀴즈: 앞사람 문제를 맞히고 새 문제 내기 */
export function QuizView({ g, act, busy }: ViewProps) {
  const v = g.view as {
    toAnswer: { id: string; question: string; author: U; answered: boolean } | null;
    quizzes: { id: string; question: string; author: U; answer: string | null; answers: { user: U; text: string; correct: boolean | null }[] }[];
  };
  const [ans, setAns] = useState('');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [err, setErr] = useState<string>();
  const done = g.status === 'DONE';

  return (
    <div className="space-y-4">
      {g.status === 'PLAYING' && g.isMyTurn && (
        <Card className="wp-pop-in space-y-4 ring-2 ring-amber-300">
          <p className="text-sm font-black text-amber-600">👉 내 차례! 앞사람 문제를 맞히고 새 문제를 내 주세요</p>
          {v.toAnswer && !v.toAnswer.answered && (
            <div className="space-y-2 rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-bold text-sky-700">{v.toAnswer.author?.name}님의 문제</p>
              <p className="text-lg font-black">{v.toAnswer.question}</p>
              <Input placeholder="내 답 (맞히면 보상! 비워도 돼요)" value={ans} onChange={(e) => setAns(e.target.value)} maxLength={100} />
            </div>
          )}
          <div className="space-y-2">
            <Input placeholder="새 문제 (예: 우리 회사 사내 메신저 이름은?)" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} />
            <Input placeholder="정답 (다음 사람이 맞힐 답)" value={a} onChange={(e) => setA(e.target.value)} maxLength={100} />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!q.trim() || !a.trim() || busy}
              onClick={async () => {
                setErr(undefined);
                try {
                  await act({ kind: 'QUIZ', text: ans.trim() || undefined, question: q.trim(), answer: a.trim() });
                  setAns('');
                  setQ('');
                  setA('');
                } catch (e) {
                  setErr(errorMessage(e));
                }
              }}
            >
              문제 내기 →
            </Button>
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </Card>
      )}
      {g.status === 'PLAYING' && !g.isMyTurn && (
        <Card className="py-8 text-center">
          <p className="wp-float text-4xl">🔗</p>
          <p className="mt-2 font-bold">{g.currentUser?.name}님이 문제를 내는 중이에요</p>
        </Card>
      )}
      <Card className="space-y-3">
        <h2 className="font-black">🔗 문제 기록</h2>
        {v.quizzes.length === 0 && <p className="text-sm text-slate-400">아직 문제가 없어요.</p>}
        {v.quizzes.map((x, i) => (
          <div key={x.id} className="wp-pop-in rounded-2xl bg-slate-50 p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-xs font-bold text-slate-500">
              {i + 1}. {x.author?.name}의 문제
            </p>
            <p className="mt-1 font-bold">{x.question}</p>
            <p className="mt-1 text-sm">
              {x.answer ? <span className="font-black text-emerald-600">정답: {x.answer}</span> : <span className="text-slate-400">정답은 누군가 답하면 공개돼요</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {x.answers.map((an, k) => (
                <span key={k} className={cn('rounded-full px-2.5 py-1 text-xs font-bold', an.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600')}>
                  {an.user?.name}: {an.text} {an.correct ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </Card>
      {done && <Confetti count={40} />}
    </div>
  );
}

/** AI 협동 추리: 사건을 함께 보고, 단서를 한 명씩 열어 범인을 지목 */
export function DetectiveView({ g, act, busy }: ViewProps) {
  const { confirm } = useDialog();
  const v = g.view as {
    title: string;
    setup: string;
    suspects: string[];
    clues: { id: string; text: string; by: U; at: string }[];
    cluesLeft: number;
    notes: { id: string; text: string; by: U }[];
    accusations: { id: string; text: string; correct: boolean | null; by: U }[];
    culprit: string | null;
    solved: boolean;
  };
  const [memo, setMemo] = useState('');
  const [pick, setPick] = useState<string>();
  const [err, setErr] = useState<string>();
  const done = g.status === 'DONE';

  return (
    <div className="space-y-4">
      {done && v.solved && <Confetti count={90} />}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">사건</Badge>
          <h2 className="text-xl font-black">{v.title}</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{v.setup}</p>
        <div className="flex flex-wrap gap-2">
          {v.suspects.map((s) => (
            <span key={s} className={cn('rounded-full px-3 py-1 text-sm font-bold ring-1 transition', done && v.culprit === s ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white ring-slate-200')}>
              {s}
            </span>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black">🔍 단서 {v.clues.length}/{v.clues.length + v.cluesLeft}</h2>
          {g.status === 'PLAYING' && g.turnDeadline && <span className="text-xs text-slate-400">{timeLeft(g.turnDeadline)}</span>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-600 transition-all duration-700" style={{ width: `${((v.clues.length) / Math.max(1, v.clues.length + v.cluesLeft)) * 100}%` }} />
        </div>
        <div className="space-y-2">
          {v.clues.map((c, i) => (
            <div key={c.id} className="wp-pop-in rounded-2xl bg-indigo-50 p-3" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="text-xs font-bold text-indigo-600">단서 {i + 1} · {c.by?.name}님이 열었어요</p>
              <p className="mt-1 font-semibold">{c.text}</p>
            </div>
          ))}
          {v.clues.length === 0 && <p className="text-sm text-slate-400">아직 열린 단서가 없어요.</p>}
        </div>
        {v.notes.length > 0 && (
          <div className="space-y-1 border-t border-slate-100 pt-3">
            {v.notes.map((n) => (
              <p key={n.id} className="text-sm text-slate-600">
                💭 {n.by?.name}: {n.text}
              </p>
            ))}
          </div>
        )}
      </Card>

      {g.status === 'PLAYING' && g.isMyTurn && (
        <Card className="wp-pop-in space-y-4 ring-2 ring-amber-300">
          <p className="text-sm font-black text-amber-600">👉 내 차례! 단서를 열거나 범인을 지목하세요</p>
          {v.cluesLeft > 0 && (
            <div className="space-y-2">
              <Input placeholder="추리 메모 (선택, 다음 사람에게 보여요)" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} />
              <Button
                disabled={busy}
                onClick={async () => {
                  setErr(undefined);
                  try {
                    await act({ kind: 'CLUE', text: memo.trim() || undefined });
                    setMemo('');
                  } catch (e) {
                    setErr(errorMessage(e));
                  }
                }}
              >
                단서 하나 열기
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-600">범인은 누구일까요?</p>
            <div className="flex flex-wrap gap-2">
              {v.suspects.map((s) => (
                <button key={s} type="button" onClick={() => setPick(s)} className={cn('rounded-full px-3 py-1.5 text-sm font-bold ring-1 transition', pick === s ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white ring-slate-200 hover:bg-rose-50')}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                variant="danger"
                disabled={!pick || busy}
                onClick={async () => {
                  if (!pick) return;
                  if (!(await confirm({ message: `${pick}이(가) 범인인가요? 지목하면 바로 결과가 나와요.`, danger: true }))) return;
                  setErr(undefined);
                  try {
                    await act({ kind: 'GUESS', text: pick });
                  } catch (e) {
                    setErr(errorMessage(e));
                  }
                }}
              >
                범인 지목하기
              </Button>
            </div>
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </Card>
      )}
      {g.status === 'PLAYING' && !g.isMyTurn && (
        <Card className="py-8 text-center">
          <p className="wp-float text-4xl">🕵️</p>
          <p className="mt-2 font-bold">{g.currentUser?.name}님이 단서를 보고 있어요</p>
        </Card>
      )}

      {done && (
        <Card className="wp-pop-in space-y-2 text-center">
          <p className="text-2xl font-black">{v.solved ? '🎉 범인 검거 성공!' : '🫥 범인은 빠져나갔어요'}</p>
          {v.culprit && <p className="text-sm text-slate-600">범인: <b>{v.culprit}</b></p>}
          {v.accusations.map((a) => (
            <p key={a.id} className="text-xs text-slate-500">
              {a.by?.name}: {a.text} {a.correct ? '✓' : '✗'}
            </p>
          ))}
        </Card>
      )}
    </div>
  );
}

/** 폭탄 돌리기 */
export function BombView({ g, act, busy }: ViewProps) {
  const v = g.view as { holder: U; heat: number; passes: { id: string; kind: string; from: U; to: U; at: string }[]; loser: U; reason: string | null };
  const [boom, setBoom] = useState(false);
  const heatColor = ['from-slate-700 to-slate-900', 'from-amber-600 to-orange-700', 'from-orange-500 to-red-600', 'from-red-500 to-rose-700', 'from-rose-500 to-fuchsia-700'][v.heat] ?? 'from-slate-700 to-slate-900';
  const others = g.participants.filter((p) => p.user && p.user.id !== v.holder?.id);

  if (g.status === 'DONE')
    return (
      <Card className="space-y-4 text-center">
        <div className="wp-shake text-8xl">💥</div>
        <p className="text-2xl font-black text-rose-600">{v.loser?.name}님 앞에서 터졌어요!</p>
        <p className="text-sm text-slate-500">{v.reason === 'TIMEOUT' ? '제한 시간 안에 넘기지 못했어요 ⏰' : `${v.passes.length}번 넘어간 끝에…`} 벌점 -{g.economy.bombPenalty}P, 나머지는 생존 보상 +{g.economy.completeReward}P</p>
        <PassLog passes={v.passes} />
      </Card>
    );
  if (g.status !== 'PLAYING') return null;
  return (
    <Card className="space-y-5">
      {boom && <div className="pointer-events-none fixed inset-0 z-50 bg-rose-500/30" />}
      <div className="flex flex-col items-center gap-3">
        <div className={cn('relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br shadow-2xl', heatColor, v.heat >= 3 ? 'wp-shake' : 'wp-float')}>
          <span className="text-7xl">💣</span>
        </div>
        <p className="text-sm font-bold text-slate-600">{['아직 차가워요', '조금 따뜻해요', '뜨거워지고 있어요!', '손이 데일 것 같아요!!', '곧 터질 것 같아요!!!'][v.heat]}</p>
        <p className="text-lg font-black">{g.isMyTurn ? '💣 폭탄이 나에게 왔어요!' : `${v.holder?.name}님이 들고 있어요`}</p>
        {g.turnDeadline && <p className="text-xs text-slate-400">{timeLeft(g.turnDeadline)} 안에 넘기지 않으면 터져요</p>}
      </div>
      {g.isMyTurn && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {others.map((p) => (
            <button
              key={p.user!.id}
              type="button"
              disabled={busy}
              onClick={async () => {
                const r = await act({ kind: 'PASS', targetUserId: p.user!.id });
                if (r?.exploded) {
                  setBoom(true);
                  setTimeout(() => setBoom(false), 900);
                }
              }}
              className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-bold shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 active:scale-95"
            >
              <Avatar name={p.user!.name} url={p.user!.avatarUrl} size={28} />
              <span className="truncate">{p.user!.name}</span>
            </button>
          ))}
        </div>
      )}
      <PassLog passes={v.passes} />
    </Card>
  );
}

function PassLog({ passes }: { passes: { id: string; kind: string; from: U; to: U; at: string }[] }) {
  if (passes.length === 0) return null;
  return (
    <div className="space-y-1 text-left text-xs text-slate-500">
      {passes
        .slice()
        .reverse()
        .slice(0, 12)
        .map((p) => (
          <p key={p.id}>
            {p.kind === 'BOOM' ? '💥' : '➡️'} {p.from?.name} → {p.to?.name} <span className="text-slate-300">{fmtDateTime(p.at)}</span>
          </p>
        ))}
    </div>
  );
}

/** 스무고개 */
export function TwentyQView({ g, act, busy }: ViewProps) {
  const v = g.view as {
    isHost: boolean;
    hint: string | null;
    secret: string | null;
    max: number;
    used: number;
    entries: { id: string; kind: 'QUESTION' | 'GUESS'; text: string; reply: 'YES' | 'NO' | 'MAYBE' | null; correct: boolean | null; user: U }[];
    winner: U;
    hostWin: boolean;
    endsAt: string | null;
  };
  const [text, setText] = useState('');
  const left = v.max - v.used;
  const replyText = { YES: '⭕ 예', NO: '❌ 아니요', MAYBE: '🤔 애매해요' } as const;
  return (
    <Card className="space-y-4">
      {g.status === 'DONE' && v.winner && !v.hostWin ? <Confetti count={60} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {v.hint && <Badge tone="brand">힌트: {v.hint}</Badge>}
        <Badge tone={left <= 5 ? 'rose' : 'slate'}>남은 기회 {left}/{v.max}</Badge>
        {v.secret && <Badge tone="amber">정답: {v.secret}</Badge>}
        {g.status === 'PLAYING' && v.endsAt && <span className="text-xs text-slate-400">{timeLeft(v.endsAt)}</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-600 transition-all duration-700" style={{ width: `${(v.used / v.max) * 100}%` }} />
      </div>
      {g.status === 'DONE' && (
        <div className="wp-pop-in rounded-2xl bg-gradient-to-r from-amber-100 to-pink-100 p-4 text-center">
          <p className="text-2xl font-black">{v.hostWin ? `🎩 출제자 ${g.createdBy?.name}님 승리!` : `🎉 ${v.winner?.name}님 정답!`}</p>
          <p className="text-sm text-slate-600">정답은 “{v.secret}” 이었어요</p>
        </div>
      )}
      <div className="space-y-2">
        {v.entries.map((e, i) => (
          <div key={e.id} className={cn('wp-pop-in flex items-start gap-2 rounded-2xl px-3 py-2 text-sm', e.kind === 'GUESS' ? (e.correct ? 'bg-emerald-50' : 'bg-rose-50') : 'bg-slate-50')}>
            <span className="w-6 shrink-0 text-xs font-bold text-slate-400">{i + 1}</span>
            <Avatar name={e.user?.name ?? '?'} url={e.user?.avatarUrl} size={22} />
            <div className="min-w-0 flex-1">
              <p>
                {e.kind === 'GUESS' && <b className="mr-1">정답 도전!</b>}
                {e.text}
              </p>
              {e.kind === 'QUESTION' &&
                (e.reply ? (
                  <p className="font-bold text-indigo-600">{replyText[e.reply]}</p>
                ) : v.isHost && g.status === 'PLAYING' ? (
                  <AnswerButtons entryId={e.id} busy={busy} act={act} />
                ) : (
                  <p className="text-xs text-slate-400">출제자의 답을 기다리는 중…</p>
                ))}
              {e.kind === 'GUESS' && <p className={cn('text-xs font-bold', e.correct ? 'text-emerald-600' : 'text-rose-500')}>{e.correct ? '정답!' : '땡!'}</p>}
            </div>
          </div>
        ))}
        {v.entries.length === 0 && <p className="text-center text-sm text-slate-400">첫 질문을 던져 보세요!</p>}
      </div>
      {g.status === 'PLAYING' && !v.isHost && left > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="예/아니오로 답할 수 있는 질문 또는 정답" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!text.trim() || busy} onClick={async () => { await act({ kind: 'QUESTION', text: text.trim() }); setText(''); }}>
              질문
            </Button>
            <Button disabled={!text.trim() || busy} onClick={async () => { await act({ kind: 'GUESS', text: text.trim() }); setText(''); }}>
              정답 도전
            </Button>
          </div>
        </div>
      )}
      {g.status === 'PLAYING' && v.isHost && <p className="text-center text-xs text-slate-400">출제자는 질문에 답만 해요. 정답은 나만 보여요.</p>}
    </Card>
  );
}

function AnswerButtons({ entryId, busy, act }: { entryId: string; busy: boolean; act: Act }) {
  const labels = { YES: '⭕ 예', NO: '❌ 아니요', MAYBE: '🤔 애매해요' } as const;
  return (
    <div className="mt-1 flex gap-1">
      {(['YES', 'NO', 'MAYBE'] as const).map((r) => (
        <button key={r} type="button" disabled={busy} onClick={() => act({ kind: 'ANSWER', entryId, reply: r })} className="rounded-full bg-white px-3 py-1 text-xs font-bold ring-1 ring-slate-200 active:scale-95">
          {labels[r]}
        </button>
      ))}
    </div>
  );
}

/** 지목 릴레이 (칭찬 릴레이 포함) */
export function NominateView({ g, act, busy }: ViewProps) {
  const v = g.view as { question: string; max: number; answers: { id: string; text: string; user: U; target: U; at: string }[]; candidates: { id: string; name: string; avatarUrl: string | null }[] };
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const [q, setQ] = useState('');
  const shown = v.candidates.filter((c) => !q || c.name.includes(q));
  return (
    <Card className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-violet-100 to-pink-100 p-4 text-center">
        <p className="text-xs font-bold text-violet-600">릴레이 질문</p>
        <p className="text-xl font-black">“{v.question}”</p>
        <p className="text-xs text-slate-500">{v.answers.length}/{v.max}명 답함</p>
      </div>
      <div className="space-y-3">
        {v.answers.map((a, i) => (
          <div key={a.id} className="wp-pop-in flex gap-3">
            <Avatar name={a.user?.name ?? '?'} url={a.user?.avatarUrl} size={34} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold text-slate-500">
                {i + 1}. {a.user?.name}
              </p>
              <p className="mt-0.5">{a.text}</p>
              {a.target && <p className="mt-1 text-xs font-semibold text-violet-600">👉 다음은 {a.target.name}님!</p>}
            </div>
          </div>
        ))}
      </div>
      {g.status === 'PLAYING' && g.isMyTurn && (
        <div className="wp-pop-in space-y-3 rounded-2xl bg-amber-50 p-4 ring-2 ring-amber-300">
          <p className="text-sm font-black text-amber-700">👉 지목받았어요! 답하고 다음 사람을 지목해 주세요</p>
          <textarea className="min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="내 답" />
          <Input placeholder="다음 사람 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {shown.map((c) => (
              <button key={c.id} type="button" onClick={() => setTarget(c.id)} className={cn('flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-3 text-xs ring-1 transition', target === c.id ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white ring-slate-200')}>
                <Avatar name={c.name} url={c.avatarUrl} size={20} /> {c.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={!text.trim() || busy} onClick={() => act({ kind: 'END', text: text.trim() })}>
              내가 마지막
            </Button>
            <Button disabled={!text.trim() || !target || busy} onClick={() => act({ kind: 'TEXT', text: text.trim(), targetUserId: target })}>
              답하고 지목하기
            </Button>
          </div>
        </div>
      )}
      {g.status === 'PLAYING' && !g.isMyTurn && <p className="text-center text-sm text-slate-500">{g.currentUser?.name}님이 답할 차례예요 ⏳</p>}
    </Card>
  );
}
