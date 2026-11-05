import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { MAILER, Mailer } from './mailer';
import { PrismaService } from './prisma.service';

/** SIGNUP: 회원가입, CHANGE_EMAIL: 회원 정보의 이메일(아이디) 변경, PASSWORD_RESET: 비밀번호 재설정 */
export type VerificationPurpose = 'SIGNUP' | 'CHANGE_EMAIL' | 'PASSWORD_RESET';

const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const CODE_TTL_MINUTES: Record<VerificationPurpose, number> = {
  SIGNUP: 5,
  CHANGE_EMAIL: 10,
  PASSWORD_RESET: 10,
};

const SUBJECT: Record<VerificationPurpose, string> = {
  SIGNUP: '[WePlay] 회원가입 인증번호',
  CHANGE_EMAIL: '[WePlay] 이메일 변경 인증번호',
  PASSWORD_RESET: '[WePlay] 비밀번호 재설정 인증번호',
};

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) { }

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  /** 인증번호 발송. 같은 주소·용도로는 1분에 한 번만 보낼 수 있음 */
  async send(email: string, purpose: VerificationPurpose, userId: string | null) {
    const now = Date.now();
    const key = { email_purpose: { email, purpose } };
    const existing = await this.prisma.emailVerification.findUnique({ where: key });
    if (existing && now - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
      const resendAvailableAt = new Date(existing.sentAt.getTime() + RESEND_COOLDOWN_MS);
      throw new AppError(ErrorCode.EMAIL_CODE_COOLDOWN, '인증번호는 1분 뒤에 다시 요청할 수 있습니다', HttpStatus.TOO_MANY_REQUESTS, { resendAvailableAt: resendAvailableAt.toISOString() });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const fields = {
      userId,
      codeHash: this.hash(code),
      attempts: 0,
      expiresAt: new Date(now + CODE_TTL_MINUTES[purpose] * 60 * 1000),
      sentAt: new Date(now),
      consumedAt: null,
    };
    const saved = await this.prisma.emailVerification.upsert({
      where: key,
      create: { email, purpose, ...fields },
      update: fields,
    });

    try {
      await this.mailer.send(
        email,
        SUBJECT[purpose],
        `인증번호는 ${code} 입니다. ${CODE_TTL_MINUTES[purpose]}분 안에 입력해 주세요.\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.`,
      );
    } catch {
      try {
        if (existing) {
          await this.prisma.emailVerification.update({
            where: { id: existing.id },
            data: {
              userId: existing.userId,
              codeHash: existing.codeHash,
              attempts: existing.attempts,
              expiresAt: existing.expiresAt,
              sentAt: existing.sentAt,
              consumedAt: existing.consumedAt,
            },
          });
        } else {
          await this.prisma.emailVerification.deleteMany({ where: { id: saved.id } });
        }
      } catch {
        // Preserve the mail error; a later resend can recover if cleanup fails.
      }
      throw new AppError(ErrorCode.EMAIL_SEND_FAILED, '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요', HttpStatus.BAD_GATEWAY);
    }
    return {
      expiresAt: fields.expiresAt.toISOString(),
      resendAvailableAt: new Date(now + RESEND_COOLDOWN_MS).toISOString(),
    };
  }

  private async validCode(email: string, purpose: VerificationPurpose, code: string, userId: string | null) {
    const invalid = (message = '인증번호가 올바르지 않거나 만료되었습니다') => new AppError(ErrorCode.EMAIL_CODE_INVALID, message, HttpStatus.BAD_REQUEST);
    const row = await this.prisma.emailVerification.findUnique({ where: { email_purpose: { email, purpose } } });
    if (!row || row.consumedAt || row.expiresAt <= new Date() || row.userId !== userId) {
      throw invalid();
    }
    if (row.attempts >= MAX_ATTEMPTS) throw invalid('인증번호 입력 횟수를 초과했습니다. 새 인증번호를 요청해 주세요.');
    if (row.codeHash !== this.hash(code)) {
      const attempts = row.attempts + 1;
      await this.prisma.emailVerification.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      if (attempts >= MAX_ATTEMPTS) throw invalid('인증번호 입력 횟수를 초과했습니다. 새 인증번호를 요청해 주세요.');
      throw invalid();
    }
    return row;
  }

  /** 가입 화면에서 미리 확인하되 가입 제출 전까지 코드는 소진하지 않음 */
  async check(email: string, purpose: VerificationPurpose, code: string, userId: string | null) {
    await this.validCode(email, purpose, code, userId);
  }

  /** 인증번호 확인 후 1회용으로 소진 */
  async verify(email: string, purpose: VerificationPurpose, code: string, userId: string | null) {
    const row = await this.validCode(email, purpose, code, userId);
    await this.prisma.emailVerification.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  }
}
