import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@weplay/db';
import {
  ApproveRequestInput,
  CreateJoinRequestInput,
  ErrorCode,
  isValidJoinCodeFormat,
  normalizeJoinCode,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { assertOneGroup, assertOneTeam } from '../../common/team-rule';
import { AuditService } from '../../common/audit.service';
import { AuthUser, GroupMembershipContext } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';

const REQUEST_TTL_DAYS = 30;

export const requestInclude = {
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
  reviewer: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  teams: { include: { team: { select: { id: true, name: true } } } },
} satisfies Prisma.GroupMembershipRequestInclude;

export type Reviewer = { user: AuthUser; groupMembership?: GroupMembershipContext };

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** 현재 사용자의 그룹/팀 가입 상태: 이미 가입 / 승인 대기 / 없음 */
  /** 사용자의 그룹/팀 가입 상태 집계. 대기 요청이 거절 요청보다 우선 */
  private async joinScope(userId: string | undefined, groupId: string) {
    const empty = { groupStatus: 'NONE' as const, groupRequestId: null, groupReason: null, approvedTeamIds: new Set<string>(), pendingTeamIds: new Map<string, string>(), rejectedTeams: new Map<string, string | null>() };
    if (!userId) return empty;
    const [gm, requests, rejected, teamMembers] = await Promise.all([
      this.prisma.groupMembership.findUnique({ where: { userId_groupId: { userId, groupId } } }),
      this.prisma.groupMembershipRequest.findMany({ where: { userId, groupId, status: 'PENDING' }, include: { teams: true } }),
      this.prisma.groupMembershipRequest.findMany({ where: { userId, groupId, status: 'REJECTED' }, include: { teams: true }, orderBy: { reviewedAt: 'desc' } }),
      this.prisma.teamMember.findMany({ where: { userId, groupId }, select: { teamId: true } }),
    ]);
    const groupRequest = requests.find((r) => r.type === 'GROUP_JOIN') ?? null;
    const groupRejected = rejected.find((r) => r.type === 'GROUP_JOIN') ?? null;
    const rejectedTeams = new Map<string, string | null>();
    for (const r of rejected) for (const t of r.teams) if (!rejectedTeams.has(t.teamId)) rejectedTeams.set(t.teamId, r.reviewNote);
    return {
      groupStatus: gm?.status === 'APPROVED' ? ('APPROVED' as const) : groupRequest ? ('PENDING' as const) : groupRejected ? ('REJECTED' as const) : ('NONE' as const),
      groupRequestId: groupRequest?.id ?? null,
      groupReason: groupRejected?.reviewNote ?? null,
      approvedTeamIds: new Set(teamMembers.map((t) => t.teamId)),
      // 팀별 대기 요청 ID (취소 시 사용)
      pendingTeamIds: new Map(requests.flatMap((r) => r.teams.map((t) => [t.teamId, r.id] as [string, string]))),
      rejectedTeams,
    };
  }

  private teamStatus(scope: Awaited<ReturnType<RequestsService['joinScope']>>, teamId: string) {
    if (scope.approvedTeamIds.has(teamId)) return { status: 'APPROVED' as const, requestId: null, reason: null };
    const requestId = scope.pendingTeamIds.get(teamId);
    if (requestId) return { status: 'PENDING' as const, requestId, reason: null };
    if (scope.rejectedTeams.has(teamId)) return { status: 'REJECTED' as const, requestId: null, reason: scope.rejectedTeams.get(teamId) ?? null };
    return { status: 'NONE' as const, requestId: null, reason: null };
  }

  async lookup(rawCode: string, userId?: string) {
    const code = normalizeJoinCode(rawCode);
    const invalid = new AppError(ErrorCode.JOIN_CODE_INVALID, '유효하지 않은 코드입니다', HttpStatus.NOT_FOUND);
    if (!isValidJoinCodeFormat(code)) throw invalid;

    const group = await this.prisma.group.findUnique({ where: { joinCode: code } });
    if (group && !group.deletedAt) {
      if (group.status !== 'ACTIVE') throw new AppError(ErrorCode.GROUP_NOT_ACTIVE, '현재 가입할 수 없는 그룹입니다');
      if (!group.joinCodeEnabled) throw new AppError(ErrorCode.JOIN_CODE_DISABLED, '비활성화된 코드입니다');
      // 공개 팀 목록: 그룹 코드를 아는 사람에게만 노출
      const publicTeams = await this.prisma.team.findMany({
        where: { groupId: group.id, deletedAt: null, visibility: 'PUBLIC', joinCodeEnabled: true },
        select: { id: true, name: true, description: true, requireApproval: true },
        orderBy: { name: 'asc' },
      });
      const scope = await this.joinScope(userId, group.id);
      return {
        kind: 'GROUP' as const,
        code,
        joinStatus: scope.groupStatus,
        pendingRequestId: scope.groupRequestId,
        rejectReason: scope.groupReason,
        group: { id: group.id, name: group.name, description: group.description },
        publicTeams: publicTeams.map((t) => ({ ...t, joinStatus: this.teamStatus(scope, t.id).status })),
      };
    }
    const team = await this.prisma.team.findUnique({ where: { joinCode: code }, include: { group: true } });
    if (team && !team.deletedAt && !team.group.deletedAt) {
      if (team.group.status !== 'ACTIVE') throw new AppError(ErrorCode.GROUP_NOT_ACTIVE, '현재 가입할 수 없는 그룹입니다');
      if (!team.joinCodeEnabled) throw new AppError(ErrorCode.JOIN_CODE_DISABLED, '비활성화된 코드입니다');
      const scope = await this.joinScope(userId, team.group.id);
      return {
        kind: 'TEAM' as const,
        code,
        joinStatus: this.teamStatus(scope, team.id).status,
        pendingRequestId: this.teamStatus(scope, team.id).requestId,
        rejectReason: this.teamStatus(scope, team.id).reason,
        group: { id: team.group.id, name: team.group.name, description: team.group.description },
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          visibility: team.visibility,
          requireApproval: team.requireApproval,
        },
      };
    }
    throw invalid;
  }

  /**
   * 가입 요청
   * - 그룹 미가입자: 선택/입력한 팀을 그룹 가입 요청(GROUP_JOIN)에 함께 담는다 (그룹 승인 시 반영)
   * - 그룹 구성원: 자동 승인 팀은 즉시 가입, 승인 필요 팀은 TEAM_JOIN 요청
   */
  async create(user: AuthUser, input: CreateJoinRequestInput) {
    const codeLookups = await Promise.all(
      [input.groupCode, ...input.teamCodes].filter((c): c is string => !!c).map((c) => this.lookup(c)),
    );
    if (input.groupCode && codeLookups[0].kind !== 'GROUP') {
      throw new AppError(ErrorCode.JOIN_CODE_INVALID, '그룹 코드가 아닙니다');
    }
    if (input.teamIds.length && !input.groupCode) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '공개 팀을 선택하려면 그룹 코드가 필요합니다');
    }
    const groupId = codeLookups[0].group.id;
    if (codeLookups.some((l) => l.group.id !== groupId)) {
      throw new AppError(ErrorCode.TEAMS_DIFFERENT_GROUP, '서로 다른 그룹의 코드가 섞여 있습니다');
    }

    // 대상 팀 = 팀 코드로 입력한 것 + 공개 목록에서 선택한 것
    const targets = new Map<string, { requireApproval: boolean }>();
    for (const l of codeLookups) {
      if (l.kind === 'TEAM') targets.set(l.team.id, { requireApproval: l.team.requireApproval });
    }
    if (input.teamIds.length) {
      const picked = await this.prisma.team.findMany({
        where: { id: { in: input.teamIds }, groupId, deletedAt: null, visibility: 'PUBLIC', joinCodeEnabled: true },
        select: { id: true, requireApproval: true },
      });
      if (picked.length !== new Set(input.teamIds).size) {
        throw new AppError(ErrorCode.JOIN_CODE_INVALID, '선택한 팀은 가입 요청할 수 없습니다');
      }
      for (const g of picked) targets.set(g.id, { requireApproval: g.requireApproval });
    }

    const groupMembership = await this.prisma.groupMembership.findUnique({ where: { userId_groupId: { userId: user.id, groupId } } });
    if (groupMembership?.status === 'BLOCKED') throw new AppError(ErrorCode.MEMBERSHIP_BLOCKED, '가입이 차단된 그룹입니다', 403);
    const isMember = groupMembership?.status === 'APPROVED';

    let ids = [...targets.keys()];
    if (isMember) {
      const joined = await this.prisma.teamMember.findMany({
        where: { userId: user.id, teamId: { in: ids } },
        select: { teamId: true },
      });
      const joinedSet = new Set(joined.map((j) => j.teamId));
      ids = ids.filter((id) => !joinedSet.has(id));
      if (ids.length === 0) throw new AppError(ErrorCode.ALREADY_MEMBER, '이미 가입되어 있습니다');
    }

    // 계정은 하나의 그룹에만 속할 수 있음: 미가입자가 다른 그룹에 승인 소속이 있으면 거부
    if (!isMember && (await this.prisma.groupMembership.count({ where: { userId: user.id, status: 'APPROVED' } })) > 0) {
      throw new AppError(ErrorCode.ONE_GROUP_ONLY, '계정은 하나의 그룹에만 속할 수 있습니다', 409);
    }
    // 계정은 하나의 팀에만 속할 수 있음: 새로 가입할 팀이 2개 이상이거나 이미 팀이 있으면 거부
    if (ids.length > 1 || (ids.length === 1 && (await this.prisma.teamMember.count({ where: { userId: user.id } })) > 0)) {
      throw new AppError(ErrorCode.ONE_TEAM_ONLY, '계정은 하나의 팀에만 속할 수 있습니다', 409);
    }
    const autoIds = isMember ? ids.filter((id) => !targets.get(id)!.requireApproval) : [];
    const requestIds = isMember ? ids.filter((id) => targets.get(id)!.requireApproval) : ids;
    const needsRequest = !isMember || requestIds.length > 0;

    if (needsRequest) {
      const pending = await this.prisma.groupMembershipRequest.findFirst({
        where: { userId: user.id, groupId, status: 'PENDING' },
      });
      if (pending) throw new AppError(ErrorCode.MEMBERSHIP_ALREADY_PENDING, '이미 승인 대기 중인 요청이 있습니다', 409);
    }

    return this.prisma.$transaction(async (tx) => {
      const request = needsRequest
        ? await tx.groupMembershipRequest.create({
            data: {
              type: isMember ? 'TEAM_JOIN' : 'GROUP_JOIN',
              userId: user.id,
              groupId,
              message: input.message,
              expiresAt: new Date(Date.now() + REQUEST_TTL_DAYS * 86_400_000),
              teams: { create: requestIds.map((teamId) => ({ teamId })) },
            },
            include: requestInclude,
          })
        : null;
      if (request) {
        await this.audit.log(tx, {
          groupId,
          actorId: user.id,
          action: 'groupMembership.request.created',
          targetType: 'GroupMembershipRequest',
          targetId: request.id,
          after: { type: request.type, teamIds: requestIds },
        });
      }
      for (const teamId of autoIds) {
        await assertOneTeam(tx, user.id, teamId);
        await tx.teamMember.createMany({ data: [{ teamId, userId: user.id, groupId }], skipDuplicates: true });
        await this.audit.log(tx, {
          groupId,
          actorId: user.id,
          action: 'team.member.added',
          targetType: 'Team',
          targetId: teamId,
          after: { userId: user.id, auto: true },
        });
      }
      return { request, autoJoinedCount: autoIds.length };
    });
  }

  async cancel(user: AuthUser, requestId: string) {
    const r = await this.prisma.groupMembershipRequest.updateMany({
      where: { id: requestId, userId: user.id, status: 'PENDING' },
      data: { status: 'CANCELED' },
    });
    if (r.count === 0) throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '취소할 수 없는 요청입니다');
    const req = await this.prisma.groupMembershipRequest.findUniqueOrThrow({ where: { id: requestId } });
    await this.audit.log(this.prisma, {
      groupId: req.groupId,
      actorId: user.id,
      action: 'groupMembership.request.canceled',
      targetType: 'GroupMembershipRequest',
      targetId: requestId,
    });
    return { ok: true };
  }

  /** 가입 요청 목록 (페이지네이션). status는 'PENDING' 또는 'APPROVED,REJECTED' 형태 */
  async list(where: Prisma.GroupMembershipRequestWhereInput, page = 1, pageSize = 20) {
    const size = Math.min(Math.max(pageSize, 1), 100);
    const current = Math.max(page, 1);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.groupMembershipRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: 'desc' }, skip: (current - 1) * size, take: size }),
      this.prisma.groupMembershipRequest.count({ where }),
    ]);
    return { items, total, page: current, pageSize: size };
  }

  /**
   * 검토 가능 여부 (PLAN §4.2)
   * - MASTER: 전체
   * - 그룹 가입: 그룹 ADMIN
   * - 팀 가입: 대표 ADMIN 또는 요청된 모든 팀의 담당 ADMIN
   */
  private async assertCanReview(reviewer: Reviewer, req: { groupId: string; type: string; teams: { teamId: string }[] }) {
    if (reviewer.user.platformRole === 'MASTER' && !reviewer.groupMembership) return;
    const m = reviewer.groupMembership;
    if (!m || m.groupId !== req.groupId) throw AppError.forbidden();
    if (req.type === 'GROUP_JOIN') {
      if (m.role !== 'ADMIN') throw AppError.forbidden('그룹 ADMIN만 그룹 가입 요청을 처리할 수 있습니다');
      return;
    }
    if (m.role === 'ADMIN' && m.isPrimaryAdmin) return;
    // 팀 가입: 요청된 팀을 모두 담당하는 팀 ADMIN (그룹 역할과 무관)
    const managed = await this.prisma.teamMember.count({
      where: { userId: m.userId, role: 'ADMIN', teamId: { in: req.teams.map((g) => g.teamId) } },
    });
    if (managed !== req.teams.length) throw AppError.forbidden('담당 팀의 요청만 처리할 수 있습니다');
  }

  private async load(requestId: string, groupId?: string) {
    const req = await this.prisma.groupMembershipRequest.findUnique({ where: { id: requestId }, include: { teams: true } });
    if (!req || (groupId && req.groupId !== groupId)) throw AppError.notFound('요청을 찾을 수 없습니다');
    if (req.status !== 'PENDING') throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 처리된 요청입니다', 409);
    return req;
  }

  async approve(reviewer: Reviewer, requestId: string, input: ApproveRequestInput, groupId?: string) {
    const req = await this.load(requestId, groupId);
    await this.assertCanReview(reviewer, req);

    const requested = new Set(req.teams.map((g) => g.teamId));
    const teamIds = (input.teamIds ?? [...requested]).filter((id) => requested.has(id));
    // 일반 ADMIN은 그룹 가입 승인 시 역할 지정 불가 (역할 변경은 대표 ADMIN/MASTER)
    const canSetRole = reviewer.user.platformRole === 'MASTER' || reviewer.groupMembership?.isPrimaryAdmin;
    const role = canSetRole ? (input.role ?? 'USER') : 'USER';

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.groupMembershipRequest.updateMany({
        where: { id: req.id, status: 'PENDING' },
        data: { status: 'APPROVED', reviewerId: reviewer.user.id, reviewedAt: new Date() },
      });
      if (claimed.count === 0) throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 처리된 요청입니다', 409);

      if (req.type === 'GROUP_JOIN') {
        await assertOneGroup(tx, req.userId, req.groupId);
        await tx.groupMembership.upsert({
          where: { userId_groupId: { userId: req.userId, groupId: req.groupId } },
          create: { userId: req.userId, groupId: req.groupId, role },
          update: { status: 'APPROVED', role, joinedAt: new Date(), leftAt: null },
        });
      } else {
        const m = await tx.groupMembership.findUnique({ where: { userId_groupId: { userId: req.userId, groupId: req.groupId } } });
        if (m?.status !== 'APPROVED') throw new AppError(ErrorCode.NOT_GROUP_MEMBER, '그룹 구성원이 아닙니다');
      }

      const liveTeams = await tx.team.findMany({ where: { id: { in: teamIds }, deletedAt: null }, select: { id: true } });
      const approvedIds = new Set(liveTeams.map((g) => g.id));
      for (const teamId of approvedIds) await assertOneTeam(tx, req.userId, teamId);
      await tx.teamMember.createMany({
        data: [...approvedIds].map((teamId) => ({ teamId, userId: req.userId, groupId: req.groupId })),
        skipDuplicates: true,
      });
      for (const g of req.teams) {
        await tx.membershipRequestTeam.update({
          where: { requestId_teamId: { requestId: req.id, teamId: g.teamId } },
          data: { approved: approvedIds.has(g.teamId) },
        });
      }
      await this.audit.log(tx, {
        groupId: req.groupId,
        actorId: reviewer.user.id,
        action: 'groupMembership.request.approved',
        targetType: 'GroupMembershipRequest',
        targetId: req.id,
        after: { role: req.type === 'GROUP_JOIN' ? role : undefined, teamIds: [...approvedIds] },
      });
      return tx.groupMembershipRequest.findUniqueOrThrow({ where: { id: req.id }, include: requestInclude });
    });
  }

  async reject(reviewer: Reviewer, requestId: string, reason: string | undefined, groupId?: string) {
    const req = await this.load(requestId, groupId);
    await this.assertCanReview(reviewer, req);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.groupMembershipRequest.updateMany({
        where: { id: req.id, status: 'PENDING' },
        data: { status: 'REJECTED', reviewerId: reviewer.user.id, reviewedAt: new Date(), reviewNote: reason },
      });
      if (claimed.count === 0) throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 처리된 요청입니다', 409);
      await this.audit.log(tx, {
        groupId: req.groupId,
        actorId: reviewer.user.id,
        action: 'groupMembership.request.rejected',
        targetType: 'GroupMembershipRequest',
        targetId: req.id,
        after: { reason },
      });
      return tx.groupMembershipRequest.findUniqueOrThrow({ where: { id: req.id }, include: requestInclude });
    });
  }
}
