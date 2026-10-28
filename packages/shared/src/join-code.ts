/** 코드는 영문 대문자와 숫자만 사용 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const JOIN_CODE_LENGTH = 8;

/** 입력값 정규화: 하이픈/공백 제거, 대문자화 */
export function normalizeJoinCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

/** 표시용: ABCD-EF23 */
export function formatJoinCode(code: string): string {
  return code.length === JOIN_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export function isValidJoinCodeFormat(code: string): boolean {
  return new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`).test(code);
}
