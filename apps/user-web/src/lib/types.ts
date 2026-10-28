export interface Me {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  platformRole: 'USER' | 'MASTER';
  status?: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
}

export interface MyGroup {
  group: { id: string; name: string; description: string | null };
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
  type: 'GROUP_JOIN' | 'TEAM_JOIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'EXPIRED';
  message: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: UserLite;
  reviewer: { id: string; name: string } | null;
  group: { id: string; name: string };
  teams: { teamId: string; approved: boolean | null; team: { id: string; name: string } }[];
}

export type JoinStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PublicTeam {
  id: string;
  name: string;
  description: string | null;
  requireApproval: boolean;
  joinStatus: JoinStatus;
}

export interface LookupResult {
  kind: 'GROUP' | 'TEAM';
  code: string;
  joinStatus: JoinStatus;
  pendingRequestId?: string | null;
  rejectReason?: string | null;
  group: { id: string; name: string; description: string | null };
  publicTeams?: PublicTeam[];
  team?: { id: string; name: string; description: string | null; visibility: 'PUBLIC' | 'PRIVATE'; requireApproval: boolean };
}

export interface JoinResult {
  request: JoinRequest | null;
  autoJoinedCount: number;
}

export interface GroupHome {
  id: string;
  name: string;
  description: string | null;
  joinCode?: string;
  memberCount: number;
  teamCount: number;
  pendingCount: number;
  me: { role: 'ADMIN' | 'USER'; isPrimaryAdmin: boolean; joinedAt: string };
}

export interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  admins: UserLite[];
  isMine: boolean;
  myRole: 'ADMIN' | 'USER' | null;
  joinStatus: JoinStatus;
  pendingRequestId?: string | null;
  joinCode?: string;
}

export interface Member extends UserLite {
  role: 'ADMIN' | 'USER';
  isPrimaryAdmin: boolean;
  joinedAt: string;
  teams: { id: string; name: string }[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
