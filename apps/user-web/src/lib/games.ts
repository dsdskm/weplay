/** 미니게임 API 응답 타입 */
export interface GUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}
export interface Rank {
  rank: number | null;
  total: number;
}
export interface GamesOverview {
  enabled: boolean;
  today: string;
  week: { from: string; to: string };
  dailyLimit: number;
  dailyGame: string | null;
  weeklyGame: string | null;
  balance: number;
  economy: { playFee: number; maxPlayReward: number; challengeReward: number };
  boss: { key: string; name: string; icon: string; line: string; hp: number; damage: number; percent: number } | null;
  streak: number;
  playedToday: boolean;
  myTeam: { id: string; name: string } | null;
  teamToday: { played: number; total: number; notYet: GUser[] } | null;
  lastWeek: { champion: { user: GUser; score: number } | null; team: { team: { id: string; name: string }; score: number } | null };
  games: { key: string; playsToday: number; plays: number; personalBest: number | null; weekBest: number | null; group: Rank; team: Rank | null }[];
}
export interface PlayResult {
  score: number;
  value: number;
  isPersonalBest: boolean;
  previousBest: number | null;
  weekBest: number;
  group: Rank;
  team: (Rank & { name: string }) | null;
  remainingToday: number;
  points: { fee: number; reward: number; balance: number };
}
export interface LeaderRow {
  rank: number;
  user: GUser;
  teamName: string | null;
  score: number;
  isMe: boolean;
}
export interface Leaderboard {
  items: LeaderRow[];
  total: number;
  page: number;
  pageSize: number;
  me: { rank: number; score: number; total: number; topPercent: number } | null;
}
export interface TeamRow {
  rank: number;
  team: { id: string; name: string };
  size: number;
  participants: number;
  k: number;
  performance: number;
  participation: number;
  score: number;
  detail: string;
  isMine: boolean;
  top: { user: GUser; score: number }[];
}
export interface TeamBoard {
  items: TeamRow[];
  total: number;
  page: number;
  pageSize: number;
  method: string;
  rule: { topN: number; participationWeight: number; goalDaysPerWeek: number; bossHpPerMember: number };
  mine: TeamRow | null;
}

export interface BossState {
  boss: { key: string; name: string; icon: string; line: string };
  week: { from: string; to: string };
  reward: number;
  mine: {
    team: { id: string; name: string };
    size: number;
    hp: number;
    damage: number;
    percent: number;
    defeated: boolean;
    topAttackers: { user: GUser; damage: number }[];
    recent: { id: string; user: GUser; game: string; damage: number; at: string }[];
  } | null;
  teams: { rank: number; team: { id: string; name: string }; size: number; hp: number; damage: number; percent: number; defeated: boolean; isMine: boolean }[];
}

export interface BingoState {
  team: { id: string; name: string } | null;
  board: {
    id: string;
    week: string;
    size: number;
    perMember: number;
    myCount: number;
    lines: number[][];
    cells: { index: number; mission: string; photo: { id: string; mediaUrl: string; mediaType: string; caption: string | null; user: GUser | null; canDelete: boolean } | null }[];
  } | null;
  ranking: { rank: number; team: { id: string; name: string }; filled: number; total: number; lines: number; isMine: boolean }[];
  lineReward: number;
}

/** 동료 게임 (점수형이 아닌 것) 응답 타입 */
export interface DailyState {
  enabled: boolean;
  date: string;
  telepathy: {
    key: string;
    question: string;
    options: string[];
    my: string | null;
    team: { id: string; name: string; size: number; answered: number; topIndex: number | null; topCount: number; sync: number; counts: number[] } | null;
  };
  balance: { key: string; question: string; a: string; b: string; my: 'A' | 'B' | null; total: number; countA: number; countB: number };
  reward: number;
  bonus: number;
}
export interface PuzzleState {
  enabled: boolean;
  team: { id: string; name: string } | null;
  week: string;
  theme: { key: string; name: string } | null;
  pieces: number;
  total: number;
  completed: boolean;
  reward: number;
  tiles: { index: number; emoji: string; unlocked: boolean }[];
  contributions: { user: GUser | null; plays: number }[];
}
export interface BelongingRound {
  enabled: boolean;
  available: boolean;
  items: { id: string; mediaUrl: string; caption: string | null; choices: GUser[] }[];
  reward: number;
  mine: { mediaUrl: string; caption: string | null } | null;
}
export interface TmiRound {
  enabled: boolean;
  available: boolean;
  items: { id: string; text: string; choices: GUser[] }[];
  mine: { id: string; text: string }[];
  reward: number;
}
export interface AiStatus {
  text: boolean;
  image: boolean;
  quizEnabled: boolean;
  imageDaily: number;
}
