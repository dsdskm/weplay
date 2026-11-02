export const SURVEY_STATUS: Record<string, { label: string; tone: 'green' | 'slate' | 'amber' | 'rose' | 'brand' }> = {
  PENDING: { label: '승인 대기', tone: 'amber' },
  QUEUED: { label: '시작 예정', tone: 'brand' },
  ACTIVE: { label: '진행 중', tone: 'green' },
  CLOSED: { label: '종료', tone: 'slate' },
  REJECTED: { label: '반려', tone: 'rose' },
};
