import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { parsePaging, paged } from '../../common/paging';
import { PrismaService } from '../../common/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../../common/audit.service';
import { AppError } from '../../common/app-error';

const quotaSchema = z.object({ storageQuotaMb: z.number().int().min(0).max(1024 * 1024) });

/** MASTER: 그룹별 저장 용량 할당 (사용량 집계는 아직 없음 → 화면에서 준비 중으로 표시) */
@UseGuards(MasterGuard)
@Controller('admin/storage')
export class AdminStorageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query('q') q?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = parsePaging(page, pageSize, 10);
    const where = { deletedAt: null, ...(q?.trim() ? { name: { contains: q.trim(), mode: 'insensitive' as const } } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.group.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.pageSize, select: { id: true, name: true, storageQuotaMb: true, _count: { select: { groupMemberships: true } } } }),
      this.prisma.group.count({ where }),
    ]);
    return paged(
      rows.map((g) => ({ id: g.id, name: g.name, storageQuotaMb: g.storageQuotaMb, memberCount: g._count.groupMemberships })),
      total,
      p,
    );
  }

  @Put(':groupId')
  async update(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string, @Body(new ZodPipe(quotaSchema)) body: { storageQuotaMb: number }) {
    const before = await this.prisma.group.findUnique({ where: { id: groupId }, select: { storageQuotaMb: true } });
    if (!before) throw AppError.notFound('그룹을 찾을 수 없어요');
    await this.prisma.$transaction(async (tx) => {
      await tx.group.update({ where: { id: groupId }, data: { storageQuotaMb: body.storageQuotaMb } });
      await this.audit.log(tx, { groupId, actorId: user.id, action: 'storage.quota', targetType: 'Group', targetId: groupId, before: before, after: { storageQuotaMb: body.storageQuotaMb } });
    });
    return { ok: true, storageQuotaMb: body.storageQuotaMb };
  }
}
