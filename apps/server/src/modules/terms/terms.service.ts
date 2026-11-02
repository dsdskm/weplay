import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCode, TERMS_TYPES } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';

export const termsSchema = z.object({
  type: z.enum(['SERVICE', 'PRIVACY', 'MARKETING']),
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(100000),
  required: z.boolean().optional(),
  effectiveAt: z.string().datetime().nullable().optional(),
});
export type TermsInput = z.infer<typeof termsSchema>;

export const agreeSchema = z.object({ termsIds: z.array(z.string().min(1)).min(1).max(10) });

/** 약관: 종류별 버전 관리(초안 → 게시 → 보관). 게시된 최신 버전에 동의를 받음 */
@Injectable()
export class TermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** 종류별 현재 게시 버전 */
  async current() {
    const rows = await this.prisma.terms.findMany({ where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' } });
    return TERMS_TYPES.map((t) => rows.find((r) => r.type === t.key)).filter(Boolean).map((r) => ({
      id: r!.id,
      type: r!.type,
      version: r!.version,
      title: r!.title,
      content: r!.content,
      required: r!.required,
      effectiveAt: r!.effectiveAt,
      publishedAt: r!.publishedAt,
    }));
  }

  /** 지난 버전 포함 종류별 게시 이력 */
  async history(type: string) {
    return this.prisma.terms.findMany({
      where: { type, status: { in: ['PUBLISHED', 'ARCHIVED'] } },
      orderBy: { version: 'desc' },
      select: { id: true, type: true, version: true, title: true, content: true, required: true, status: true, effectiveAt: true, publishedAt: true },
    });
  }

  /** 아직 동의하지 않은 현재 약관 */
  async pending(user: AuthUser) {
    const current = await this.current();
    if (current.length === 0) return [];
    const agreed = await this.prisma.termsAgreement.findMany({ where: { userId: user.id, termsId: { in: current.map((c) => c.id) } }, select: { termsId: true } });
    const done = new Set(agreed.map((a) => a.termsId));
    return current.filter((c) => !done.has(c.id));
  }

  async agree(user: AuthUser, termsIds: string[]) {
    const valid = await this.prisma.terms.findMany({ where: { id: { in: termsIds }, status: 'PUBLISHED' }, select: { id: true } });
    if (valid.length === 0) throw new AppError(ErrorCode.VALIDATION_FAILED, '동의할 약관이 없어요', HttpStatus.BAD_REQUEST);
    await this.prisma.termsAgreement.createMany({ data: valid.map((v) => ({ termsId: v.id, userId: user.id })), skipDuplicates: true });
    return { ok: true, agreed: valid.length };
  }

  // ── MASTER ──

  async adminList(type: string | undefined, q: PageQuery) {
    const where = type ? { type } : {};
    const [rows, total] = await Promise.all([
      this.prisma.terms.findMany({ where, orderBy: [{ type: 'asc' }, { version: 'desc' }], skip: q.skip, take: q.pageSize, include: { _count: { select: { agreements: true } } } }),
      this.prisma.terms.count({ where }),
    ]);
    const userCount = await this.prisma.user.count({ where: { status: 'ACTIVE', platformRole: 'USER' } });
    return {
      userCount,
      ...paged(
        rows.map((r) => ({ ...r, content: undefined, length: r.content.length, agreements: r._count.agreements, _count: undefined })),
        total,
        q,
      ),
    };
  }

  async adminDetail(id: string) {
    const row = await this.prisma.terms.findUnique({ where: { id }, include: { _count: { select: { agreements: true } } } });
    if (!row) throw AppError.notFound('약관을 찾을 수 없어요');
    return row;
  }

  /** 새 초안 (종류별 다음 버전 번호) */
  async create(master: AuthUser, input: TermsInput) {
    const last = await this.prisma.terms.findFirst({ where: { type: input.type }, orderBy: { version: 'desc' } });
    const def = TERMS_TYPES.find((t) => t.key === input.type);
    const row = await this.prisma.$transaction(async (tx) => {
      const t = await tx.terms.create({
        data: {
          type: input.type,
          version: (last?.version ?? 0) + 1,
          title: input.title,
          content: input.content,
          required: input.required ?? def?.required ?? true,
          effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : null,
          createdById: master.id,
        },
      });
      await this.audit.log(tx, { actorId: master.id, action: 'terms.create', targetType: 'Terms', targetId: t.id, after: { type: t.type, version: t.version } });
      return t;
    });
    return { id: row.id, version: row.version };
  }

  /** 초안만 수정 가능 (게시된 약관은 새 버전으로) */
  async update(master: AuthUser, id: string, input: TermsInput) {
    const row = await this.adminDetail(id);
    if (row.status !== 'DRAFT') throw new AppError(ErrorCode.VALIDATION_FAILED, '게시된 약관은 고칠 수 없어요. 새 버전을 만들어 주세요', HttpStatus.BAD_REQUEST);
    await this.prisma.terms.update({
      where: { id },
      data: { title: input.title, content: input.content, required: input.required ?? row.required, effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : null },
    });
    await this.audit.log(this.prisma, { actorId: master.id, action: 'terms.update', targetType: 'Terms', targetId: id });
    return { ok: true };
  }

  /** 게시: 같은 종류의 이전 게시본은 보관 처리 → 사용자는 다시 동의 */
  async publish(master: AuthUser, id: string) {
    const row = await this.adminDetail(id);
    if (row.status !== 'DRAFT') throw new AppError(ErrorCode.VALIDATION_FAILED, '초안만 게시할 수 있어요', HttpStatus.BAD_REQUEST);
    await this.prisma.$transaction(async (tx) => {
      await tx.terms.updateMany({ where: { type: row.type, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
      await tx.terms.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), effectiveAt: row.effectiveAt ?? new Date() } });
      await this.audit.log(tx, { actorId: master.id, action: 'terms.publish', targetType: 'Terms', targetId: id, after: { type: row.type, version: row.version } });
    });
    return { ok: true };
  }

  async remove(master: AuthUser, id: string) {
    const row = await this.adminDetail(id);
    if (row.status !== 'DRAFT') throw new AppError(ErrorCode.VALIDATION_FAILED, '초안만 지울 수 있어요', HttpStatus.BAD_REQUEST);
    await this.prisma.terms.delete({ where: { id } });
    await this.audit.log(this.prisma, { actorId: master.id, action: 'terms.delete', targetType: 'Terms', targetId: id, before: { type: row.type, version: row.version } });
    return { ok: true };
  }
}
