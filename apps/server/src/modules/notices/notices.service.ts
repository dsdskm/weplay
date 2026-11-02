import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';

const userSelect = { id: true, name: true, avatarUrl: true } as const;

export const noticeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(10000),
  teamId: z.string().min(1).nullable().optional(),
  pinned: z.boolean().optional(),
  important: z.boolean().optional(),
});
export type NoticeInput = z.infer<typeof noticeSchema>;

export const systemNoticeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(10000),
  level: z.enum(['INFO', 'UPDATE', 'MAINTENANCE', 'URGENT']).default('INFO'),
  pinned: z.boolean().optional(),
  banner: z.boolean().optional(),
  published: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});
export type SystemNoticeInput = z.infer<typeof systemNoticeSchema>;

/** 지금 보여 줄 시스템 공지 조건 (게시 + 기간 안) */
const activeSystem = () => {
  const now = new Date();
  return { published: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] };
};

/** 그룹 공지(관리자 작성, 팀 공지 가능)와 시스템 공지(MASTER) */
@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async myTeams(groupId: string, userId: string) {
    return this.prisma.teamMember.findMany({ where: { groupId, userId, team: { deletedAt: null } }, select: { teamId: true, role: true } });
  }

  /** 작성 권한: 그룹 공지는 그룹 ADMIN, 팀 공지는 그 팀 ADMIN도 */
  private async assertWriter(groupId: string, userId: string, isGroupAdmin: boolean, teamId: string | null | undefined) {
    if (isGroupAdmin) return;
    if (teamId && (await this.myTeams(groupId, userId)).some((t) => t.teamId === teamId && t.role === 'ADMIN')) return;
    throw AppError.forbidden(teamId ? '팀 관리자만 팀 공지를 쓸 수 있어요' : '그룹 관리자만 공지를 쓸 수 있어요');
  }

  async list(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, q: PageQuery, search?: string) {
    const teams = await this.myTeams(groupId, viewer.id);
    const where = {
      groupId,
      ...(isGroupAdmin ? {} : { OR: [{ teamId: null }, { teamId: { in: teams.map((t) => t.teamId) } }] }),
      ...(search?.trim() ? { title: { contains: search.trim(), mode: 'insensitive' as const } } : {}),
    };
    const [rows, total, teamRows, unread] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
        include: { reads: { where: { userId: viewer.id }, select: { userId: true } }, _count: { select: { reads: true } } },
      }),
      this.prisma.notice.count({ where }),
      this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true } }),
      this.prisma.notice.count({ where: { ...where, reads: { none: { userId: viewer.id } } } }),
    ]);
    const authors = new Map((await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.authorId) } }, select: userSelect })).map((u) => [u.id, u]));
    const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
    return {
      unread,
      canWrite: isGroupAdmin || teams.some((t) => t.role === 'ADMIN'),
      teams: teamRows.filter((t) => isGroupAdmin || teams.some((m) => m.teamId === t.id && m.role === 'ADMIN')),
      ...paged(
        rows.map((n) => ({
          id: n.id,
          title: n.title,
          excerpt: n.body.slice(0, 100),
          teamName: n.teamId ? (teamName.get(n.teamId) ?? null) : null,
          pinned: n.pinned,
          important: n.important,
          read: n.reads.length > 0,
          readCount: n._count.reads,
          author: authors.get(n.authorId) ?? null,
          createdAt: n.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  /** 상세 (열면 읽음 처리) */
  async detail(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const n = await this.prisma.notice.findFirst({ where: { id, groupId } });
    if (!n) throw AppError.notFound('공지를 찾을 수 없어요');
    const teams = await this.myTeams(groupId, viewer.id);
    if (n.teamId && !isGroupAdmin && !teams.some((t) => t.teamId === n.teamId)) throw AppError.forbidden('우리 팀 공지가 아니에요');
    await this.prisma.noticeRead.upsert({ where: { noticeId_userId: { noticeId: id, userId: viewer.id } }, create: { noticeId: id, userId: viewer.id }, update: {} });
    const [author, readCount, memberCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: n.authorId }, select: userSelect }),
      this.prisma.noticeRead.count({ where: { noticeId: id } }),
      n.teamId ? this.prisma.teamMember.count({ where: { teamId: n.teamId } }) : this.prisma.groupMembership.count({ where: { groupId, status: 'APPROVED' } }),
    ]);
    const canEdit = isGroupAdmin || (!!n.teamId && teams.some((t) => t.teamId === n.teamId && t.role === 'ADMIN'));
    return { ...n, author, readCount, memberCount, canEdit };
  }

  async create(actor: AuthUser, groupId: string, isGroupAdmin: boolean, input: NoticeInput) {
    await this.assertWriter(groupId, actor.id, isGroupAdmin, input.teamId);
    const row = await this.prisma.$transaction(async (tx) => {
      const n = await tx.notice.create({
        data: { groupId, teamId: input.teamId ?? null, authorId: actor.id, title: input.title, body: input.body, pinned: !!input.pinned, important: !!input.important },
      });
      await tx.noticeRead.create({ data: { noticeId: n.id, userId: actor.id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'notice.create', targetType: 'Notice', targetId: n.id, after: { title: n.title } });
      return n;
    });
    return { id: row.id };
  }

  async update(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: NoticeInput) {
    const n = await this.prisma.notice.findFirst({ where: { id, groupId } });
    if (!n) throw AppError.notFound('공지를 찾을 수 없어요');
    await this.assertWriter(groupId, actor.id, isGroupAdmin, n.teamId);
    await this.prisma.notice.update({ where: { id }, data: { title: input.title, body: input.body, pinned: !!input.pinned, important: !!input.important } });
    return { ok: true };
  }

  async remove(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    const n = await this.prisma.notice.findFirst({ where: { id, groupId } });
    if (!n) throw AppError.notFound('공지를 찾을 수 없어요');
    await this.assertWriter(groupId, actor.id, isGroupAdmin, n.teamId);
    await this.prisma.$transaction(async (tx) => {
      await tx.notice.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'notice.delete', targetType: 'Notice', targetId: id, before: { title: n.title } });
    });
    return { ok: true };
  }

  // ── 시스템 공지 ──

  /** 사용자용: 지금 게시 중인 시스템 공지 */
  async systemList(q: PageQuery) {
    const where = activeSystem();
    const [rows, total] = await Promise.all([
      this.prisma.systemNotice.findMany({ where, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], skip: q.skip, take: q.pageSize }),
      this.prisma.systemNotice.count({ where }),
    ]);
    return paged(
      rows.map((n) => ({ id: n.id, title: n.title, body: n.body, level: n.level, pinned: n.pinned, banner: n.banner, createdAt: n.createdAt })),
      total,
      q,
    );
  }

  /** 상단 띠 배너로 보여 줄 공지 (최신 1개) */
  systemBanner() {
    return this.prisma.systemNotice.findFirst({
      where: { ...activeSystem(), banner: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, level: true, createdAt: true },
    });
  }

  async systemDetail(id: string, includeHidden = false) {
    const n = await this.prisma.systemNotice.findFirst({ where: { id, ...(includeHidden ? {} : activeSystem()) } });
    if (!n) throw AppError.notFound('공지를 찾을 수 없어요');
    return n;
  }

  /** MASTER: 전체 목록 (게시 전·끝난 공지 포함) */
  async adminSystemList(q: PageQuery) {
    const [rows, total] = await Promise.all([
      this.prisma.systemNotice.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], skip: q.skip, take: q.pageSize }),
      this.prisma.systemNotice.count(),
    ]);
    return paged(rows, total, q);
  }

  private systemData(input: SystemNoticeInput) {
    return {
      title: input.title,
      body: input.body,
      level: input.level,
      pinned: !!input.pinned,
      banner: !!input.banner,
      published: input.published ?? true,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    };
  }

  async createSystem(actor: AuthUser, input: SystemNoticeInput) {
    const row = await this.prisma.$transaction(async (tx) => {
      const n = await tx.systemNotice.create({ data: { ...this.systemData(input), authorId: actor.id } });
      await this.audit.log(tx, { actorId: actor.id, action: 'system_notice.create', targetType: 'SystemNotice', targetId: n.id, after: { title: n.title, level: n.level } });
      return n;
    });
    return { id: row.id };
  }

  async updateSystem(actor: AuthUser, id: string, input: SystemNoticeInput) {
    await this.systemDetail(id, true);
    await this.prisma.$transaction(async (tx) => {
      await tx.systemNotice.update({ where: { id }, data: this.systemData(input) });
      await this.audit.log(tx, { actorId: actor.id, action: 'system_notice.update', targetType: 'SystemNotice', targetId: id, after: { title: input.title } });
    });
    return { ok: true };
  }

  async removeSystem(actor: AuthUser, id: string) {
    const n = await this.systemDetail(id, true);
    await this.prisma.$transaction(async (tx) => {
      await tx.systemNotice.delete({ where: { id } });
      await this.audit.log(tx, { actorId: actor.id, action: 'system_notice.delete', targetType: 'SystemNotice', targetId: id, before: { title: n.title } });
    });
    return { ok: true };
  }
}
