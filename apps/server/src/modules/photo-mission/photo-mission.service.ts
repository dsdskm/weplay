import { HttpStatus, Injectable } from '@nestjs/common';
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

const FEATURE = FeatureKey.PHOTO_MISSION;
const userSelect = { id: true, name: true, avatarUrl: true } as const;
const mediaUrl = z.string().regex(/^\/uploads\/[0-9a-f]{32}\.(jpg|png|gif|webp|mp4|webm|mov)$/, '업로드한 파일만 사용할 수 있어요');

export const createMissionSchema = z.object({
  theme: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  referenceUrl: mediaUrl.nullable().optional(),
  referenceType: z.enum(['IMAGE', 'VIDEO']).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  hostId: z.string().min(1).optional(),
});
export type CreateMissionInput = z.infer<typeof createMissionSchema>;

export const submitSchema = z.object({
  mediaUrl,
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  caption: z.string().trim().max(200).nullable().optional(),
});
export type SubmitInput = z.infer<typeof submitSchema>;

export const bestSchema = z.object({ submissionIds: z.array(z.string().min(1)).max(3) });
export type BestInput = z.infer<typeof bestSchema>;

type Mission = { id: string; status: string; deadline: Date | null; hostId: string };
const isOpen = (m: Mission) => m.status === 'OPEN' && (!m.deadline || m.deadline.getTime() > Date.now());

