import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { ErrorCode } from '@weplay/shared';
import { AppError } from './app-error';
import { MAILER, Mailer } from './mailer';
import { PrismaService } from './prisma.service';

/** SIGNUP: 회원가입, CHANGE_EMAIL: 회원 정보의 이메일(아이디) 변경, PASSWORD_RESET: 비밀번호 재설정 */
export type VerificationPurpose = 'SIGNUP' | 'CHANGE_EMAIL' | 'PASSWORD_RESET';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

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
  ) {}

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  /** 인증번호 발송. 같은 주소·용도로는 1분에 한 번만 보낼 수 있음 */
  async send(email: string, purpose: VerificationPurpose, userId: string | null) {
    const now = Date.now();
    const key = { email_purpose: { email, purpose } };
    const existing = await this.prisma.emailVerification.findUnique({ where: key });
    if (existing && now - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new AppError(ErrorCode.EMAIL_CODE_COOLDOWN, '인증번호는 1분 뒤에 다시 요청할 수 있습니다', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const fields = {
      userId,
      codeHash: this.hash(code),
      attempts: 0,
      expiresAt: new Date(now + CODE_TTL_MS),
      sentAt: new Date(now),
      consumedAt: null,
    };
    await this.prisma.emailVerification.upsert({
      where: key,
      create: { email, purpose, ...fields },
      update: fields,
    });

    try {
      await this.mailer.send(
        email,
        SUBJECT[purpose],
        `인증번호는 ${code} 입니다. 10분 안에 입력해 주세요.\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.`,
      );
    } catch {
      throw new AppError(ErrorCode.EMAIL_SEND_FAILED, '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요', HttpStatus.BAD_GATEWAY);
    }
  }

  /** 인증번호 확인. 맞으면 1회용으로 소진, 틀리면 시도 횟수를 올리고 5회를 넘으면 다시 요청해야 함 */
  async verify(email: string, purpose: VerificationPurpose, code: string, userId: string | null) {
    const invalid = () => new AppError(ErrorCode.EMAIL_CODE_INVALID, '인증번호가 올바르지 않거나 만료되었습니다', HttpStatus.BAD_REQUEST);
    const row = await this.prisma.emailVerification.findUnique({ where: { email_purpose: { email, purpose } } });
    if (!row || row.consumedAt || row.expiresAt < new Date() || row.attempts >= MAX_ATTEMPTS || row.userId !== userId) {
      throw invalid();
    }
    if (row.codeHash !== this.hash(code)) {
      await this.prisma.emailVerification.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      throw invalid();
    }
    await this.prisma.emailVerification.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  }
}
