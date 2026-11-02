import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { CreateSurveyInput, createSurveySchema, RandomSurveyService, RejectInput, rejectSchema, RespondInput, respondSchema } from './random-survey.service';

function assertManager(m: GroupMembershipContext) {
  if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
}

/** 랜덤 설문 API. 등록은 누구나, 승인·강제 시작/종료는 관리자 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/surveys')
export class RandomSurveyController {
  constructor(private readonly surveys: RandomSurveyService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.surveys.list(groupId, user, isGroupManager(m), status, parsePaging(page, pageSize, 10));
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createSurveySchema)) body: CreateSurveyInput,
  ) {
    return this.surveys.create(user, groupId, isGroupManager(m), body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.surveys.detail(groupId, user, isGroupManager(m), id);
  }

  @Post(':id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(respondSchema)) body: RespondInput) {
    return this.surveys.respond(user, groupId, id, body);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    assertManager(m);
    return this.surveys.approve(user, groupId, id);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(rejectSchema)) body: RejectInput,
  ) {
    assertManager(m);
    return this.surveys.reject(user, groupId, id, body);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.surveys.start(user, groupId, isGroupManager(m), id);
  }

  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.surveys.close(user, groupId, isGroupManager(m), id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.surveys.remove(user, groupId, isGroupManager(m), id);
  }
}
