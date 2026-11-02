import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { FeatureSettingsService } from './feature-settings.service';
import { FeaturesService, parseFeatureKey } from './features.service';

/** 그룹 구성원용 기능 API (user-web) */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/features')
export class GroupFeaturesController {
  constructor(
    private readonly features: FeaturesService,
    private readonly settings: FeatureSettingsService,
  ) {}

  @Get()
  catalog(@Param('groupId') groupId: string) {
    return this.features.catalog(groupId);
  }

  /** 기능 사용 신청: 그룹 ADMIN(대표 포함) */
  @Post(':key/request')
  request(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('key') key: string,
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 신청할 수 있습니다');
    return this.features.request(user, groupId, parseFeatureKey(key));
  }

  /** 기능 설정값 조회 (구성원 모두: 화면 동작에 필요) */
  @Get(':key/settings')
  getSettings(@Param('groupId') groupId: string, @Param('key') key: string) {
    return this.settings.get(groupId, parseFeatureKey(key));
  }

  /** 기능 설정값 저장 (관리자: 그룹 ADMIN·팀 ADMIN) */
  @Put(':key/settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('key') key: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!isGroupManager(m)) throw AppError.forbidden('관리자만 설정할 수 있습니다');
    return this.settings.update(user, groupId, parseFeatureKey(key), body);
  }
}
