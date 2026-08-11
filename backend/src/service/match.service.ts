import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  Lineup,
  LineupPlayer,
  Match,
  MatchDetail,
  MatchEvent,
  MatchGroup,
  PlayerRating,
  TeamBrief,
  Team,
} from "../interface";

@Provide()
export class MatchService {
  @Config("courseDatabase.path")
  databasePath: string;

  private database: DatabaseSync;

  @Init()
  async initialize() {
    const absolutePath = resolve(process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);
    this.createTables();
    this.seedFromCSV();
  }

  /* ================================================================
   * 建表（全部表结构）
   * ================================================================ */
  private createTables() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_en TEXT NOT NULL,
        flag_url TEXT NOT NULL DEFAULT '',
        group_name TEXT NOT NULL,
        fifa_ranking INTEGER
      );

      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        kickoff_time TEXT,
        stage TEXT NOT NULL,
        group_name TEXT,
        venue TEXT,
        home_team_id INTEGER NOT NULL REFERENCES teams(id),
        away_team_id INTEGER NOT NULL REFERENCES teams(id),
        home_score INTEGER,
        away_score INTEGER,
        home_penalty INTEGER,
        away_penalty INTEGER,
        status TEXT NOT NULL DEFAULT 'finished',
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS match_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL REFERENCES matches(id),
        minute TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        player_id INTEGER,
        player_name TEXT,
        team_side TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lineups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL REFERENCES matches(id),
        team_id INTEGER NOT NULL REFERENCES teams(id),
        side TEXT NOT NULL,
        formation TEXT NOT NULL DEFAULT '4-3-3'
      );

      CREATE TABLE IF NOT EXISTS lineup_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lineup_id INTEGER NOT NULL REFERENCES lineups(id),
        player_id INTEGER NOT NULL,
        number INTEGER NOT NULL,
        name TEXT NOT NULL,
        position TEXT,
        is_starter INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS player_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL REFERENCES matches(id),
        player_id INTEGER NOT NULL,
        team_side TEXT NOT NULL,
        rating REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL REFERENCES teams(id),
        name TEXT NOT NULL,
        name_en TEXT,
        number INTEGER NOT NULL,
        position TEXT NOT NULL,
        nationality TEXT,
        age INTEGER,
        height INTEGER,
        weight INTEGER,
        market_value TEXT,
        club TEXT
      );

      CREATE TABLE IF NOT EXISTS player_tournament_stats (
        player_id INTEGER PRIMARY KEY REFERENCES players(id),
        appearances INTEGER NOT NULL DEFAULT 0,
        goals INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        yellow_cards INTEGER NOT NULL DEFAULT 0,
        red_cards INTEGER NOT NULL DEFAULT 0,
        minutes_played INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  /* ================================================================
   * 从 CSV 导入种子数据
   * ================================================================ */
  private seedFromCSV() {
    // 检查是否已导入
    const teamCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM teams")
      .get() as { total: number };
    if (teamCount.total >= 48) return;

    const dataDir = resolve(process.cwd(), "..");

    // ---------- 1. 球队 ----------
    const teamsCsv = this.readCSV(join(dataDir, "teams.csv — 48支球队（A-L组，含FIFA排名）.csv"), 1);
    const insertTeam = this.database.prepare(
      "INSERT INTO teams (id, name, name_en, group_name, fifa_ranking, flag_url) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const row of teamsCsv) {
      insertTeam.run(
        Number(row[0]), row[1], row[2], row[3],
        row[4] ? Number(row[4]) : null, row[5] ?? "",
      );
    }

    // ---------- 2. 球员 ----------
    const playersCsv = this.readCSV(join(dataDir, "players.csv — 576名核心球员（48队全覆盖）.csv"), 1);
    const insertPlayer = this.database.prepare(
      `INSERT INTO players (id, team_id, name, name_en, number, position, nationality, age, height, weight, market_value, club)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of playersCsv) {
      insertPlayer.run(
        Number(row[0]), Number(row[1]), row[2], row[3] ?? null,
        Number(row[4]), row[5], row[6] ?? null,
        row[7] ? Number(row[7]) : null,
        row[8] ? Number(row[8]) : null,
        row[9] ? Number(row[9]) : null,
        row[10] ?? null, row[11] ?? null,
      );
    }

    // ---------- 3. 比赛 ----------
    const matchesCsv = this.readCSV(join(dataDir, "matches.csv — 104场完整赛果（含比分_点球_场地_时间）.csv"), 1);
    const insertMatch = this.database.prepare(
      `INSERT INTO matches (id, date, kickoff_time, stage, group_name, venue,
         home_team_id, away_team_id, home_score, away_score, home_penalty, away_penalty, status, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finished', ?)`,
    );
    for (const row of matchesCsv) {
      insertMatch.run(
        Number(row[0]), row[1], row[2] || null, row[3],
        row[4] || null, row[5] || null,
        Number(row[6]), Number(row[7]),
        row[8] ? Number(row[8]) : null,
        row[9] ? Number(row[9]) : null,
        row[10] ? Number(row[10]) : null,
        row[11] ? Number(row[11]) : null,
        row[12] || null,
      );
    }

    // ---------- 4. 比赛事件 ----------
    const eventsCsv = this.readCSV(join(dataDir, "match_events.csv — 386条比赛事件（覆盖全部104场）.csv"), 1);
    const insertEvent = this.database.prepare(
      `INSERT INTO match_events (id, match_id, minute, type, description, player_id, player_name, team_side)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of eventsCsv) {
      insertEvent.run(
        Number(row[0]), Number(row[1]), row[2], row[3], row[4],
        row[5] ? Number(row[5]) : null, row[6] || null, row[7],
      );
    }

    // ---------- 5. 阵容 ----------
    const lineupsCsv = this.readCSV(join(dataDir, "lineups.csv — 32条阵容（16场淘汰赛）.csv"), 1);
    const insertLineup = this.database.prepare(
      "INSERT INTO lineups (id, match_id, team_id, side, formation) VALUES (?, ?, ?, ?, ?)",
    );
    for (const row of lineupsCsv) {
      insertLineup.run(Number(row[0]), Number(row[1]), Number(row[2]), row[3], row[4]);
    }

    // ---------- 6. 阵容球员 ----------
    const lpCsv = this.readCSV(join(dataDir, "lineup_players.csv — 431条阵容球员（首发+替补）.csv"), 1);
    const insertLP = this.database.prepare(
      "INSERT INTO lineup_players (id, lineup_id, player_id, number, name, position, is_starter) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const row of lpCsv) {
      insertLP.run(Number(row[0]), Number(row[1]), Number(row[2]), Number(row[3]), row[4], row[5] || null, Number(row[6]));
    }

    // ---------- 7. 球员评分 ----------
    const ratingsCsv = this.readCSV(join(dataDir, "player_ratings.csv — 350条球员评分（淘汰赛首发）.csv"), 1);
    const insertRating = this.database.prepare(
      "INSERT INTO player_ratings (id, match_id, player_id, team_side, rating) VALUES (?, ?, ?, ?, ?)",
    );
    for (const row of ratingsCsv) {
      // ratings csv: id,match_id,player_id,number,name,team_side,rating
      insertRating.run(Number(row[0]), Number(row[1]), Number(row[2]), row[5], Number(row[6]));
    }

    // ---------- 8. 球员赛事统计 ----------
    const statsCsv = this.readCSV(join(dataDir, "player_tournament_stats.csv — 576条赛事统计.csv"), 1);
    const insertStats = this.database.prepare(
      "INSERT INTO player_tournament_stats (player_id, appearances, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const row of statsCsv) {
      insertStats.run(
        Number(row[0]), Number(row[1]), Number(row[2]), Number(row[3]),
        Number(row[4]), Number(row[5]), Number(row[6]),
      );
    }
  }

  /* ================================================================
   * CSV 解析工具（简单 split，处理 UTF-8 BOM）
   * ================================================================ */
  private readCSV(filePath: string, skipLines: number): string[][] {
    if (!existsSync(filePath)) {
      console.warn(`[MatchService] CSV not found: ${filePath}`);
      return [];
    }
    let raw = readFileSync(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // BOM
    const lines = raw.trim().split("\n").slice(skipLines);
    return lines.map((line) => parseCSVLine(line));
  }

  /* ================================================================
   * 查询 — 赛程列表
   * ================================================================ */
  list(stage?: string): MatchGroup[] {
    let rows: any[];
    if (stage) {
      rows = this.database
        .prepare(
          `SELECT m.*, ht.name AS home_name, ht.name_en AS home_name_en,
                  at.name AS away_name, at.name_en AS away_name_en
           FROM matches m
           JOIN teams ht ON m.home_team_id = ht.id
           JOIN teams at ON m.away_team_id = at.id
           WHERE m.stage = ?
           ORDER BY m.date, m.kickoff_time`,
        )
        .all(stage);
    } else {
      rows = this.database
        .prepare(
          `SELECT m.*, ht.name AS home_name, ht.name_en AS home_name_en,
                  at.name AS away_name, at.name_en AS away_name_en
           FROM matches m
           JOIN teams ht ON m.home_team_id = ht.id
           JOIN teams at ON m.away_team_id = at.id
           ORDER BY m.date, m.kickoff_time`,
        )
        .all();
    }

    const matches = rows.map(mapMatch);
    return groupByDate(matches);
  }

  /* ================================================================
   * 查询 — 比赛详情
   * ================================================================ */
  getById(id: number): MatchDetail | null {
    const row = this.database
      .prepare(
        `SELECT m.*, ht.name AS home_name, ht.name_en AS home_name_en,
                at.name AS away_name, at.name_en AS away_name_en
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.id = ?`,
      )
      .get(id) as any;

    if (!row) return null;

    const match = mapMatch(row);
    const events = this.getEvents(id);
    const lineups = this.getLineups(id);
    const ratings = this.getRatings(id);

    return { match, events, lineups, ratings };
  }

  private getEvents(matchId: number): MatchEvent[] {
    const rows = this.database
      .prepare("SELECT * FROM match_events WHERE match_id = ? ORDER BY CAST(minute AS INTEGER)")
      .all(matchId) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      minute: r.minute,
      type: r.type,
      description: r.description,
      playerId: r.player_id,
      playerName: r.player_name,
      teamSide: r.team_side,
    }));
  }

  private getLineups(matchId: number): { home: Lineup; away: Lineup } {
    const lineupRows = this.database
      .prepare("SELECT * FROM lineups WHERE match_id = ?")
      .all(matchId) as any[];

    const homeLineup = lineupRows.find((r: any) => r.side === "home");
    const awayLineup = lineupRows.find((r: any) => r.side === "away");

    return {
      home: homeLineup ? this.buildLineup(homeLineup.id) : { formation: "未知", starting: [], substitutes: [] },
      away: awayLineup ? this.buildLineup(awayLineup.id) : { formation: "未知", starting: [], substitutes: [] },
    };
  }

  private buildLineup(lineupId: number): Lineup {
    const row = this.database
      .prepare("SELECT formation FROM lineups WHERE id = ?")
      .get(lineupId) as any;

    const players = this.database
      .prepare("SELECT * FROM lineup_players WHERE lineup_id = ? ORDER BY id")
      .all(lineupId) as any[];

    const mapPlayer = (p: any): LineupPlayer => ({
      playerId: p.player_id,
      number: p.number,
      name: p.name,
      position: p.position,
    });

    return {
      formation: row?.formation ?? "未知",
      starting: players.filter((p: any) => p.is_starter === 1).map(mapPlayer),
      substitutes: players.filter((p: any) => p.is_starter === 0).map(mapPlayer),
    };
  }

  private getRatings(matchId: number): { home: PlayerRating[]; away: PlayerRating[] } {
    const rows = this.database
      .prepare("SELECT * FROM player_ratings WHERE match_id = ? ORDER BY rating DESC")
      .all(matchId) as any[];

    const home = rows
      .filter((r: any) => r.team_side === "home")
      .map(mapRating);
    const away = rows
      .filter((r: any) => r.team_side === "away")
      .map(mapRating);

    return { home, away };
  }

  @Destroy()
  async close() {
    this.database?.close();
  }
}

/* ================================================================
 * 辅助函数
 * ================================================================ */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { result.push(current); current = ""; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

function mapMatch(row: any): Match {
  return {
    id: row.id,
    date: row.date,
    kickoffTime: row.kickoff_time,
    stage: row.stage,
    group: row.group_name,
    venue: row.venue,
    homeTeam: {
      id: row.home_team_id,
      name: row.home_name,
      nameEn: row.home_name_en,
      flagUrl: "",
    },
    awayTeam: {
      id: row.away_team_id,
      name: row.away_name,
      nameEn: row.away_name_en,
      flagUrl: "",
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    homePenalty: row.home_penalty,
    awayPenalty: row.away_penalty,
    status: row.status,
    summary: row.summary,
  };
}

function mapRating(r: any): PlayerRating {
  return {
    playerId: r.player_id,
    number: 0, // from player_ratings table directly
    name: "",  // player info joined in getRatings
    rating: r.rating,
  };
}

function groupByDate(matches: Match[]): MatchGroup[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const list = map.get(m.date) ?? [];
    list.push(m);
    map.set(m.date, list);
  }
  return Array.from(map.entries()).map(([date, list]) => ({ date, matches: list }));
}
