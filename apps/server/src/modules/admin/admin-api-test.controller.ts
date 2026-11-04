import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { z } from 'zod';
import { MasterGuard } from '../../common/master.guard';
import { MAILER, Mailer } from '../../common/mailer';
import { ZodPipe } from '../../common/zod.pipe';

const sendTestSchema = z.object({ to: z.string().email().max(100) });

const WORDS = ['바다', '구름', '커피', '기차', '소나무', '노을', '달팽이', '유리잔', '우산', '자전거', '호수', '책장'];
const pick = () => WORDS[randomInt(WORDS.length)];

/** MASTER: API 테스트 화면용. 메일 설정 확인과 테스트 메일 발송 */
@UseGuards(MasterGuard)
@Controller('admin/api-test')
export class AdminApiTestController {
  constructor(@Inject(MAILER) private readonly mailer: Mailer) {}

  /** 현재 메일 설정 (비밀번호는 내보내지 않음) */
  @Get('mail')
  mailStatus() {
    const driver = process.env.MAIL_DRIVER ?? 'noop';
    return {
      driver,
      from: process.env.MAIL_FROM || process.env.MAIL_USER || null,
      configured: driver === 'gmail' && !!process.env.MAIL_USER && !!process.env.MAIL_PASSWORD,
    };
  }

  /** 랜덤 내용의 테스트 메일 발송 */
  @Post('mail')
  async sendTestMail(@Body(new ZodPipe(sendTestSchema)) body: { to: string }) {
    const token = randomBytes(6).toString('hex');
    const sentAt = new Date().toISOString();
    const lines = Array.from({ length: 3 }, () => `${pick()} ${pick()} ${pick()}를 떠올리면 ${pick()}이(가) 생각난다.`);
    const subject = `[WePlay API 테스트] ${token}`;
    const text = ['WePlay API 테스트 메일입니다.', '', ...lines, '', `랜덤 토큰: ${token}`, `랜덤 숫자: ${randomInt(1000, 10000)}`, `발송 시각: ${sentAt}`].join('\n');
    await this.mailer.send(body.to, subject, text);
    return { ok: true, to: body.to, subject, sentAt };
  }
}
