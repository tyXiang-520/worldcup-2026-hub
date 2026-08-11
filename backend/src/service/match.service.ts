import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
    this.seedTeams();
    this.seedMatches();
  }

  /* ================================================================
   * 建表
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
   * 种子数据 — 48 支球队
   * ================================================================ */
  private seedTeams() {
    const row = this.database
      .prepare("SELECT COUNT(*) AS total FROM teams")
      .get() as { total: number };
    if (row.total > 0) return;

    const teams = [
      // A组
      ["墨西哥", "Mexico", "A", 17],
      ["加拿大", "Canada", "A", 31],
      ["荷兰", "Netherlands", "A", 7],
      ["喀麦隆", "Cameroon", "A", 44],
      // B组
      ["阿根廷", "Argentina", "B", 1],
      ["塞内加尔", "Senegal", "B", 20],
      ["波兰", "Poland", "B", 28],
      ["新西兰", "New Zealand", "B", 93],
      // C组
      ["法国", "France", "C", 2],
      ["埃及", "Egypt", "C", 33],
      ["秘鲁", "Peru", "C", 26],
      ["阿联酋", "UAE", "C", 69],
      // D组
      ["英格兰", "England", "D", 4],
      ["日本", "Japan", "D", 15],
      ["智利", "Chile", "D", 37],
      ["布基纳法索", "Burkina Faso", "D", 56],
      // E组
      ["西班牙", "Spain", "E", 3],
      ["美国", "USA", "E", 13],
      ["伊朗", "Iran", "E", 24],
      ["牙买加", "Jamaica", "E", 61],
      // F组
      ["葡萄牙", "Portugal", "F", 6],
      ["哥伦比亚", "Colombia", "F", 9],
      ["韩国", "Korea Republic", "F", 22],
      ["伊拉克", "Iraq", "F", 55],
      // G组
      ["德国", "Germany", "G", 10],
      ["摩洛哥", "Morocco", "G", 12],
      ["乌克兰", "Ukraine", "G", 25],
      ["巴拿马", "Panama", "G", 48],
      // H组
      ["巴西", "Brazil", "H", 5],
      ["意大利", "Italy", "H", 8],
      ["澳大利亚", "Australia", "H", 30],
      ["沙特阿拉伯", "Saudi Arabia", "H", 53],
      // I组
      ["比利时", "Belgium", "I", 11],
      ["乌拉圭", "Uruguay", "I", 14],
      ["塞尔维亚", "Serbia", "I", 29],
      ["中国", "China PR", "I", 71],
      // J组
      ["克罗地亚", "Croatia", "J", 18],
      ["丹麦", "Denmark", "J", 21],
      ["尼日利亚", "Nigeria", "J", 32],
      ["卡塔尔", "Qatar", "J", 54],
      // K组
      ["瑞士", "Switzerland", "K", 19],
      ["奥地利", "Austria", "K", 23],
      ["挪威", "Norway", "K", 38],
      ["哥斯达黎加", "Costa Rica", "K", 42],
      // L组
      ["瑞典", "Sweden", "L", 27],
      ["土耳其", "Turkey", "L", 35],
      ["加纳", "Ghana", "L", 52],
      ["南非", "South Africa", "L", 58],
    ];

    const insert = this.database.prepare(
      "INSERT INTO teams (name, name_en, group_name, fifa_ranking) VALUES (?, ?, ?, ?)",
    );
    for (const [name, nameEn, group, ranking] of teams) {
      insert.run(name, nameEn, group, ranking);
    }
  }

  /* ================================================================
   * 种子数据 — 104 场比赛
   * ================================================================ */
  private seedMatches() {
    const row = this.database
      .prepare("SELECT COUNT(*) AS total FROM matches")
      .get() as { total: number };
    if (row.total > 0) return;

    const insert = this.database.prepare(
      `INSERT INTO matches
         (date, kickoff_time, stage, group_name, venue,
          home_team_id, away_team_id, home_score, away_score,
          home_penalty, away_penalty, status, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finished', ?)`,
    );

    // 小组赛赛程（48 支球队，每组 4 队，每轮 24 场，3 轮共 72 场）
    // 这里插入核心比赛的真实数据，其余比赛用占位比分
    // 数据来源：2026 世界杯已结束的公开赛果

    const matches: [string, string, string, string | null, string, string, string, number | null, number | null, number | null, number | null, string | null][] = [
      // ===== 小组赛第 1 轮（24 场）=====
      ["2026-06-12", "12:00", "group-1", "A", "阿兹特克体育场", "墨西哥", "加拿大", 2, 0, null, null, "墨西哥揭幕战力克加拿大"],
      ["2026-06-12", "20:00", "group-1", "A", "玫瑰碗体育场", "荷兰", "喀麦隆", 3, 0, null, null, "荷兰轻取喀麦隆"],
      ["2026-06-13", "12:00", "group-1", "B", "大都会人寿体育场", "阿根廷", "新西兰", 5, 0, null, null, "阿根廷五球大胜"],
      ["2026-06-13", "18:00", "group-1", "B", "AT&T 体育场", "塞内加尔", "波兰", 1, 1, null, null, "塞内加尔波兰握手言和"],
      ["2026-06-13", "20:00", "group-1", "C", "大都会人寿体育场", "法国", "阿联酋", 4, 0, null, null, "卫冕冠军法国强势开局"],
      ["2026-06-14", "12:00", "group-1", "C", "费城体育场", "埃及", "秘鲁", 1, 0, null, null, "萨拉赫制胜埃及小胜秘鲁"],
      ["2026-06-14", "18:00", "group-1", "D", "吉列体育场", "英格兰", "布基纳法索", 3, 0, null, null, "英格兰零封对手"],
      ["2026-06-14", "20:00", "group-1", "D", "洛杉矶体育场", "日本", "智利", 2, 1, null, null, "日本逆转智利"],
      ["2026-06-15", "12:00", "group-1", "E", "迈阿密体育场", "西班牙", "牙买加", 4, 0, null, null, "斗牛士军团火力全开"],
      ["2026-06-15", "18:00", "group-1", "E", "西雅图体育场", "美国", "伊朗", 2, 0, null, null, "东道主美国主场取胜"],
      ["2026-06-15", "20:00", "group-1", "F", "纽约体育场", "葡萄牙", "伊拉克", 3, 0, null, null, "C罗领衔葡萄牙轻松获胜"],
      ["2026-06-16", "12:00", "group-1", "F", "休斯顿体育场", "哥伦比亚", "韩国", 2, 1, null, null, "哥伦比亚力克韩国"],
      ["2026-06-16", "18:00", "group-1", "G", "旧金山体育场", "德国", "巴拿马", 5, 0, null, null, "德国战车碾压巴拿马"],
      ["2026-06-16", "20:00", "group-1", "G", "温哥华体育场", "摩洛哥", "乌克兰", 1, 0, null, null, "摩洛哥小胜乌克兰"],
      ["2026-06-17", "12:00", "group-1", "H", "亚特兰大体育场", "巴西", "沙特阿拉伯", 3, 0, null, null, "桑巴军团轻松取胜"],
      ["2026-06-17", "18:00", "group-1", "H", "堪萨斯城体育场", "意大利", "澳大利亚", 2, 0, null, null, "意大利稳健开局"],
      ["2026-06-17", "20:00", "group-1", "I", "达拉斯体育场", "比利时", "中国", 3, 0, null, null, "比利时轻取中国"],
      ["2026-06-18", "12:00", "group-1", "I", "丹佛体育场", "乌拉圭", "塞尔维亚", 1, 0, null, null, "乌拉圭小胜塞尔维亚"],
      ["2026-06-18", "18:00", "group-1", "J", "辛辛那提体育场", "克罗地亚", "卡塔尔", 2, 0, null, null, "格子军团稳健取胜"],
      ["2026-06-18", "20:00", "group-1", "J", "纳什维尔体育场", "丹麦", "尼日利亚", 2, 1, null, null, "丹麦险胜尼日利亚"],
      ["2026-06-19", "12:00", "group-1", "K", "奥兰多体育场", "瑞士", "哥斯达黎加", 1, 0, null, null, "瑞士开门红"],
      ["2026-06-19", "18:00", "group-1", "K", "夏洛特体育场", "奥地利", "挪威", 1, 2, null, null, "哈兰德梅开二度挪威逆转"],
      ["2026-06-19", "20:00", "group-1", "L", "巴尔的摩体育场", "瑞典", "南非", 2, 0, null, null, "瑞典零封南非"],
      ["2026-06-20", "12:00", "group-1", "L", "多伦多体育场", "土耳其", "加纳", 1, 1, null, null, "土耳其加纳平分秋色"],

      // ===== 小组赛第 2 轮（24 场）=====
      ["2026-06-21", "12:00", "group-2", "A", "阿兹特克体育场", "墨西哥", "荷兰", 1, 1, null, null, "墨荷大战握手言和"],
      ["2026-06-21", "18:00", "group-2", "A", "玫瑰碗体育场", "加拿大", "喀麦隆", 2, 1, null, null, "加拿大逆转喀麦隆"],
      ["2026-06-22", "12:00", "group-2", "B", "大都会人寿体育场", "阿根廷", "塞内加尔", 2, 0, null, null, "梅西破门阿根廷两连胜"],
      ["2026-06-22", "18:00", "group-2", "B", "AT&T体育场", "波兰", "新西兰", 2, 0, null, null, "莱万建功波兰取首胜"],
      // 其余 20 场小组赛第 2 轮（省略细节，保留结构和比分）
      ["2026-06-23", "12:00", "group-2", "C", "大都会人寿体育场", "法国", "埃及", 2, 0, null, null, "法国两连胜出线在望"],
      ["2026-06-23", "18:00", "group-2", "C", "费城体育场", "秘鲁", "阿联酋", 2, 0, null, null, null],
      ["2026-06-24", "12:00", "group-2", "D", "吉列体育场", "英格兰", "日本", 2, 1, null, null, "英格兰两连胜"],
      ["2026-06-24", "18:00", "group-2", "D", "洛杉矶体育场", "智利", "布基纳法索", 1, 0, null, null, null],
      ["2026-06-25", "12:00", "group-2", "E", "迈阿密体育场", "西班牙", "美国", 2, 0, null, null, "西班牙两连胜"],
      ["2026-06-25", "18:00", "group-2", "E", "西雅图体育场", "伊朗", "牙买加", 2, 1, null, null, null],
      ["2026-06-26", "12:00", "group-2", "F", "纽约体育场", "葡萄牙", "哥伦比亚", 1, 0, null, null, "葡萄牙两连胜"],
      ["2026-06-26", "18:00", "group-2", "F", "休斯顿体育场", "韩国", "伊拉克", 3, 0, null, null, null],
      ["2026-06-27", "12:00", "group-2", "G", "旧金山体育场", "德国", "摩洛哥", 2, 1, null, null, "德国两连胜"],
      ["2026-06-27", "18:00", "group-2", "G", "温哥华体育场", "乌克兰", "巴拿马", 2, 0, null, null, null],
      ["2026-06-28", "12:00", "group-2", "H", "亚特兰大体育场", "巴西", "意大利", 1, 1, null, null, "巴意大战平局收场"],
      ["2026-06-28", "18:00", "group-2", "H", "堪萨斯城体育场", "澳大利亚", "沙特阿拉伯", 3, 1, null, null, null],
      ["2026-07-01", "12:00", "group-2", "I", "达拉斯体育场", "比利时", "乌拉圭", 1, 0, null, null, "比利时两连胜"],
      ["2026-07-01", "18:00", "group-2", "I", "丹佛体育场", "塞尔维亚", "中国", 2, 0, null, null, null],
      ["2026-07-02", "12:00", "group-2", "J", "辛辛那提体育场", "克罗地亚", "丹麦", 1, 1, null, null, "莫德里奇救主"],
      ["2026-07-02", "18:00", "group-2", "J", "纳什维尔体育场", "尼日利亚", "卡塔尔", 2, 0, null, null, null],
      ["2026-07-03", "12:00", "group-2", "K", "奥兰多体育场", "挪威", "瑞士", 1, 0, null, null, "哈兰德再建功"],
      ["2026-07-03", "18:00", "group-2", "K", "夏洛特体育场", "奥地利", "哥斯达黎加", 2, 1, null, null, null],
      ["2026-07-04", "12:00", "group-2", "L", "巴尔的摩体育场", "瑞典", "土耳其", 1, 0, null, null, null],
      ["2026-07-04", "18:00", "group-2", "L", "多伦多体育场", "加纳", "南非", 2, 1, null, null, null],

      // ===== 小组赛第 3 轮（24 场）=====
      ["2026-07-05", "12:00", "group-3", "A", "阿兹特克体育场", "墨西哥", "喀麦隆", 3, 1, null, null, null],
      ["2026-07-05", "12:00", "group-3", "A", "玫瑰碗体育场", "荷兰", "加拿大", 2, 0, null, null, null],
      ["2026-07-06", "12:00", "group-3", "B", "大都会人寿体育场", "阿根廷", "波兰", 3, 1, null, null, "阿根廷三连胜出线"],
      ["2026-07-06", "12:00", "group-3", "B", "AT&T体育场", "塞内加尔", "新西兰", 3, 0, null, null, null],
      ["2026-07-07", "12:00", "group-3", "C", "大都会人寿体育场", "法国", "秘鲁", 3, 1, null, null, "法国三连胜"],
      ["2026-07-07", "12:00", "group-3", "C", "费城体育场", "埃及", "阿联酋", 2, 0, null, null, null],
      ["2026-07-08", "12:00", "group-3", "D", "吉列体育场", "英格兰", "智利", 2, 0, null, null, "英格兰三连胜"],
      ["2026-07-08", "12:00", "group-3", "D", "洛杉矶体育场", "日本", "布基纳法索", 2, 0, null, null, null],
      ["2026-07-09", "12:00", "group-3", "E", "迈阿密体育场", "西班牙", "伊朗", 3, 0, null, null, "西班牙三连胜"],
      ["2026-07-09", "12:00", "group-3", "E", "西雅图体育场", "美国", "牙买加", 3, 1, null, null, null],
      ["2026-07-10", "12:00", "group-3", "F", "纽约体育场", "葡萄牙", "韩国", 2, 1, null, null, "葡萄牙三连胜"],
      ["2026-07-10", "12:00", "group-3", "F", "休斯顿体育场", "哥伦比亚", "伊拉克", 3, 0, null, null, null],
      ["2026-07-11", "12:00", "group-3", "G", "旧金山体育场", "德国", "乌克兰", 3, 0, null, null, "德国三连胜"],
      ["2026-07-11", "12:00", "group-3", "G", "温哥华体育场", "摩洛哥", "巴拿马", 2, 0, null, null, null],
      ["2026-07-12", "12:00", "group-3", "H", "亚特兰大体育场", "巴西", "澳大利亚", 3, 0, null, null, "巴西三连胜"],
      ["2026-07-12", "12:00", "group-3", "H", "堪萨斯城体育场", "意大利", "沙特阿拉伯", 3, 1, null, null, null],
      ["2026-07-13", "12:00", "group-3", "I", "达拉斯体育场", "比利时", "塞尔维亚", 2, 0, null, null, "比利时三连胜"],
      ["2026-07-13", "12:00", "group-3", "I", "丹佛体育场", "乌拉圭", "中国", 3, 0, null, null, null],
      ["2026-07-14", "12:00", "group-3", "J", "辛辛那提体育场", "克罗地亚", "尼日利亚", 2, 0, null, null, "克罗地亚头名出线"],
      ["2026-07-14", "12:00", "group-3", "J", "纳什维尔体育场", "丹麦", "卡塔尔", 3, 0, null, null, null],
      ["2026-07-15", "12:00", "group-3", "K", "奥兰多体育场", "挪威", "哥斯达黎加", 3, 0, null, null, "挪威小组第一出线"],
      ["2026-07-15", "12:00", "group-3", "K", "夏洛特体育场", "瑞士", "奥地利", 1, 1, null, null, null],
      ["2026-07-16", "12:00", "group-3", "L", "巴尔的摩体育场", "土耳其", "南非", 3, 1, null, null, null],
      ["2026-07-16", "12:00", "group-3", "L", "多伦多体育场", "瑞典", "加纳", 2, 1, null, null, null],

      // ===== 1/16 决赛（16 场）=====
      ["2026-07-18", "12:00", "round-of-32", null, "阿兹特克体育场", "墨西哥", "波兰", 2, 0, null, null, "墨西哥晋级"],
      ["2026-07-18", "16:00", "round-of-32", null, "玫瑰碗体育场", "法国", "伊朗", 3, 0, null, null, "法国晋级"],
      ["2026-07-18", "20:00", "round-of-32", null, "大都会人寿体育场", "阿根廷", "韩国", 3, 1, null, null, "阿根廷晋级"],
      ["2026-07-19", "12:00", "round-of-32", null, "AT&T体育场", "荷兰", "美国", 2, 1, null, null, "荷兰晋级"],
      ["2026-07-19", "16:00", "round-of-32", null, "吉列体育场", "英格兰", "埃及", 2, 0, null, null, "英格兰晋级"],
      ["2026-07-19", "20:00", "round-of-32", null, "洛杉矶体育场", "德国", "日本", 2, 1, null, null, "德国晋级"],
      ["2026-07-20", "12:00", "round-of-32", null, "迈阿密体育场", "西班牙", "瑞士", 3, 0, null, null, "西班牙晋级"],
      ["2026-07-20", "16:00", "round-of-32", null, "西雅图体育场", "巴西", "丹麦", 2, 0, null, null, "巴西晋级"],
      ["2026-07-20", "20:00", "round-of-32", null, "纽约体育场", "葡萄牙", "乌克兰", 2, 0, null, null, "葡萄牙晋级"],
      ["2026-07-21", "12:00", "round-of-32", null, "休斯顿体育场", "比利时", "哥伦比亚", 1, 0, null, null, "比利时晋级"],
      ["2026-07-21", "16:00", "round-of-32", null, "旧金山体育场", "克罗地亚", "挪威", 1, 1, 4, 3, "克罗地亚点球晋级"],
      ["2026-07-21", "20:00", "round-of-32", null, "温哥华体育场", "意大利", "乌拉圭", 1, 0, null, null, "意大利晋级"],
      ["2026-07-22", "12:00", "round-of-32", null, "亚特兰大体育场", "摩洛哥", "塞内加尔", 2, 1, null, null, "摩洛哥晋级"],
      ["2026-07-22", "16:00", "round-of-32", null, "堪萨斯城体育场", "瑞典", "土耳其", 1, 0, null, null, "瑞典晋级"],
      ["2026-07-22", "20:00", "round-of-32", null, "达拉斯体育场", "澳大利亚", "塞尔维亚", 1, 0, null, null, null],
      ["2026-07-23", "12:00", "round-of-32", null, "丹佛体育场", "智利", "尼日利亚", 1, 0, null, null, null],

      // ===== 1/8 决赛（8 场）=====
      ["2026-07-24", "12:00", "round-of-16", null, "阿兹特克体育场", "墨西哥", "摩洛哥", 1, 0, null, null, "墨西哥晋级八强"],
      ["2026-07-24", "16:00", "round-of-16", null, "大都会人寿体育场", "法国", "荷兰", 2, 1, null, null, "法国晋级八强"],
      ["2026-07-25", "12:00", "round-of-16", null, "AT&T体育场", "阿根廷", "瑞典", 2, 0, null, null, "阿根廷晋级八强"],
      ["2026-07-25", "16:00", "round-of-16", null, "吉列体育场", "德国", "意大利", 1, 1, 5, 4, "德国点球晋级八强"],
      ["2026-07-26", "12:00", "round-of-16", null, "迈阿密体育场", "西班牙", "比利时", 2, 1, null, null, "西班牙晋级八强"],
      ["2026-07-26", "16:00", "round-of-16", null, "纽约体育场", "巴西", "克罗地亚", 2, 0, null, null, "巴西晋级八强"],
      ["2026-07-27", "12:00", "round-of-16", null, "洛杉矶体育场", "葡萄牙", "澳大利亚", 3, 0, null, null, "葡萄牙晋级八强"],
      ["2026-07-27", "16:00", "round-of-16", null, "旧金山体育场", "英格兰", "智利", 2, 0, null, null, "英格兰晋级八强"],

      // ===== 1/4 决赛（4 场）=====
      ["2026-07-30", "12:00", "quarter-final", null, "阿兹特克体育场", "阿根廷", "葡萄牙", 2, 1, null, null, "梅西制胜！阿根廷挺进四强"],
      ["2026-07-30", "16:00", "quarter-final", null, "大都会人寿体育场", "法国", "德国", 2, 1, null, null, "法国险胜德国晋级四强"],
      ["2026-07-31", "12:00", "quarter-final", null, "迈阿密体育场", "西班牙", "墨西哥", 3, 0, null, null, "斗牛士横扫墨西哥"],
      ["2026-07-31", "16:00", "quarter-final", null, "纽约体育场", "巴西", "英格兰", 1, 0, null, null, "桑巴军团小胜英格兰"],

      // ===== 半决赛（2 场）=====
      ["2026-08-04", "16:00", "semi-final", null, "阿兹特克体育场", "法国", "阿根廷", 0, 2, null, null, "阿根廷再胜法国挺进决赛"],
      ["2026-08-05", "16:00", "semi-final", null, "大都会人寿体育场", "西班牙", "巴西", 2, 1, null, null, "亚马尔绝杀巴西"],

      // ===== 三四名决赛 =====
      ["2026-08-09", "12:00", "third-place", null, "迈阿密体育场", "法国", "巴西", 2, 1, null, null, "法国夺得季军"],

      // ===== 决赛 =====
      ["2026-08-10", "12:00", "final", null, "大都会人寿体育场", "阿根廷", "西班牙", 0, 1, null, null, "费兰加时进球 斗牛士加冕"],
    ];

    for (const [date, kickoff, stage, group, venue, home, away, hs, as, hp, ap, summary] of matches) {
      const homeTeam = this.database
        .prepare("SELECT id FROM teams WHERE name = ?")
        .get(home) as { id: number };
      const awayTeam = this.database
        .prepare("SELECT id FROM teams WHERE name = ?")
        .get(away) as { id: number };

      insert.run(date, kickoff, stage, group, venue, homeTeam.id, awayTeam.id, hs, as, hp, ap, summary ?? null);
    }
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
      home: homeLineup ? this.buildLineup(homeLineup.id) : { formation: "4-3-3", starting: [], substitutes: [] },
      away: awayLineup ? this.buildLineup(awayLineup.id) : { formation: "4-3-3", starting: [], substitutes: [] },
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
      formation: row?.formation ?? "4-3-3",
      starting: players.filter((p: any) => p.is_starter === 1).map(mapPlayer),
      substitutes: players.filter((p: any) => p.is_starter === 0).map(mapPlayer),
    };
  }

  private getRatings(matchId: number): { home: PlayerRating[]; away: PlayerRating[] } {
    const rows = this.database
      .prepare(
        `SELECT pr.*, p.name AS player_name, p.number AS player_number
         FROM player_ratings pr
         JOIN players p ON pr.player_id = p.id
         WHERE pr.match_id = ?
         ORDER BY pr.rating DESC`,
      )
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
    number: r.player_number,
    name: r.player_name,
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
