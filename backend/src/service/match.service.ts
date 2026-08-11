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
   * 建表
   * ================================================================ */
  private createTables() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
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
        name_en TEXT DEFAULT '',
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
    const teamCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM teams")
      .get() as { total: number };
    if (teamCount.total >= 48) return;

    const dataDir = resolve(process.cwd(), "..", "scripts");

    // ---------- 1. teams ----------
    this.importCSV(join(dataDir, "teams_new.csv"), 1, (row) => {
      this.database.prepare(
        "INSERT INTO teams (id, name, name_en, group_name, fifa_ranking, flag_url) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(Number(row[0]), row[1], row[2] ?? "", row[3], row[4] ? Number(row[4]) : null, row[5] ?? "");
    });

    // ---------- 2. players ----------
    this.importCSV(join(dataDir, "players_new.csv"), 1, (row) => {
      this.database.prepare(
        `INSERT INTO players (id, team_id, name, name_en, number, position, nationality, age, height, weight, market_value, club)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(Number(row[0]), Number(row[1]), row[2], row[3] ?? "", Number(row[4]), row[5], row[6] ?? null, row[7] ? Number(row[7]) : null, row[8] ? Number(row[8]) : null, row[9] ? Number(row[9]) : null, row[10] ?? null, row[11] ?? null);
    });

    // ---------- 3. matches ----------
    this.importCSV(join(dataDir, "matches_new.csv"), 1, (row) => {
      this.database.prepare(
        `INSERT INTO matches (id, date, kickoff_time, stage, group_name, venue,
           home_team_id, away_team_id, home_score, away_score, home_penalty, away_penalty, status, summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finished', ?)`,
      ).run(Number(row[0]), row[1], row[2] || null, row[3], row[4] || null, row[5] || null, Number(row[6]), Number(row[7]), row[8] ? Number(row[8]) : null, row[9] ? Number(row[9]) : null, row[10] ? Number(row[10]) : null, row[11] ? Number(row[11]) : null, row[12] || null);
    });

    // ---------- 4. match_events ----------
    this.importCSV(join(dataDir, "match_events_new.csv"), 1, (row) => {
      this.database.prepare(
        `INSERT INTO match_events (id, match_id, minute, type, description, player_id, player_name, team_side)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(Number(row[0]), Number(row[1]), row[2], row[3], row[4], row[5] ? Number(row[5]) : null, row[6] || null, row[7]);
    });

    // ---------- 5. player_tournament_stats ----------
    this.importCSV(join(dataDir, "player_tournament_stats_new.csv"), 1, (row) => {
      this.database.prepare(
        "INSERT INTO player_tournament_stats (player_id, appearances, goals, assists, yellow_cards, red_cards, minutes_played) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(Number(row[0]), Number(row[1]), Number(row[2]), Number(row[3]), Number(row[4]), Number(row[5]), Number(row[6]));
    });
  }

  private importCSV(filePath: string, skipLines: number, handler: (row: string[]) => void) {
    if (!existsSync(filePath)) {
      console.warn(`[MatchService] CSV not found: ${filePath}`);
      return;
    }
    let raw = readFileSync(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const lines = raw.trim().split("\n").slice(skipLines);
    for (const line of lines) {
      const row = parseCSVLine(line);
      try { handler(row); } catch (e) { console.warn(`Row error:`, row[0], e); }
    }
  }

  // ============================================================
  // 查询 — 赛程列表
  // ============================================================
  list(stage?: string): MatchGroup[] {
    let rows: any[];
    const sql = `SELECT m.*, ht.name AS home_name, ht.name_en AS home_name_en,
            at.name AS away_name, at.name_en AS away_name_en
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id`;
    if (stage) {
      rows = this.database.prepare(`${sql} WHERE m.stage = ? ORDER BY m.date, m.kickoff_time`).all(stage);
    } else {
      rows = this.database.prepare(`${sql} ORDER BY m.date, m.kickoff_time`).all();
    }
    return groupByDate(rows.map(mapMatch));
  }

  // ============================================================
  // 查询 — 比赛详情
  // ============================================================
  getById(id: number): MatchDetail | null {
    const row = this.database.prepare(
      `SELECT m.*, ht.name AS home_name, ht.name_en AS home_name_en,
              at.name AS away_name, at.name_en AS away_name_en
       FROM matches m JOIN teams ht ON m.home_team_id = ht.id JOIN teams at ON m.away_team_id = at.id
       WHERE m.id = ?`,
    ).get(id) as any;
    if (!row) return null;
    return {
      match: mapMatch(row),
      events: this.getEvents(id),
      lineups: this.getLineups(id),
      ratings: this.getRatings(id),
    };
  }

  private getEvents(matchId: number): MatchEvent[] {
    const rows = this.database.prepare("SELECT * FROM match_events WHERE match_id = ? ORDER BY CAST(minute AS INTEGER)").all(matchId) as any[];
    return rows.map((r: any) => ({ id: r.id, minute: r.minute, type: r.type, description: r.description, playerId: r.player_id, playerName: r.player_name, teamSide: r.team_side }));
  }

  private getLineups(matchId: number): { home: Lineup; away: Lineup } {
    const lineupRows = this.database.prepare("SELECT * FROM lineups WHERE match_id = ?").all(matchId) as any[];
    const hl = lineupRows.find((r: any) => r.side === "home");
    const al = lineupRows.find((r: any) => r.side === "away");
    return {
      home: hl ? this.buildLineup(hl.id) : { formation: "未知", starting: [], substitutes: [] },
      away: al ? this.buildLineup(al.id) : { formation: "未知", starting: [], substitutes: [] },
    };
  }

  private buildLineup(lineupId: number): Lineup {
    const row = this.database.prepare("SELECT formation FROM lineups WHERE id = ?").get(lineupId) as any;
    const players = this.database.prepare("SELECT * FROM lineup_players WHERE lineup_id = ? ORDER BY id").all(lineupId) as any[];
    const map = (p: any): LineupPlayer => ({ playerId: p.player_id, number: p.number, name: p.name, position: p.position });
    return {
      formation: row?.formation ?? "未知",
      starting: players.filter((p: any) => p.is_starter === 1).map(map),
      substitutes: players.filter((p: any) => p.is_starter === 0).map(map),
    };
  }

  private getRatings(matchId: number): { home: PlayerRating[]; away: PlayerRating[] } {
    const rows = this.database.prepare("SELECT * FROM player_ratings WHERE match_id = ? ORDER BY rating DESC").all(matchId) as any[];
    return {
      home: rows.filter((r: any) => r.team_side === "home").map(mapRating),
      away: rows.filter((r: any) => r.team_side === "away").map(mapRating),
    };
  }

  @Destroy() async close() { this.database?.close(); }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false; }
      else current += ch;
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
    id: row.id, date: row.date, kickoffTime: row.kickoff_time, stage: row.stage,
    group: row.group_name, venue: row.venue,
    homeTeam: { id: row.home_team_id, name: row.home_name, nameEn: row.home_name_en, flagUrl: row.flag_url },
    awayTeam: { id: row.away_team_id, name: row.away_name, nameEn: row.away_name_en, flagUrl: row.flag_url },
    homeScore: row.home_score, awayScore: row.away_score,
    homePenalty: row.home_penalty, awayPenalty: row.away_penalty,
    status: row.status, summary: row.summary,
  };
}

function mapRating(r: any): PlayerRating {
  return { playerId: r.player_id, number: 0, name: "", rating: r.rating };
}

function groupByDate(matches: Match[]): MatchGroup[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) { const list = map.get(m.date) ?? []; list.push(m); map.set(m.date, list); }
  return Array.from(map.entries()).map(([date, list]) => ({ date, matches: list }));
}
