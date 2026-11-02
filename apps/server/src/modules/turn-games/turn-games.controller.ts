import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { CreateTurnGameInput, createTurnGameSchema, TurnActInput, turnActSchema, TurnGamesService } from './turn-games.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 비동기 턴제 게임 API */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/turn-games')
export class TurnGamesController {
  constructor(private readonly turns: TurnGamesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.turns.list(groupId, user, isGroupAdmin(m), status, parsePaging(page, pageSize, 10));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Body(new ZodPipe(createTurnGameSchema)) body: CreateTurnGameInput) {
    return this.turns.create(user, groupId, isGroupAdmin(m), body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.turns.detail(groupId, user, isGroupAdmin(m), isGroupManager(m), id);
  }

  @Post(':id/join')
  join(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.turns.join(user, groupId, isGroupAdmin(m), id);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.turns.leave(user, groupId, isGroupAdmin(m), id);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.turns.start(user, groupId, isGroupAdmin(m), isGroupManager(m), id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.turns.cancel(user, groupId, isGroupAdmin(m), isGroupManager(m), id);
  }

  @Post(':id/act')
  act(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(turnActSchema)) body: TurnActInput) {
    return this.turns.act(user, groupId, isGroupAdmin(m), id, body);
  }
}
