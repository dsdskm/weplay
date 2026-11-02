import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { BestInput, bestSchema, CreateMissionInput, createMissionSchema, PhotoMissionService, SubmitInput, submitSchema } from './photo-mission.service';

/** 사진·영상 미션 API. 주최 순서는 설정(돌아가며/누구나/관리자만)에 따름 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/photo-missions')
export class PhotoMissionController {
  constructor(private readonly missions: PhotoMissionService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.missions.list(groupId, user, isGroupManager(m), status, parsePaging(page, pageSize, 8));
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createMissionSchema)) body: CreateMissionInput,
  ) {
    return this.missions.create(user, groupId, isGroupManager(m), body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.missions.detail(groupId, user, isGroupManager(m), id);
  }

  @Post(':id/submissions')
  submit(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(submitSchema)) body: SubmitInput) {
    return this.missions.submit(user, groupId, id, body);
  }

  @Delete(':id/submissions/:sid')
  deleteSubmission(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Param('sid') sid: string,
  ) {
    return this.missions.deleteSubmission(user, groupId, isGroupManager(m), id, sid);
  }

  @Put(':id/best')
  best(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(bestSchema)) body: BestInput,
  ) {
    return this.missions.pickBest(user, groupId, isGroupManager(m), id, body);
  }

  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.missions.close(user, groupId, isGroupManager(m), id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.missions.remove(user, groupId, isGroupManager(m), id);
  }
}
