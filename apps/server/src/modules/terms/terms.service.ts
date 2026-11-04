import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { attachmentSchema, ErrorCode } from '@weplay/shared';
import { Prisma } from '@weplay/db';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { effectiveTerms, lockTerms, validateConsent } from '../../common/terms-policy';
import { readUploadBuffer } from '../uploads/uploads.service';
import { TermsMailService } from './terms-mail.service';

export const termsSchema = z.object({
  type: z.enum(['SERVICE', 'PRIVACY', 'MARKETING']),
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(100000),
  required: z.boolean().optional(),
  effectiveAt: z.string().datetime().nullable().optional(),
  changeSummary: z.string().trim().max(5000).default(''),
  attachment: attachmentSchema.refine((file) =>
    (file.url.endsWith('.pdf') && file.mimeType === 'application/pdf') ||
    (file.url.endsWith('.txt') && file.mimeType === 'text/plain') ||
    (/\.(html|htm)$/.test(file.url) && file.mimeType === 'text/html'), '약관 파일은 PDF, TXT 또는 HTML만 사용할 수 있어요').nullable().optional(),
});
export type TermsInput = z.infer<typeof termsSchema>;

export const agreeSchema = z.object({ termsIds: z.array(z.string().min(1)).min(1).max(10) });

/** 약관: 종류별 버전 관리(초안 → 게시 → 보관). 게시된 최신 버전에 동의를 받음 */
@Injectable()
export class TermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: TermsMailService,
  ) { }

  /** 종류별 현재 게시 버전 */
  async current() {
    return (await effectiveTerms(this.prisma)).map((row) => this.publicDocument(row));
  }

  private publicDocument(row: Awaited<ReturnType<typeof effectiveTerms>>[number]) {
    const { id, type, version, title, content, required, status, effectiveAt, publishedAt, attachment, changeSummary } = row;
    return { id, type, version, title, content, required: required || type === 'SERVICE', status, effectiveAt, publishedAt, attachment, changeSummary };
  }

  /** 지난 버전 포함 종류별 게시 이력 */
  async history(type: string) {
    if (!['SERVICE', 'PRIVACY', 'MARKETING'].includes(type)) throw AppError.notFound('약관 종류를 찾을 수 없어요');
    return this.prisma.terms.findMany({
      where: { type, status: { in: ['PUBLISHED', 'ARCHIVED'] } },
      orderBy: { version: 'desc' },
      select: { id: true, type: true, version: true, title: true, content: true, required: true, status: true, effectiveAt: true, publishedAt: true, attachment: true, changeSummary: true },
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
    return this.prisma.$transaction(async (tx) => {
      await lockTerms(tx);
      const valid = await validateConsent(tx, termsIds);
      await tx.termsAgreement.createMany({ data: valid.map((row) => ({ termsId: row.id, userId: user.id })), skipDuplicates: true });
      await this.audit.log(tx, { actorId: user.id, action: 'terms.agree', targetType: 'User', targetId: user.id, after: { termsIds } });
      return { ok: true, agreed: valid.length };
    });
  }

  agreements(user: AuthUser) {
    return this.prisma.termsAgreement.findMany({ where: { userId: user.id }, orderBy: { agreedAt: 'desc' }, include: { terms: { select: { type: true, title: true, version: true, effectiveAt: true } } } });
  }

  // ── MASTER ──

  async adminList(type: string | undefined, q: PageQuery) {
    const where = type ? { type } : {};
    const [rows, total] = await Promise.all([
      this.prisma.terms.findMany({ where, orderBy: [{ type: 'asc' }, { version: 'desc' }], skip: q.skip, take: q.pageSize, include: { _count: { select: { agreements: true } } } }),
      this.prisma.terms.count({ where }),
    ]);
    const userCount = await this.prisma.user.count({ where: { status: 'ACTIVE', platformRole: 'USER' } });
    const notifications = await this.prisma.termsNotification.groupBy({ by: ['termsId', 'status'], where: { termsId: { in: rows.map((row) => row.id) } }, _count: true });
    return {
      userCount,
      ...paged(
        rows.map((r) => ({
          ...r, content: undefined, length: r.content.length, agreements: r._count.agreements, _count: undefined,
          notifications: Object.fromEntries(['pending', 'sent', 'failed', 'simulated'].map((status) => [status, notifications.filter((item) => item.termsId === r.id && (item.status === status.toUpperCase() || (status === 'pending' && item.status === 'SENDING'))).reduce((sum, item) => sum + item._count, 0)])),
        })),
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
    await this.checkAttachment(input);
    const row = await this.prisma.$transaction(async (tx) => {
      await lockTerms(tx);
      const last = await tx.terms.findFirst({ where: { type: input.type }, orderBy: { version: 'desc' } });
      const t = await tx.terms.create({
        data: {
          type: input.type,
          version: (last?.version ?? 0) + 1,
          title: input.title,
          content: input.content,
          required: input.type === 'SERVICE' ? true : input.required ?? input.type === 'PRIVACY',
          attachment: input.attachment ?? Prisma.DbNull,
          changeSummary: input.changeSummary,
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
    await this.checkAttachment(input);
    await this.prisma.$transaction(async (tx) => {
      await lockTerms(tx);
      const row = await tx.terms.findUnique({ where: { id } });
      if (!row) throw AppError.notFound('약관을 찾을 수 없어요');
      if (row.status !== 'DRAFT' || row.type !== input.type) throw new AppError(ErrorCode.VALIDATION_FAILED, '초안만 수정할 수 있고 약관 종류는 변경할 수 없어요', 400);
      await tx.terms.update({
        where: { id }, data: {
          title: input.title, content: input.content,
          required: row.type === 'SERVICE' ? true : input.required ?? row.required,
          attachment: input.attachment === undefined ? undefined : input.attachment ?? Prisma.DbNull,
          changeSummary: input.changeSummary,
          effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : null,
        }
      });
      await this.audit.log(tx, { actorId: master.id, action: 'terms.update', targetType: 'Terms', targetId: id });
    });
    return { ok: true };
  }

  /** 게시: 같은 종류의 이전 게시본은 보관 처리 → 사용자는 다시 동의 */
  async publish(master: AuthUser, id: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockTerms(tx);
      const row = await tx.terms.findUnique({ where: { id } });
      if (!row) throw AppError.notFound('약관을 찾을 수 없어요');
      if (row.status !== 'DRAFT') throw new AppError(ErrorCode.VALIDATION_FAILED, '초안만 게시할 수 있어요', 400);
      const now = new Date();
      const latest = await tx.terms.findFirst({ where: { type: row.type, status: { in: ['PUBLISHED', 'ARCHIVED'] } }, orderBy: { version: 'desc' } });
      const effectiveAt = row.effectiveAt ?? now;
      if (latest && (row.version <= latest.version || effectiveAt < now || (latest.effectiveAt && effectiveAt <= latest.effectiveAt))) {
        throw new AppError(ErrorCode.VALIDATION_FAILED, '기존 게시본보다 높은 버전과 늦은 시행일을 지정해 주세요. 과거 시행일로 개정할 수 없어요.', 400);
      }
      await tx.terms.updateMany({ where: { type: row.type, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
      await tx.terms.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: now, effectiveAt, required: row.type === 'SERVICE' ? true : row.required } });
      const users = await tx.user.findMany({ where: { status: 'ACTIVE', email: { not: null } }, select: { id: true, email: true } });
      await tx.termsNotification.createMany({ data: users.filter((user) => user.email).map((user) => ({ termsId: id, userId: user.id, email: user.email! })), skipDuplicates: true });
      await this.audit.log(tx, { actorId: master.id, action: 'terms.publish', targetType: 'Terms', targetId: id, after: { type: row.type, version: row.version } });
    });
    this.mail.kick();
    return { ok: true };
  }

  async remove(master: AuthUser, id: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockTerms(tx);
      const row = await tx.terms.findUnique({ where: { id } });
      if (!row) throw AppError.notFound('약관을 찾을 수 없어요');
      if (row.status !== 'DRAFT') throw new AppError(ErrorCode.VALIDATION_FAILED, '초안만 지울 수 있어요', HttpStatus.BAD_REQUEST);
      await tx.terms.delete({ where: { id } });
      await this.audit.log(tx, { actorId: master.id, action: 'terms.delete', targetType: 'Terms', targetId: id, before: { type: row.type, version: row.version } });
    });
    return { ok: true };
  }

  async notifications(id: string) {
    await this.adminDetail(id);
    return this.prisma.termsNotification.findMany({ where: { termsId: id }, orderBy: [{ status: 'asc' }, { createdAt: 'asc' }], select: { id: true, userId: true, email: true, status: true, attempts: true, sentAt: true, lastError: true } });
  }

  async retry(master: AuthUser, id: string) {
    await this.adminDetail(id);
    await this.prisma.termsNotification.updateMany({ where: { termsId: id, status: { in: ['FAILED', 'SIMULATED'] } }, data: { status: 'PENDING', attempts: 0, lastError: null } });
    await this.audit.log(this.prisma, { actorId: master.id, action: 'terms.notifications.retry', targetType: 'Terms', targetId: id });
    this.mail.kick();
    return { ok: true };
  }

  private async checkAttachment(input: TermsInput) {
    if (!input.attachment) return;
    const file = await readUploadBuffer(input.attachment.url);
    if (!file || file.length !== input.attachment.size) throw new AppError(ErrorCode.VALIDATION_FAILED, '첨부 파일을 확인할 수 없어요. 다시 업로드해 주세요.', 400);
  }
}
