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
import { AuditService } from '../../common/audit.service';
import { AuthUser, MembershipContext } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';

const REQUEST_TTL_DAYS = 30;

export const requestInclude = {
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
  reviewer: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  groups: { include: { group: { select: { id: true, name: true } } } },
} satisfies Prisma.MembershipRequestInclude;

export type Reviewer = { user: AuthUser; membership?: MembershipContext };

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async lookup(rawCode: string) {
    const code = normalizeJoinCode(rawCode);
    const invalid = new AppError(ErrorCode.JOIN_CODE_INVALID, '유효하지 않은 코드입니다', HttpStatus.NOT_FOUND);
    if (!isValidJoinCodeFormat(code)) throw invalid;

    const company = await this.prisma.company.findUnique({ where: { joinCode: code } });
    if (company && !company.deletedAt) {
      if (company.status !== 'ACTIVE') throw new AppError(ErrorCode.COMPANY_NOT_ACTIVE, '현재 가입할 수 없는 회사입니다');
      if (!company.joinCodeEnabled) throw new AppError(ErrorCode.JOIN_CODE_DISABLED, '비활성화된 코드입니다');
      // 공개 그룹 목록: 회사 코드를 아는 사람에게만 노출
      const publicGroups = await this.prisma.group.findMany({
        where: { companyId: company.id, deletedAt: null, visibility: 'PUBLIC', joinCodeEnabled: true },
        select: { id: true, name: true, description: true, requireApproval: true },
        orderBy: { name: 'asc' },
      });
      return {
        kind: 'COMPANY' as const,
        code,
        company: { id: company.id, name: company.name, description: company.description },
        publicGroups,
      };
    }
    const group = await this.prisma.group.findUnique({ where: { joinCode: code }, include: { company: true } });
    if (group && !group.deletedAt && !group.company.deletedAt) {
      if (group.company.status !== 'ACTIVE') throw new AppError(ErrorCode.COMPANY_NOT_ACTIVE, '현재 가입할 수 없는 회사입니다');
      if (!group.joinCodeEnabled) throw new AppError(ErrorCode.JOIN_CODE_DISABLED, '비활성화된 코드입니다');
      return {
        kind: 'GROUP' as const,
        code,
        company: { id: group.company.id, name: group.company.name, description: group.company.description },
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          visibility: group.visibility,
          requireApproval: group.requireApproval,
        },
      };
    }
    throw invalid;
  }

  /**
   * 가입 요청
   * - 회사 미가입자: 선택/입력한 그룹을 회사 가입 요청(COMPANY_JOIN)에 함께 담는다 (회사 승인 시 반영)
   * - 회사 구성원: 자동 승인 그룹은 즉시 가입, 승인 필요 그룹은 GROUP_JOIN 요청
   */
  async create(user: AuthUser, input: CreateJoinRequestInput) {
    const codeLookups = await Promise.all(
      [input.companyCode, ...input.groupCodes].filter((c): c is string => !!c).map((c) => this.lookup(c)),
    );
    if (input.companyCode && codeLookups[0].kind !== 'COMPANY') {
      throw new AppError(ErrorCode.JOIN_CODE_INVALID, '회사 코드가 아닙니다');
    }
    if (input.groupIds.length && !input.companyCode) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '공개 그룹을 선택하려면 회사 코드가 필요합니다');
    }
    const companyId = codeLookups[0].company.id;
    if (codeLookups.some((l) => l.company.id !== companyId)) {
      throw new AppError(ErrorCode.GROUPS_DIFFERENT_COMPANY, '서로 다른 회사의 코드가 섞여 있습니다');
    }

    // 대상 그룹 = 그룹 코드로 입력한 것 + 공개 목록에서 선택한 것
    const targets = new Map<string, { requireApproval: boolean }>();
    for (const l of codeLookups) {
      if (l.kind === 'GROUP') targets.set(l.group.id, { requireApproval: l.group.requireApproval });
    }
    if (input.groupIds.length) {
      const picked = await this.prisma.group.findMany({
        where: { id: { in: input.groupIds }, companyId, deletedAt: null, visibility: 'PUBLIC', joinCodeEnabled: true },
        select: { id: true, requireApproval: true },
      });
      if (picked.length !== new Set(input.groupIds).size) {
        throw new AppError(ErrorCode.JOIN_CODE_INVALID, '선택한 그룹은 가입 요청할 수 없습니다');
      }
      for (const g of picked) targets.set(g.id, { requireApproval: g.requireApproval });
    }

    const membership = await this.prisma.membership.findUnique({ where: { userId_companyId: { userId: user.id, companyId } } });
    if (membership?.status === 'BLOCKED') throw new AppError(ErrorCode.MEMBERSHIP_BLOCKED, '가입이 차단된 회사입니다', 403);
    const isMember = membership?.status === 'APPROVED';

    let ids = [...targets.keys()];
    if (isMember) {
      const joined = await this.prisma.groupMember.findMany({
        where: { userId: user.id, groupId: { in: ids } },
        select: { groupId: true },
      });
      const joinedSet = new Set(joined.map((j) => j.groupId));
      ids = ids.filter((id) => !joinedSet.has(id));
      if (ids.length === 0) throw new AppError(ErrorCode.ALREADY_MEMBER, '이미 가입되어 있습니다');
    }

    const autoIds = isMember ? ids.filter((id) => !targets.get(id)!.requireApproval) : [];
    const requestIds = isMember ? ids.filter((id) => targets.get(id)!.requireApproval) : ids;
    const needsRequest = !isMember || requestIds.length > 0;

    if (needsRequest) {
      const pending = await this.prisma.membershipRequest.findFirst({
        where: { userId: user.id, companyId, status: 'PENDING' },
      });
      if (pending) throw new AppError(ErrorCode.MEMBERSHIP_ALREADY_PENDING, '이미 승인 대기 중인 요청이 있습니다', 409);
    }

    return this.prisma.$transaction(async (tx) => {
      const request = needsRequest
        ? await tx.membershipRequest.create({
            data: {
              type: isMember ? 'GROUP_JOIN' : 'COMPANY_JOIN',
              userId: user.id,
              companyId,
              message: input.message,
              expiresAt: new Date(Date.now() + REQUEST_TTL_DAYS * 86_400_000),
              groups: { create: requestIds.map((groupId) => ({ groupId })) },
            },
            include: requestInclude,
          })
        : null;
      if (request) {
        await this.audit.log(tx, {
          companyId,
          actorId: user.id,
          action: 'membership.request.created',
          targetType: 'MembershipRequest',
          targetId: request.id,
          after: { type: request.type, groupIds: requestIds },
        });
      }
      for (const groupId of autoIds) {
        await tx.groupMember.createMany({ data: [{ groupId, userId: user.id, companyId }], skipDuplicates: true });
        await this.audit.log(tx, {
          companyId,
          actorId: user.id,
          action: 'group.member.added',
          targetType: 'Group',
          targetId: groupId,
          after: { userId: user.id, auto: true },
        });
      }
      return { request, autoJoinedCount: autoIds.length };
    });
  }

  async cancel(user: AuthUser, requestId: string) {
    const r = await this.prisma.membershipRequest.updateMany({
      where: { id: requestId, userId: user.id, status: 'PENDING' },
      data: { status: 'CANCELED' },
    });
    if (r.count === 0) throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '취소할 수 없는 요청입니다');
    const req = await this.prisma.membershipRequest.findUniqueOrThrow({ where: { id: requestId } });
    await this.audit.log(this.prisma, {
      companyId: req.companyId,
      actorId: user.id,
      action: 'membership.request.canceled',
      targetType: 'MembershipRequest',
      targetId: requestId,
    });
    return { ok: true };
  }

  list(where: Prisma.MembershipRequestWhereInput) {
    return this.prisma.membershipRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  /**
   * 검토 권한 (PLAN §4.2)
   * - MASTER: 전체
   * - 회사 가입: 회사 ADMIN
   * - 그룹 가입: 대표 ADMIN 또는 요청된 모든 그룹의 담당 ADMIN
   */
  private async assertCanReview(reviewer: Reviewer, req: { companyId: string; type: string; groups: { groupId: string }[] }) {
    if (reviewer.user.platformRole === 'MASTER' && !reviewer.membership) return;
    const m = reviewer.membership;
    if (!m || m.companyId !== req.companyId || m.role !== 'ADMIN') throw AppError.forbidden();
    if (req.type === 'COMPANY_JOIN' || m.isPrimaryAdmin) return;
    const managed = await this.prisma.groupMember.count({
      where: { userId: m.userId, role: 'ADMIN', groupId: { in: req.groups.map((g) => g.groupId) } },
    });
    if (managed !== req.groups.length) throw AppError.forbidden('담당 그룹의 요청만 처리할 수 있습니다');
  }

  private async load(requestId: string, companyId?: string) {
    const req = await this.prisma.membershipRequest.findUnique({ where: { id: requestId }, include: { groups: true } });
    if (!req || (companyId && req.companyId !== companyId)) throw AppError.notFound('요청을 찾을 수 없습니다');
    if (req.status !== 'PENDING') throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 처리된 요청입니다', 409);
    return req;
  }

  async approve(reviewer: Reviewer, requestId: string, input: ApproveRequestInput, companyId?: string) {
    const req = await this.load(requestId, companyId);
    await this.assertCanReview(reviewer, req);

    const requested = new Set(req.groups.map((g) => g.groupId));
    const groupIds = (input.groupIds ?? [...requested]).filter((id) => requested.has(id));
    // 일반 ADMIN은 회사 가입 승인 시 역할 지정 불가 (역할 변경은 대표 ADMIN/MASTER)
    const canSetRole = reviewer.user.platformRole === 'MASTER' || reviewer.membership?.isPrimaryAdmin;
    const role = canSetRole ? (input.role ?? 'USER') : 'USER';

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.membershipRequest.updateMany({
        where: { id: req.id, status: 'PENDING' },
        data: { status: 'APPROVED', reviewerId: reviewer.user.id, reviewedAt: new Date() },
      });
      if (claimed.count === 0) throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 처리된 요청입니다', 409);

      if (req.type === 'COMPANY_JOIN') {
        await tx.membership.upsert({
          where: { userId_companyId: { userId: req.userId, companyId: req.companyId } },
          create: { userId: req.userId, companyId: req.companyId, role },
          update: { status: 'APPROVED', role, joinedAt: new Date(), leftAt: null },
        });
      } else {
        const m = await tx.membership.findUnique({ where: { userId_companyId: { userId: req.userId, companyId: req.companyId } } });
        if (m?.status !== 'APPROVED') throw new AppError(ErrorCode.NOT_COMPANY_MEMBER, '회사 구성원이 아닙니다');
      }

      const liveGroups = await tx.group.findMany({ where: { id: { in: groupIds }, deletedAt: null }, select: { id: true } });
      const approvedIds = new Set(liveGroups.map((g) => g.id));
      await tx.groupMember.createMany({
        data: [...approvedIds].map((groupId) => ({ groupId, userId: req.userId, companyId: req.companyId })),
        skipDuplicates: true,
      });
      for (const g of req.groups) {
        await tx.membershipRequestGroup.update({
          where: { requestId_groupId: { requestId: req.id, groupId: g.groupId } },
          data: { approved: approvedIds.has(g.groupId) },
        });
      }
      await this.audit.log(tx, {
        companyId: req.companyId,
        actorId: reviewer.user.id,
        action: 'membership.request.approved',
        targetType: 'MembershipRequest',
        targetId: req.id,
        after: { role: req.type === 'COMPANY_JOIN' ? role : undefined, groupIds: [...approvedIds] },
      });
      return tx.membershipRequest.findUniqueOrThrow({ where: { id: req.id }, include: requestInclude });
    });
  }

  async reject(reviewer: Reviewer, requestId: string, reason: string | undefined, companyId?: string) {
    const req = await this.load(requestId, companyId);
    await this.assertCanReview(reviewer, req);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.membershipRequest.updateMany({
        where: { id: req.id, status: 'PENDING' },
        data: { status: 'REJECTED', reviewerId: reviewer.user.id, reviewedAt: new Date(), reviewNote: reason },
      });
      if (claimed.count === 0) throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 처리된 요청입니다', 409);
      await this.audit.log(tx, {
        companyId: req.companyId,
        actorId: reviewer.user.id,
        action: 'membership.request.rejected',
        targetType: 'MembershipRequest',
        targetId: req.id,
        after: { reason },
      });
      return tx.membershipRequest.findUniqueOrThrow({ where: { id: req.id }, include: requestInclude });
    });
  }
}
