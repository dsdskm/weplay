export interface UserLite {
  id: string;
  name: string;
  email: string | null;
}

export interface AdminUser extends UserLite {
  username: string | null;
  platformRole: 'USER' | 'MASTER';
  status: 'ACTIVE' | 'SUSPENDED';
  googleSub: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: { role: 'ADMIN' | 'USER'; company: { id: string; name: string } }[];
}

export interface CompanyRow {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  joinCodeEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  primaryAdminId: string | null;
  createdAt: string;
  memberCount: number;
  groupCount: number;
  pendingCount: number;
}

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  joinCodeEnabled: boolean;
  visibility: 'PUBLIC' | 'PRIVATE';
  requireApproval: boolean;
  memberCount: number;
  admin: UserLite | null;
}

export interface CompanyMember extends UserLite {
  role: 'ADMIN' | 'USER';
  status: 'APPROVED' | 'BLOCKED';
  joinedAt: string;
  isPrimaryAdmin: boolean;
}

export interface CompanyDetail extends Omit<CompanyRow, 'memberCount' | 'groupCount' | 'pendingCount'> {
  groups: GroupRow[];
  members: CompanyMember[];
}

export interface JoinRequest {
  id: string;
  type: 'COMPANY_JOIN' | 'GROUP_JOIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'EXPIRED';
  message: string | null;
  reviewNote: string | null;
  createdAt: string;
  user: UserLite;
  reviewer: { id: string; name: string } | null;
  company: { id: string; name: string };
  groups: { groupId: string; approved: boolean | null; group: { id: string; name: string } }[];
}
