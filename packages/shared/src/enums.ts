export const PlatformRole = { USER: 'USER', MASTER: 'MASTER' } as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

export const CompanyRole = { ADMIN: 'ADMIN', USER: 'USER' } as const;
export type CompanyRole = (typeof CompanyRole)[keyof typeof CompanyRole];

export const GroupRole = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' } as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

export const RequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const GroupVisibility = { PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE' } as const;
export type GroupVisibility = (typeof GroupVisibility)[keyof typeof GroupVisibility];

/** 사용자 관점 통합 가입 상태 (PLAN §2.4) */
export const JoinStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
} as const;
export type JoinStatus = (typeof JoinStatus)[keyof typeof JoinStatus];
