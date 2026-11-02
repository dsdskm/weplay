import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@weplay/db';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { CASE_BANK, CaseFile, ErrorCode, FeatureKey, kstDate, turnGameDef } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { AiService } from '../ai/ai.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';
import { PointsBadgeService } from '../points-badge/points-badge.service';
import { saveBuffer } from '../uploads/uploads.service';

const FEATURE = FeatureKey.MINI_GAMES;
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const HOUR = 3_600_000;
const TWENTY_Q_MAX = 20;
const NOMINATE_MAX = 10;
const TURN_TYPES = ['TELEPHONE', 'STORY', 'BOMB', 'TWENTY_Q', 'NOMINATE', 'DRAW_RELAY', 'VIDEO_RELAY', 'CHAIN_QUIZ', 'DETECTIVE', 'AI_TELEPHONE'] as const;
/** 차례마다 한 기록을 이어 쓰는 방식 (act 에서 expectedKind 로 검사) */
const CHAIN_TYPES: string[] = ['TELEPHONE', 'STORY', 'DRAW_RELAY', 'VIDEO_RELAY', 'AI_TELEPHONE'];
/** 공개 화면에서 이어 보여 주는 기록 종류 */
const CHAIN_SHOWN: Record<string, string[]> = {
  TELEPHONE: ['TEXT', 'DRAWING'],
  STORY: ['TEXT'],
  DRAW_RELAY: ['DRAWING'],
  VIDEO_RELAY: ['VIDEO'],
  AI_TELEPHONE: ['AI_IMAGE'],
};
const KIND_HINT: Record<string, string> = { TEXT: '이번 차례는 글이에요', DRAWING: '이번 차례는 그림이에요', VIDEO: '이번 차례는 영상이에요' };

export const createTurnGameSchema = z.object({
  type: z.enum(TURN_TYPES),
  title: z.string().trim().min(1).max(60),
  teamId: z.string().min(1).nullable().optional(),
  rounds: z.number().int().min(1).max(3).optional(),
  secret: z.string().trim().min(1).max(40).optional(),
  hint: z.string().trim().max(60).optional(),
  question: z.string().trim().min(1).max(100).optional(),
});
export type CreateTurnGameInput = z.infer<typeof createTurnGameSchema>;

export const turnActSchema = z.object({
  kind: z.enum(['TEXT', 'DRAWING', 'VIDEO', 'PASS', 'QUESTION', 'GUESS', 'ANSWER', 'END', 'QUIZ', 'CLUE']),
  text: z.string().trim().max(500).optional(),
  mediaUrl: z.string().max(300).optional(),
  targetUserId: z.string().min(1).optional(),
  entryId: z.string().min(1).optional(),
  reply: z.enum(['YES', 'NO', 'MAYBE']).optional(),
  /** 체인 퀴즈: 새로 낼 문제와 정답 */
  question: z.string().trim().max(200).optional(),
  answer: z.string().trim().max(100).optional(),
});
export type TurnActInput = z.infer<typeof turnActSchema>;

type Game = NonNullable<Awaited<ReturnType<PrismaService['turnGame']['findUnique']>>>;
type Config = {
  rounds?: number;
  fuse?: number;
  passes?: number;
  secret?: string;
  hint?: string;
  question?: string;
  /** AI 협동 추리 사건 (범인은 게임이 끝날 때까지 화면에 나오지 않음) */
  case?: CaseFile;
};

const bad = (msg: string, status = HttpStatus.BAD_REQUEST) => new AppError(ErrorCode.VALIDATION_FAILED, msg, status);
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
const todayStart = () => new Date(`${kstDate()}T00:00:00+09:00`);

/**
 * 비동기 턴제 게임. 동시에 접속하지 않아도 내 차례에 한 번씩 하고 넘기는 방식.
 * - 이어 쓰기: 그림 전화·릴레이 소설·그림 이어그리기·영상 릴레이·AI 그림 전화 (진행 중에는 앞사람 것만 보이고, 끝나면 전체 공개)
 * - 체인 퀴즈: 앞사람이 낸 퀴즈를 맞히고 새 퀴즈를 낸다. 맞히면 보상
 * - AI 협동 추리: 사건(AI 또는 기본 사건)의 단서를 한 명씩 열고, 범인을 맞히면 모두 보상
 * - 폭탄 돌리기 / 스무고개 / 지목 릴레이(칭찬 릴레이 포함)
 * 제한 시간 처리는 스케줄러 없이 조회·행동할 때 처리(tick)
 */
