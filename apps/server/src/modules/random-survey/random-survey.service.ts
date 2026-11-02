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

const FEATURE = FeatureKey.RANDOM_SURVEY;
const userSelect = { id: true, name: true, avatarUrl: true } as const;

const questionSchema = z.object({
  text: z.string().trim().min(1).max(200),
  type: z.enum(['SINGLE', 'MULTI', 'TEXT', 'RATING']),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(10).optional(),
});

export const createSurveySchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  anonymous: z.boolean().default(true),
  launchMode: z.enum(['MANUAL', 'RANDOM']).default('MANUAL'),
  questions: z.array(questionSchema).min(1).max(30),
});
export type CreateSurveyInput = z.infer<typeof createSurveySchema>;

export const respondSchema = z.object({ answers: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])) });
export type RespondInput = z.infer<typeof respondSchema>;

export const rejectSchema = z.object({ reason: z.string().trim().min(1).max(200) });
export type RejectInput = z.infer<typeof rejectSchema>;

@Injectable()
export class RandomSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
  ) {}

  /** 시간이 된 설문 자동 처리: 랜덤 예약 → 진행, 기한 지난 진행 → 종료 */
  private async tick(groupId: string) {
    const cfg = await this.settings.get(groupId, FEATURE);
    const now = new Date();
    const due = await this.prisma.survey.findMany({ where: { groupId, status: 'QUEUED', launchMode: 'RANDOM', launchAt: { lte: now } }, select: { id: true } });
    for (const s of due) {
      await this.prisma.survey.update({ where: { id: s.id }, data: { status: 'ACTIVE', startedAt: now, endsAt: new Date(now.getTime() + Number(cfg.durationHours) * 3_600_000) } });
    }
    await this.prisma.survey.updateMany({ where: { groupId, status: 'ACTIVE', endsAt: { lt: now } }, data: { status: 'CLOSED', closedAt: now } });
  }

  /** 랜덤 시작 시각: 지금부터 randomWindowDays 안의 무작위 */
  private randomLaunchAt(windowDays: number) {
    const windowMs = windowDays * 86_400_000;
    return new Date(Date.now() + randomInt(60_000, Math.max(120_000, Math.min(windowMs, 2 ** 31 - 1))));
  }

  /** 설문 목록. mine=내가 등록한 것, PENDING 은 관리자만 */
  async list(groupId: string, viewer: AuthUser, isManager: boolean, status: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    await this.tick(groupId);
    let where: Record<string, unknown> = { groupId };
    if (status === 'mine') where = { groupId, authorId: viewer.id };
    else if (status === 'PENDING') {
      if (!isManager) throw AppError.forbidden('관리자만 볼 수 있어요');
      where = { groupId, status: 'PENDING' };
    } else if (status === 'ACTIVE' || status === 'CLOSED' || status === 'QUEUED') where = { groupId, status };
    else where = { groupId, OR: [{ status: { in: ['ACTIVE', 'CLOSED', 'QUEUED'] } }, { authorId: viewer.id }] };
    const [rows, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        include: { author: { select: userSelect }, _count: { select: { responses: true, questions: true } } },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.survey.count({ where }),
    ]);
    const done = await this.prisma.surveyResponse.findMany({ where: { userId: viewer.id, surveyId: { in: rows.map((r) => r.id) } }, select: { surveyId: true } });
    const responded = new Set(done.map((d) => d.surveyId));
    return {
      enabled: true as const,
      ...paged(
        rows.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          launchMode: s.launchMode,
          anonymous: s.anonymous,
          author: s.anonymous && s.authorId !== viewer.id && !isManager ? null : s.author,
          questionCount: s._count.questions,
          responseCount: s._count.responses,
          endsAt: s.endsAt,
          launchAt: s.authorId === viewer.id || isManager ? s.launchAt : null,
          responded: responded.has(s.id),
          mine: s.authorId === viewer.id,
          createdAt: s.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  async create(actor: AuthUser, groupId: string, isManager: boolean, input: CreateSurveyInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (input.questions.length > Number(cfg.maxQuestions)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `질문은 ${cfg.maxQuestions}개까지 만들 수 있어요`, HttpStatus.BAD_REQUEST);
    }
    for (const qn of input.questions) {
      if ((qn.type === 'SINGLE' || qn.type === 'MULTI') && !qn.options) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, '선택형 질문에는 보기가 필요해요', HttpStatus.BAD_REQUEST);
      }
    }
    const needsApproval = !!cfg.requireApproval && !isManager;
    const status = needsApproval ? 'PENDING' : 'QUEUED';
    const launchAt = input.launchMode === 'RANDOM' && !needsApproval ? this.randomLaunchAt(Number(cfg.randomWindowDays)) : null;
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.survey.create({
        data: {
          groupId,
          authorId: actor.id,
          title: input.title,
          description: input.description ?? null,
          anonymous: input.anonymous,
          launchMode: input.launchMode,
          status,
          launchAt,
          questions: { create: input.questions.map((qn, i) => ({ position: i, text: qn.text, type: qn.type, options: qn.options ?? undefined })) },
        },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'survey.create', targetType: 'Survey', targetId: s.id, after: { title: input.title, status, launchMode: input.launchMode } });
      return { id: s.id, status };
    });
  }

  async approve(actor: AuthUser, groupId: string, id: string) {
    const s = await this.prisma.survey.findFirst({ where: { id, groupId } });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    if (s.status !== 'PENDING') throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '승인 대기 중인 설문이 아니에요', HttpStatus.CONFLICT);
    const cfg = await this.settings.get(groupId, FEATURE);
    await this.prisma.$transaction(async (tx) => {
      await tx.survey.update({ where: { id }, data: { status: 'QUEUED', launchAt: s.launchMode === 'RANDOM' ? this.randomLaunchAt(Number(cfg.randomWindowDays)) : null } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'survey.approve', targetType: 'Survey', targetId: id });
    });
    return { ok: true };
  }

  async reject(actor: AuthUser, groupId: string, id: string, input: RejectInput) {
    const s = await this.prisma.survey.findFirst({ where: { id, groupId } });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    if (s.status !== 'PENDING') throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '승인 대기 중인 설문이 아니에요', HttpStatus.CONFLICT);
    await this.prisma.$transaction(async (tx) => {
      await tx.survey.update({ where: { id }, data: { status: 'REJECTED', rejectReason: input.reason } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'survey.reject', targetType: 'Survey', targetId: id, after: { reason: input.reason } });
    });
    return { ok: true };
  }

  /** 직접 시작: 등록자 또는 관리자. 대기 중이어야 함 */
  async start(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    await this.features.assertEnabled(groupId, FEATURE);
    const s = await this.prisma.survey.findFirst({ where: { id, groupId } });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    if (!isManager && s.authorId !== actor.id) throw AppError.forbidden('등록한 사람이나 관리자만 시작할 수 있어요');
    if (s.status !== 'QUEUED') throw new AppError(ErrorCode.VALIDATION_FAILED, '대기 중인 설문만 시작할 수 있어요', HttpStatus.BAD_REQUEST);
    const cfg = await this.settings.get(groupId, FEATURE);
    const now = new Date();
    await this.prisma.survey.update({ where: { id }, data: { status: 'ACTIVE', startedAt: now, launchAt: null, endsAt: new Date(now.getTime() + Number(cfg.durationHours) * 3_600_000) } });
    return { ok: true };
  }

  async close(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    const s = await this.prisma.survey.findFirst({ where: { id, groupId } });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    if (!isManager && s.authorId !== actor.id) throw AppError.forbidden('등록한 사람이나 관리자만 종료할 수 있어요');
    if (s.status !== 'ACTIVE') throw new AppError(ErrorCode.VALIDATION_FAILED, '진행 중인 설문만 종료할 수 있어요', HttpStatus.BAD_REQUEST);
    await this.prisma.survey.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } });
    return { ok: true };
  }

  async remove(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    const s = await this.prisma.survey.findFirst({ where: { id, groupId } });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    if (!isManager && s.authorId !== actor.id) throw AppError.forbidden('등록한 사람이나 관리자만 삭제할 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.survey.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'survey.delete', targetType: 'Survey', targetId: id, before: { title: s.title } });
    });
    return { ok: true };
  }

  /** 설문 상세. 결과는 설정(종료 후/항상)과 권한(응답자·등록자·관리자)에 따라 공개 */
  async detail(groupId: string, viewer: AuthUser, isManager: boolean, id: string) {
    await this.tick(groupId);
    const s = await this.prisma.survey.findFirst({
      where: { id, groupId },
      include: { questions: { orderBy: { position: 'asc' } }, author: { select: userSelect }, _count: { select: { responses: true } } },
    });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    const isAuthor = s.authorId === viewer.id;
    if (['PENDING', 'REJECTED'].includes(s.status) && !isAuthor && !isManager) throw AppError.forbidden('볼 수 없는 설문이에요');
    const cfg = await this.settings.get(groupId, FEATURE);
    const mine = await this.prisma.surveyResponse.findUnique({ where: { surveyId_userId: { surveyId: id, userId: viewer.id } } });
    const canSeeResults =
      (isAuthor || isManager || !!mine) && (s.status === 'CLOSED' || cfg.resultsVisibility === 'ALWAYS' || isAuthor || isManager);
    const results = canSeeResults ? await this.results(id, s.questions, !s.anonymous) : null;
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      launchMode: s.launchMode,
      anonymous: s.anonymous,
      rejectReason: isAuthor || isManager ? s.rejectReason : null,
      author: s.anonymous && !isAuthor && !isManager ? null : s.author,
      isAuthor,
      canManage: isAuthor || isManager,
      responseCount: s._count.responses,
      endsAt: s.endsAt,
      launchAt: isAuthor || isManager ? s.launchAt : null,
      responded: !!mine,
      canRespond: s.status === 'ACTIVE' && !mine,
      questions: s.questions.map((qn) => ({ id: qn.id, text: qn.text, type: qn.type, options: qn.options as string[] | null })),
      results,
    };
  }

  /** 질문별 집계: 선택형은 보기별 수, 별점은 평균·분포, 서술형은 답변 목록 */
  private async results(surveyId: string, questions: { id: string; type: string; options: unknown }[], showNames: boolean) {
    const rows = await this.prisma.surveyResponse.findMany({ where: { surveyId }, include: { user: { select: userSelect } } });
    return questions.map((qn) => {
      const answers = rows.map((r) => ({ user: r.user, value: (r.answers as Record<string, unknown>)[qn.id] })).filter((a) => a.value !== undefined && a.value !== '');
      if (qn.type === 'SINGLE' || qn.type === 'MULTI') {
        const counts = new Map<string, number>(((qn.options as string[]) ?? []).map((o) => [o, 0]));
        for (const a of answers) for (const v of Array.isArray(a.value) ? a.value : [a.value]) if (counts.has(String(v))) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
        return { questionId: qn.id, type: qn.type, total: answers.length, options: [...counts].map(([option, count]) => ({ option, count })) };
      }
      if (qn.type === 'RATING') {
        const nums = answers.map((a) => Number(a.value)).filter((n) => n >= 1 && n <= 5);
        const dist = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: nums.filter((x) => x === n).length }));
        return { questionId: qn.id, type: qn.type, total: nums.length, average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0, distribution: dist };
      }
      return { questionId: qn.id, type: qn.type, total: answers.length, texts: answers.map((a) => ({ text: String(a.value), author: showNames ? a.user : null })) };
    });
  }

  async respond(actor: AuthUser, groupId: string, id: string, input: RespondInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    await this.tick(groupId);
    const s = await this.prisma.survey.findFirst({ where: { id, groupId }, include: { questions: true } });
    if (!s) throw AppError.notFound('설문을 찾을 수 없어요');
    if (s.status !== 'ACTIVE') throw new AppError(ErrorCode.VALIDATION_FAILED, '진행 중인 설문이 아니에요', HttpStatus.BAD_REQUEST);
    if (await this.prisma.surveyResponse.count({ where: { surveyId: id, userId: actor.id } })) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '이미 응답했어요', HttpStatus.CONFLICT);
    }
    const answers: Record<string, string | number | string[]> = {};
    for (const qn of s.questions) {
      const v = input.answers[qn.id];
      if (qn.type === 'TEXT') {
        if (typeof v === 'string' && v.trim()) answers[qn.id] = v.trim().slice(0, 500);
        continue;
      }
      if (v === undefined || (Array.isArray(v) && v.length === 0)) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, `"${qn.text}" 질문에 답해 주세요`, HttpStatus.BAD_REQUEST);
      }
      const options = (qn.options as string[] | null) ?? [];
      if (qn.type === 'SINGLE' && !(typeof v === 'string' && options.includes(v))) throw new AppError(ErrorCode.VALIDATION_FAILED, '보기를 다시 확인해 주세요', HttpStatus.BAD_REQUEST);
      if (qn.type === 'MULTI' && !(Array.isArray(v) && v.every((x) => options.includes(x)))) throw new AppError(ErrorCode.VALIDATION_FAILED, '보기를 다시 확인해 주세요', HttpStatus.BAD_REQUEST);
      if (qn.type === 'RATING' && !(typeof v === 'number' && v >= 1 && v <= 5)) throw new AppError(ErrorCode.VALIDATION_FAILED, '별점은 1~5점이에요', HttpStatus.BAD_REQUEST);
      answers[qn.id] = v;
    }
    await this.prisma.surveyResponse.create({ data: { surveyId: id, userId: actor.id, answers } });
    return { ok: true };
  }
}
