import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { JoinCodeService } from './join-code.service';
import { EmailVerificationService } from './email-verification.service';
import { MAILER, createMailer } from './mailer';

@Global()
@Module({
  providers: [
    PrismaService,
    AuditService,
    JoinCodeService,
    { provide: MAILER, useFactory: createMailer },
    EmailVerificationService,
  ],
  exports: [PrismaService, AuditService, JoinCodeService, MAILER, EmailVerificationService],
})
export class CommonModule {}
