// 数据统计 API 类型
export type BracketMatch = {
  id: number;
  stage: string;
  homeTeam: { id: number; name: string; nameEn: string; flagUrl: string };
  awayTeam: { id: number; name: string; nameEn: string; flagUrl: string };
  homeScore: number | null;
  awayScore: number | null;
  homePenalty: number | null;
  awayPenalty: number | null;
  date: string;
};

export type BracketData = {
  rounds: { title: string; matches: BracketMatch[] }[];
  final: BracketMatch | null;
};

export type ScorerEntry = {
  playerId: number;
  name: string;
  number: number;
  teamName: string;
  teamId: number;
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
};

export type StandingRow = {
  rank: number;
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type StandingGroup = {
  group: string;
  teams: StandingRow[];
};
