export interface Me {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  platformRole: 'USER' | 'MASTER';
  createdAt: string;
}

export interface MyCompany {
  company: { id: string; name: string; description: string | null };
  joinStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  role?: 'ADMIN' | 'USER';
  isPrimaryAdmin?: boolean;
  joinedAt?: string;
  requestId?: string;
  reviewNote?: string | null;
  requestedAt?: string;
}

export interface UserLite {
  id: string;
  name: string;
  email: string | null;
  avatarUrl?: string | null;
}

export interface JoinRequest {
  id: string;
  type: 'COMPANY_JOIN' | 'GROUP_JOIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'EXPIRED';
  message: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: UserLite;
  reviewer: { id: string; name: string } | null;
  company: { id: string; name: string };
  groups: { groupId: string; approved: boolean | null; group: { id: string; name: string } }[];
}

export interface PublicGroup {
  id: string;
  name: string;
  description: string | null;
  requireApproval: boolean;
}

export interface LookupResult {
  kind: 'COMPANY' | 'GROUP';
  code: string;
  company: { id: string; name: string; description: string | null };
  publicGroups?: PublicGroup[];
  group?: { id: string; name: string; description: string | null; visibility: 'PUBLIC' | 'PRIVATE'; requireApproval: boolean };
}

export interface JoinResult {
  request: JoinRequest | null;
  autoJoinedCount: number;
}

export interface CompanyHome {
  id: string;
  name: string;
  description: string | null;
  joinCode?: string;
  memberCount: number;
  groupCount: number;
  pendingCount: number;
  me: { role: 'ADMIN' | 'USER'; isPrimaryAdmin: boolean; joinedAt: string };
}

export interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  admin: UserLite | null;
  isMine: boolean;
  myRole: 'ADMIN' | 'MEMBER' | null;
  joinCode?: string;
}

export interface Member extends UserLite {
  role: 'ADMIN' | 'USER';
  isPrimaryAdmin: boolean;
  joinedAt: string;
  groups: { id: string; name: string }[];
}
