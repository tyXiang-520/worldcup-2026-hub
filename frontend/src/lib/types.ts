// 赛事数据展示相关类型

export type TeamBrief = {
  id: number;
  name: string;
  nameEn: string;
  flagUrl: string;
};

export type Match = {
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
};

export type MatchGroup = {
  date: string;
  matches: Match[];
};

export type MatchEvent = {
  id: number;
  minute: string;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "var";
  description: string;
  playerId: number | null;
  playerName: string | null;
  teamSide: "home" | "away";
};

export type LineupPlayer = {
  playerId: number;
  number: number;
  name: string;
  position: string | null;
};

export type Lineup = {
  formation: string;
  starting: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type PlayerRating = {
  playerId: number;
  number: number;
  name: string;
  rating: number;
};

export type MatchDetail = {
  match: Match;
  events: MatchEvent[];
  lineups: { home: Lineup; away: Lineup };
  ratings: { home: PlayerRating[]; away: PlayerRating[] };
  stats: MatchStats | null;
};

export type MatchStats = {
  possession_home: number;
  possession_away: number;
  shots_home: number;
  shots_away: number;
  shots_on_home: number;
  shots_on_away: number;
  corners_home: number;
  corners_away: number;
  fouls_home: number;
  fouls_away: number;
  pass_pct_home: number;
  pass_pct_away: number;
  offsides_home: number;
  offsides_away: number;
};

export type MatchListResponse = { data: MatchGroup[] };
export type MatchDetailResponse = { data: MatchDetail };

export type TeamStats = {
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
};

export type Team = {
  id: number;
  name: string;
  nameEn: string;
  flagUrl: string;
  group: string;
  fifaRanking: number | null;
  stats: TeamStats | null;
};

export type TeamDetailData = {
  team: Team;
  players: PlayerBrief[];
  matches: Match[];
};

export type PlayerBrief = {
  id: number;
  name: string;
  number: number;
  position: string;
};

export type PlayerTournamentStats = {
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
};

export type PlayerDetail = {
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
};

export type TeamListResponse = { data: Team[] };
export type TeamDetailResponse = { data: TeamDetailData };
export type PlayerDetailResponse = { data: PlayerDetail };

// 阶段枚举值，用于 UI 展示
export const STAGE_LABELS: Record<string, string> = {
  "group-1": "小组赛第一轮",
  "group-2": "小组赛第二轮",
  "group-3": "小组赛第三轮",
  "round-of-32": "1/16 决赛",
  "round-of-16": "1/8 决赛",
  "quarter-final": "1/4 决赛",
  "semi-final": "半决赛",
  "third-place": "三四名决赛",
  "final": "决赛",
};

export const STAGE_ORDER = [
  "group-1",
  "group-2",
  "group-3",
  "round-of-32",
  "round-of-16",
  "quarter-final",
  "semi-final",
  "third-place",
  "final",
];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  goal: "进球",
  yellow_card: "黄牌",
  red_card: "红牌",
  substitution: "换人",
  var: "VAR",
};

export const POSITION_ORDER: Record<string, number> = {
  "守门员": 1,
  "后卫": 2,
  "中场": 3,
  "前锋": 4,
};
