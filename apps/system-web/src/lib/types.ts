export interface UserLite {
  id: string;
  name: string;
  email: string | null;
}

export interface AdminUser extends UserLite {
  username: string | null;
  birthDate: string | null;
  phone: string | null;
  platformRole: 'USER' | 'MASTER';
  status: 'ACTIVE' | 'DEACTIVATED';
  googleSub: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  groupMemberships: { role: 'ADMIN' | 'USER'; group: { id: string; name: string } }[];
  teamMembers: { role: 'ADMIN' | 'USER'; team: { id: string; name: string; group: { id: string; name: string } } }[];
}

export interface AdminUserDetail extends AdminUser {
  primaryOf: { groups: { id: string; name: string }[]; teams: { id: string; name: string; group: { name: string } }[] };
  groupMemberships: { role: 'ADMIN' | 'USER'; status: string; joinedAt: string; group: { id: string; name: string } }[];
  teamMembers: { role: 'ADMIN' | 'USER'; joinedAt: string; team: { id: string; name: string; group: { id: string; name: string } } }[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminTeam {
  id: string;
  name: string;
  group: { id: string; name: string };
}

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  joinCodeEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  primaryAdminId: string | null;
  createdAt: string;
  memberCount: number;
  teamCount: number;
  pendingCount: number;
}

export interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  primaryAdminId: string | null;
  joinCode: string;
  joinCodeEnabled: boolean;
  visibility: 'PUBLIC' | 'PRIVATE';
  requireApproval: boolean;
  memberCount: number;
  admins: UserLite[];
}

export interface GroupMember extends UserLite {
  role: 'ADMIN' | 'USER';
  status: 'APPROVED' | 'BLOCKED';
  joinedAt: string;
  isPrimaryAdmin: boolean;
  teams: { id: string; name: string; role: 'ADMIN' | 'USER' }[];
}

export interface GroupDetail extends Omit<GroupRow, 'memberCount' | 'teamCount' | 'pendingCount'> {
  memberCount: number;
  teams: TeamRow[];
}

export interface JoinRequest {
  id: string;
  type: 'GROUP_JOIN' | 'TEAM_JOIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'EXPIRED';
  message: string | null;
  reviewNote: string | null;
  createdAt: string;
  user: UserLite;
  reviewer: { id: string; name: string } | null;
  group: { id: string; name: string };
  teams: { teamId: string; approved: boolean | null; team: { id: string; name: string } }[];
}
