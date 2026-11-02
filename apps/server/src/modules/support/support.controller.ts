import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { InquiryInput, inquirySchema, ReplyInput, replySchema, SupportService } from './support.service';

/** 시스템 문의 (로그인 사용자) */
@Controller('support/inquiries')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.support.mine(user, parsePaging(page, pageSize, 10));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(inquirySchema)) body: InquiryInput) {
    return this.support.create(user, body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.detail(user, id);
  }

  @Post(':id/replies')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(replySchema)) body: ReplyInput) {
    return this.support.reply(user, id, body);
  }

  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.close(user, id);
  }
}

/** MASTER: 시스템 문의 처리 */
@UseGuards(MasterGuard)
@Controller('admin/inquiries')
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@Query('status') status?: string, @Query('q') q?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.support.adminList(status, q, parsePaging(page, pageSize, 10));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.support.adminDetail(id);
  }

  @Post(':id/replies')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(replySchema)) body: ReplyInput) {
    return this.support.adminReply(user, id, body);
  }

  @Put(':id/status')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status?: string }) {
    return this.support.adminStatus(user, id, String(body.status ?? ''));
  }
}
