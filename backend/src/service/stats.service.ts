import { Provide, Inject } from "@midwayjs/core";
import { DatabaseSync } from "node:sqlite";
import type { TeamBrief } from "../interface";
import { MatchService } from "./match.service";

export interface BracketRound {
  title: string;
  matches: BracketMatchData[];
}

export interface BracketMatchData {
  id: number;
  stage: string;
  homeTeam: TeamBrief;
  awayTeam: TeamBrief;
  homeScore: number | null;
  awayScore: number | null;
  homePenalty: number | null;
  awayPenalty: number | null;
  date: string;
}

export interface ScorerData {
  playerId: number;
  name: string;
  number: number;
  teamName: string;
  teamId: number;
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
}

export interface StandingRow {
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
}

export interface StandingGroup {
  group: string;
  teams: StandingRow[];
}

@Provide()
export class StatsService {
  @Inject()
  matchService: MatchService;

  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  /* ================================================================
   * 晋级图
   * ================================================================ */
  getBracket(): { rounds: BracketRound[]; final: BracketMatchData | null } {
    const knockoutStages = [
      { key: "round-of-32", title: "1/16 决赛" },
      { key: "round-of-16", title: "1/8 决赛" },
      { key: "quarter-final", title: "1/4 决赛" },
      { key: "semi-final", title: "半决赛" },
      { key: "third-place", title: "三四名决赛" },
    ];

    const rounds = knockoutStages
      .map((s) => {
        const matches = this.listByStage(s.key);
        return { title: s.title, matches };
      })
      .filter((r) => r.matches.length > 0);

    // 决赛单独返回
    const finalMatches = this.listByStage("final");
    return {
      rounds,
      final: finalMatches.length > 0 ? finalMatches[0] : null,
    };
  }

  private listByStage(stage: string): BracketMatchData[] {
    const rows = this.database
      .prepare(
        `SELECT m.*, ht.name AS home_name, ht.name_en AS home_name_en,
                at.name AS away_name, at.name_en AS away_name_en
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.stage = ?
         ORDER BY m.date, m.kickoff_time`,
      )
      .all(stage) as any[];

    return rows.map((r) => ({
      id: r.id,
      stage: r.stage,
      homeTeam: { id: r.home_team_id, name: r.home_name, nameEn: r.home_name_en, flagUrl: "" },
      awayTeam: { id: r.away_team_id, name: r.away_name, nameEn: r.away_name_en, flagUrl: "" },
      homeScore: r.home_score,
      awayScore: r.away_score,
      homePenalty: r.home_penalty,
      awayPenalty: r.away_penalty,
      date: r.date,
    }));
  }

  /* ================================================================
   * 射手榜 / 助攻榜
   * ================================================================ */
  getTopScorers(sortBy: string, order: string): ScorerData[] {
    const sortColumn = sortBy === "assists" ? "s.assists" : sortBy === "appearances" ? "s.appearances" : "s.goals";
    const dir = order === "asc" ? "ASC" : "DESC";

    const rows = this.database
      .prepare(
        `SELECT p.id AS playerId, p.name, p.number, t.name AS teamName, t.id AS teamId,
                s.goals, s.assists, s.appearances, s.minutes_played AS minutesPlayed
         FROM player_tournament_stats s
         JOIN players p ON s.player_id = p.id
         JOIN teams t ON p.team_id = t.id
         WHERE s.goals > 0
         ORDER BY ${sortColumn} ${dir}, s.goals DESC, s.assists DESC, s.minutes_played ASC
         LIMIT 10`,
      )
      .all() as any[];

    return rows.map(mapScorer);
  }

  getTopAssists(sortBy: string, order: string): ScorerData[] {
    const sortColumn = sortBy === "goals" ? "s.goals" : sortBy === "appearances" ? "s.appearances" : "s.assists";
    const dir = order === "asc" ? "ASC" : "DESC";

    const rows = this.database
      .prepare(
        `SELECT p.id AS playerId, p.name, p.number, t.name AS teamName, t.id AS teamId,
                s.goals, s.assists, s.appearances, s.minutes_played AS minutesPlayed
         FROM player_tournament_stats s
         JOIN players p ON s.player_id = p.id
         JOIN teams t ON p.team_id = t.id
         WHERE s.assists > 0
         ORDER BY ${sortColumn} ${dir}, s.assists DESC, s.goals DESC, s.minutes_played ASC
         LIMIT 10`,
      )
      .all() as any[];

    return rows.map(mapScorer);
  }

  /* ================================================================
   * 积分榜（小组赛）
   * ================================================================ */
  getStandings(): StandingGroup[] {
    const groups = this.database
      .prepare("SELECT DISTINCT group_name FROM teams ORDER BY group_name")
      .all() as any[];

    return groups.map((g: any) => {
      const teams = this.database
        .prepare("SELECT id, name FROM teams WHERE group_name = ?")
        .all(g.group_name) as any[];

      const standings = teams.map((t: any) => {
        const stats = this.computeTeamStats(t.id);
        return {
          teamId: t.id,
          teamName: t.name,
          ...stats,
        };
      });

      // 排序：积分降序 → 净胜球降序 → 进球降序
      standings.sort(
        (a: any, b: any) =>
          b.points - a.points ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor,
      );

      return {
        group: g.group_name,
        teams: standings.map((s: any, i: number) => ({
          rank: i + 1,
          ...s,
        })),
      };
    });
  }

  private computeTeamStats(teamId: number) {
    const homeRows = this.database
      .prepare(
        `SELECT home_score, away_score FROM matches
         WHERE home_team_id = ? AND stage LIKE 'group-%' AND home_score IS NOT NULL`,
      )
      .all(teamId) as any[];
    const awayRows = this.database
      .prepare(
        `SELECT home_score, away_score FROM matches
         WHERE away_team_id = ? AND stage LIKE 'group-%' AND away_score IS NOT NULL`,
      )
      .all(teamId) as any[];

    let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;

    for (const m of homeRows) {
      played++; goalsFor += m.home_score; goalsAgainst += m.away_score;
      if (m.home_score > m.away_score) won++;
      else if (m.home_score < m.away_score) lost++;
      else drawn++;
    }
    for (const m of awayRows) {
      played++; goalsFor += m.away_score; goalsAgainst += m.home_score;
      if (m.away_score > m.home_score) won++;
      else if (m.away_score < m.home_score) lost++;
      else drawn++;
    }

    return {
      played, won, drawn, lost, goalsFor, goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: won * 3 + drawn * 1,
    };
  }
}

function mapScorer(r: any): ScorerData {
  return {
    playerId: r.playerId,
    name: r.name,
    number: r.number,
    teamName: r.teamName,
    teamId: r.teamId,
    goals: r.goals,
    assists: r.assists,
    appearances: r.appearances,
    minutesPlayed: r.minutesPlayed,
  };
}
