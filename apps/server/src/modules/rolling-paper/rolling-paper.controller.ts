import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentGroupMembership, CurrentUser, GroupMembershipContext, isGroupManager } from '../../common/decorators';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { CreateNoteInput, createNoteSchema, CreatePaperInput, createPaperSchema, RollingPaperService } from './rolling-paper.service';

/** 롤링페이퍼 API. 보기·쓰기는 구성원 모두, 닫기·삭제는 만든 사람/관리자 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/rolling-papers')
export class RollingPaperController {
  constructor(private readonly papers: RollingPaperService) {}

  @Get()
  list(@Param('groupId') groupId: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.papers.list(groupId, status, parsePaging(page, pageSize, 12));
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Body(new ZodPipe(createPaperSchema)) body: CreatePaperInput,
  ) {
    return this.papers.create(user, groupId, isGroupManager(m), body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.papers.detail(groupId, user, isGroupManager(m), id);
  }

  @Post(':id/notes')
  addNote(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Param('id') id: string, @Body(new ZodPipe(createNoteSchema)) body: CreateNoteInput) {
    return this.papers.addNote(user, groupId, id, body);
  }

  @Delete(':id/notes/:noteId')
  deleteNote(
    @CurrentUser() user: AuthUser,
    @CurrentGroupMembership() m: GroupMembershipContext,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.papers.deleteNote(user, groupId, isGroupManager(m), id, noteId);
  }

  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.papers.close(user, groupId, isGroupManager(m), id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @CurrentGroupMembership() m: GroupMembershipContext, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.papers.remove(user, groupId, isGroupManager(m), id);
  }
}
