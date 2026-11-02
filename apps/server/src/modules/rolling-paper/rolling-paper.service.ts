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

const FEATURE = FeatureKey.ROLLING_PAPER;
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const COLORS = ['#fef08a', '#fbcfe8', '#bae6fd', '#bbf7d0', '#fed7aa', '#ddd6fe'];
const THEMES = ['YELLOW', 'PINK', 'BLUE', 'GREEN'] as const;

export const createPaperSchema = z.object({
  targetUserId: z.string().min(1),
  title: z.string().trim().min(1).max(60),
  message: z.string().trim().max(300).nullable().optional(),
  theme: z.enum(THEMES).optional(),
  closeAt: z.string().datetime().nullable().optional(),
});
export type CreatePaperInput = z.infer<typeof createPaperSchema>;

export const createNoteSchema = z.object({
  body: z.string().trim().min(1, '내용을 입력하세요').max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  anonymous: z.boolean().optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

const isOpen = (p: { status: string; closeAt: Date | null }) => p.status === 'OPEN' && (!p.closeAt || p.closeAt.getTime() > Date.now());

@Injectable()
export class RollingPaperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
  ) {}

  /** 롤링페이퍼 목록 (최신순). 진행 중 먼저 */
  async list(groupId: string, status: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    const where = { groupId, ...(status === 'OPEN' || status === 'CLOSED' ? { status } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.rollingPaper.findMany({
        where,
        include: { target: { select: userSelect }, _count: { select: { notes: true } } },
        orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.rollingPaper.count({ where }),
    ]);
    return {
      enabled: true as const,
      ...paged(
        rows.map((p) => ({
          id: p.id,
          title: p.title,
          theme: p.theme,
          target: p.target,
          open: isOpen(p),
          closeAt: p.closeAt,
          noteCount: p._count.notes,
          createdAt: p.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  async create(actor: AuthUser, groupId: string, isManager: boolean, input: CreatePaperInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (!isManager && !cfg.memberCanCreate) throw AppError.forbidden('관리자만 롤링페이퍼를 만들 수 있어요');
    if (!isManager && input.targetUserId === actor.id) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '본인의 롤링페이퍼는 다른 사람이 만들어 줘요', HttpStatus.BAD_REQUEST);
    }
    const target = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: input.targetUserId, groupId } },
      include: { user: { select: { status: true } } },
    });
    if (target?.status !== 'APPROVED' || target.user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '활성 구성원만 대상으로 할 수 있어요', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.rollingPaper.create({
        data: {
          groupId,
          targetUserId: input.targetUserId,
          title: input.title,
          message: input.message ?? null,
          theme: input.theme ?? 'YELLOW',
          closeAt: input.closeAt ? new Date(input.closeAt) : null,
          createdById: actor.id,
        },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'rolling_paper.create', targetType: 'RollingPaper', targetId: row.id, after: { targetUserId: input.targetUserId, title: input.title } });
      return { id: row.id };
    });
  }

  /** 롤링페이퍼 상세: 포스트잇 전체 (익명 메시지는 작성자 본인에게만 mine 표시) */
  async detail(groupId: string, viewer: AuthUser, isManager: boolean, id: string) {
    const paper = await this.prisma.rollingPaper.findFirst({
      where: { id, groupId },
      include: { target: { select: userSelect }, notes: { include: { author: { select: userSelect } }, orderBy: { createdAt: 'asc' }, take: 300 } },
    });
    if (!paper) throw AppError.notFound('롤링페이퍼를 찾을 수 없어요');
    const cfg = await this.settings.get(groupId, FEATURE);
    const mine = paper.notes.filter((n) => n.authorId === viewer.id).length;
    return {
      id: paper.id,
      title: paper.title,
      message: paper.message,
      theme: paper.theme,
      target: paper.target,
      open: isOpen(paper),
      closeAt: paper.closeAt,
      createdAt: paper.createdAt,
      canClose: isManager || paper.createdById === viewer.id,
      canWrite: isOpen(paper) && mine < Number(cfg.maxNotesPerMember),
      remainingNotes: Math.max(0, Number(cfg.maxNotesPerMember) - mine),
      anonymousAllowed: !!cfg.anonymousAllowed,
      maxNoteLength: Number(cfg.maxNoteLength),
      notes: paper.notes.map((n) => ({
        id: n.id,
        body: n.body,
        color: n.color,
        rotation: n.rotation,
        createdAt: n.createdAt,
        author: n.anonymous ? null : n.author,
        mine: n.authorId === viewer.id,
        canDelete: isManager || n.authorId === viewer.id,
      })),
    };
  }

  async addNote(actor: AuthUser, groupId: string, id: string, input: CreateNoteInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const paper = await this.prisma.rollingPaper.findFirst({ where: { id, groupId } });
    if (!paper) throw AppError.notFound('롤링페이퍼를 찾을 수 없어요');
    if (!isOpen(paper)) throw new AppError(ErrorCode.VALIDATION_FAILED, '닫힌 롤링페이퍼예요', HttpStatus.BAD_REQUEST);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (input.body.length > Number(cfg.maxNoteLength)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `메시지는 ${cfg.maxNoteLength}자까지 쓸 수 있어요`, HttpStatus.BAD_REQUEST);
    }
    if (input.anonymous && !cfg.anonymousAllowed) throw new AppError(ErrorCode.VALIDATION_FAILED, '익명으로는 쓸 수 없어요', HttpStatus.BAD_REQUEST);
    const mine = await this.prisma.rollingPaperNote.count({ where: { paperId: id, authorId: actor.id } });
    if (mine >= Number(cfg.maxNotesPerMember)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `한 롤링페이퍼에는 ${cfg.maxNotesPerMember}개까지 남길 수 있어요`, HttpStatus.BAD_REQUEST);
    }
    const row = await this.prisma.rollingPaperNote.create({
      data: {
        paperId: id,
        authorId: actor.id,
        body: input.body,
        color: input.color ?? COLORS[randomInt(COLORS.length)],
        rotation: randomInt(-6, 7),
        anonymous: !!input.anonymous,
      },
    });
    return { id: row.id };
  }

  async deleteNote(actor: AuthUser, groupId: string, isManager: boolean, id: string, noteId: string) {
    const note = await this.prisma.rollingPaperNote.findFirst({ where: { id: noteId, paperId: id, paper: { groupId } } });
    if (!note) throw AppError.notFound('메시지를 찾을 수 없어요');
    if (!isManager && note.authorId !== actor.id) throw AppError.forbidden('본인 메시지만 지울 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.rollingPaperNote.delete({ where: { id: noteId } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'rolling_paper.note_delete', targetType: 'RollingPaperNote', targetId: noteId, before: { authorId: note.authorId } });
    });
    return { ok: true };
  }

  async close(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    const paper = await this.prisma.rollingPaper.findFirst({ where: { id, groupId } });
    if (!paper) throw AppError.notFound('롤링페이퍼를 찾을 수 없어요');
    if (!isManager && paper.createdById !== actor.id) throw AppError.forbidden('만든 사람이나 관리자만 닫을 수 있어요');
    await this.prisma.rollingPaper.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } });
    return { ok: true };
  }

  async remove(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    const paper = await this.prisma.rollingPaper.findFirst({ where: { id, groupId } });
    if (!paper) throw AppError.notFound('롤링페이퍼를 찾을 수 없어요');
    if (!isManager) throw AppError.forbidden('관리자만 삭제할 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.rollingPaper.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'rolling_paper.delete', targetType: 'RollingPaper', targetId: id, before: { title: paper.title } });
    });
    return { ok: true };
  }
}
