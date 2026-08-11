import { Provide, Inject } from "@midwayjs/core";
import { DatabaseSync } from "node:sqlite";
import { MatchService } from "./match.service";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  predictionCount: number;
  correctRate: number;
}

export interface MyRank {
  rank: number;
  points: number;
  predictionCount: number;
  correctRate: number;
  totalUsers: number;
  percentile: number;
}

@Provide()
export class LeaderboardService {
  @Inject()
  matchService: MatchService;

  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  getTop100(): LeaderboardEntry[] {
    const rows = this.database
      .prepare(
        `SELECT u.id, u.username, u.allow_leaderboard,
                COALESCE(SUM(p.points), 0) AS points,
                COUNT(p.id) AS prediction_count,
                CAST(SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) AS REAL) / MAX(1, COUNT(p.id)) AS correct_rate
         FROM users u
         LEFT JOIN predictions p ON u.id = p.user_id
         WHERE u.allow_leaderboard = 1
         GROUP BY u.id
         HAVING points > 0
         ORDER BY points DESC, correct_rate DESC
         LIMIT 100`,
      )
      .all() as any[];

    return rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      points: r.points,
      predictionCount: r.prediction_count,
      correctRate: Math.round(r.correct_rate * 100),
    }));
  }

  getMyRank(userId: number): MyRank | null {
    // 所有有积分的用户排名
    const allRows = this.database
      .prepare(
        `SELECT u.id,
                COALESCE(SUM(p.points), 0) AS points,
                COUNT(p.id) AS prediction_count,
                CAST(SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) AS REAL) / MAX(1, COUNT(p.id)) AS correct_rate
         FROM users u
         LEFT JOIN predictions p ON u.id = p.user_id
         GROUP BY u.id
         HAVING points > 0
         ORDER BY points DESC, correct_rate DESC`,
      )
      .all() as any[];

    if (allRows.length === 0) return null;

    const idx = allRows.findIndex((r: any) => r.id === userId);
    if (idx === -1) return {
      rank: 0, points: 0, predictionCount: 0, correctRate: 0,
      totalUsers: allRows.length, percentile: 0,
    };

    const row = allRows[idx];
    return {
      rank: idx + 1,
      points: row.points,
      predictionCount: row.prediction_count,
      correctRate: Math.round(row.correct_rate * 100),
      totalUsers: allRows.length,
      percentile: Math.round((1 - (idx + 1) / allRows.length) * 100),
    };
  }
}
