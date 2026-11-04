#!/usr/bin/env node
// 메일 발송 테스트. email.sh 가 `node --env-file=.env` 로 실행한다.
// 필요한 환경변수: MAIL_USER, MAIL_PASSWORD (Gmail 앱 비밀번호), MAIL_FROM (선택, 기본값은 MAIL_USER)
import { randomBytes, randomInt } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// nodemailer 는 apps/server 에 설치되어 있으므로 그 위치 기준으로 불러온다
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(ROOT, 'apps/server/package.json'));
const nodemailer = require('nodemailer');

const to = process.argv[2];
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASSWORD;
const from = process.env.MAIL_FROM || user;

if (!user || !pass) {
  console.error('MAIL_USER 와 MAIL_PASSWORD 가 .env 에 필요합니다.');
  process.exit(1);
}

const WORDS = ['바다', '구름', '커피', '기차', '소나무', '노을', '달팽이', '유리잔', '우산', '자전거', '호수', '책장'];
const pick = () => WORDS[randomInt(WORDS.length)];

// 랜덤 내용: 단어 조합 문장 몇 줄 + 랜덤 토큰 + 숫자
const lines = Array.from({ length: 3 }, () => `${pick()} ${pick()} ${pick()}를 떠올리면 ${pick()}이(가) 생각난다.`);
const token = randomBytes(6).toString('hex');
const number = randomInt(1000, 10000);
const sentAt = new Date().toISOString();

const subject = `[WePlay 메일 테스트] ${token}`;
const text = [
  'WePlay 메일 발송 테스트입니다.',
  '',
  ...lines,
  '',
  `랜덤 토큰: ${token}`,
  `랜덤 숫자: ${number}`,
  `발송 시각: ${sentAt}`,
].join('\n');

const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

try {
  const info = await transporter.sendMail({ from, to, subject, text });
  console.log(`발송 완료: ${to}`);
  console.log(`  제목: ${subject}`);
  console.log(`  messageId: ${info.messageId}`);
} catch (err) {
  console.error(`발송 실패: ${err.message}`);
  process.exit(1);
}
