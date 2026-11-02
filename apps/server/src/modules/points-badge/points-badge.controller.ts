import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  createPointAdjustmentSchema,
  CreatePointAdjustmentInput,
  updatePointConfigSchema,
  UpdatePointConfigInput,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { MasterGuard } from '../../common/master.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { PointsBadgeService, TransferInput, transferSchema } from './points-badge.service';

function assertManager(m: GroupMembershipContext) {
  if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
}

/** 포인트·배지 API (구성원 조회, 설정·수동 부여는 관리자) */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/points')
export class PointsBadgeController {
  constructor(private readonly points: PointsBadgeService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.points.me(groupId, user.id);
  }

  @Get('me/history')
  history(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.points.history(groupId, user.id, parsePaging(page, pageSize, 5));
  }

  /** 내 포인트를 다른 구성원에게 전달 */
  @Post('transfer')
  transfer(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(transferSchema)) body: TransferInput) {
    return this.points.transfer(user, groupId, body);
  }

  @Get('config')
  getConfig(@Param('groupId') groupId: string) {
    return this.points.getConfig(groupId);
  }

  @Put('config')
  updateConfig(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(updatePointConfigSchema)) body: UpdatePointConfigInput,
  ) {
    assertManager(m);
    return this.points.updateConfig(user, groupId, body);
  }

  @Delete('config')
  resetConfig(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string) {
    assertManager(m);
    return this.points.resetConfig(user, groupId);
  }

  @Get('adjustments')
  adjustments(
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    assertManager(m);
    return this.points.adjustments(groupId, parsePaging(page, pageSize));
  }

  @Post('adjustments')
  adjust(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createPointAdjustmentSchema)) body: CreatePointAdjustmentInput,
  ) {
    assertManager(m);
    return this.points.adjust(user, groupId, body);
  }
}

/** MASTER: 포인트·배지 기본값 (모든 그룹의 기본 적용값) */
@UseGuards(MasterGuard)
@Controller('admin/points/defaults')
export class PointsDefaultsController {
  constructor(private readonly points: PointsBadgeService) {}

  @Get()
  get() {
    return this.points.getDefaults();
  }

  @Put()
  update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updatePointConfigSchema)) body: UpdatePointConfigInput) {
    return this.points.updateDefaults(user, body);
  }
}
