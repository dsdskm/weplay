import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  CreateEmployeeOfTheMonthCommentInput,
  createEmployeeOfTheMonthCommentSchema,
  UpdateEmployeeOfTheMonthCommentInput,
  updateEmployeeOfTheMonthCommentSchema,
  NominateEmployeeOfTheMonthInput,
  nominateEmployeeOfTheMonthSchema,
  SetEmployeeOfTheMonthWinnersInput,
  setEmployeeOfTheMonthWinnersSchema,
  UpdateEmployeeOfTheMonthSettingInput,
  updateEmployeeOfTheMonthSettingSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { parsePaging } from '../../common/paging';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { EmployeeOfTheMonthService } from './employee-of-the-month.service';

function isGroupAdmin(m: GroupMembershipContext) {
  return m.role === 'ADMIN' || m.isPrimaryAdmin;
}

function assertGroupAdmin(m: GroupMembershipContext) {
  if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
}

/** 이달의 사원 API (user-web). 조회·추천은 구성원 모두, 추천 내역·선정·공개일은 그룹 ADMIN */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/employee-of-the-month')
export class EmployeeOfTheMonthController {
  constructor(private readonly eotm: EmployeeOfTheMonthService) {}

  @Get()
  overview(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('month') month?: string,
  ) {
    return this.eotm.overview(groupId, user.id, month, isGroupManager(m));
  }

  @Post('comments')
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createEmployeeOfTheMonthCommentSchema)) body: CreateEmployeeOfTheMonthCommentInput,
  ) {
    return this.eotm.createComment(user, groupId, body);
  }

  @Patch('comments/:commentId')
  updateComment(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('commentId') commentId: string,
    @Body(new ZodPipe(updateEmployeeOfTheMonthCommentSchema)) body: UpdateEmployeeOfTheMonthCommentInput,
  ) {
    return this.eotm.updateComment(user, groupId, commentId, body);
  }

  @Delete('comments/:commentId')
  removeComment(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.eotm.removeComment(user, groupId, commentId, isGroupManager(m));
  }

  @Put('nomination')
  nominate(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(nominateEmployeeOfTheMonthSchema)) body: NominateEmployeeOfTheMonthInput,
  ) {
    return this.eotm.nominate(user, groupId, body);
  }

  @Delete('nomination')
  withdraw(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.eotm.withdraw(user, groupId);
  }

  @Get('admin/months/:month/nominations')
  async adminNominations(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('month') month: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.adminNominations(groupId, month, parsePaging(page, pageSize), scope);
  }

  @Get('admin/months/:month/candidates')
  async adminCandidates(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('month') month: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.adminCandidates(groupId, month, parsePaging(page, pageSize), scope);
  }

  @Get('admin/months/:month/comments')
  async adminComments(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('month') month: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.adminComments(groupId, month, parsePaging(page, pageSize), scope);
  }

  @Get('admin/months/:month/compliments')
  async adminCompliments(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('month') month: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.adminCompliments(groupId, month, parsePaging(page, pageSize, 5), scope);
  }

  @Get('admin/months/:month/missing')
  async adminMissing(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('month') month: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.adminMissing(groupId, month, parsePaging(page, pageSize), scope);
  }

  /** 선정자별 추천 사유(익명) 또는 댓글 목록 */
  @Get('winners/:month/:userId/:kind')
  winnerList(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('month') month: string,
    @Param('userId') userId: string,
    @Param('kind') kind: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (kind !== 'reasons' && kind !== 'comments') throw AppError.notFound('없는 목록입니다');
    return this.eotm.winnerList(user.id, isGroupManager(m), groupId, month, userId, kind, parsePaging(page, pageSize, 5));
  }

  /** 구성원별 이달의 사원 선정 횟수 */
  @Get('hall')
  hall(@Param('groupId') groupId: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.eotm.hallList(groupId, parsePaging(page, pageSize));
  }

  @Get('admin/dashboard')
  async dashboard(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.dashboard(groupId, scope);
  }

  @Get('admin/months/:month')
  async monthDetail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('month') month: string) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.monthDetail(groupId, month, scope);
  }

  @Put('admin/months/:month/winners')
  async selectWinners(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('month') month: string,
    @Body(new ZodPipe(setEmployeeOfTheMonthWinnersSchema)) body: SetEmployeeOfTheMonthWinnersInput,
  ) {
    assertGroupAdmin(m);
    const scope = await this.eotm.managerScope(groupId, user.id, isGroupAdmin(m));
    return this.eotm.selectWinners(user, groupId, month, body, scope);
  }

  @Delete('admin/nominations/:nominationId')
  deleteNomination(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('nominationId') nominationId: string,
  ) {
    assertGroupAdmin(m);
    return this.eotm.deleteNomination(user, groupId, nominationId);
  }

  @Put('admin/settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(updateEmployeeOfTheMonthSettingSchema)) body: UpdateEmployeeOfTheMonthSettingInput,
  ) {
    assertGroupAdmin(m);
    return this.eotm.updateSettings(user, groupId, body);
  }
}
