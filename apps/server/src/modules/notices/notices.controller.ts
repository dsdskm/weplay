import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { MasterGuard } from '../../common/master.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { NoticeInput, noticeSchema, NoticesService, SystemNoticeInput, systemNoticeSchema } from './notices.service';

const isGroupAdmin = (m: GroupMembershipContext) => m.role === 'ADMIN' || m.isPrimaryAdmin;

/** 그룹 공지 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/notices')
export class NoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notices.list(groupId, user, isGroupAdmin(m), parsePaging(page, pageSize, 10), q);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.notices.detail(groupId, user, isGroupAdmin(m), id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Body(new ZodPipe(noticeSchema)) body: NoticeInput) {
    return this.notices.create(user, groupId, isGroupAdmin(m), body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(noticeSchema)) body: NoticeInput,
  ) {
    return this.notices.update(user, groupId, isGroupAdmin(m), id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.notices.remove(user, groupId, isGroupAdmin(m), id);
  }
}

/** 시스템 공지 (로그인한 모든 사용자) */
@Controller('system-notices')
export class SystemNoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.notices.systemList(parsePaging(page, pageSize, 10));
  }

  @Get('banner')
  banner() {
    return this.notices.systemBanner();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.notices.systemDetail(id);
  }
}

/** MASTER: 시스템 공지 관리 */
@UseGuards(MasterGuard)
@Controller('admin/system-notices')
export class AdminSystemNoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.notices.adminSystemList(parsePaging(page, pageSize, 10));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(systemNoticeSchema)) body: SystemNoticeInput) {
    return this.notices.createSystem(user, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(systemNoticeSchema)) body: SystemNoticeInput) {
    return this.notices.updateSystem(user, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notices.removeSystem(user, id);
  }
}
