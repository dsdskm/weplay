import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { parsePaging } from '../../common/paging';
import { ZodPipe } from '../../common/zod.pipe';
import { agreeSchema, TermsInput, termsSchema, TermsService } from './terms.service';

/** 약관 (공개 조회: 로그인 없이 볼 수 있음 → 회원가입·홍보 사이트에서 사용) */
@Controller('terms')
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  @Public()
  @Get()
  current() {
    return this.terms.current();
  }

  @Public()
  @Get(':type/history')
  history(@Param('type') type: string) {
    return this.terms.history(type);
  }
}

/** 내 약관 동의 */
@Controller('me/terms')
export class MyTermsController {
  constructor(private readonly terms: TermsService) {}

  @Get('pending')
  pending(@CurrentUser() user: AuthUser) {
    return this.terms.pending(user);
  }

  @Post('agree')
  agree(@CurrentUser() user: AuthUser, @Body(new ZodPipe(agreeSchema)) body: z.infer<typeof agreeSchema>) {
    return this.terms.agree(user, body.termsIds);
  }
}

/** MASTER: 약관 관리 */
@UseGuards(MasterGuard)
@Controller('admin/terms')
export class AdminTermsController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  list(@Query('type') type?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.terms.adminList(type, parsePaging(page, pageSize, 10));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.terms.adminDetail(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(termsSchema)) body: TermsInput) {
    return this.terms.create(user, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(termsSchema)) body: TermsInput) {
    return this.terms.update(user, id, body);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.terms.publish(user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.terms.remove(user, id);
  }
}
