import { Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

/** 메일 발송 인터페이스 */
export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export const MAILER = Symbol('MAILER');

/** Gmail SMTP 발송. 계정은 2단계 인증 + 앱 비밀번호 필요 (MAIL_USER, MAIL_PASSWORD, MAIL_FROM) */
export class GmailMailer implements Mailer {
  private readonly logger = new Logger(GmailMailer.name);
  private readonly transporter: Transporter;

  constructor(
    private readonly user: string,
    pass: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  async send(to: string, subject: string, body: string) {
    await this.transporter.sendMail({ from: this.from || this.user, to, subject, text: body });
    this.logger.log(`메일 발송 완료: ${subject}`);
  }
}

/** 개발용: 발송하지 않고 로그에만 남김 */
export class NoopMailer implements Mailer {
  private readonly logger = new Logger(NoopMailer.name);

  async send(to: string, subject: string, body: string) {
    this.logger.log(`[noop] to=${to} subject=${subject}\n${body}`);
  }
}

/** MAIL_DRIVER=gmail 이면 Gmail, 그 외에는 Noop */
export function createMailer(): Mailer {
  const driver = process.env.MAIL_DRIVER ?? 'noop';
  if (driver === 'gmail') {
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASSWORD;
    if (!user || !pass) throw new Error('MAIL_DRIVER=gmail 이면 MAIL_USER, MAIL_PASSWORD 가 필요합니다');
    return new GmailMailer(user, pass, process.env.MAIL_FROM ?? user);
  }
  return new NoopMailer();
}
