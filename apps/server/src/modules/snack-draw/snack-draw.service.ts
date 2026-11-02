import { HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { ErrorCode, FeatureKey } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';
import { PointsBadgeService } from '../points-badge/points-badge.service';

const FEATURE = FeatureKey.SNACK_DRAW;
const userSelect = { id: true, name: true, avatarUrl: true } as const;

export const createGameSchema = z.object({
  title: z.string().trim().min(1).max(60),
  teamId: z.string().min(1).nullable().optional(),
  winnerCount: z.number().int().min(1).max(10).optional(),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const drawSchema = z.object({ position: z.number().int().min(1).max(500) });
export type DrawInput = z.infer<typeof drawSchema>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class SnackDrawService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
  ) {}

  async list(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, status: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    const myTeams = await this.prisma.teamMember.findMany({ where: { groupId, userId: viewer.id }, select: { teamId: true } });
    const teamIds = myTeams.map((t) => t.teamId);
    const where = {
      groupId,
      ...(status === 'RECRUITING' || status === 'DRAWING' || status === 'DONE' ? { status } : {}),
      ...(isGroupAdmin ? {} : { OR: [{ teamId: null }, { teamId: { in: teamIds } }] }),
    };
    const [rows, total, cfg, teams] = await Promise.all([
      this.prisma.snackGame.findMany({
        where,
        include: { _count: { select: { participants: true } }, participants: { where: { userId: viewer.id }, select: { id: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.snackGame.count({ where }),
      this.settings.get(groupId, FEATURE),
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true } }),
    ]);
    const teamName = new Map(teams.map((t) => [t.id, t.name]));
    return {
      enabled: true as const,
      canCreate: !!cfg.memberCanCreate || isGroupAdmin || (await this.prisma.teamMember.count({ where: { groupId, userId: viewer.id, role: 'ADMIN' } })) > 0,
      defaultWinnerCount: Number(cfg.defaultWinnerCount),
      teams: teams.filter((t) => isGroupAdmin || teamIds.includes(t.id)),
      ...paged(
        rows.map((g) => ({
          id: g.id,
          title: g.title,
          status: g.status,
          teamName: g.teamId ? (teamName.get(g.teamId) ?? null) : null,
          winnerCount: g.winnerCount,
          participantCount: g._count.participants,
          joined: g.participants.length > 0,
          createdAt: g.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  async create(actor: AuthUser, groupId: string, isManager: boolean, isGroupAdmin: boolean, input: CreateGameInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (!cfg.memberCanCreate && !isManager) throw AppError.forbidden('관리자만 게임을 만들 수 있어요');
    if (input.teamId) {
      const team = await this.prisma.team.findFirst({ where: { id: input.teamId, groupId, deletedAt: null } });
      if (!team) throw AppError.notFound('팀을 찾을 수 없어요');
      if (!isGroupAdmin && !(await this.prisma.teamMember.count({ where: { teamId: input.teamId, userId: actor.id } }))) {
        throw AppError.forbidden('내 팀의 게임만 만들 수 있어요');
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const game = await tx.snackGame.create({
        data: { groupId, teamId: input.teamId ?? null, title: input.title, winnerCount: input.winnerCount ?? Number(cfg.defaultWinnerCount), createdById: actor.id },
      });
      await tx.snackParticipant.create({ data: { gameId: game.id, userId: actor.id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'snack_draw.create', targetType: 'SnackGame', targetId: game.id, after: { title: input.title } });
      return { id: game.id };
    });
  }

  private async gameFor(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const game = await this.prisma.snackGame.findFirst({ where: { id, groupId } });
    if (!game) throw AppError.notFound('게임을 찾을 수 없어요');
    if (game.teamId && !isGroupAdmin && !(await this.prisma.teamMember.count({ where: { teamId: game.teamId, userId: viewer.id } }))) {
      throw AppError.forbidden('팀 게임은 팀원만 볼 수 있어요');
    }
    return game;
  }

  async join(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'RECRUITING') throw new AppError(ErrorCode.VALIDATION_FAILED, '참가 신청 기간이 끝났어요', HttpStatus.BAD_REQUEST);
    await this.prisma.snackParticipant.upsert({ where: { gameId_userId: { gameId: id, userId: actor.id } }, create: { gameId: id, userId: actor.id }, update: {} });
    // 참가비 (잔액이 0이어도 참가 가능, 마이너스 허용)
    const cfg = await this.settings.get(groupId, FEATURE);
    await this.points.addLedger(groupId, [{ userId: actor.id, amount: -Number(cfg.entryFee), kind: 'GAME_FEE', refId: `snack:${id}`, memo: `간식 쏘기 참가비: ${game.title}` }]);
    return { ok: true };
  }

  async leave(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'RECRUITING') throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 시작해서 나갈 수 없어요', HttpStatus.BAD_REQUEST);
    await this.prisma.snackParticipant.deleteMany({ where: { gameId: id, userId: actor.id } });
    await this.prisma.pointLedger.deleteMany({ where: { groupId, userId: actor.id, kind: 'GAME_FEE', refId: `snack:${id}` } });
    return { ok: true };
  }

  /** 뽑기 시작: 참가자 수만큼 칸을 만들고 당첨(쏘는 사람)·다음 기회를 무작위로 숨겨서 배치 */
  async start(actor: AuthUser, groupId: string, isManager: boolean, isGroupAdmin: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (!isManager && game.createdById !== actor.id) throw AppError.forbidden('만든 사람이나 관리자만 시작할 수 있어요');
    if (game.status !== 'RECRUITING') throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 시작했어요', HttpStatus.BAD_REQUEST);
    const count = await this.prisma.snackParticipant.count({ where: { gameId: id } });
    if (count < 2) throw new AppError(ErrorCode.VALIDATION_FAILED, '참가자가 2명 이상이어야 해요', HttpStatus.BAD_REQUEST);
    const winners = Math.min(game.winnerCount, count - 1);
    const results = shuffle(Array.from({ length: count }, (_, i) => i < winners));
    await this.prisma.$transaction(async (tx) => {
      await tx.snackSlot.createMany({ data: results.map((isWinner, i) => ({ gameId: id, position: i + 1, isWinner })) });
      await tx.snackGame.update({ where: { id }, data: { status: 'DRAWING', startedAt: new Date(), winnerCount: winners } });
      // 결과는 서버에만 저장 (감사 로그에도 남기지 않음)
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'snack_draw.start', targetType: 'SnackGame', targetId: id, after: { participants: count, winners } });
    });
    return { ok: true };
  }

  /** 게임 상세: 칸마다 뽑힘 여부와 결과(뽑힌 칸만 공개), 참가자별 뽑았는지 */
  async detail(groupId: string, viewer: AuthUser, isManager: boolean, isGroupAdmin: boolean, id: string) {
    const game = await this.gameFor(groupId, viewer, isGroupAdmin, id);
    const [participants, slots, cfg] = await Promise.all([
      this.prisma.snackParticipant.findMany({ where: { gameId: id }, include: { user: { select: userSelect } }, orderBy: { joinedAt: 'asc' } }),
      this.prisma.snackSlot.findMany({ where: { gameId: id }, orderBy: { position: 'asc' } }),
      this.settings.get(groupId, FEATURE),
    ]);
    const drawnBy = new Map(slots.filter((s) => s.drawnById).map((s) => [s.drawnById as string, s]));
    const userById = new Map(participants.map((p) => [p.userId, p.user]));
    const mySlot = drawnBy.get(viewer.id);
    return {
      id: game.id,
      title: game.title,
      status: game.status,
      theme: String(cfg.drawTheme),
      winnerCount: game.winnerCount,
      canStart: game.status === 'RECRUITING' && (isManager || game.createdById === viewer.id),
      canCancel: ['RECRUITING', 'DRAWING'].includes(game.status) && (isManager || game.createdById === viewer.id),
      joined: participants.some((p) => p.userId === viewer.id),
      canDraw: game.status === 'DRAWING' && participants.some((p) => p.userId === viewer.id) && !mySlot,
      myResult: mySlot ? (mySlot.isWinner ? 'WIN' : 'LOSE') : null,
      participants: participants.map((p) => {
        const slot = drawnBy.get(p.userId);
        return { user: p.user, drawn: !!slot, result: slot ? (slot.isWinner ? 'WIN' : 'LOSE') : null };
      }),
      slots: slots.map((s) => ({
        position: s.position,
        drawn: !!s.drawnById,
        by: s.drawnById ? (userById.get(s.drawnById) ?? null) : null,
        result: s.drawnById ? (s.isWinner ? 'WIN' : 'LOSE') : null, // 뽑히기 전에는 결과를 주지 않음
      })),
    };
  }

  /** 칸 뽑기: 참가자는 한 번만, 이미 뽑힌 칸은 불가. 모두 뽑으면 종료 */
  async draw(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: DrawInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (game.status !== 'DRAWING') throw new AppError(ErrorCode.VALIDATION_FAILED, '지금은 뽑을 수 없어요', HttpStatus.BAD_REQUEST);
    if (!(await this.prisma.snackParticipant.count({ where: { gameId: id, userId: actor.id } }))) throw AppError.forbidden('참가자만 뽑을 수 있어요');
    return this.prisma.$transaction(async (tx) => {
      if (await tx.snackSlot.count({ where: { gameId: id, drawnById: actor.id } })) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 뽑았어요', HttpStatus.CONFLICT);
      }
      const claimed = await tx.snackSlot.updateMany({ where: { gameId: id, position: input.position, drawnById: null }, data: { drawnById: actor.id, drawnAt: new Date() } });
      if (claimed.count === 0) throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 뽑힌 칸이에요', HttpStatus.CONFLICT);
      const slot = await tx.snackSlot.findFirstOrThrow({ where: { gameId: id, position: input.position } });
      const remaining = await tx.snackSlot.count({ where: { gameId: id, drawnById: null } });
      if (remaining === 0) await tx.snackGame.update({ where: { id }, data: { status: 'DONE', doneAt: new Date() } });
      return { result: slot.isWinner ? ('WIN' as const) : ('LOSE' as const), done: remaining === 0 };
    });
  }

  async cancel(actor: AuthUser, groupId: string, isManager: boolean, isGroupAdmin: boolean, id: string) {
    const game = await this.gameFor(groupId, actor, isGroupAdmin, id);
    if (!isManager && game.createdById !== actor.id) throw AppError.forbidden('만든 사람이나 관리자만 취소할 수 있어요');
    if (!['RECRUITING', 'DRAWING'].includes(game.status)) throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 끝난 게임이에요', HttpStatus.BAD_REQUEST);
    await this.prisma.$transaction(async (tx) => {
      await tx.snackGame.update({ where: { id }, data: { status: 'CANCELED' } });
      // 참가비 환불
      await tx.pointLedger.deleteMany({ where: { groupId, kind: 'GAME_FEE', refId: `snack:${id}` } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'snack_draw.cancel', targetType: 'SnackGame', targetId: id });
    });
    return { ok: true };
  }
}
