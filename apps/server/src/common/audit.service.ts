import { Injectable } from '@nestjs/common';
import { PrismaService, Tx } from './prisma.service';

export interface AuditEntry {
  groupId?: string | null;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** 상태 변경과 같은 트랜잭션에서 호출 (PLAN 부록 A-5) */
  log(tx: Tx | PrismaService, entry: AuditEntry) {
    return tx.auditLog.create({
      data: {
        groupId: entry.groupId ?? null,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        before: (entry.before ?? undefined) as any,
        after: (entry.after ?? undefined) as any,
      },
    });
  }
}