@Injectable()
export class PhotoMissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
    private readonly points: PointsBadgeService,
  ) {}

  /** 기한이 지난 미션을 종료 처리 */
  private async closeExpired(groupId: string) {
    await this.prisma.photoMission.updateMany({
      where: { groupId, status: 'OPEN', deadline: { lt: new Date() } },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  /** 다음 주최 순서: 주최 횟수가 가장 적고, 마지막 주최가 가장 오래된(또는 없는) 활성 구성원 */
  private async nextHost(groupId: string) {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId, status: 'APPROVED', user: { status: 'ACTIVE' } },
      select: { userId: true, joinedAt: true, user: { select: userSelect } },
    });
    if (members.length === 0) return null;
    const hosted = await this.prisma.photoMission.groupBy({ by: ['hostId'], where: { groupId }, _count: { _all: true }, _max: { createdAt: true } });
    const stat = new Map(hosted.map((h) => [h.hostId, { count: h._count._all, last: h._max.createdAt?.getTime() ?? 0 }]));
    members.sort((a, b) => {
      const sa = stat.get(a.userId) ?? { count: 0, last: 0 };
      const sb = stat.get(b.userId) ?? { count: 0, last: 0 };
      return sa.count - sb.count || sa.last - sb.last || a.joinedAt.getTime() - b.joinedAt.getTime();
    });
    return members[0].user;
  }

  /** 미션 목록과 주최 순서 정보 */
  async list(groupId: string, viewer: AuthUser, isManager: boolean, status: string | undefined, q: PageQuery) {
    if (!(await this.features.isEnabled(groupId, FEATURE))) return { enabled: false as const, items: [], total: 0, page: q.page, pageSize: q.pageSize };
    await this.closeExpired(groupId);
    const cfg = await this.settings.get(groupId, FEATURE);
    const where = { groupId, ...(status === 'OPEN' || status === 'CLOSED' ? { status } : {}) };
    const [rows, total, open, next] = await Promise.all([
      this.prisma.photoMission.findMany({
        where,
        include: {
          host: { select: userSelect },
          _count: { select: { submissions: true } },
          submissions: { take: 1, orderBy: [{ isBest: 'desc' }, { createdAt: 'asc' }], select: { mediaUrl: true, mediaType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.photoMission.count({ where }),
      this.prisma.photoMission.count({ where: { groupId, status: 'OPEN' } }),
      this.nextHost(groupId),
    ]);
    const mode = String(cfg.rotationMode);
    const canCreate = open === 0 && (isManager || mode === 'ANYONE' || (mode === 'ROTATION' && next?.id === viewer.id));
    return {
      enabled: true as const,
      rotation: { mode, nextHost: next, hasOpen: open > 0, canCreate },
      ...paged(
        rows.map((m) => ({
          id: m.id,
          theme: m.theme,
          host: m.host,
          open: isOpen(m),
          deadline: m.deadline,
          submissionCount: m._count.submissions,
          cover: m.submissions[0] ?? (m.referenceUrl ? { mediaUrl: m.referenceUrl, mediaType: m.referenceType ?? 'IMAGE' } : null),
          createdAt: m.createdAt,
        })),
        total,
        q,
      ),
    };
  }

  async create(actor: AuthUser, groupId: string, isManager: boolean, input: CreateMissionInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    await this.closeExpired(groupId);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (await this.prisma.photoMission.count({ where: { groupId, status: 'OPEN' } })) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '진행 중인 미션이 있어요. 끝난 뒤에 새 미션을 열 수 있어요', HttpStatus.CONFLICT);
    }
    const mode = String(cfg.rotationMode);
    const next = await this.nextHost(groupId);
    let hostId = actor.id;
    if (isManager && input.hostId) hostId = input.hostId;
    else if (!isManager) {
      if (mode === 'ADMIN_ONLY') throw AppError.forbidden('관리자만 미션을 열 수 있어요');
      if (mode === 'ROTATION' && next?.id !== actor.id) throw AppError.forbidden('지금은 다른 분이 주최할 차례예요');
    }
    const host = await this.prisma.groupMembership.findUnique({ where: { userId_groupId: { userId: hostId, groupId } }, include: { user: { select: { status: true } } } });
    if (host?.status !== 'APPROVED' || host.user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '활성 구성원만 주최할 수 있어요', HttpStatus.BAD_REQUEST);
    }
    const deadline = input.deadline ? new Date(input.deadline) : new Date(Date.now() + Number(cfg.durationHours) * 3_600_000);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.photoMission.create({
        data: {
          groupId,
          hostId,
          theme: input.theme,
          description: input.description ?? null,
          referenceUrl: input.referenceUrl ?? null,
          referenceType: input.referenceUrl ? (input.referenceType ?? 'IMAGE') : null,
          deadline,
        },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'photo_mission.create', targetType: 'PhotoMission', targetId: row.id, after: { hostId, theme: input.theme } });
      return { id: row.id };
    });
  }

  async detail(groupId: string, viewer: AuthUser, isManager: boolean, id: string) {
    await this.closeExpired(groupId);
    const m = await this.prisma.photoMission.findFirst({
      where: { id, groupId },
      include: { host: { select: userSelect }, submissions: { include: { author: { select: userSelect } }, orderBy: { createdAt: 'asc' }, take: 200 } },
    });
    if (!m) throw AppError.notFound('미션을 찾을 수 없어요');
    const cfg = await this.settings.get(groupId, FEATURE);
    const mine = m.submissions.filter((s) => s.authorId === viewer.id).length;
    const isHost = m.hostId === viewer.id;
    return {
      id: m.id,
      theme: m.theme,
      description: m.description,
      referenceUrl: m.referenceUrl,
      referenceType: m.referenceType,
      host: m.host,
      open: isOpen(m),
      deadline: m.deadline,
      createdAt: m.createdAt,
      isHost,
      canManage: isHost || isManager,
      bestCount: Number(cfg.bestCount),
      allowVideo: !!cfg.allowVideo,
      maxSubmissions: Number(cfg.maxSubmissionsPerMember),
      canSubmit: isOpen(m) && !isHost && mine < Number(cfg.maxSubmissionsPerMember),
      remainingSubmissions: Math.max(0, Number(cfg.maxSubmissionsPerMember) - mine),
      submissions: m.submissions.map((s) => ({
        id: s.id,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        isBest: s.isBest,
        author: s.author,
        mine: s.authorId === viewer.id,
        createdAt: s.createdAt,
      })),
    };
  }

  async submit(actor: AuthUser, groupId: string, id: string, input: SubmitInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    await this.closeExpired(groupId);
    const m = await this.prisma.photoMission.findFirst({ where: { id, groupId } });
    if (!m) throw AppError.notFound('미션을 찾을 수 없어요');
    if (!isOpen(m)) throw new AppError(ErrorCode.VALIDATION_FAILED, '끝난 미션이에요', HttpStatus.BAD_REQUEST);
    if (m.hostId === actor.id) throw new AppError(ErrorCode.VALIDATION_FAILED, '주최자는 사진을 올리지 않고 베스트 컷을 골라요', HttpStatus.BAD_REQUEST);
    const cfg = await this.settings.get(groupId, FEATURE);
    if (input.mediaType === 'VIDEO' && !cfg.allowVideo) throw new AppError(ErrorCode.VALIDATION_FAILED, '영상은 올릴 수 없어요', HttpStatus.BAD_REQUEST);
    const mine = await this.prisma.photoSubmission.count({ where: { missionId: id, authorId: actor.id } });
    if (mine >= Number(cfg.maxSubmissionsPerMember)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `한 미션에는 ${cfg.maxSubmissionsPerMember}개까지 올릴 수 있어요`, HttpStatus.BAD_REQUEST);
    }
    const row = await this.prisma.photoSubmission.create({
      data: { missionId: id, authorId: actor.id, mediaUrl: input.mediaUrl, mediaType: input.mediaType, caption: input.caption ?? null },
    });
    await this.points.addLedger(groupId, [{ userId: actor.id, amount: -Number(cfg.entryFee), kind: 'GAME_FEE', refId: `photo:${row.id}`, memo: `사진 미션 참가비: ${m.theme}` }]);
    return { id: row.id };
  }

  async deleteSubmission(actor: AuthUser, groupId: string, isManager: boolean, id: string, sid: string) {
    const s = await this.prisma.photoSubmission.findFirst({ where: { id: sid, missionId: id, mission: { groupId } } });
    if (!s) throw AppError.notFound('제출물을 찾을 수 없어요');
    if (!isManager && s.authorId !== actor.id) throw AppError.forbidden('본인 제출물만 지울 수 있어요');
    await this.prisma.photoSubmission.delete({ where: { id: sid } });
    // 참가비 환불
    await this.prisma.pointLedger.deleteMany({ where: { groupId, userId: s.authorId, kind: 'GAME_FEE', refId: `photo:${sid}` } });
    return { ok: true };
  }

  /** 주최자(또는 관리자)가 베스트 컷을 고름. 개수는 설정(bestCount)까지 */
  async pickBest(actor: AuthUser, groupId: string, isManager: boolean, id: string, input: BestInput) {
    await this.features.assertEnabled(groupId, FEATURE);
    const m = await this.prisma.photoMission.findFirst({ where: { id, groupId } });
    if (!m) throw AppError.notFound('미션을 찾을 수 없어요');
    if (!isManager && m.hostId !== actor.id) throw AppError.forbidden('주최자만 베스트 컷을 고를 수 있어요');
    const cfg = await this.settings.get(groupId, FEATURE);
    const ids = [...new Set(input.submissionIds)];
    if (ids.length > Number(cfg.bestCount)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, `베스트 컷은 최대 ${cfg.bestCount}개까지 고를 수 있어요`, HttpStatus.BAD_REQUEST);
    }
    const found = await this.prisma.photoSubmission.count({ where: { id: { in: ids }, missionId: id } });
    if (found !== ids.length) throw AppError.notFound('제출물을 찾을 수 없어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.photoSubmission.updateMany({ where: { missionId: id }, data: { isBest: false } });
      if (ids.length) await tx.photoSubmission.updateMany({ where: { missionId: id, id: { in: ids } }, data: { isBest: true } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'photo_mission.best', targetType: 'PhotoMission', targetId: id, after: { submissionIds: ids } });
    });
    return { ok: true };
  }

  async close(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    const m = await this.prisma.photoMission.findFirst({ where: { id, groupId } });
    if (!m) throw AppError.notFound('미션을 찾을 수 없어요');
    if (!isManager && m.hostId !== actor.id) throw AppError.forbidden('주최자나 관리자만 끝낼 수 있어요');
    await this.prisma.photoMission.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } });
    return { ok: true };
  }

  async remove(actor: AuthUser, groupId: string, isManager: boolean, id: string) {
    const m = await this.prisma.photoMission.findFirst({ where: { id, groupId } });
    if (!m) throw AppError.notFound('미션을 찾을 수 없어요');
    if (!isManager) throw AppError.forbidden('관리자만 삭제할 수 있어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.photoMission.delete({ where: { id } });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'photo_mission.delete', targetType: 'PhotoMission', targetId: id, before: { theme: m.theme } });
    });
    return { ok: true };
  }
}
