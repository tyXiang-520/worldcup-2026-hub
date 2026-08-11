export interface Course {
  id: number;
  title: string;
  description: string;
  createdAt: string;
}

export interface CreateCourseInput {
  title: string;
  description: string;
}

// ============================================================
// 001-match-display：赛事数据展示
// ============================================================

/** 球队简要信息（嵌入在 Match 中） */
export interface TeamBrief {
  id: number;
  name: string;
  nameEn: string;
  flagUrl: string;
}

/** 球队完整信息 */
export interface Team extends TeamBrief {
  group: string;
  fifaRanking: number | null;
  stats: TeamStats | null;
}

export interface TeamStats {
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
}

/** 赛程列表中的比赛 */
export interface Match {
  id: number;
  date: string;
  kickoffTime: string | null;
  stage: string;
  group: string | null;
  venue: string | null;
  homeTeam: TeamBrief;
  awayTeam: TeamBrief;
  homeScore: number | null;
  awayScore: number | null;
  homePenalty: number | null;
  awayPenalty: number | null;
  status: "finished";
  summary: string | null;
}

/** 赛场事件 */
export interface MatchEvent {
  id: number;
  minute: string;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "var";
  description: string;
  playerId: number | null;
  playerName: string | null;
  teamSide: "home" | "away";
}

/** 阵容球员 */
export interface LineupPlayer {
  playerId: number;
  number: number;
  name: string;
  position: string | null;
}

/** 阵容 */
export interface Lineup {
  formation: string;
  starting: LineupPlayer[];
  substitutes: LineupPlayer[];
}

/** 球员评分 */
export interface PlayerRating {
  playerId: number;
  number: number;
  name: string;
  rating: number;
}

/** 比赛详情 */
export interface MatchDetail {
  match: Match;
  events: MatchEvent[];
  lineups: { home: Lineup; away: Lineup };
  ratings: { home: PlayerRating[]; away: PlayerRating[] };
}

/** 球员简要信息 */
export interface PlayerBrief {
  id: number;
  name: string;
  number: number;
  position: string;
}

/** 球员完整信息 */
export interface PlayerDetail {
  id: number;
  name: string;
  nameEn: string | null;
  number: number;
  position: string;
  nationality: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  marketValue: string | null;
  club: string | null;
  tournamentStats: PlayerTournamentStats | null;
}

export interface PlayerTournamentStats {
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

/** 按日期分组的赛程响应 */
export interface MatchGroup {
  date: string;
  matches: Match[];
}
