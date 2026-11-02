import { Injectable } from '@nestjs/common';
import { FEATURE_SETTINGS, FeatureKey, normalizeSettings, SettingValues } from '@weplay/shared';
import { AuditService } from '../../common/audit.service';
import { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma.service';
import { FeaturesService } from './features.service';

/** 기능별 관리자 설정값 (JSON). 저장된 값이 없으면 shared 의 기본값 */
@Injectable()
export class FeatureSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly features: FeaturesService,
  ) {}

  async get(groupId: string, feature: FeatureKey): Promise<SettingValues> {
    const row = await this.prisma.featureSetting.findUnique({ where: { groupId_feature: { groupId, feature } } });
    return normalizeSettings(feature, row?.values);
  }

  /** 관리자: 설정 저장 (정의에 없는 키는 버리고 범위를 보정) */
  async update(actor: AuthUser, groupId: string, feature: FeatureKey, input: unknown) {
    await this.features.assertEnabled(groupId, feature);
    const before = await this.get(groupId, feature);
    const values = normalizeSettings(feature, { ...before, ...(input as Record<string, unknown>) });
    await this.prisma.$transaction(async (tx) => {
      await tx.featureSetting.upsert({
        where: { groupId_feature: { groupId, feature } },
        create: { groupId, feature, values, updatedById: actor.id },
        update: { values, updatedById: actor.id },
      });
      await this.audit.log(tx, { groupId, actorId: actor.id, action: 'feature.settings', targetType: 'FeatureSetting', targetId: `${groupId}:${feature}`, before, after: values });
    });
    return values;
  }

  /** 설정 정의가 있는 기능인지 */
  hasDefinition(feature: FeatureKey) {
    return !!FEATURE_SETTINGS[feature];
  }
}
