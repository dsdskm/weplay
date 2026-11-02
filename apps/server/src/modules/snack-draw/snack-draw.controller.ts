import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { CreateGameInput, createGameSchema, DrawInput, drawSchema, SnackDrawService } from './snack-draw.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 간식 쏘기 랜덤 API: 모집 → 시작 → 한 칸씩 뽑기 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/snack-draws')
export class SnackDrawController {
  constructor(private readonly snacks: SnackDrawService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.snacks.list(groupId, user, isGroupAdmin(m), status, parsePaging(page, pageSize, 10));
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createGameSchema)) body: CreateGameInput,
  ) {
    return this.snacks.create(user, groupId, isGroupManager(m), isGroupAdmin(m), body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.snacks.detail(groupId, user, isGroupManager(m), isGroupAdmin(m), id);
  }

  @Post(':id/join')
  join(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.snacks.join(user, groupId, isGroupAdmin(m), id);
  }

  @Delete(':id/join')
  leave(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.snacks.leave(user, groupId, isGroupAdmin(m), id);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.snacks.start(user, groupId, isGroupManager(m), isGroupAdmin(m), id);
  }

  @Post(':id/draw')
  draw(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(drawSchema)) body: DrawInput,
  ) {
    return this.snacks.draw(user, groupId, isGroupAdmin(m), id, body);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.snacks.cancel(user, groupId, isGroupManager(m), isGroupAdmin(m), id);
  }
}
