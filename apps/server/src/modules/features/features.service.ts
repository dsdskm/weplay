import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode, FEATURE_CATALOG, FeatureKey, FeatureStatus } from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { paged, PageQuery } from '../../common/paging';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { parseStatus } from '../admin/admin-requests.controller';

/** URL의 기능 키 검증 */
export function parseFeatureKey(key: string): FeatureKey {
  const found = Object.values(FeatureKey).find((k) => k === key);
  if (!found) throw AppError.notFound('없는 기능입니다');
  return found;
}

@Injectable()
export class FeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** 기능별 전역 설정: 활성(설정 없으면 활성), 기본 탑재(설정 없으면 아님) */
  async configMap() {
    const rows = await this.prisma.featureConfig.findMany();
    const byKey = new Map(rows.map((r) => [r.feature, r]));
    return {
      isActive: (key: FeatureKey) => byKey.get(key)?.active !== false,
      isDefault: (key: FeatureKey) => byKey.get(key)?.isDefault === true,
      guide: (key: FeatureKey) => {
        const r = byKey.get(key);
        return { summary: r?.guideSummary ?? null, body: r?.guideBody ?? null, images: (r?.guideImages as string[] | null) ?? [] };
      },
    };
  }

  /**
   * 그룹에서 실제로 쓸 수 있는지: 전역 활성이고,
   * 승인됐거나 기본 탑재 기능인데 그룹 기록이 없음(회수·거절·재신청 대기 기록이 있으면 그 상태를 따름)
   */
  private effective(active: boolean, isDefault: boolean, status: string | null | undefined) {
    return active && (status === FeatureStatus.APPROVED || (isDefault && !status));
  }

  /** 기능 전역 활성/비활성 (MASTER). 비활성이면 모든 그룹에서 쓸 수 없지만 승인 기록은 유지 */
  async setActive(user: AuthUser, key: FeatureKey, active: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.featureConfig.findUnique({ where: { feature: key } });
      const row = await tx.featureConfig.upsert({ where: { feature: key }, create: { feature: key, active }, update: { active } });
      await this.audit.log(tx, {
        actorId: user.id,
        action: active ? 'feature.activate' : 'feature.deactivate',
        targetType: 'FeatureConfig',
        targetId: key,
        before: { active: before?.active ?? true },
        after: { active },
      });
      return row;
    });
  }

  /** 기본 탑재 지정/해제 (MASTER). 지정하면 신청 대기 중인 그룹은 자동 승인 */
  async setDefault(user: AuthUser, key: FeatureKey, isDefault: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.featureConfig.findUnique({ where: { feature: key } });
      const row = await tx.featureConfig.upsert({ where: { feature: key }, create: { feature: key, isDefault }, update: { isDefault } });
      let autoApproved = 0;
      if (isDefault) {
        const res = await tx.groupFeature.updateMany({
          where: { feature: key, status: FeatureStatus.PENDING },
          data: { status: FeatureStatus.APPROVED, reviewedById: user.id, reviewedAt: new Date(), rejectReason: null },
        });
        autoApproved = res.count;
      }
      await this.audit.log(tx, {
        actorId: user.id,
        action: isDefault ? 'feature.default_on' : 'feature.default_off',
        targetType: 'FeatureConfig',
        targetId: key,
        before: { isDefault: before?.isDefault ?? false },
        after: { isDefault, autoApproved },
      });
      return { ...row, autoApproved };
    });
  }

  /** 기능 소개 팝업 내용 저장 (MASTER) */
  async setGuide(user: AuthUser, key: FeatureKey, input: { summary?: string | null; body?: string | null; images?: string[] }) {
    const data = { guideSummary: input.summary?.trim() || null, guideBody: input.body?.trim() || null, guideImages: (input.images ?? []).slice(0, 8) };
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.featureConfig.upsert({ where: { feature: key }, create: { feature: key, ...data }, update: data });
      await this.audit.log(tx, { actorId: user.id, action: 'feature.guide', targetType: 'FeatureConfig', targetId: key, after: { summary: data.guideSummary, images: data.guideImages.length } });
      return { summary: row.guideSummary, body: row.guideBody, images: (row.guideImages as string[] | null) ?? [] };
    });
  }

  /** 그룹의 기능 목록과 신청 상태. 기본 탑재 기능은 기록이 없어도 '승인'으로 보임 */
  async catalog(groupId: string) {
    const [rows, cfg] = await Promise.all([this.prisma.groupFeature.findMany({ where: { groupId } }), this.configMap()]);
    const byKey = new Map(rows.map((r) => [r.feature, r]));
    return FEATURE_CATALOG.map((f) => {
      const row = byKey.get(f.key);
      const isDefault = cfg.isDefault(f.key);
      return {
        ...f,
        active: cfg.isActive(f.key),
        isDefault,
        guide: cfg.guide(f.key),
        status: row?.status ?? (isDefault ? FeatureStatus.APPROVED : null),
        rejectReason: row?.rejectReason ?? null,
        reviewedAt: row?.reviewedAt ?? null,
      };
    });
  }

  /** 기능 사용 신청. 대기 중이면 그대로 두고, 거절된 건은 다시 대기로 바꾼다 */
  async request(user: AuthUser, groupId: string, key: FeatureKey) {
    const existing = await this.prisma.groupFeature.findUnique({ where: { groupId_feature: { groupId, feature: key } } });
    if (existing?.status === FeatureStatus.APPROVED) {
      throw new AppError(ErrorCode.FEATURE_ALREADY_ENABLED, '이미 사용 중인 기능입니다', HttpStatus.CONFLICT);
    }
    if (existing?.status === FeatureStatus.PENDING) return existing;
    if (!(await this.configMap()).isActive(key)) throw AppError.forbidden('지금은 신청할 수 없는 기능입니다');

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.groupFeature.upsert({
        where: { groupId_feature: { groupId, feature: key } },
        create: { groupId, feature: key, status: FeatureStatus.PENDING, requestedById: user.id },
        update: { status: FeatureStatus.PENDING, requestedById: user.id, rejectReason: null, reviewedById: null, reviewedAt: null },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: user.id,
        action: 'feature.request',
        targetType: 'GroupFeature',
        targetId: row.id,
        after: { feature: key },
      });
      return row;
    });
  }

  /** MASTER용 신청 목록 */
  async list(status: string | undefined, page: number, pageSize: number) {
    const where = status ? { status: parseStatus(status) } : {};
    const [items, total] = await Promise.all([
      this.prisma.groupFeature.findMany({
        where,
        include: { group: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.groupFeature.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** MASTER용 기능 목록: 기능별 상태 집계와 그룹별 신청 현황 */
  async overview() {
    const [rows, cfg, groupCount] = await Promise.all([
      this.prisma.groupFeature.findMany({
        where: { group: { deletedAt: null } },
        include: { group: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.configMap(),
      this.prisma.group.count({ where: { deletedAt: null } }),
    ]);
    return FEATURE_CATALOG.map((f) => {
      const mine = rows.filter((r) => r.feature === f.key);
      const count = (status: FeatureStatus) => mine.filter((r) => r.status === status).length;
      const isDefault = cfg.isDefault(f.key);
      return {
        ...f,
        active: cfg.isActive(f.key),
        isDefault,
        guide: cfg.guide(f.key),
        // 기본 탑재면 기록 없는 그룹도 사용 중으로 셈
        counts: {
          PENDING: count(FeatureStatus.PENDING),
          APPROVED: isDefault ? groupCount - count(FeatureStatus.PENDING) - count(FeatureStatus.REJECTED) : count(FeatureStatus.APPROVED),
          REJECTED: count(FeatureStatus.REJECTED),
        },
      };
    });
  }

  /** 기능별 그룹 목록 (페이지네이션). 기본 탑재 기능은 모든 그룹을 실제 상태로 보여 줌 */
  async grants(feature: FeatureKey, status: string | undefined, q: PageQuery) {
    if ((await this.configMap()).isDefault(feature)) {
      const groups = await this.prisma.group.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, features: { where: { feature } } },
        orderBy: { createdAt: 'desc' },
      });
      const rows = groups
        .map((g) => {
          const row = g.features[0];
          return {
            id: row?.id ?? null,
            groupId: g.id,
            group: { id: g.id, name: g.name },
            feature,
            status: row?.status ?? FeatureStatus.APPROVED,
            byDefault: !row,
            rejectReason: row?.rejectReason ?? null,
            reviewedAt: row?.reviewedAt ?? null,
            updatedAt: row?.updatedAt ?? null,
          };
        })
        .filter((r) => !status || status.split(',').includes(r.status));
      return paged(rows.slice(q.skip, q.skip + q.pageSize), rows.length, q);
    }
    const where = {
      feature,
      group: { deletedAt: null },
      ...(status ? { status: parseStatus(status) } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.groupFeature.findMany({
        where,
        include: { group: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.groupFeature.count({ where }),
    ]);
    return paged(
      rows.map((r) => ({ ...r, byDefault: false })),
      total,
      q,
    );
  }

  /** 그룹 단위 회수 (기본 탑재로 기록이 없는 그룹도 가능). 그룹은 거절 상태가 되어 다시 신청해야 함 */
  revokeGroup(reviewer: AuthUser, groupId: string, key: FeatureKey, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.groupFeature.findUnique({ where: { groupId_feature: { groupId, feature: key } } });
      if (existing?.status === FeatureStatus.REJECTED) {
        throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '이미 회수·거절된 그룹입니다', HttpStatus.CONFLICT);
      }
      const row = await tx.groupFeature.upsert({
        where: { groupId_feature: { groupId, feature: key } },
        create: { groupId, feature: key, status: FeatureStatus.REJECTED, requestedById: reviewer.id, reviewedById: reviewer.id, reviewedAt: new Date(), rejectReason: reason },
        update: { status: FeatureStatus.REJECTED, reviewedById: reviewer.id, reviewedAt: new Date(), rejectReason: reason },
      });
      await this.audit.log(tx, {
        groupId,
        actorId: reviewer.id,
        action: 'feature.revoke',
        targetType: 'GroupFeature',
        targetId: row.id,
        before: { status: existing?.status ?? 'DEFAULT' },
        after: { status: FeatureStatus.REJECTED, reason },
      });
      return row;
    });
  }

  approve(reviewer: AuthUser, id: string) {
    return this.review(reviewer, id, FeatureStatus.APPROVED, null);
  }

  reject(reviewer: AuthUser, id: string, reason: string) {
    return this.review(reviewer, id, FeatureStatus.REJECTED, reason);
  }

  /** 승인된 기능 회수: 그룹은 거절 상태로 보고 다시 신청할 수 있음 */
  revoke(reviewer: AuthUser, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.groupFeature.findUnique({ where: { id } });
      if (!row) throw AppError.notFound('신청을 찾을 수 없습니다');
      if (row.status !== FeatureStatus.APPROVED) {
        throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '승인된 기능만 회수할 수 있습니다', HttpStatus.CONFLICT);
      }
      const updated = await tx.groupFeature.update({
        where: { id },
        data: { status: FeatureStatus.REJECTED, reviewedById: reviewer.id, reviewedAt: new Date(), rejectReason: reason },
      });
      await this.audit.log(tx, {
        groupId: row.groupId,
        actorId: reviewer.id,
        action: 'feature.revoke',
        targetType: 'GroupFeature',
        targetId: id,
        before: { status: row.status },
        after: { status: FeatureStatus.REJECTED, reason },
      });
      return updated;
    });
  }

  private review(reviewer: AuthUser, id: string, status: 'APPROVED' | 'REJECTED', reason: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.groupFeature.findUnique({ where: { id } });
      if (!row) throw AppError.notFound('신청을 찾을 수 없습니다');
      if (row.status !== FeatureStatus.PENDING) {
        throw new AppError(ErrorCode.REQUEST_NOT_PENDING, '대기 중인 신청이 아닙니다', HttpStatus.CONFLICT);
      }
      const updated = await tx.groupFeature.update({
        where: { id },
        data: { status, reviewedById: reviewer.id, reviewedAt: new Date(), rejectReason: reason },
      });
      await this.audit.log(tx, {
        groupId: row.groupId,
        actorId: reviewer.id,
        action: status === FeatureStatus.APPROVED ? 'feature.approve' : 'feature.reject',
        targetType: 'GroupFeature',
        targetId: id,
        before: { status: row.status },
        after: { status, reason },
      });
      return updated;
    });
  }

  /** 기능 사용 가능 여부 (전역 활성 + MASTER 승인 또는 기본 탑재) */
  async isEnabled(groupId: string, key: FeatureKey) {
    const [row, config] = await Promise.all([
      this.prisma.groupFeature.findUnique({ where: { groupId_feature: { groupId, feature: key } } }),
      this.prisma.featureConfig.findUnique({ where: { feature: key } }),
    ]);
    return this.effective(config?.active !== false, config?.isDefault === true, row?.status);
  }

  /** 기능 사용 가능 여부 검사. 각 기능 모듈이 실행 전에 호출 */
  async assertEnabled(groupId: string, key: FeatureKey) {
    if (!(await this.isEnabled(groupId, key))) throw AppError.forbidden('승인되지 않은 기능입니다');
  }
}
