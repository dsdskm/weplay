import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@weplay/db';
import {
  CreateMasterInput,
  createMasterSchema,
  ErrorCode,
  SetUserStatusInput,
  setUserStatusSchema,
} from '@weplay/shared';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { AuditService } from '../../common/audit.service';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';

const resetPasswordSchema = z.object({ password: z.string().min(4).max(100) });

@UseGuards(MasterGuard)
@Controller('admin')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [users, masters, companies, groups, pendingRequests] = await Promise.all([
      this.prisma.user.count({ where: { platformRole: 'USER' } }),
      this.prisma.user.count({ where: { platformRole: 'MASTER' } }),
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.group.count({ where: { deletedAt: null } }),
      this.prisma.membershipRequest.count({ where: { status: 'PENDING' } }),
    ]);
    return { users, masters, companies, groups, pendingRequests };
  }

  @Get('users')
  users(@Query('q') q?: string, @Query('role') role?: string) {
    const where: Prisma.UserWhereInput = {
      ...(role === 'MASTER' || role === 'USER' ? { platformRole: role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        platformRole: true,
        status: true,
        googleSub: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          where: { status: 'APPROVED' },
          select: { role: true, company: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Patch('users/:id/status')
  async setStatus(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(setUserStatusSchema)) body: SetUserStatusInput) {
    if (actor.id === id) throw new AppError(ErrorCode.CANNOT_MODIFY_SELF, '자기 자신은 변경할 수 없습니다');
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id } });
      const user = await tx.user.update({ where: { id }, data: { status: body.status } });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: body.status === 'SUSPENDED' ? 'user.suspended' : 'user.resumed',
        targetType: 'User',
        targetId: id,
        before: { status: before.status },
        after: { status: user.status },
      });
      return { id: user.id, status: user.status };
    });
  }

  @Post('masters')
  async createMaster(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(createMasterSchema)) body: CreateMasterInput) {
    if (await this.prisma.user.findUnique({ where: { username: body.username } })) {
      throw new AppError(ErrorCode.USERNAME_TAKEN, '이미 사용 중인 아이디입니다', 409);
    }
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: body.username, name: body.name, platformRole: 'MASTER', passwordHash: await bcrypt.hash(body.password, 10) },
      });
      await this.audit.log(tx, { actorId: actor.id, action: 'user.master.created', targetType: 'User', targetId: user.id });
      return { id: user.id, username: user.username, name: user.name };
    });
  }

  @Post('users/:id/reset-password')
  async resetPassword(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body(new ZodPipe(resetPasswordSchema)) body: { password: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.platformRole !== 'MASTER') throw AppError.notFound('MASTER 계정이 아닙니다');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(body.password, 10) } });
      await this.audit.log(tx, { actorId: actor.id, action: 'user.password_reset', targetType: 'User', targetId: id });
    });
    return { ok: true };
  }

  @Get('audit-logs')
  auditLogs(@Query('companyId') companyId?: string) {
    return this.prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
