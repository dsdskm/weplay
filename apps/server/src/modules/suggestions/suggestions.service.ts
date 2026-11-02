import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCode, FeatureKey } from '@weplay/shared';
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';
import { PointsBadgeService } from '../points-badge/points-badge.service';

const FEATURE = FeatureKey.SUGGESTION_BOX;
const userSelect = { id: true, name: true, avatarUrl: true } as const;

export const suggestionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(5000),
  category: z.enum(['WORK', 'WELFARE', 'SYSTEM', 'FACILITY', 'ETC']).default('ETC'),
  anonymous: z.boolean().optional(),
  teamId: z.string().min(1).nullable().optional(),
});
export type SuggestionInput = z.infer<typeof suggestionSchema>;

export const answerSchema = z.object({
  status: z.enum(['RECEIVED', 'REVIEWING', 'ACCEPTED', 'DONE', 'DECLINED']),
  answer: z.string().trim().max(3000).nullable().optional(),
});
export type AnswerInput = z.infer<typeof answerSchema>;

/** 건의사항: 구성원이 올리고 공감, 관리자가 상태·답변. 반영되면 작성자 보상 */
@Injectable()
export class SuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
  ) {}

  private async myTeams(groupId: string, userId: string) {
    return this.prisma.teamMember.findMany({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true, role: true } });
  }

  async list(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, isManager: boolean, filter: { status?: string; sort?: string; mine?: boolean }, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    const cfg = await this.settings.get(groupId, FEATURE);
    const teams = await this.myTeams(groupId, viewer.id);
    const where = {
      groupId,
      ...(isGroupAdmin ? {} : { OR: [{ teamId: null }, { teamId: { in: teams.map((t) => t.teamId) } }] }),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.mine ? { authorId: viewer.id } : {}),
    };
    const [rows, total, teamRows, counts] = await Promise.all([
      this.prisma.suggestion.findMany({
        where,
        include: { _count: { select: { votes: true } }, votes: { where: { userId: viewer.id }, select: { userId: true } } },
        orderBy: filter.sort === 'popular' ? [{ votes: { _count: 'desc' } }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.suggestion.count({ where }),
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true } }),
      this.prisma.suggestion.groupBy({ by: ['status'], where: { groupId, ...(isGroupAdmin ? {} : { OR: [{ teamId: null }, { teamId: { in: teams.map((t) => t.teamId) } }] }) }, _count: { _all: true } }),
    ]);
    const authors = new Map((await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.authorId) } }, select: userSelect })).map((u) => [u.id, u]));
    const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
    return {
      enabled: true as const,
      anonymousAllowed: !!cfg.anonymousAllowed,
      showVotes: !!cfg.showVotes || isManager,
      isManager,
      teams: teamRows.filter((t) => isGroupAdmin || teams.some((m) => m.teamId === t.id)),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      ...paged(
        rows.map((s) => ({
          id: s.id,
          title: s.title,
          excerpt: s.body.slice(0, 120),
          category: s.category,
          status: s.status,
          teamName: s.teamId ? (teamName.get(s.teamId) ?? null) : null,
          // 익명이면 작성자는 본인만 알 수 있음 (관리자에게도 숨김)
          author: s.anonymous ? null : (authors.get(s.authorId) ?? null),
          mine: s.authorId === viewer.id,
          votes: !!cfg.showVotes || isManager ? s._count.votes : null,
          voted: s.votes.length > 0,
          answered: !!s.answer,
          createdAt: s.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  private async suggestionFor(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const s = await this.prisma.suggestion.findFirst({ where: { id, groupId } });
    if (!s) throw AppError.notFound('건의를 찾을 수 없어요');
    if (s.teamId && !isGroupAdmin && !(await this.myTeams(groupId, viewer.id)).some((t) => t.teamId === s.teamId)) throw AppError.forbidden('우리 팀 건의가 아니에요');
    return s;
  }

  async detail(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, isManager: boolean, id: string) {
    const s = await this.suggestionFor(groupId, viewer, isGroupAdmin, id);
    const cfg = await this.settings.get(groupId, FEATURE);
    const [votes, voted, author, answeredBy] = await Promise.all([
      this.prisma.suggestionVote.count({ where: { suggestionId: id } }),
      this.prisma.suggestionVote.findUnique({ where: { suggestionId_userId: { suggestionId: id, userId: viewer.id } } }),
      s.anonymous ? Promise.resolve(null) : this.prisma.user.findUnique({ where: { id: s.authorId }, select: userSelect }),
      s.answeredById ? this.prisma.user.findUnique({ where: { id: s.answeredById }, select: userSelect }) : Promise.resolve(null),
    ]);
    return {
      id: s.id,
      title: s.title,
      body: s.body,
      category: s.category,
      status: s.status,
      anonymous: s.anonymous,
      author,
      mine: s.authorId === viewer.id,
      votes: !!cfg.showVotes || isManager ? votes : null,
      voted: !!voted,
      answer: s.answer,
      answeredBy,
      answeredAt: s.answeredAt,
      canAnswer: isManager,
      canDelete: s.authorId === viewer.id || isManager,
      canEdit: s.authorId === viewer.id && s.status === 'RECEIVED',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  async create(actor: AuthUser, groupId: string, isGroupAdmin: boolean, input: SuggestionInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (input.anonymous && !cfg.anonymousAllowed) throw new AppError(ErrorCode.VALIDATION_FAILED, '익명 건의는 쓸 수 없어요', HttpStatus.BAD_REQUEST);
    if (input.teamId && !isGroupAdmin && !(await this.myTeams(groupId, actor.id)).some((t) => t.teamId === input.teamId)) throw AppError.forbidden('우리 팀에만 건의할 수 있어요');
    const row = await this.prisma.suggestion.create({
      data: { groupId, teamId: input.teamId ?? null, authorId: actor.id, anonymous: !!input.anonymous, category: input.category, title: input.title, body: input.body },
    });
    return { id: row.id };
  }

  /** 수정: 작성자, 접수 상태일 때만 */
  async update(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: SuggestionInput) {
    const s = await this.suggestionFor(groupId, actor, isGroupAdmin, id);
    if (s.authorId !== actor.id) throw AppError.forbidden('작성자만 수정할 수 있어요');
    if (s.status !== 'RECEIVED') throw new AppError(ErrorCode.VALIDATION_FAILED, '검토가 시작된 건의는 수정할 수 없어요', HttpStatus.BAD_REQUEST);
    await this.prisma.suggestion.update({ where: { id }, data: { title: input.title, body: input.body, category: input.category } });
    return { ok: true };
  }

  async vote(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const s = await this.suggestionFor(groupId, actor, isGroupAdmin, id);
    const existing = await this.prisma.suggestionVote.findUnique({ where: { suggestionId_userId: { suggestionId: s.id, userId: actor.id } } });
    if (existing) await this.prisma.suggestionVote.delete({ where: { suggestionId_userId: { suggestionId: s.id, userId: actor.id } } });
    else await this.prisma.suggestionVote.create({ data: { suggestionId: s.id, userId: actor.id } });
    return { voted: !existing, votes: await this.prisma.suggestionVote.count({ where: { suggestionId: s.id } }) };
  }

  /** 관리자: 상태 변경·답변. 반영 예정/완료가 되면 작성자에게 보상 (한 번만) */
  async answer(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: AnswerInput) {
    const s = await this.suggestionFor(groupId, actor, isGroupAdmin, id);
    const cfg = await this.settings.get(groupId, FEATURE);
    await this.prisma.$transaction(async (tx) => {
      await tx.suggestion.update({
        where: { id },
        data: {
          status: input.status,
          answer: input.answer?.trim() || null,
          answeredById: input.answer?.trim() ? actor.id : s.answeredById,
          answeredAt: input.answer?.trim() ? new Date() : s.answeredAt,
        },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'suggestion.answer', targetType: 'Suggestion', targetId: id, before: { status: s.status }, after: { status: input.status } });
    });
    if (input.status === 'ACCEPTED' || input.status === 'DONE') {
      await this.points.addLedger(groupId, [{ userId: s.authorId, amount: Number(cfg.acceptReward), kind: 'REWARD', refId: `suggestion:${id}`, memo: `건의 반영: ${s.title}` }]);
    }
    return { ok: true };
  }

  async remove(actor: AuthUser, groupId: string, isGroupAdmin: boolean, isManager: boolean, id: string) {
    const s = await this.suggestionFor(groupId, actor, isGroupAdmin, id);
    if (s.authorId !== actor.id && !isManager) throw AppError.forbidden('작성자나 관리자만 지울 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.suggestion.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'suggestion.delete', targetType: 'Suggestion', targetId: id, before: { title: s.title } });
    });
    return { ok: true };
  }
}
