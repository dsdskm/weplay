import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { doneSchema, DutyInput, dutySchema, DutyService, handoverSchema } from './duty.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 공통 업무 담당 API */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/duties')
export class DutyController {
  constructor(private readonly duties: DutyService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('scope') scope?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.duties.list(groupId, user, isGroupAdmin(m), isGroupManager(m), scope, parsePaging(page, pageSize, 12));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Body(new ZodPipe(dutySchema)) body: DutyInput) {
    return this.duties.create(user, groupId, isGroupAdmin(m), isGroupManager(m), body);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(dutySchema)) body: DutyInput) {
    return this.duties.update(user, groupId, isGroupAdmin(m), id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.duties.remove(user, groupId, isGroupAdmin(m), id);
  }

  @Post(':id/done')
  done(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(doneSchema)) body: z.infer<typeof doneSchema>) {
    return this.duties.done(user, groupId, isGroupAdmin(m), id, body.memo);
  }

  @Post(':id/volunteer')
  volunteer(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.duties.volunteer(user, groupId, isGroupAdmin(m), id);
  }

  @Post(':id/handover')
  handover(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(handoverSchema)) body: z.infer<typeof handoverSchema>) {
    return this.duties.handover(user, groupId, isGroupAdmin(m), id, body.userId);
  }

  @Post(':id/skip')
  skip(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.duties.skip(user, groupId, isGroupAdmin(m), id);
  }

  @Get(':id/history')
  history(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.duties.history(groupId, user, isGroupAdmin(m), id, parsePaging(page, pageSize, 10));
  }
}
