import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { z } from 'zod';
import {
  addDays,
  AI_QUIZ_BANK,
  BALANCE_PROMPTS,
  dayIndex,
  ErrorCode,
  FeatureKey,
  kstDate,
  PUZZLE_THEMES,
  TELEPATHY_PROMPTS,
  WORD_BANK,
  weekStart,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { AiService, uploadPathOf } from '../ai/ai.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';
import { PointsBadgeService } from '../points-badge/points-badge.service';
import { saveBuffer } from '../uploads/uploads.service';

const FEATURE = FeatureKey.MINI_GAMES;
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const IMG_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;
const ROUND_TTL = 60 * 60_000;

export const belongingSchema = z.object({ mediaUrl: z.string().min(1).max(300), caption: z.string().trim().max(100).optional() });
export const pickSchema = z.object({ photoId: z.string().min(1), userId: z.string().min(1) });
export const factSchema = z.object({ text: z.string().trim().min(2).max(120) });
export const factGuessSchema = z.object({ factId: z.string().min(1), userId: z.string().min(1) });
export const quizCheckSchema = z.object({ roundId: z.string().min(1), index: z.number().int().min(0).max(9), choice: z.number().int().min(0).max(3) });
export const wordCheckSchema = z.object({ roundId: z.string().min(1), choice: z.string().min(1).max(20) });
export const memeSchema = z.object({ mediaUrl: z.string().min(1).max(300) });
export const transformSchema = z.object({ mediaUrl: z.string().min(1).max(300), style: z.enum(['COMIC', 'WATERCOLOR', 'SKETCH']) });
export const dailySchema = z.object({ answer: z.union([z.string().min(1).max(3), z.number().int().min(0).max(9)]) });

export type BelongingInput = z.infer<typeof belongingSchema>;
export type FactGuessInput = z.infer<typeof factGuessSchema>;

const TRANSFORM_PROMPT: Record<string, string> = {
  COMIC: '이 사진을 만화 일러스트 풍으로 바꿔 주세요. 인물과 구도는 그대로 유지하세요.',
  WATERCOLOR: '이 사진을 수채화 풍으로 바꿔 주세요. 구도는 그대로 유지하세요.',
  SKETCH: '이 사진을 연필 스케치 풍으로 바꿔 주세요. 구도는 그대로 유지하세요.',
};

/** 정답 등 서버만 알아야 하는 값은 메모리에 보관하고 라운드 id 로만 주고받음 (1시간 후 만료) */
const rounds = new Map<string, { value: unknown; expires: number }>();
function remember(value: unknown) {
  const now = Date.now();
  for (const [k, v] of rounds) if (v.expires < now) rounds.delete(k);
  const id = randomUUID();
  rounds.set(id, { value, expires: now + ROUND_TTL });
  return id;
}
function recall<T>(id: string): T | null {
  const r = rounds.get(id);
  return r && r.expires > Date.now() ? (r.value as T) : null;
}

const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T>(arr: readonly T[], n: number) => shuffle(arr).slice(0, n);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const countBy = (values: string[]) => {
  const m: Record<string, number> = {};
  for (const v of values) m[v] = (m[v] ?? 0) + 1;
  return m;
};
const topOf = (m: Record<string, number>): [string, number] | null => {
  let best: [string, number] | null = null;
  for (const [k, v] of Object.entries(m)) if (!best || v > best[1]) best = [k, v];
  return best;
};
/** 팀 퍼즐 조각이 열리는 순서 (팀·주마다 다르고 같은 주에는 같음) */
function unlockOrder(seed: string): number[] {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const arr = [...Array(16).keys()];
  for (let i = 15; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const todayStart = () => new Date(`${kstDate()}T00:00:00+09:00`);
const notFound = (msg: string) => AppError.notFound(msg);
const bad = (msg: string, status = HttpStatus.BAD_REQUEST) => new AppError(ErrorCode.VALIDATION_FAILED, msg, status);

/**
 * 동료 게임 (점수형이 아닌 것): 오늘의 질문(팀 텔레파시·밸런스), 팀 퍼즐, 이 물건의 주인은?, TMI 퀴즈,
 * AI 퀴즈·AI 제시어·AI 밈·AI 사진 변환. AI 키가 없으면 AI 항목은 기본 콘텐츠로 대체하거나 안내만 한다.
 */
@Injectable()
export class SocialGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
    private readonly ai: AiService,
  ) {}

  // ── 공통 조회 ──

  private async teamOf(groupId: string, userId: string) {
    return this.prisma.teamMember.findFirst({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true, team: { select: { name: true } } } });
  }
  private async teamMemberIds(teamId: string) {
    return (await this.prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } })).map((r) => r.userId);
  }
  private async groupMemberIds(groupId: string) {
    const rows = await this.prisma.groupMembership.findMany({ where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }
  private async usersById(ids: string[]) {
    const rows = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
    return new Map(rows.map((u) => [u.id, u]));
  }
  private async assertEnabled(groupId: string) {
    await this.features.assertEnabled(groupId, FEATURE);
  }
  private async enabled(groupId: string) {
    return this.features.isEnabled(groupId, FEATURE);
  }

  /** 하루 AI 그림·변환 횟수 (1인) */
  private async assertImageQuota(groupId: string, userId: string) {
    const cfg = await this.settings.get(groupId, FEATURE);
    const used = await this.prisma.gamePhoto.count({ where: { groupId, userId, kind: { in: ['AI_WORD', 'TRANSFORM'] }, createdAt: { gte: todayStart() } } });
    if (used >= Number(cfg.aiImageDaily)) throw bad(`오늘 AI 그림은 ${cfg.aiImageDaily}번까지 만들 수 있어요`, HttpStatus.TOO_MANY_REQUESTS);
  }

  // ── 오늘의 질문: 팀 텔레파시 · 밸런스 게임 ──

  async daily(groupId: string, viewer: AuthUser) {
    if (!(await this.enabled(groupId))) return { enabled: false as const };
    const today = kstDate();
    const d = dayIndex(today);
    const tp = TELEPATHY_PROMPTS[mod(d, TELEPATHY_PROMPTS.length)];
    const bp = BALANCE_PROMPTS[mod(d * 3 + 1, BALANCE_PROMPTS.length)];
    const [picks, team, cfg] = await Promise.all([
      this.prisma.dailyPick.findMany({ where: { groupId, date: today } }),
      this.teamOf(groupId, viewer.id),
      this.settings.get(groupId, FEATURE),
    ]);
    const teamIds = team ? await this.teamMemberIds(team.teamId) : [];
    const teamSet = new Set(teamIds);
    const tPicks = picks.filter((p) => p.kind === 'TELEPATHY');
    const bPicks = picks.filter((p) => p.kind === 'BALANCE');
    const mine = (kind: string) => picks.find((p) => p.userId === viewer.id && p.kind === kind)?.answer ?? null;
    const teamCounts = countBy(tPicks.filter((p) => teamSet.has(p.userId)).map((p) => p.answer));
    const answered = Object.values(teamCounts).reduce((a, b) => a + b, 0);
    const top = topOf(teamCounts);
    return {
      enabled: true as const,
      date: today,
      telepathy: {
        key: tp.key,
        question: tp.question,
        options: tp.options,
        my: mine('TELEPATHY'),
        team: team
          ? {
              id: team.teamId,
              name: team.team.name,
              size: teamIds.length,
              answered,
              topIndex: top ? Number(top[0]) : null,
              topCount: top?.[1] ?? 0,
              sync: answered ? Math.round(((top?.[1] ?? 0) / answered) * 100) : 0,
              counts: tp.options.map((_, i) => teamCounts[String(i)] ?? 0),
            }
          : null,
      },
      balance: {
        key: bp.key,
        question: bp.question,
        a: bp.a,
        b: bp.b,
        my: mine('BALANCE'),
        total: bPicks.length,
        countA: bPicks.filter((p) => p.answer === 'A').length,
        countB: bPicks.filter((p) => p.answer === 'B').length,
      },
      reward: Number(cfg.dailyPickReward),
      bonus: Number(cfg.telepathyBonus),
    };
  }

  async answerDaily(actor: AuthUser, groupId: string, kind: 'TELEPATHY' | 'BALANCE', raw: string | number) {
    await this.assertEnabled(groupId);
    const today = kstDate();
    const d = dayIndex(today);
    const def = kind === 'TELEPATHY' ? TELEPATHY_PROMPTS[mod(d, TELEPATHY_PROMPTS.length)] : BALANCE_PROMPTS[mod(d * 3 + 1, BALANCE_PROMPTS.length)];
    const answer = kind === 'TELEPATHY' ? String(raw) : String(raw).toUpperCase();
    if (kind === 'TELEPATHY') {
      const idx = Number(answer);
      if (!Number.isInteger(idx) || idx < 0 || idx >= (def as (typeof TELEPATHY_PROMPTS)[number]).options.length) throw bad('보기를 다시 골라 주세요');
    } else if (answer !== 'A' && answer !== 'B') throw bad('A 또는 B 를 골라 주세요');
    const done = await this.prisma.dailyPick.findUnique({ where: { groupId_userId_date_kind: { groupId, userId: actor.id, date: today, kind } } });
    if (done) throw new AppError(ErrorCode.VALIDATION_FAILED, '오늘은 이미 답했어요', HttpStatus.CONFLICT);

    const team = await this.teamOf(groupId, actor.id);
    const cfg = await this.settings.get(groupId, FEATURE);
    // 같은 답 보너스: 나를 뺀 팀원 중 가장 많이 고른 답과 내 답이 같고, 그 답을 고른 팀원이 2명 이상
    let bonus = false;
    if (kind === 'TELEPATHY' && team) {
      const others = (await this.teamMemberIds(team.teamId)).filter((id) => id !== actor.id);
      const picks = await this.prisma.dailyPick.findMany({ where: { groupId, date: today, kind: 'TELEPATHY', userId: { in: others } }, select: { answer: true } });
      const top = topOf(countBy(picks.map((p) => p.answer)));
      bonus = !!top && top[0] === answer && top[1] >= 2;
    }
    await this.prisma.dailyPick.create({ data: { groupId, userId: actor.id, teamId: team?.teamId ?? null, date: today, kind, promptKey: def.key, answer } });
    const reward = Number(cfg.dailyPickReward);
    await this.points.addLedger(groupId, [
      { userId: actor.id, amount: reward, kind: 'GAME_REWARD', refId: `daily:${kind}:${today}`, memo: `오늘의 질문 참여 (${kind === 'TELEPATHY' ? '팀 텔레파시' : '밸런스 게임'})` },
      ...(bonus ? [{ userId: actor.id, amount: Number(cfg.telepathyBonus), kind: 'GAME_REWARD', refId: `telepathy-bonus:${today}`, memo: '팀 텔레파시: 같은 답 보너스' }] : []),
    ]);
    return { ok: true, bonus, reward };
  }

  // ── 팀 퍼즐 ──

  private async puzzleState(groupId: string, teamId: string, teamName: string, week: string) {
    const memberIds = await this.teamMemberIds(teamId);
    const end = addDays(week, 6);
    const plays = await this.prisma.gameScore.groupBy({
      by: ['userId'],
      where: { groupId, userId: { in: memberIds }, playedOn: { gte: week, lte: end } },
      _count: { _all: true },
    });
    const total = plays.reduce((sum, p) => sum + p._count._all, 0);
    const pieces = Math.min(16, total);
    const themeIdx = mod(Math.floor(dayIndex(week) / 7), PUZZLE_THEMES.length);
    const theme = PUZZLE_THEMES[themeIdx];
    const unlocked = new Set(unlockOrder(`${teamId}:${week}`).slice(0, pieces));
    return { memberIds, plays, pieces, theme, unlocked, teamName };
  }

  /** 팀 퍼즐 완성 시 팀원 모두에게 보상 (한 번만). 게임 한 판 저장 뒤에 호출 */
  async settleTeamPuzzle(groupId: string, userId: string) {
    const team = await this.teamOf(groupId, userId);
    if (!team || !(await this.enabled(groupId))) return;
    const week = weekStart(kstDate());
    const st = await this.puzzleState(groupId, team.teamId, team.team.name, week);
    if (st.pieces < 16) return;
    const cfg = await this.settings.get(groupId, FEATURE);
    await this.points.addLedger(
      groupId,
      st.memberIds.map((uid) => ({ userId: uid, amount: Number(cfg.puzzleReward), kind: 'GAME_REWARD', refId: `puzzle:${team.teamId}:${week}`, memo: `팀 퍼즐 완성: ${st.theme.name}` })),
    );
  }

  async puzzle(groupId: string, viewer: AuthUser) {
    if (!(await this.enabled(groupId))) return { enabled: false as const };
    const week = weekStart(kstDate());
    const cfg = await this.settings.get(groupId, FEATURE);
    const team = await this.teamOf(groupId, viewer.id);
    if (!team) return { enabled: true as const, team: null, week, theme: null, pieces: 0, total: 16, completed: false, reward: Number(cfg.puzzleReward), tiles: [], contributions: [] };
    const st = await this.puzzleState(groupId, team.teamId, team.team.name, week);
    const users = await this.usersById(st.memberIds);
    return {
      enabled: true as const,
      team: { id: team.teamId, name: team.team.name },
      week,
      theme: { key: st.theme.key, name: st.theme.name },
      pieces: st.pieces,
      total: 16,
      completed: st.pieces >= 16,
      reward: Number(cfg.puzzleReward),
      tiles: st.theme.tiles.map((emoji, index) => ({ index, emoji, unlocked: st.unlocked.has(index) })),
      contributions: st.memberIds
        .map((id) => ({ user: users.get(id) ?? null, plays: st.plays.find((p) => p.userId === id)?._count._all ?? 0 }))
        .sort((a, b) => b.plays - a.plays),
    };
  }

  // ── 이 물건의 주인은 누구? ──

  async putBelonging(actor: AuthUser, groupId: string, input: BelongingInput) {
    await this.assertEnabled(groupId);
    if (!input.mediaUrl.startsWith('/uploads/') || !IMG_EXT.test(input.mediaUrl)) throw bad('사진 파일만 올릴 수 있어요');
    // 한 사람당 하나: 새로 올리면 이전 사진은 교체
    await this.prisma.$transaction(async (tx) => {
      await tx.gamePhoto.deleteMany({ where: { groupId, userId: actor.id, kind: 'BELONGING' } });
      await tx.gamePhoto.create({ data: { groupId, userId: actor.id, kind: 'BELONGING', mediaUrl: input.mediaUrl, caption: input.caption?.trim() || null } });
    });
    return { ok: true };
  }

  async removeBelonging(actor: AuthUser, groupId: string) {
    await this.assertEnabled(groupId);
    await this.prisma.gamePhoto.deleteMany({ where: { groupId, userId: actor.id, kind: 'BELONGING' } });
    return { ok: true };
  }

  async belongingRound(groupId: string, viewer: AuthUser) {
    if (!(await this.enabled(groupId))) return { enabled: false as const };
    const cfg = await this.settings.get(groupId, FEATURE);
    const [photos, members, own] = await Promise.all([
      this.prisma.gamePhoto.findMany({ where: { groupId, kind: 'BELONGING', userId: { not: viewer.id } }, select: { id: true, mediaUrl: true, caption: true, userId: true }, take: 200 }),
      this.groupMemberIds(groupId),
      this.prisma.gamePhoto.findFirst({ where: { groupId, userId: viewer.id, kind: 'BELONGING' }, select: { mediaUrl: true, caption: true } }),
    ]);
    const others = members.filter((id) => id !== viewer.id);
    const chosen = pick(photos, 5);
    const users = await this.usersById(members);
    const items = chosen.map((p) => {
      const decoys = pick(others.filter((id) => id !== p.userId), 3);
      return {
        id: p.id,
        mediaUrl: p.mediaUrl,
        caption: p.caption,
        choices: shuffle([p.userId, ...decoys]).map((id) => users.get(id)).filter(Boolean),
      };
    });
    return { enabled: true as const, available: items.length >= 1 && others.length >= 4, items, reward: Number(cfg.belongingReward), mine: own ?? null };
  }

  async guessBelonging(actor: AuthUser, groupId: string, input: { photoId: string; userId: string }) {
    await this.assertEnabled(groupId);
    const photo = await this.prisma.gamePhoto.findFirst({ where: { id: input.photoId, groupId, kind: 'BELONGING' } });
    if (!photo) throw notFound('사진을 찾을 수 없어요');
    const correct = photo.userId === input.userId;
    if (correct && photo.userId !== actor.id) {
      const cfg = await this.settings.get(groupId, FEATURE);
      await this.points.addLedger(groupId, [{ userId: actor.id, amount: Number(cfg.belongingReward), kind: 'GAME_REWARD', refId: `belong:${photo.id}`, memo: '물건 주인 맞히기' }]);
    }
    const owner = (await this.usersById([photo.userId])).get(photo.userId) ?? null;
    return { correct, owner };
  }

  // ── TMI 퀴즈 ──

  async addFact(actor: AuthUser, groupId: string, text: string) {
    await this.assertEnabled(groupId);
    const count = await this.prisma.profileFact.count({ where: { groupId, userId: actor.id } });
    if (count >= 5) throw bad('TMI는 5개까지 남길 수 있어요. 하나를 지우고 다시 써 주세요');
    const row = await this.prisma.profileFact.create({ data: { groupId, userId: actor.id, text } });
    return { id: row.id };
  }

  async removeFact(actor: AuthUser, groupId: string, id: string) {
    await this.assertEnabled(groupId);
    await this.prisma.profileFact.deleteMany({ where: { id, groupId, userId: actor.id } });
    return { ok: true };
  }

  async tmiRound(groupId: string, viewer: AuthUser) {
    if (!(await this.enabled(groupId))) return { enabled: false as const };
    const cfg = await this.settings.get(groupId, FEATURE);
    const [facts, members, mine] = await Promise.all([
      this.prisma.profileFact.findMany({ where: { groupId, userId: { not: viewer.id } }, select: { id: true, text: true, userId: true }, take: 300 }),
      this.groupMemberIds(groupId),
      this.prisma.profileFact.findMany({ where: { groupId, userId: viewer.id }, orderBy: { createdAt: 'asc' }, select: { id: true, text: true } }),
    ]);
    const others = members.filter((id) => id !== viewer.id);
    const users = await this.usersById(members);
    const items = pick(facts, 5).map((f) => ({
      id: f.id,
      text: f.text,
      choices: shuffle([f.userId, ...pick(others.filter((id) => id !== f.userId), 3)]).map((id) => users.get(id)).filter(Boolean),
    }));
    return { enabled: true as const, available: items.length >= 1 && others.length >= 4, items, mine, reward: Number(cfg.tmiReward) };
  }

  async guessFact(actor: AuthUser, groupId: string, input: FactGuessInput) {
    await this.assertEnabled(groupId);
    const fact = await this.prisma.profileFact.findFirst({ where: { id: input.factId, groupId } });
    if (!fact) throw notFound('TMI를 찾을 수 없어요');
    const correct = fact.userId === input.userId;
    if (correct && fact.userId !== actor.id) {
      const cfg = await this.settings.get(groupId, FEATURE);
      await this.points.addLedger(groupId, [{ userId: actor.id, amount: Number(cfg.tmiReward), kind: 'GAME_REWARD', refId: `tmi:${fact.id}`, memo: 'TMI 퀴즈 정답' }]);
    }
    const owner = (await this.usersById([fact.userId])).get(fact.userId) ?? null;
    return { correct, owner };
  }

  // ── AI 게임 ──

  async aiStatus(groupId: string) {
    const cfg = await this.settings.get(groupId, FEATURE);
    return { text: this.ai.textEnabled, image: this.ai.imageEnabled, quizEnabled: !!cfg.aiQuizEnabled, imageDaily: Number(cfg.aiImageDaily) };
  }

  /** AI 퀴즈: AI 가 사내 상식 문제 5개를 만들고, 없으면 기본 문제 은행에서 뽑음 */
  async aiQuizRound(groupId: string) {
    if (!(await this.enabled(groupId))) return { enabled: false as const };
    const cfg = await this.settings.get(groupId, FEATURE);
    if (!cfg.aiQuizEnabled) return { enabled: true as const, available: false, reason: '관리자가 AI 퀴즈를 꺼 두었어요' };
    type Item = { question: string; choices: string[]; answer: number };
    let items: Item[] | null = null;
    let source: 'AI' | 'BANK' = 'BANK';
    if (this.ai.textEnabled) {
      const list = await this.ai.json<Item[]>(
        '회사 동료들이 풀 가벼운 사내 상식 객관식 문제 5개를 만드세요. 직장 용어·업무 상식·회사 생활 위주로, 보기는 4개, 정답은 0부터 시작하는 번호(answer)입니다. JSON 배열 [{"question","choices","answer"}] 만 출력하세요.',
        1400,
      );
      if (Array.isArray(list) && list.length >= 5 && list.every((q) => typeof q.question === 'string' && Array.isArray(q.choices) && q.choices.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3)) {
        items = list.slice(0, 5);
        source = 'AI';
      }
    }
    if (!items) items = pick(AI_QUIZ_BANK, 5).map((q) => ({ question: q.question, choices: [...q.choices], answer: q.answer }));
    const roundId = remember(items.map((i) => i.answer));
    return { enabled: true as const, available: true, source, roundId, items: items.map((i) => ({ question: i.question, choices: i.choices })) };
  }

  async aiQuizCheck(actor: AuthUser, groupId: string, input: { roundId: string; index: number; choice: number }) {
    await this.assertEnabled(groupId);
    const answers = recall<number[]>(input.roundId);
    if (!answers || input.index >= answers.length) throw notFound('문제가 만료됐어요. 새 문제를 받아 주세요');
    const correct = answers[input.index] === input.choice;
    if (correct) {
      const cfg = await this.settings.get(groupId, FEATURE);
      await this.points.addLedger(groupId, [{ userId: actor.id, amount: Number(cfg.aiQuizReward), kind: 'GAME_REWARD', refId: `aiquiz:${input.roundId}:${input.index}`, memo: 'AI 퀴즈 정답' }]);
    }
    return { correct, answer: answers[input.index] };
  }

  /** AI 밈: 사진을 보고 자막 후보 3개 (AI 가 없으면 빈 목록 → 직접 쓰기) */
  async memeCaptions(groupId: string, mediaUrl: string) {
    await this.assertEnabled(groupId);
    if (!mediaUrl.startsWith('/uploads/') || !IMG_EXT.test(mediaUrl)) throw bad('사진에만 자막을 붙일 수 있어요');
    if (!this.ai.textEnabled) return { source: 'NONE' as const, captions: [] as string[] };
    const list = await this.ai.visionJson<string[]>(
      mediaUrl,
      '이 사진을 보고 회사 동료들이 웃을 만한 짧은 한국어 자막 3개를 만드세요. 각 20자 이내, 사람을 놀리거나 비하하지 않게. JSON 문자열 배열만 출력하세요.',
    );
    const captions = Array.isArray(list) ? list.filter((c) => typeof c === 'string').slice(0, 3) : [];
    return { source: captions.length ? ('AI' as const) : ('NONE' as const), captions };
  }

  /** AI 제시어 맞히기: AI 가 단어 그림을 그리고 보기 4개 중 맞힘 */
  async aiWordRound(groupId: string, viewer: AuthUser) {
    if (!(await this.enabled(groupId))) return { enabled: false as const };
    if (!this.ai.imageEnabled) return { enabled: true as const, available: false, reason: 'AI 그림 기능 설정(IMAGE_API_KEY)이 필요해요' };
    await this.assertImageQuota(groupId, viewer.id);
    const word = pick(WORD_BANK, 1)[0];
    const png = await this.ai.generateImage(`"${word}"을(를) 떠올릴 수 있는 간단하고 밝은 일러스트. 글자와 워터마크 없이.`);
    if (!png) return { enabled: true as const, available: false, reason: 'AI가 그림을 만들지 못했어요. 잠시 뒤 다시 해 주세요' };
    const saved = saveBuffer(png, 'png');
    await this.prisma.gamePhoto.create({ data: { groupId, userId: viewer.id, kind: 'AI_WORD', mediaUrl: saved.url } });
    const choices = shuffle([word, ...pick(WORD_BANK.filter((w) => w !== word), 3)]);
    return { enabled: true as const, available: true, roundId: remember(word), imageUrl: saved.url, choices };
  }

  async aiWordCheck(actor: AuthUser, groupId: string, input: { roundId: string; choice: string }) {
    await this.assertEnabled(groupId);
    const word = recall<string>(input.roundId);
    if (!word) throw notFound('문제가 만료됐어요. 새 문제를 받아 주세요');
    const correct = input.choice === word;
    if (correct) {
      const cfg = await this.settings.get(groupId, FEATURE);
      await this.points.addLedger(groupId, [{ userId: actor.id, amount: Number(cfg.aiWordReward), kind: 'GAME_REWARD', refId: `aiword:${input.roundId}`, memo: 'AI 제시어 맞히기' }]);
    }
    return { correct, answer: word };
  }

  /** AI 사진 변환: 내 사진을 만화·수채화·스케치 풍으로 (하루 횟수 제한) */
  async transform(actor: AuthUser, groupId: string, input: { mediaUrl: string; style: 'COMIC' | 'WATERCOLOR' | 'SKETCH' }) {
    await this.assertEnabled(groupId);
    if (!input.mediaUrl.startsWith('/uploads/') || !IMG_EXT.test(input.mediaUrl)) throw bad('사진 파일만 변환할 수 있어요');
    if (!this.ai.imageEnabled) throw bad('AI 그림 기능 설정(IMAGE_API_KEY)이 필요해요');
    await this.assertImageQuota(groupId, actor.id);
    const path = uploadPathOf(input.mediaUrl);
    let source: Buffer;
    try {
      if (!path) throw new Error('bad path');
      source = readFileSync(path);
    } catch {
      throw notFound('원본 사진을 찾을 수 없어요');
    }
    const mime = input.mediaUrl.endsWith('.png') ? 'image/png' : input.mediaUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const out = await this.ai.editImage(source, mime, TRANSFORM_PROMPT[input.style]);
    if (!out) throw bad('AI가 사진을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요', HttpStatus.SERVICE_UNAVAILABLE);
    const saved = saveBuffer(out, 'png');
    await this.prisma.gamePhoto.create({ data: { groupId, userId: actor.id, kind: 'TRANSFORM', mediaUrl: saved.url, caption: input.style } });
    return { url: saved.url, style: input.style };
  }
}
