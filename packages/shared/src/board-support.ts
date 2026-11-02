/** 건의사항·시스템 문의·공지·약관 공통 상수 */
export const SUGGESTION_CATEGORIES = [
  { key: 'WORK', name: '업무 환경' },
  { key: 'WELFARE', name: '복지' },
  { key: 'SYSTEM', name: '제도·규칙' },
  { key: 'FACILITY', name: '시설' },
  { key: 'ETC', name: '기타' },
] as const;

export const SUGGESTION_STATUS = [
  { key: 'RECEIVED', name: '접수', tone: 'slate' },
  { key: 'REVIEWING', name: '검토 중', tone: 'amber' },
  { key: 'ACCEPTED', name: '반영 예정', tone: 'brand' },
  { key: 'DONE', name: '반영 완료', tone: 'green' },
  { key: 'DECLINED', name: '보류', tone: 'rose' },
] as const;

export const INQUIRY_CATEGORIES = [
  { key: 'ACCOUNT', name: '계정·로그인' },
  { key: 'BUG', name: '오류 신고' },
  { key: 'FEATURE', name: '기능 제안' },
  { key: 'GROUP', name: '그룹·기능 신청' },
  { key: 'ETC', name: '기타' },
] as const;

export const INQUIRY_STATUS = [
  { key: 'OPEN', name: '답변 대기', tone: 'amber' },
  { key: 'ANSWERED', name: '답변 완료', tone: 'green' },
  { key: 'CLOSED', name: '종료', tone: 'slate' },
] as const;

export const SYSTEM_NOTICE_LEVELS = [
  { key: 'INFO', name: '안내', icon: '📢' },
  { key: 'UPDATE', name: '업데이트', icon: '✨' },
  { key: 'MAINTENANCE', name: '점검', icon: '🛠️' },
  { key: 'URGENT', name: '긴급', icon: '🚨' },
] as const;

export const TERMS_TYPES = [
  { key: 'SERVICE', name: '서비스 이용약관', required: true },
  { key: 'PRIVACY', name: '개인정보 처리방침', required: true },
  { key: 'MARKETING', name: '마케팅 정보 수신 동의', required: false },
] as const;

export const labelOf = <T extends readonly { key: string; name: string }[]>(list: T, key: string) => list.find((x) => x.key === key)?.name ?? key;