@Injectable()
export class TurnGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
    private readonly ai: AiService,
  ) {}

  private cfg(groupId: string) {
    return this.settings.get(groupId, FEATURE);
  }

  /** 볼 수 있는 팀 범위: 그룹 ADMIN은 전체, 그 외는 내 팀 + 그룹 전체 게임 */
  private async myTeamIds(groupId: string, userId: string) {
    const rows = await this.prisma.teamMember.findMany({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true } });
    return rows.map((r) => r.teamId);
  }

  /** 게임에 참여할 수 있는 사람 (팀 게임이면 팀원, 아니면 그룹 활성 구성원) */
  private async eligible(groupId: string, teamId: string | null) {
    if (teamId) {
      const rows = await this.prisma.teamMember.findMany({ where: { teamId, user: { status: 'ACTIVE' } }, select: { userId: true } });
      return new Set(rows.map((r) => r.userId));
    }
    const rows = await this.prisma.groupMembership.findMany({ where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } }, select: { userId: true } });
    return new Set(rows.map((r) => r.userId));
  }

  private async gameFor(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const game = await this.prisma.turnGame.findFirst({ where: { id, groupId } });
    if (!game) throw AppError.notFound('게임을 찾을 수 없어요');
    if (game.teamId && !isGroupAdmin && !(await this.myTeamIds(groupId, viewer.id)).includes(game.teamId)) throw AppError.forbidden('우리 팀 게임이 아니에요');
    return this.tick(game);
  }

  private feeRef = (gameId: string) => `turn:${gameId}`;

  private async chargeFee(game: Game, userId: string) {
    const cfg = await this.cfg(game.groupId);
    const def = turnGameDef(game.type);
    await this.points.addLedger(game.groupId, [{ userId, amount: -Number(cfg.turnEntryFee), kind: 'GAME_FEE', refId: this.feeRef(game.id), memo: `${def?.name ?? '턴제 게임'} 참가비: ${game.title}` }]);
  }

  private async refundAll(game: Game) {
    await this.prisma.pointLedger.deleteMany({ where: { groupId: game.groupId, kind: 'GAME_FEE', refId: this.feeRef(game.id) } });
  }

  private async order(gameId: string) {
    return this.prisma.turnParticipant.findMany({ where: { gameId }, orderBy: [{ position: 'asc' }, { joinedAt: 'asc' }] });
  }

  private totalTurns(game: Game, n: number) {
    return n * ((game.config as Config).rounds ?? 1);
  }

  /** 제한 시간이 지난 턴 처리 */
  private async tick(game: Game): Promise<Game> {
    if (game.status !== 'PLAYING' || !game.turnDeadline || game.turnDeadline > new Date()) return game;
    if (CHAIN_TYPES.includes(game.type) || game.type === 'CHAIN_QUIZ') {
      if (game.currentUserId) await this.prisma.turnEntry.create({ data: { gameId: game.id, userId: game.currentUserId, kind: 'SKIP' } });
      await this.advance(game);
    } else if (game.type === 'DETECTIVE') {
      // 시간이 지나면 다음 단서를 자동으로 열고 넘김. 단서를 다 열었으면 해결 실패로 끝
      const cs = (game.config as Config).case;
      const revealed = await this.prisma.turnEntry.count({ where: { gameId: game.id, kind: 'CLUE' } });
      if (cs && game.currentUserId && revealed < cs.clues.length) {
        await this.prisma.turnEntry.create({ data: { gameId: game.id, userId: game.currentUserId, kind: 'CLUE', text: cs.clues[revealed] } });
        await this.advance(game);
      } else await this.finish(game, { reason: 'TIMEOUT' });
    } else if (game.type === 'BOMB') {
      await this.finish(game, { loserId: game.currentUserId, reason: 'TIMEOUT' });
    } else {
      await this.finish(game, game.type === 'TWENTY_Q' ? { winnerId: game.createdById, hostWin: true, reason: 'TIMEOUT' } : { reason: 'TIMEOUT' });
    }
    return (await this.prisma.turnGame.findUnique({ where: { id: game.id } })) as Game;
  }

  /** 다음 턴으로. 이어 쓰기류는 마지막 턴이면 종료, 추리 게임은 정답을 맞힐 때까지 계속 */
  private async advance(game: Game) {
    const cfg = await this.cfg(game.groupId);
    const order = await this.order(game.id);
    const next = game.turnIndex + 1;
    if (game.type !== 'DETECTIVE' && next >= this.totalTurns(game, order.length)) return this.finish(game, {});
    await this.prisma.turnGame.updateMany({
      where: { id: game.id, turnIndex: game.turnIndex, status: 'PLAYING' },
      data: { turnIndex: next, currentUserId: order[next % order.length].userId, turnDeadline: new Date(Date.now() + Number(cfg.turnHours) * HOUR) },
    });
  }

  /** 게임 종료와 포인트 정산 (한 번만) */
  private async finish(game: Game, result: { winnerId?: string | null; loserId?: string | null; hostWin?: boolean; reason?: string; solved?: boolean }) {
    const claimed = await this.prisma.turnGame.updateMany({
      where: { id: game.id, status: 'PLAYING' },
      data: { status: 'DONE', endedAt: new Date(), currentUserId: null, turnDeadline: null, result },
    });
    if (claimed.count === 0) return;
    const cfg = await this.cfg(game.groupId);
    const def = turnGameDef(game.type);
    const name = `${def?.name ?? '턴제 게임'}: ${game.title}`;
    const ref = `turn-done:${game.id}`;
    const people = (await this.order(game.id)).map((p) => p.userId);
    const entries: Parameters<PointsBadgeService['addLedger']>[1] = [];
    if (game.type === 'BOMB') {
      for (const uid of people) {
        if (uid === result.loserId) entries.push({ userId: uid, amount: -Number(cfg.bombPenalty), kind: 'GAME_PENALTY', refId: ref, memo: `💥 ${name} 폭탄이 터졌어요` });
        else entries.push({ userId: uid, amount: Number(cfg.turnCompleteReward), kind: 'GAME_REWARD', refId: ref, memo: `${name} 생존 보상` });
      }
    } else if (game.type === 'TWENTY_Q') {
      if (result.winnerId) entries.push({ userId: result.winnerId, amount: Number(cfg.twentyQReward), kind: 'GAME_REWARD', refId: ref, memo: result.hostWin ? `${name} 출제자 승리` : `${name} 정답!` });
    } else if (game.type === 'DETECTIVE') {
      if (result.solved) for (const uid of people) entries.push({ userId: uid, amount: Number(cfg.detectiveReward), kind: 'GAME_REWARD', refId: ref, memo: `${name} 범인 검거!` });
    } else if (game.type === 'CHAIN_QUIZ') {
      const writers = await this.prisma.turnEntry.findMany({ where: { gameId: game.id, kind: 'QUIZ' }, distinct: ['userId'], select: { userId: true } });
      for (const w of writers) entries.push({ userId: w.userId, amount: Number(cfg.turnCompleteReward), kind: 'GAME_REWARD', refId: ref, memo: `${name} 완주 보상` });
    } else {
      const done = await this.prisma.turnEntry.findMany({ where: { gameId: game.id, kind: { in: ['TEXT', 'DRAWING', 'VIDEO', 'AI_IMAGE'] } }, distinct: ['userId'], select: { userId: true } });
      for (const d of done) entries.push({ userId: d.userId, amount: Number(cfg.turnCompleteReward), kind: 'GAME_REWARD', refId: ref, memo: `${name} 완주 보상` });
    }
    await this.points.addLedger(game.groupId, entries);
  }

  /** 목록: open(모집·진행), mine(참가 중), done(끝난 게임) */
  async list(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, status: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize, myTurnCount: 0 };
    const teamIds = await this.myTeamIds(groupId, viewer.id);
    const scope = isGroupAdmin ? {} : { OR: [{ teamId: null }, { teamId: { in: teamIds } }] };
    // 제한 시간이 지난 게임 먼저 처리
    const expired = await this.prisma.turnGame.findMany({ where: { groupId, status: 'PLAYING', turnDeadline: { lt: new Date() } }, take: 20 });
    for (const g of expired) await this.tick(g);

    const where = {
      groupId,
      ...scope,
      ...(status === 'done' ? { status: { in: ['DONE', 'CANCELED'] } } : status === 'mine' ? { participants: { some: { userId: viewer.id } }, status: { in: ['RECRUITING', 'PLAYING'] } } : { status: { in: ['RECRUITING', 'PLAYING'] } }),
    };
    const [rows, total, myTurnCount, teams] = await Promise.all([
      this.prisma.turnGame.findMany({
        where,
        include: { _count: { select: { participants: true, entries: true } }, participants: { where: { userId: viewer.id }, select: { id: true } } },
        orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.turnGame.count({ where }),
      this.prisma.turnGame.count({ where: { groupId, status: 'PLAYING', currentUserId: viewer.id } }),
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true } }),
    ]);
    const teamName = new Map(teams.map((t) => [t.id, t.name]));
    const userIds = [...new Set(rows.map((r) => r.currentUserId).filter(Boolean) as string[])];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: userSelect });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      enabled: true as const,
      myTurnCount,
      teams: teams.filter((t) => isGroupAdmin || teamIds.includes(t.id)),
      ...paged(
        rows.map((g) => ({
          id: g.id,
          type: g.type,
          title: g.title,
          status: g.status,
          teamName: g.teamId ? (teamName.get(g.teamId) ?? null) : null,
          participantCount: g._count.participants,
          entryCount: g._count.entries,
          joined: g.participants.length > 0,
          isMyTurn: g.status === 'PLAYING' && g.currentUserId === viewer.id && g.type !== 'TWENTY_Q',
          // 스무고개는 출제자가 늘 "현재" → 차례 표시 대신 진행 중으로
          currentUser: g.type === 'TWENTY_Q' || !g.currentUserId ? null : (byId.get(g.currentUserId) ?? null),
          turnDeadline: g.turnDeadline,
          createdAt: g.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  /** AI 협동 추리 사건: AI 가 만들고, 실패하면 기본 사건 중 하나 */
  private async caseFor(): Promise<CaseFile> {
    if (this.ai.textEnabled) {
      const c = await this.ai.json<CaseFile>(
        '사내 사건 추리 게임의 사건을 만드세요. 직장 동료 3~4명이 등장하고(이름(부서) 형식, 예: "지현(개발)"), 범인은 그중 한 명입니다. setup 은 2문장 이내, clues 는 정확히 5개이며 각 한 문장입니다. 단서를 모두 보면 범인이 하나로 좁혀지도록 쓰세요. {"title","setup","suspects":[],"culprit","clues":[]} 형식의 JSON 만 출력하세요.',
        900,
      );
      if (
        c &&
        typeof c.title === 'string' &&
        typeof c.setup === 'string' &&
        Array.isArray(c.suspects) &&
        c.suspects.length >= 3 &&
        c.suspects.every((s) => typeof s === 'string') &&
        c.suspects.includes(c.culprit) &&
        Array.isArray(c.clues) &&
        c.clues.length === 5 &&
        c.clues.every((s) => typeof s === 'string')
      ) {
        return c;
      }
    }
    return CASE_BANK[randomInt(CASE_BANK.length)];
  }

  async create(actor: AuthUser, groupId: string, isGroupAdmin: boolean, input: CreateTurnGameInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    if (input.teamId && !isGroupAdmin && !(await this.myTeamIds(groupId, actor.id)).includes(input.teamId)) throw AppError.forbidden('우리 팀에서만 만들 수 있어요');
    if (input.type === 'TWENTY_Q' && !input.secret) throw bad('스무고개 정답을 정해 주세요');
    if (input.type === 'NOMINATE' && !input.question) throw bad('릴레이 질문을 정해 주세요');
    if (input.type === 'AI_TELEPHONE' && !this.ai.imageEnabled) throw bad('AI 그림 기능 설정(IMAGE_API_KEY)이 필요해요');
    const cfg = await this.cfg(groupId);
    const immediate = input.type === 'TWENTY_Q' || input.type === 'NOMINATE';
    const config: Config =
      input.type === 'STORY'
        ? { rounds: input.rounds ?? 1 }
        : input.type === 'TWENTY_Q'
          ? { secret: input.secret, hint: input.hint }
          : input.type === 'NOMINATE'
            ? { question: input.question }
            : input.type === 'DETECTIVE'
              ? { case: await this.caseFor() }
              : {};
    const game = await this.prisma.turnGame.create({
      data: {
        groupId,
        teamId: input.teamId ?? null,
        type: input.type,
        title: input.title,
        status: immediate ? 'PLAYING' : 'RECRUITING',
        config: config as unknown as Prisma.InputJsonObject,
        createdById: actor.id,
        currentUserId: immediate ? actor.id : null,
        startedAt: immediate ? new Date() : null,
        // 스무고개는 3일 동안 진행, 지목 릴레이는 턴 제한 시간
        turnDeadline: immediate ? new Date(Date.now() + (input.type === 'TWENTY_Q' ? 72 : Number(cfg.turnHours)) * HOUR) : null,
        participants: { create: { userId: actor.id, position: 0 } },
      },
    });
    await this.chargeFee(game, actor.id);
    return { id: game.id };
  }

  async join(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'RECRUITING') throw bad('지금은 참가할 수 없어요');
    if (!(await this.eligible(groupId, game.teamId)).has(actor.id)) throw AppError.forbidden('참가할 수 없는 게임이에요');
    const exists = await this.prisma.turnParticipant.findUnique({ where: { gameId_userId: { gameId: id, userId: actor.id } } });
    if (exists) return { ok: true };
    const count = await this.prisma.turnParticipant.count({ where: { gameId: id } });
    await this.prisma.turnParticipant.create({ data: { gameId: id, userId: actor.id, position: count } });
    await this.chargeFee(game, actor.id);
    return { ok: true };
  }

  async leave(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'RECRUITING') throw bad('시작한 게임은 나갈 수 없어요');
    if (game.createdById === actor.id) throw bad('만든 사람은 나갈 수 없어요. 대신 취소해 주세요');
    await this.prisma.turnParticipant.deleteMany({ where: { gameId: id, userId: actor.id } });
    await this.prisma.pointLedger.deleteMany({ where: { groupId, userId: actor.id, kind: 'GAME_FEE', refId: this.feeRef(id) } });
    return { ok: true };
  }

  /** 시작: 순서를 섞고 첫 차례를 정함. 폭탄은 숨겨진 횟수(참가자 수 ~ 3배)를 정함 */
  async start(actor: AuthUser, groupId: string, isGroupAdmin: boolean, isManager: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'RECRUITING') throw bad('이미 시작했어요');
    if (game.createdById !== actor.id && !isManager) throw AppError.forbidden('만든 사람만 시작할 수 있어요');
    const def = turnGameDef(game.type);
    const people = await this.order(id);
    if (people.length < (def?.min ?? 2)) throw bad(`${def?.min ?? 2}명 이상 모여야 시작할 수 있어요`);
    const shuffled = [...people].sort(() => Math.random() - 0.5);
    const cfg = await this.cfg(groupId);
    await this.prisma.$transaction(async (tx) => {
      for (const [i, p] of shuffled.entries()) await tx.turnParticipant.update({ where: { id: p.id }, data: { position: i } });
      const config = { ...(game.config as Config), ...(game.type === 'BOMB' ? { fuse: randomInt(people.length, people.length * 3 + 1), passes: 0 } : {}) };
      const first = game.type === 'BOMB' ? shuffled[randomInt(shuffled.length)] : shuffled[0];
      await tx.turnGame.update({
        where: { id },
        data: { status: 'PLAYING', startedAt: new Date(), turnIndex: 0, currentUserId: first.userId, turnDeadline: new Date(Date.now() + Number(cfg.turnHours) * HOUR), config: config as unknown as Prisma.InputJsonObject },
      });
    });
    return { ok: true };
  }

  async cancel(actor: AuthUser, groupId: string, isGroupAdmin: boolean, isManager: boolean, id: string) {
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (!['RECRUITING', 'PLAYING'].includes(game.status)) throw bad('이미 끝난 게임이에요');
    if (game.createdById !== actor.id && !isManager) throw AppError.forbidden('만든 사람만 취소할 수 있어요');
    await this.prisma.turnGame.update({ where: { id }, data: { status: 'CANCELED', endedAt: new Date(), currentUserId: null, turnDeadline: null } });
    await this.refundAll(game);
    return { ok: true };
  }

  /** 내 차례 행동 */
  async act(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: TurnActInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'PLAYING') throw bad('진행 중인 게임이 아니에요');
    const cfg = await this.cfg(groupId);
    const config = game.config as Config;

    if (CHAIN_TYPES.includes(game.type)) {
      if (game.currentUserId !== actor.id) throw bad('내 차례가 아니에요');
      const expected = await this.expectedKind(game);
      if (input.kind !== expected) throw bad(KIND_HINT[expected]);
      if (expected === 'TEXT' && !input.text) throw bad('내용을 입력해 주세요');
      if ((expected === 'DRAWING' || expected === 'VIDEO') && !input.mediaUrl) throw bad(expected === 'DRAWING' ? '그림을 그려 주세요' : '영상을 올려 주세요');
      if (input.mediaUrl && !input.mediaUrl.startsWith('/uploads/')) throw bad('올바르지 않은 파일이에요');
      if (game.type === 'AI_TELEPHONE') return this.aiTelephoneTurn(game, actor, input.text ?? '');
      await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: expected, text: input.text ?? null, mediaUrl: input.mediaUrl ?? null } });
      await this.advance(game);
      return { ok: true };
    }

    if (game.type === 'BOMB') {
      if (game.currentUserId !== actor.id) throw bad('폭탄을 가진 사람만 넘길 수 있어요');
      const people = await this.order(id);
      if (!input.targetUserId || input.targetUserId === actor.id || !people.some((p) => p.userId === input.targetUserId)) throw bad('넘길 참가자를 골라 주세요');
      const passes = (config.passes ?? 0) + 1;
      if (passes >= (config.fuse ?? 1)) {
        // 넘기려는 순간 터짐
        await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'BOOM', targetUserId: input.targetUserId } });
        await this.finish(game, { loserId: actor.id, reason: 'BOOM' });
        return { ok: true, exploded: true };
      }
      const moved = await this.prisma.turnGame.updateMany({
        where: { id, status: 'PLAYING', currentUserId: actor.id },
        data: { currentUserId: input.targetUserId, turnIndex: { increment: 1 }, turnDeadline: new Date(Date.now() + Number(cfg.turnHours) * HOUR), config: { ...config, passes } as unknown as Prisma.InputJsonObject },
      });
      if (moved.count === 0) throw bad('이미 넘어간 폭탄이에요', HttpStatus.CONFLICT);
      await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'PASS', targetUserId: input.targetUserId } });
      return { ok: true, exploded: false };
    }

    if (game.type === 'TWENTY_Q') {
      const isHost = game.createdById === actor.id;
      if (input.kind === 'ANSWER') {
        if (!isHost) throw bad('출제자만 답할 수 있어요');
        if (!input.entryId || !input.reply) throw bad('답할 질문을 골라 주세요');
        const updated = await this.prisma.turnEntry.updateMany({ where: { id: input.entryId, gameId: id, kind: 'QUESTION', reply: null }, data: { reply: input.reply } });
        if (updated.count === 0) throw bad('이미 답한 질문이에요', HttpStatus.CONFLICT);
      } else {
        if (isHost) throw bad('출제자는 질문할 수 없어요');
        if (input.kind !== 'QUESTION' && input.kind !== 'GUESS') throw bad('질문 또는 정답 추측만 할 수 있어요');
        if (!input.text) throw bad('내용을 입력해 주세요');
        if (!(await this.eligible(groupId, game.teamId)).has(actor.id)) throw AppError.forbidden('참여할 수 없는 게임이에요');
        const used = await this.prisma.turnEntry.count({ where: { gameId: id, kind: { in: ['QUESTION', 'GUESS'] } } });
        if (used >= TWENTY_Q_MAX) throw bad('질문 기회를 모두 썼어요');
        // 첫 참여면 참가자로 등록하고 참가비
        const joined = await this.prisma.turnParticipant.findUnique({ where: { gameId_userId: { gameId: id, userId: actor.id } } });
        if (!joined) {
          await this.prisma.turnParticipant.create({ data: { gameId: id, userId: actor.id, position: await this.prisma.turnParticipant.count({ where: { gameId: id } }) } });
          await this.chargeFee(game, actor.id);
        }
        const correct = input.kind === 'GUESS' ? norm(input.text) === norm(config.secret ?? '') : null;
        await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: input.kind, text: input.text, correct } });
        if (correct) {
          await this.finish(game, { winnerId: actor.id });
          return { ok: true, correct: true };
        }
      }
      // 기회를 다 쓰고 답 안 한 질문도 없으면 출제자 승리
      const [used, pending] = await Promise.all([
        this.prisma.turnEntry.count({ where: { gameId: id, kind: { in: ['QUESTION', 'GUESS'] } } }),
        this.prisma.turnEntry.count({ where: { gameId: id, kind: 'QUESTION', reply: null } }),
      ]);
      if (used >= TWENTY_Q_MAX && pending === 0) await this.finish(game, { winnerId: game.createdById, hostWin: true });
      return { ok: true, correct: input.kind === 'GUESS' ? false : null };
    }

    if (game.type === 'CHAIN_QUIZ') {
      if (game.currentUserId !== actor.id) throw bad('내 차례가 아니에요');
      if (!input.question || !input.answer) throw bad('퀴즈와 정답을 입력해 주세요');
      // 앞사람 퀴즈에 답하기 (답이 없으면 건너뜀). 맞히면 보상
      const prev = await this.prisma.turnEntry.findFirst({ where: { gameId: id, kind: 'QUIZ' }, orderBy: { createdAt: 'desc' } });
      let correct: boolean | null = null;
      if (prev && input.text?.trim()) {
        const already = await this.prisma.turnEntry.findFirst({ where: { gameId: id, kind: 'GUESS', reply: prev.id } });
        if (!already) {
          correct = norm(input.text) === norm(prev.reply ?? '');
          const g = await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'GUESS', text: input.text.trim(), reply: prev.id, correct } });
          if (correct) await this.points.addLedger(game.groupId, [{ userId: actor.id, amount: Number(cfg.chainQuizReward), kind: 'GAME_REWARD', refId: `chain:${g.id}`, memo: `체인 퀴즈 정답: ${game.title}` }]);
        }
      }
      // 새 문제는 정답과 함께 저장 (정답은 답이 나오기 전까지 화면에 나오지 않음)
      await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'QUIZ', text: input.question.trim(), reply: input.answer.trim() } });
      await this.advance(game);
      return { ok: true, correct };
    }

    if (game.type === 'DETECTIVE') {
      if (game.currentUserId !== actor.id) throw bad('내 차례가 아니에요');
      const cs = config.case;
      if (!cs) throw bad('사건 정보가 없어요');
      if (input.kind === 'CLUE') {
        const revealed = await this.prisma.turnEntry.count({ where: { gameId: id, kind: 'CLUE' } });
        if (revealed >= cs.clues.length) throw bad('단서를 모두 열었어요. 이제 범인을 지목해 주세요');
        await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'CLUE', text: cs.clues[revealed] } });
        if (input.text?.trim()) await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'TEXT', text: input.text.trim() } });
        await this.advance(game);
        return { ok: true };
      }
      if (input.kind === 'GUESS') {
        if (!input.text) throw bad('범인을 골라 주세요');
        const pick = input.text.trim();
        const correct = norm(pick) === norm(cs.culprit);
        await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'GUESS', text: pick, correct } });
        await this.finish(game, { solved: correct, reason: 'ACCUSE' });
        return { ok: true, correct };
      }
      throw bad('단서를 열거나 범인을 지목해 주세요');
    }

    // 지목 릴레이 (칭찬 릴레이 포함)
    if (game.currentUserId !== actor.id) throw bad('지목받은 사람만 답할 수 있어요');
    if (!input.text) throw bad('답을 입력해 주세요');
    const answered = await this.prisma.turnEntry.findMany({ where: { gameId: id, kind: 'TEXT' }, select: { userId: true } });
    const answeredIds = new Set(answered.map((a) => a.userId));
    if (answeredIds.has(actor.id)) throw bad('이미 답했어요');
    const ending = input.kind === 'END' || !input.targetUserId || answeredIds.size + 1 >= NOMINATE_MAX;
    if (!ending) {
      const eligible = await this.eligible(groupId, game.teamId);
      if (!eligible.has(input.targetUserId as string) || input.targetUserId === actor.id || answeredIds.has(input.targetUserId as string)) throw bad('아직 답하지 않은 다른 구성원을 지목해 주세요');
    }
    if (!(await this.prisma.turnParticipant.findUnique({ where: { gameId_userId: { gameId: id, userId: actor.id } } }))) {
      await this.prisma.turnParticipant.create({ data: { gameId: id, userId: actor.id, position: answeredIds.size } });
      await this.chargeFee(game, actor.id);
    }
    await this.prisma.turnEntry.create({ data: { gameId: id, userId: actor.id, kind: 'TEXT', text: input.text, targetUserId: ending ? null : input.targetUserId } });
    if (ending) await this.finish(game, { reason: 'END' });
    else
      await this.prisma.turnGame.update({
        where: { id },
        data: { currentUserId: input.targetUserId, turnIndex: { increment: 1 }, turnDeadline: new Date(Date.now() + Number(cfg.turnHours) * HOUR) },
      });
    return { ok: true };
  }

  /** AI 그림 전화: 내가 쓴 문장으로 AI 가 그림을 그리고, 그 그림이 다음 사람에게 보임 (하루 횟수 제한) */
  private async aiTelephoneTurn(game: Game, actor: AuthUser, text: string) {
    if (!this.ai.imageEnabled) throw bad('AI 그림 기능 설정(IMAGE_API_KEY)이 필요해요');
    if (!text.trim()) throw bad('내용을 입력해 주세요');
    const cfg = await this.cfg(game.groupId);
    const used = await this.prisma.turnEntry.count({ where: { userId: actor.id, kind: 'AI_IMAGE', createdAt: { gte: todayStart() } } });
    if (used >= Number(cfg.aiImageDaily)) throw bad(`오늘 AI 그림은 ${cfg.aiImageDaily}번까지 만들 수 있어요`, HttpStatus.TOO_MANY_REQUESTS);
    const png = await this.ai.generateImage(`${text.trim()}을(를) 표현한 간단한 일러스트. 글자 없이.`);
    if (!png) throw bad('AI가 그림을 만들지 못했어요. 잠시 뒤 다시 해 주세요', HttpStatus.SERVICE_UNAVAILABLE);
    const saved = saveBuffer(png, 'png');
    await this.prisma.$transaction([
      this.prisma.turnEntry.create({ data: { gameId: game.id, userId: actor.id, kind: 'TEXT', text: text.trim() } }),
      this.prisma.turnEntry.create({ data: { gameId: game.id, userId: actor.id, kind: 'AI_IMAGE', mediaUrl: saved.url } }),
    ]);
    await this.advance(game);
    return { ok: true };
  }

  /** 이어 쓰기류의 다음 입력 종류. 그림 전화는 글 → 그림 → 글 ... */
  private async expectedKind(game: Game): Promise<'TEXT' | 'DRAWING' | 'VIDEO'> {
    if (game.type === 'STORY' || game.type === 'AI_TELEPHONE') return 'TEXT';
    if (game.type === 'DRAW_RELAY') return 'DRAWING';
    if (game.type === 'VIDEO_RELAY') return 'VIDEO';
    const last = await this.prisma.turnEntry.findFirst({ where: { gameId: game.id, kind: { in: ['TEXT', 'DRAWING'] } }, orderBy: { createdAt: 'desc' } });
    return !last || last.kind === 'DRAWING' ? 'TEXT' : 'DRAWING';
  }

  /** 상세. 진행 중 공개 범위는 게임마다 다름 */
  async detail(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, isManager: boolean, id: string) {
    const game = await this.gameFor(groupId, viewer, isGroupAdmin, id);
    const config = game.config as Config;
    const [people, entries, team] = await Promise.all([
      this.order(id),
      this.prisma.turnEntry.findMany({ where: { gameId: id }, orderBy: { createdAt: 'asc' } }),
      game.teamId ? this.prisma.team.findUnique({ where: { id: game.teamId }, select: { name: true } }) : Promise.resolve(null),
    ]);
    const ids = new Set([...people.map((p) => p.userId), ...entries.map((e) => e.userId), ...entries.map((e) => e.targetUserId).filter(Boolean), game.createdById, game.currentUserId].filter(Boolean) as string[]);
    const users = await this.prisma.user.findMany({ where: { id: { in: [...ids] } }, select: userSelect });
    const u = (uid: string | null | undefined) => (uid ? (users.find((x) => x.id === uid) ?? null) : null);
    const done = game.status === 'DONE' || game.status === 'CANCELED';
    const isMyTurn = game.status === 'PLAYING' && game.currentUserId === viewer.id;
    const result = (game.result ?? {}) as { winnerId?: string; loserId?: string; hostWin?: boolean; reason?: string; solved?: boolean };
    const real = entries.filter((e) => e.kind === 'TEXT' || e.kind === 'DRAWING');

    let view: Record<string, unknown> = {};
    if (game.type in CHAIN_SHOWN) {
      const shownKinds = CHAIN_SHOWN[game.type];
      // 진행 중에는 내 차례일 때 바로 앞 기록만
      const prevEntry = [...entries].reverse().find((e) => shownKinds.includes(e.kind));
      view = {
        expected: game.status === 'PLAYING' ? await this.expectedKind(game) : null,
        previous: isMyTurn && prevEntry ? { kind: prevEntry.kind, text: prevEntry.text, mediaUrl: prevEntry.mediaUrl } : null,
        chain: done
          ? entries.filter((e) => ['TEXT', 'DRAWING', 'VIDEO', 'AI_IMAGE'].includes(e.kind)).map((e) => ({ id: e.id, kind: e.kind, text: e.text, mediaUrl: e.mediaUrl, user: u(e.userId), at: e.createdAt }))
          : null,
        rounds: config.rounds ?? 1,
      };
    } else if (game.type === 'CHAIN_QUIZ') {
      const quizzes = entries.filter((e) => e.kind === 'QUIZ');
      const guesses = entries.filter((e) => e.kind === 'GUESS');
      const latest = quizzes[quizzes.length - 1];
      view = {
        // 지금 풀어야 할 문제 (정답은 보여 주지 않음)
        toAnswer: isMyTurn && latest ? { id: latest.id, question: latest.text, author: u(latest.userId), answered: guesses.some((g) => g.reply === latest.id) } : null,
        quizzes: quizzes.map((q) => {
          const answers = guesses.filter((g) => g.reply === q.id);
          const revealed = done || answers.length > 0;
          return {
            id: q.id,
            question: q.text,
            author: u(q.userId),
            answer: revealed ? q.reply : null,
            answers: answers.map((a) => ({ user: u(a.userId), text: a.text, correct: a.correct })),
          };
        }),
      };
    } else if (game.type === 'DETECTIVE') {
      const cs = config.case;
      const clues = entries.filter((e) => e.kind === 'CLUE');
      const notes = entries.filter((e) => e.kind === 'TEXT');
      const accusations = entries.filter((e) => e.kind === 'GUESS');
      view = {
        title: cs?.title ?? '',
        setup: cs?.setup ?? '',
        suspects: cs?.suspects ?? [],
        // 단서는 연 것만 보임
        clues: clues.map((c) => ({ id: c.id, text: c.text, by: u(c.userId), at: c.createdAt })),
        cluesLeft: Math.max(0, (cs?.clues.length ?? 0) - clues.length),
        notes: notes.map((n) => ({ id: n.id, text: n.text, by: u(n.userId), at: n.createdAt })),
        accusations: accusations.map((a) => ({ id: a.id, text: a.text, correct: a.correct, by: u(a.userId), at: a.createdAt })),
        culprit: done ? (cs?.culprit ?? null) : null,
        solved: !!result.solved,
      };
    } else if (game.type === 'BOMB') {
      const passes = config.passes ?? 0;
      view = {
        holder: u(game.currentUserId),
        // 터질 때까지 남은 횟수는 비밀. 넘긴 횟수로 '열기'만 보여 줌
        heat: Math.min(4, Math.floor((passes / Math.max(1, people.length * 2)) * 5)),
        passes: entries.filter((e) => e.kind === 'PASS' || e.kind === 'BOOM').map((e) => ({ id: e.id, kind: e.kind, from: u(e.userId), to: u(e.targetUserId), at: e.createdAt })),
        loser: u(result.loserId),
        reason: result.reason ?? null,
      };
    } else if (game.type === 'TWENTY_Q') {
      const isHost = game.createdById === viewer.id;
      view = {
        isHost,
        hint: config.hint ?? null,
        secret: isHost || done ? (config.secret ?? null) : null,
        max: TWENTY_Q_MAX,
        used: entries.filter((e) => e.kind === 'QUESTION' || e.kind === 'GUESS').length,
        entries: entries.filter((e) => e.kind === 'QUESTION' || e.kind === 'GUESS').map((e) => ({ id: e.id, kind: e.kind, text: e.text, reply: e.reply, correct: e.correct, user: u(e.userId), at: e.createdAt })),
        winner: u(result.winnerId),
        hostWin: !!result.hostWin,
        endsAt: game.turnDeadline,
      };
    } else {
      const answered = new Set(real.map((e) => e.userId));
      const eligible = await this.eligible(groupId, game.teamId);
      view = {
        question: config.question ?? '',
        max: NOMINATE_MAX,
        answers: real.map((e) => ({ id: e.id, text: e.text, user: u(e.userId), target: u(e.targetUserId), at: e.createdAt })),
        // 지목할 수 있는 사람 (아직 답하지 않은 사람)
        candidates: isMyTurn ? await this.prisma.user.findMany({ where: { id: { in: [...eligible].filter((x) => !answered.has(x) && x !== viewer.id) } }, select: userSelect, orderBy: { name: 'asc' } }) : [],
      };
    }

    const cfg = await this.cfg(groupId);
    const def = turnGameDef(game.type);
    return {
      id: game.id,
      type: game.type,
      title: game.title,
      status: game.status,
      teamName: team?.name ?? null,
      createdBy: u(game.createdById),
      canManage: game.createdById === viewer.id || isManager,
      joined: people.some((p) => p.userId === viewer.id),
      canJoin: game.status === 'RECRUITING' && !people.some((p) => p.userId === viewer.id),
      minPlayers: def?.min ?? 2,
      participants: people.map((p) => ({ user: u(p.userId), position: p.position, done: entries.some((e) => e.userId === p.userId && ['TEXT', 'DRAWING', 'VIDEO', 'AI_IMAGE', 'QUIZ', 'CLUE'].includes(e.kind)) })),
      currentUser: game.type === 'TWENTY_Q' ? null : u(game.currentUserId),
      isMyTurn: isMyTurn && game.type !== 'TWENTY_Q',
      turnIndex: game.turnIndex,
      totalTurns: game.type in CHAIN_SHOWN || game.type === 'CHAIN_QUIZ' ? this.totalTurns(game, people.length) : null,
      turnDeadline: game.turnDeadline,
      economy: { entryFee: Number(cfg.turnEntryFee), completeReward: Number(cfg.turnCompleteReward), bombPenalty: Number(cfg.bombPenalty), twentyQReward: Number(cfg.twentyQReward), detectiveReward: Number(cfg.detectiveReward), chainQuizReward: Number(cfg.chainQuizReward) },
      view,
      createdAt: game.createdAt,
    };
  }
}
