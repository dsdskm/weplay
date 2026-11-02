import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCode } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';

const userSelect = { id: true, name: true, avatarUrl: true, email: true, username: true } as const;

export const inquirySchema = z.object({
  category: z.enum(['ACCOUNT', 'BUG', 'FEATURE', 'GROUP', 'ETC']).default('ETC'),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(5000),
  groupId: z.string().min(1).nullable().optional(),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const replySchema = z.object({ body: z.string().trim().min(1).max(5000) });
export type ReplyInput = z.infer<typeof replySchema>;

/** 시스템 문의: 사용자 ↔ MASTER 대화형 문의 */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** 내 문의 목록 */
  async mine(user: AuthUser, q: PageQuery) {
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      this.prisma.inquiry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: q.skip, take: q.pageSize, include: { _count: { select: { replies: true } } } }),
      this.prisma.inquiry.count({ where }),
    ]);
    return paged(
      rows.map((r) => ({ id: r.id, category: r.category, title: r.title, status: r.status, replyCount: r._count.replies, createdAt: r.createdAt, updatedAt: r.updatedAt })),
      total,
      q,
    );
  }

  async create(user: AuthUser, input: InquiryInput) {
    if (input.groupId) {
      const m = await this.prisma.groupMembership.findUnique({ where: { userId_groupId: { userId: user.id, groupId: input.groupId } } });
      if (!m) throw AppError.forbidden('내 그룹만 고를 수 있어요');
    }
    const row = await this.prisma.inquiry.create({ data: { userId: user.id, groupId: input.groupId ?? null, category: input.category, title: input.title, body: input.body } });
    return { id: row.id };
  }

  private async inquiryFor(id: string, user: AuthUser | null) {
    const row = await this.prisma.inquiry.findUnique({ where: { id }, include: { user: { select: userSelect }, replies: { orderBy: { createdAt: 'asc' } } } });
    if (!row) throw AppError.notFound('문의를 찾을 수 없어요');
    if (user && row.userId !== user.id) throw AppError.forbidden('내 문의만 볼 수 있어요');
    return row;
  }

  private async view(row: Awaited<ReturnType<SupportService['inquiryFor']>>) {
    const ids = [...new Set(row.replies.map((r) => r.authorId))];
    const users = new Map((await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u]));
    const group = row.groupId ? await this.prisma.group.findUnique({ where: { id: row.groupId }, select: { id: true, name: true } }) : null;
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      status: row.status,
      user: row.user,
      group,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      replies: row.replies.map((r) => ({ id: r.id, body: r.body, fromMaster: r.fromMaster, author: users.get(r.authorId)?.name ?? '', createdAt: r.createdAt })),
    };
  }

  async detail(user: AuthUser, id: string) {
    return this.view(await this.inquiryFor(id, user));
  }

  /** 사용자가 추가 질문 → 다시 답변 대기 */
  async reply(user: AuthUser, id: string, input: ReplyInput) {
    const row = await this.inquiryFor(id, user);
    if (row.status === 'CLOSED') throw new AppError(ErrorCode.VALIDATION_FAILED, '종료된 문의예요. 새 문의를 남겨 주세요', HttpStatus.BAD_REQUEST);
    await this.prisma.$transaction([
      this.prisma.inquiryReply.create({ data: { inquiryId: id, authorId: user.id, fromMaster: false, body: input.body } }),
      this.prisma.inquiry.update({ where: { id }, data: { status: 'OPEN' } }),
    ]);
    return { ok: true };
  }

  async close(user: AuthUser, id: string) {
    await this.inquiryFor(id, user);
    await this.prisma.inquiry.update({ where: { id }, data: { status: 'CLOSED' } });
    return { ok: true };
  }

  // ── MASTER ──

  async adminList(status: string | undefined, search: string | undefined, q: PageQuery) {
    const where = {
      ...(status ? { status } : {}),
      ...(search?.trim() ? { OR: [{ title: { contains: search.trim(), mode: 'insensitive' as const } }, { user: { name: { contains: search.trim(), mode: 'insensitive' as const } } }] } : {}),
    };
    const [rows, total, counts] = await Promise.all([
      this.prisma.inquiry.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip: q.skip, take: q.pageSize, include: { user: { select: userSelect }, _count: { select: { replies: true } } } }),
      this.prisma.inquiry.count({ where }),
      this.prisma.inquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      ...paged(
        rows.map((r) => ({ id: r.id, category: r.category, title: r.title, status: r.status, user: r.user, replyCount: r._count.replies, createdAt: r.createdAt, updatedAt: r.updatedAt })),
        total,
        q,
      ),
    };
  }

  async adminDetail(id: string) {
    return this.view(await this.inquiryFor(id, null));
  }

  /** MASTER 답변 → 답변 완료 */
  async adminReply(master: AuthUser, id: string, input: ReplyInput) {
    await this.inquiryFor(id, null);
    await this.prisma.$transaction(async (tx) => {
      await tx.inquiryReply.create({ data: { inquiryId: id, authorId: master.id, fromMaster: true, body: input.body } });
      await tx.inquiry.update({ where: { id }, data: { status: 'ANSWERED' } });
      await this.audit.log(tx, { actorId: master.id, action: 'inquiry.reply', targetType: 'Inquiry', targetId: id });
    });
    return { ok: true };
  }

  async adminStatus(master: AuthUser, id: string, status: string) {
    if (!['OPEN', 'ANSWERED', 'CLOSED'].includes(status)) throw new AppError(ErrorCode.VALIDATION_FAILED, '상태가 올바르지 않아요', HttpStatus.BAD_REQUEST);
    await this.inquiryFor(id, null);
    await this.prisma.inquiry.update({ where: { id }, data: { status } });
    await this.audit.log(this.prisma, { actorId: master.id, action: 'inquiry.status', targetType: 'Inquiry', targetId: id, after: { status } });
    return { ok: true };
  }
}
