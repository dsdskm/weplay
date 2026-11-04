import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { attachmentSizeLimit, createAttachmentInputSchema, readAttachments, ErrorCode, FeatureKey } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { paged, PageQuery } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { FeaturesService } from '../features/features.service';

const FEATURE = FeatureKey.BOARD;
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const attachmentInputSchema = createAttachmentInputSchema(attachmentSizeLimit(process.env.MAX_UPLOAD_MB));

export const createPostSchema = attachmentInputSchema.extend({
  teamId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(10000),
  anonymous: z.boolean().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = attachmentInputSchema.extend({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(10000),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const commentSchema = attachmentInputSchema.extend({ body: z.string().trim().min(1, '댓글을 입력하세요').max(1000) });
export type CommentInput = z.infer<typeof commentSchema>;

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
  ) { }

  /** 내가 볼 수 있는 게시판: 그룹 전체(설정 시) + 내 팀 (그룹 ADMIN은 모든 팀) */
  async boards(groupId: string, viewer: AuthUser, isGroupAdmin: boolean) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, anonymousAllowed: false, boards: [] };
    const cfg = await this.settings.get(groupId, FEATURE);
    const mine = await this.prisma.teamMember.findMany({ where: { groupId, userId: viewer.id, team: { deletedAt: null } }, select: { teamId: true } });
    const myIds = new Set(mine.map((m) => m.teamId));
    const teams = await this.prisma.team.findMany({ where: { groupId, deletedAt: null }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
    const counts = await this.prisma.boardPost.groupBy({ by: ['teamId'], where: { groupId, hiddenAt: null }, _count: { _all: true } });
    const countOf = new Map(counts.map((c) => [c.teamId, c._count._all]));
    return {
      enabled: true as const,
      anonymousAllowed: !!cfg.anonymousAllowed,
      boards: [
        ...(cfg.groupBoardEnabled ? [{ teamId: null as string | null, name: '그룹 전체', postCount: countOf.get(null) ?? 0 }] : []),
        ...teams.filter((t) => isGroupAdmin || myIds.has(t.id)).map((t) => ({ teamId: t.id as string | null, name: t.name, postCount: countOf.get(t.id) ?? 0 })),
      ],
    };
  }

  /** 게시판 접근 확인: 그룹 게시판은 구성원 모두, 팀 게시판은 팀원 또는 그룹 ADMIN */
  private async assertAccess(groupId: string, userId: string, isGroupAdmin: boolean, teamId: string | null) {
    if (teamId === null) {
      const cfg = await this.settings.get(groupId, FEATURE);
      if (!cfg.groupBoardEnabled) throw AppError.forbidden('그룹 전체 게시판을 쓰지 않아요');
      return;
    }
    const team = await this.prisma.team.findFirst({ where: { id: teamId, groupId, deletedAt: null } });
    if (!team) throw AppError.notFound('팀을 찾을 수 없어요');
    if (!isGroupAdmin && !(await this.prisma.teamMember.count({ where: { teamId, userId } }))) throw AppError.forbidden('팀원만 볼 수 있는 게시판이에요');
  }

  async posts(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, teamId: string | null, search: string | undefined, q: PageQuery) {
    await this.features.assertEnabled(groupId, FEATURE);
    await this.assertAccess(groupId, viewer.id, isGroupAdmin, teamId);
    const where = {
      groupId,
      teamId,
      hiddenAt: null,
      ...(search?.trim() ? { OR: [{ title: { contains: search.trim(), mode: 'insensitive' as const } }, { body: { contains: search.trim(), mode: 'insensitive' as const } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.boardPost.findMany({
        where,
        include: { author: { select: userSelect }, _count: { select: { comments: true } } },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.boardPost.count({ where }),
    ]);
    return paged(
      rows.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.body.slice(0, 80),
        attachments: readAttachments(p.attachments),
        author: p.anonymous ? null : p.author,
        mine: p.authorId === viewer.id,
        pinned: p.pinned,
        commentCount: p._count.comments,
        createdAt: p.createdAt,
      })),
      total,
      q,
    );
  }

  async create(actor: AuthUser, groupId: string, isGroupAdmin: boolean, input: CreatePostInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const teamId = input.teamId ?? null;
    await this.assertAccess(groupId, actor.id, isGroupAdmin, teamId);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (input.body.length > Number(cfg.maxPostLength)) throw new AppError(ErrorCode.VALIDATION_FAILED, `본문은 ${cfg.maxPostLength}자까지 쓸 수 있어요`, HttpStatus.BAD_REQUEST);
    if (input.anonymous && !cfg.anonymousAllowed) throw new AppError(ErrorCode.VALIDATION_FAILED, '익명으로는 쓸 수 없어요', HttpStatus.BAD_REQUEST);
    const row = await this.prisma.boardPost.create({
      data: { groupId, teamId, authorId: actor.id, title: input.title, body: input.body, anonymous: !!input.anonymous, attachments: input.attachments },
    });
    return { id: row.id };
  }

  private async postFor(groupId: string, viewer: AuthUser, isGroupAdmin: boolean, id: string) {
    const post = await this.prisma.boardPost.findFirst({ where: { id, groupId, hiddenAt: null }, include: { author: { select: userSelect } } });
    if (!post) throw AppError.notFound('게시글을 찾을 수 없어요');
    await this.assertAccess(groupId, viewer.id, isGroupAdmin, post.teamId);
    return post;
  }

  /** 게시글 상세와 첫 댓글 페이지 */
  async detail(groupId: string, viewer: AuthUser, isManager: boolean, isGroupAdmin: boolean, id: string) {
    const post = await this.postFor(groupId, viewer, isGroupAdmin, id);
    const cfg = await this.settings.get(groupId, FEATURE);
    const comments = await this.prisma.boardComment.count({ where: { postId: id } });
    return {
      id: post.id,
      teamId: post.teamId,
      title: post.title,
      body: post.body,
      attachments: readAttachments(post.attachments),
      author: post.anonymous ? null : post.author,
      mine: post.authorId === viewer.id,
      pinned: post.pinned,
      canEdit: post.authorId === viewer.id,
      canDelete: post.authorId === viewer.id || isManager,
      canModerate: isManager,
      commentsEnabled: !!cfg.commentsEnabled,
      commentCount: comments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async comments(groupId: string, viewer: AuthUser, isManager: boolean, isGroupAdmin: boolean, id: string, q: PageQuery) {
    await this.postFor(groupId, viewer, isGroupAdmin, id);
    const [rows, total] = await Promise.all([
      this.prisma.boardComment.findMany({ where: { postId: id }, include: { author: { select: userSelect } }, orderBy: { createdAt: 'asc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.boardComment.count({ where: { postId: id } }),
    ]);
    return paged(
      rows.map((c) => ({ id: c.id, body: c.body, attachments: readAttachments(c.attachments), author: c.author, createdAt: c.createdAt, mine: c.authorId === viewer.id, canEdit: c.authorId === viewer.id, canDelete: c.authorId === viewer.id || isManager })),
      total,
      q,
    );
  }

  async update(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: UpdatePostInput) {
    const post = await this.postFor(groupId, actor, isGroupAdmin, id);
    if (post.authorId !== actor.id) throw AppError.forbidden('본인 글만 고칠 수 있어요');
    const cfg = await this.settings.get(groupId, FEATURE);
    if (input.body.length > Number(cfg.maxPostLength)) throw new AppError(ErrorCode.VALIDATION_FAILED, `본문은 ${cfg.maxPostLength}자까지 쓸 수 있어요`, HttpStatus.BAD_REQUEST);
    await this.prisma.boardPost.update({ where: { id }, data: { title: input.title, body: input.body, attachments: input.attachments } });
    return { ok: true };
  }

  async remove(actor: AuthUser, groupId: string, isManager: boolean, isGroupAdmin: boolean, id: string) {
    const post = await this.postFor(groupId, actor, isGroupAdmin, id);
    if (post.authorId !== actor.id && !isManager) throw AppError.forbidden('본인 글이나 관리자만 지울 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.boardPost.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'board.post_delete', targetType: 'BoardPost', targetId: id, before: { title: post.title, authorId: post.authorId } });
    });
    return { ok: true };
  }

  /** 관리자: 상단 고정 */
  async pin(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, pinned: boolean) {
    await this.postFor(groupId, actor, isGroupAdmin, id);
    await this.prisma.boardPost.update({ where: { id }, data: { pinned } });
    return { ok: true };
  }

  /** 관리자: 숨김 (구성원 화면과 포인트 집계에서 제외) */
  async hide(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string) {
    await this.postFor(groupId, actor, isGroupAdmin, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.boardPost.update({ where: { id }, data: { hiddenAt: new Date() } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'board.post_hide', targetType: 'BoardPost', targetId: id });
    });
    return { ok: true };
  }

  async addComment(actor: AuthUser, groupId: string, isGroupAdmin: boolean, id: string, input: CommentInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    await this.postFor(groupId, actor, isGroupAdmin, id);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (!cfg.commentsEnabled) throw AppError.forbidden('댓글을 쓸 수 없는 게시판이에요');
    const row = await this.prisma.boardComment.create({ data: { postId: id, authorId: actor.id, body: input.body, attachments: input.attachments } });
    return { id: row.id };
  }

  async updateComment(actor: AuthUser, groupId: string, id: string, commentId: string, input: CommentInput) {
    const c = await this.prisma.boardComment.findFirst({ where: { id: commentId, postId: id, post: { groupId } } });
    if (!c) throw AppError.notFound('댓글을 찾을 수 없어요');
    if (c.authorId !== actor.id) throw AppError.forbidden('본인 댓글만 고칠 수 있어요');
    await this.prisma.boardComment.update({ where: { id: commentId }, data: { body: input.body, attachments: input.attachments } });
    return { ok: true };
  }

  async removeComment(actor: AuthUser, groupId: string, isManager: boolean, id: string, commentId: string) {
    const c = await this.prisma.boardComment.findFirst({ where: { id: commentId, postId: id, post: { groupId } } });
    if (!c) throw AppError.notFound('댓글을 찾을 수 없어요');
    if (c.authorId !== actor.id && !isManager) throw AppError.forbidden('본인 댓글이나 관리자만 지울 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.boardComment.delete({ where: { id: commentId } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'board.comment_delete', targetType: 'BoardComment', targetId: commentId, before: { authorId: c.authorId } });
    });
    return { ok: true };
  }
}
