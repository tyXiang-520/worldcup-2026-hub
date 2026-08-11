import { Provide, Inject, Init } from "@midwayjs/core";
import { DatabaseSync } from "node:sqlite";
import { MatchService } from "./match.service";

export interface PredictionInput {
  matchId: number;
  prediction: "home" | "away" | "draw";
  homeScore?: number;
  awayScore?: number;
}

export interface PredictionResult {
  id: number;
  matchId: number;
  prediction: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  points: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  correctResult: boolean;
  correctScore: boolean;
  createdAt: string;
}

@Provide()
export class PredictionService {
  @Inject()
  matchService: MatchService;

  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  @Init()
  async initTables() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        match_id INTEGER NOT NULL REFERENCES matches(id),
        prediction TEXT NOT NULL,
        home_score INTEGER,
        away_score INTEGER,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, match_id)
      );
    `);
  }

  submit(userId: number, input: PredictionInput): PredictionResult {
    const matchRow = this.database
      .prepare(
        `SELECT m.*, ht.name AS home_name, at.name AS away_name
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.id = ?`,
      )
      .get(input.matchId) as any;

    if (!matchRow) throw new ValidationError("比赛不存在");
    if (matchRow.home_score === null || matchRow.away_score === null) {
      throw new ValidationError("该比赛尚无结果");
    }
    if (!["home", "away", "draw"].includes(input.prediction)) {
      throw new ValidationError("预测值必须为 home、away 或 draw");
    }

    // 检查是否已预测
    const existing = this.database
      .prepare("SELECT id FROM predictions WHERE user_id = ? AND match_id = ?")
      .get(userId, input.matchId);
    if (existing) throw new ConflictError("您已对该场比赛提交过预测");

    // 计算
    const correctResult = this.isResultCorrect(
      input.prediction,
      matchRow.home_score,
      matchRow.away_score,
    );
    let correctScore = false;
    if (input.homeScore !== undefined && input.awayScore !== undefined) {
      correctScore =
        input.homeScore === matchRow.home_score &&
        input.awayScore === matchRow.away_score;
    }
    const points = correctScore ? 50 : correctResult ? 10 : 0;

    const result = this.database
      .prepare(
        `INSERT INTO predictions (user_id, match_id, prediction, home_score, away_score, points)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId, input.matchId, input.prediction,
        input.homeScore ?? null, input.awayScore ?? null, points,
      );

    return {
      id: Number(result.lastInsertRowid),
      matchId: input.matchId,
      prediction: input.prediction,
      predictedHomeScore: input.homeScore ?? null,
      predictedAwayScore: input.awayScore ?? null,
      points,
      homeTeamName: matchRow.home_name,
      awayTeamName: matchRow.away_name,
      homeScore: matchRow.home_score,
      awayScore: matchRow.away_score,
      correctResult,
      correctScore,
      createdAt: new Date().toISOString(),
    };
  }

  listByUser(userId: number, matchId?: number): PredictionResult[] {
    const filter = matchId ? "AND p.match_id = ?" : "";
    const params: any[] = matchId ? [userId, matchId] : [userId];
    const rows = this.database
      .prepare(
        `SELECT p.*, m.home_score AS actual_home, m.away_score AS actual_away,
                ht.name AS home_name, at.name AS away_name
         FROM predictions p
         JOIN matches m ON p.match_id = m.id
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE p.user_id = ? ${filter}
         ORDER BY m.date DESC, m.kickoff_time DESC`,
      )
      .all(...params) as any[];

    return rows.map((r) => {
      const hs = r.actual_home, as = r.actual_away;
      const correctResult = this.isResultCorrect(r.prediction, hs, as);
      const correctScore =
        r.home_score !== null &&
        r.away_score !== null &&
        r.home_score === hs &&
        r.away_score === as;

      return {
        id: r.id,
        matchId: r.match_id,
        prediction: r.prediction,
        predictedHomeScore: r.home_score,
        predictedAwayScore: r.away_score,
        points: r.points,
        homeTeamName: r.home_name,
        awayTeamName: r.away_name,
        homeScore: hs,
        awayScore: as,
        correctResult,
        correctScore,
        createdAt: new Date(`${r.created_at.replace(" ", "T")}Z`).toISOString(),
      };
    });
  }

  private isResultCorrect(pred: string, hs: number, as: number): boolean {
    if (pred === "home") return hs > as;
    if (pred === "away") return hs < as;
    return hs === as;
  }
}

export class ValidationError extends Error {
  constructor(msg: string) { super(msg); this.name = "ValidationError"; }
}
export class ConflictError extends Error {
  constructor(msg: string) { super(msg); this.name = "ConflictError"; }
}
