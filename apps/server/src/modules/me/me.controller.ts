import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  EmailCodeRequestInput,
  emailCodeRequestSchema,
  ErrorCode,
  JoinStatus,
  UpdateProfileInput,
  updateProfileSchema,
} from '@weplay/shared';
import { AppError } from '../../common/app-error';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { EmailVerificationService } from '../../common/email-verification.service';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { toPublicUser } from '../auth/auth.service';
import { requestInclude, RequestsService } from '../requests/requests.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly verification: EmailVerificationService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { ...toPublicUser(u), hasPassword: !!u.passwordHash, status: u.status };
  }

  /** 이메일(아이디) 변경용 인증번호 발송. 새 주소로 메일이 간다 */
  @Post('email-code')
  async sendEmailCode(@CurrentUser() user: AuthUser, @Body(new ZodPipe(emailCodeRequestSchema)) body: EmailCodeRequestInput) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (body.email === me.email) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, '현재 이메일과 같은 주소입니다', HttpStatus.BAD_REQUEST);
    }
    await this.assertEmailFree(user.id, body.email);
    await this.verification.send(body.email, 'CHANGE_EMAIL', user.id);
    return { ok: true };
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const data: { name?: string; email?: string; username?: string } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email && body.email !== me.email) {
      await this.assertEmailFree(user.id, body.email);
      await this.verification.verify(body.email, 'CHANGE_EMAIL', body.emailCode!, user.id);
      data.email = body.email;
      // 아이디가 이메일과 같은 계정(일반 가입)은 아이디도 함께 바꿈. MASTER 전용 아이디는 그대로 둠
      if (me.username === me.email) data.username = body.email;
    }
    return toPublicUser(await this.prisma.user.update({ where: { id: user.id }, data }));
  }

  private async assertEmailFree(userId: string, email: string) {
    const taken = await this.prisma.user.findFirst({
      where: { id: { not: userId }, OR: [{ email }, { username: email }] },
    });
    if (taken) throw new AppError(ErrorCode.EMAIL_TAKEN, '이미 사용 중인 이메일입니다', HttpStatus.CONFLICT);
  }

  /** 소속/대기/거절/차단 그룹 목록 (통합 joinStatus) */
  @Get('groups')
  async groups(@CurrentUser() user: AuthUser) {
    const [groupMemberships, requests] = await Promise.all([
      this.prisma.groupMembership.findMany({
        where: { userId: user.id, status: { in: ['APPROVED', 'BLOCKED'] }, group: { deletedAt: null } },
        include: { group: true },
      }),
      this.prisma.groupMembershipRequest.findMany({
        where: { userId: user.id, type: 'GROUP_JOIN', status: { in: ['PENDING', 'REJECTED'] } },
        include: { group: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const result = new Map<string, any>();
    for (const m of groupMemberships) {
      result.set(m.groupId, {
        group: { id: m.group.id, name: m.group.name, description: m.group.description },
        joinStatus: m.status === 'BLOCKED' ? JoinStatus.BLOCKED : JoinStatus.APPROVED,
        role: m.role,
        isPrimaryAdmin: m.group.primaryAdminId === user.id,
        joinedAt: m.joinedAt,
      });
    }
    for (const r of requests) {
      if (result.has(r.groupId)) continue;
      result.set(r.groupId, {
        group: { id: r.group.id, name: r.group.name, description: r.group.description },
        joinStatus: r.status === 'PENDING' ? JoinStatus.PENDING : JoinStatus.REJECTED,
        requestId: r.id,
        reviewNote: r.reviewNote,
        requestedAt: r.createdAt,
      });
    }
    return [...result.values()];
  }

  @Get('requests')
  requestsList(@CurrentUser() user: AuthUser) {
    return this.prisma.groupMembershipRequest.findMany({
      where: { userId: user.id },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Delete('requests/:id')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.cancel(user, id);
  }
}
