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

export interface EarnedBadge {
  key: string;
  name: string;
  icon: string;
  count?: number;
}

export interface Member extends UserLite {
  badges?: EarnedBadge[];
  /** 이번 달 공개된 이달의 사원이면 true */
  isMvpThisMonth?: boolean;
  /** 포인트 기능이 꺼져 있으면 null */
  points?: number | null;
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

export interface FeatureItem {
  key: string;
  /** 기능 소개(MASTER 작성): 한 줄 소개, 본문, 이미지 주소 */
  guide?: { summary: string | null; body: string | null; images: string[] };
  /** MASTER가 전역 비활성으로 두면 false */
  active?: boolean;
  /** 기본 탑재: 신청 없이 사용 */
  isDefault?: boolean;
  name: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  rejectReason: string | null;
  reviewedAt: string | null;
}

export interface EotmUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface EotmWinner {
  month: string;
  note: string | null;
  updatedAt: string;
  user: EotmUser;
}

export interface EotmComment {
  id: string;
  body: string;
  createdAt: string;
  author: EotmUser;
  canDelete: boolean;
  canEdit: boolean;
}

export interface EotmNomination {
  id: string;
  month: string;
  reason: string;
  updatedAt: string;
  nominator: EotmUser;
  nominee: EotmUser;
}

export interface EotmTop {
  count: number;
  users: EotmUser[];
}

export interface EotmOverview {
  enabled: boolean;
  month: string;
  publishDay: number;
  winnerCount: number;
  selectedMonth: string;
  selectedPublished: boolean;
  selectedWinners: EotmWinner[];
  publishedMonth: string | null;
  publishedWinners: EotmWinner[];
  pendingPublishDate: string | null;
  nextPublishDate: string | null;
  /** 추천을 받는 달: 항상 아직 공개되지 않은 달 */
  nominationMonth: string;
  myNomination: EotmNomination | null;
  hallOfFame: { mostSelected: EotmTop | null; mostNominated: EotmTop | null };
}

export interface EotmDashboard {
  enabled: boolean;
  months: {
    month: string;
    total: number;
    top: { user: EotmUser; count: number }[];
    winners: EotmWinner[];
    published: boolean;
  }[];
}

export interface EotmMonthDetail {
  month: string;
  publishDay: number;
  winnerCount: number;
  published: boolean;
  winners: EotmWinner[];
  participation: { total: number; nominated: number };
}

export interface EotmReason {
  id: string;
  reason: string;
  createdAt: string;
}

export interface EotmCandidate {
  user: EotmUser;
  count: number;
  complimentCount: number;
}

export interface EotmAdminComment {
  id: string;
  body: string;
  createdAt: string;
  author: EotmUser;
  target: EotmUser;
}

export interface EotmRank {
  user: EotmUser;
  count: number;
}

export interface ComplimentCard {
  id: string;
  month: string;
  body: string;
  anonymous: boolean;
  createdAt: string;
  /** 익명 카드는 보낸 사람 본인·관리자 외에는 null */
  sender: EotmUser | null;
  receiver: EotmUser;
  /** 보낸 사람 본인만 수정 가능 */
  canEdit: boolean;
  /** 보낸 사람 본인이 아니면 반응 가능 */
  canReact: boolean;
  reactions: { emoji: string; count: number }[];
  myReaction: string | null;
}

export interface ComplimentOverview {
  enabled: boolean;
  dailyLimit: number;
  remainingToday: number;
  sentTotal: number;
  receivedTotal: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminComplimentCard {
  id: string;
  body: string;
  anonymous: boolean;
  createdAt: string;
  /** 관리자 화면은 익명이어도 보낸 사람을 항상 표시 */
  sender: EotmUser;
  receiver: EotmUser;
  hidden: boolean;
}

export interface PointsMe {
  enabled: boolean;
  points?: number;
  breakdown?: Record<string, { count: number; points: number }>;
  badges?: { key: string; name: string; icon: string; description: string; value: number; target: number; earned: boolean; count?: number }[];
}

export interface PointsRank {
  user: EotmUser;
  points: number;
}

export type PointMetric = string;

export interface PointConfig {
  rules: Record<PointMetric, number>;
  badges: { key: string; name: string; icon: string; description: string; target: number; enabled: boolean; customized: boolean }[];
  customized: boolean;
}

export interface PointAdjustmentRow {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  user: EotmUser;
  actorName: string;
}

export interface EotmHallRow {
  user: EotmUser;
  count: number;
}


export interface PointHistoryItem {
  id: string;
  label: string;
  points: number;
  at: string;
}
