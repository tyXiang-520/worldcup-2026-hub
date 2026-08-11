import { Provide, Inject, Init } from "@midwayjs/core";
import { DatabaseSync } from "node:sqlite";
import type { Team, TeamStats } from "../interface";
import { MatchService } from "./match.service";

@Provide()
export class TeamService {
  @Inject()
  matchService: MatchService;

  // 复用同一个数据库实例
  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  list(): Team[] {
    const rows = this.database
      .prepare("SELECT * FROM teams ORDER BY group_name, id")
      .all() as any[];

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      nameEn: r.name_en,
      flagUrl: r.flag_url,
      group: r.group_name,
      fifaRanking: r.fifa_ranking,
      stats: this.getTeamStats(r.id),
    }));
  }

  getById(id: number): Team | null {
    const row = this.database
      .prepare("SELECT * FROM teams WHERE id = ?")
      .get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      nameEn: row.name_en,
      flagUrl: row.flag_url,
      group: row.group_name,
      fifaRanking: row.fifa_ranking,
      stats: this.getTeamStats(row.id),
    };
  }

  /** 计算球队在本届赛事中的数据 */
  private getTeamStats(teamId: number): TeamStats | null {
    const homeMatches = this.database
      .prepare(
        `SELECT home_score, away_score FROM matches
         WHERE home_team_id = ? AND status = 'finished' AND home_score IS NOT NULL`,
      )
      .all(teamId) as any[];
    const awayMatches = this.database
      .prepare(
        `SELECT home_score, away_score FROM matches
         WHERE away_team_id = ? AND status = 'finished' AND away_score IS NOT NULL`,
      )
      .all(teamId) as any[];

    const total = homeMatches.length + awayMatches.length;
    if (total === 0) return null;

    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

    for (const m of homeMatches) {
      if (m.home_score > m.away_score) wins++;
      else if (m.home_score < m.away_score) losses++;
      else draws++;
      goalsFor += m.home_score;
      goalsAgainst += m.away_score;
    }
    for (const m of awayMatches) {
      if (m.away_score > m.home_score) wins++;
      else if (m.away_score < m.home_score) losses++;
      else draws++;
      goalsFor += m.away_score;
      goalsAgainst += m.home_score;
    }

    return {
      matches: total,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
    };
  }
}
