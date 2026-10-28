/** 메일 발송 인터페이스. 실제 발송 서비스(SMTP/API)는 아직 연결하지 않음 */
export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

/** 임시 구현: 아무것도 보내지 않음 (TODO: 발송 서비스 연결) */
export class NoopMailer implements Mailer {
  async send(_to: string, _subject: string, _body: string) {
    // TODO: 비밀번호 재설정 메일 발송
  }
}
