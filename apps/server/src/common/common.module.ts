import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { JoinCodeService } from './join-code.service';

@Global()
@Module({
  providers: [PrismaService, AuditService, JoinCodeService],
  exports: [PrismaService, AuditService, JoinCodeService],
})
export class CommonModule {}
