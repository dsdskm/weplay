import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ManittoMessageInput,
  manittoMessageSchema,
  ManittoPeriodInput,
  manittoPeriodSchema,
  StartManittoInput,
  startManittoSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { parsePaging } from '../../common/paging';
import { ManittoService } from './manitto.service';

function assertManager(m: GroupMembershipContext) {
  if (!isGroupManager(m)) throw AppError.forbidden('관리자만 사용할 수 있습니다');
}

/** 마니또 API. 시작·종료·기간은 관리자, 배정 조회·채팅은 당사자만 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/manitto')
export class ManittoController {
  constructor(private readonly manitto: ManittoService) {}

  @Get()
  status(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string) {
    return this.manitto.status(groupId, user.id, isGroupManager(m));
  }

  @Get('overview')
  overview(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    assertManager(m);
    const q = parsePaging(page, pageSize, 20, 50);
    return this.manitto.overview(groupId, user.id, q.page, q.pageSize);
  }

  @Post('start')
  start(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(startManittoSchema)) body: StartManittoInput,
  ) {
    assertManager(m);
    return this.manitto.start(user, groupId, body);
  }

  @Post('end')
  end(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string) {
    assertManager(m);
    return this.manitto.end(user, groupId);
  }

  @Patch('period')
  period(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(manittoPeriodSchema)) body: ManittoPeriodInput,
  ) {
    assertManager(m);
    return this.manitto.period(user, groupId, body);
  }

  @Get('assignments/:assignmentId/messages')
  messages(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('assignmentId') assignmentId: string) {
    return this.manitto.messages(groupId, user.id, assignmentId);
  }

  @Post('assignments/:assignmentId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('assignmentId') assignmentId: string,
    @Body(new ZodPipe(manittoMessageSchema)) body: ManittoMessageInput,
  ) {
    return this.manitto.send(groupId, user.id, assignmentId, body);
  }
}
