// 从购买的 CSV 数据批量更新球员信息、赛事统计、比赛事件
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const db = new DatabaseSync("backend/data/course-demo.sqlite");
const DATA = "买的数据";

function csvRows(file) {
  const raw = fs.readFileSync(path.join(DATA, file), "utf8").trim().split("\n");
  const header = raw[0].split(",");
  return raw.slice(1).map((line) => {
    const parts = []; let cur = "", inQ = false;
    for (const ch of line) { if (ch === '"') inQ = !inQ; else if (ch === "," && !inQ) { parts.push(cur); cur = ""; } else cur += ch; }
    parts.push(cur);
    const obj = {};
    header.forEach((h, i) => (obj[h.trim()] = parts[i] || ""));
    return obj;
  });
}

// ============================================================
// 1. 团队映射 (purchased team_id → our team_id)
// ============================================================
const teamIdMap = {
  1:3, 2:4, 3:1, 4:2, 5:6, 6:5, 7:7, 8:8,
  9:9, 10:11, 11:10, 12:12, 13:15, 14:14, 15:13, 16:16,
  17:17, 18:20, 19:19, 20:18, 21:21, 22:22, 23:23, 24:24,
  25:26, 26:25, 27:28, 28:27, 29:32, 30:29, 31:30, 32:31,
  33:33, 34:35, 35:36, 36:34, 37:38, 38:37, 39:39, 40:40,
  41:43, 42:41, 43:44, 44:42, 45:48, 46:47, 47:46, 48:45,
};

// ============================================================
// 2. 创建临时参考表：purchased_player_id → our_player_id
// ============================================================
db.exec("DROP TABLE IF EXISTS _player_map");
db.exec("CREATE TABLE _player_map (purchased_id INTEGER PRIMARY KEY, our_id INTEGER)");

// 读取 squad 数据并插入我们的 players 表（如果不存在），同时建立映射
const squads = csvRows("squads_and_players.csv");
const posMap = { GK: "守门员", DEF: "后卫", MID: "中场", FW: "前锋", DF: "后卫", MF: "中场" };

let inserted = 0, updated = 0;
for (const p of squads) {
  const tid = teamIdMap[Number(p.team_id)];
  if (!tid) continue;
  const purchasedId = Number(p.player_id);
  const name = p.player_name;
  const pos = posMap[p.position] || p.position;
  const club = p.club_team || "";
  const marketValue = p.market_value_eur ? Math.round(Number(p.market_value_eur) / 10000) + "万欧" : "";
  const dob = p.date_of_birth || "";
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null;
  const height = p.height_cm ? Number(p.height_cm) : null;
  const goals = Number(p.goals) || 0;

  // 查找匹配的 existing player （按 team + name）
  const existing = db.prepare("SELECT id FROM players WHERE team_id=? AND (name=? OR name_en=?)").get(tid, name, name);
  let ourId;
  if (existing) {
    ourId = existing.id;
    // 更新详情
    db.prepare("UPDATE players SET age=?, height=?, market_value=?, club=?, name_en=?, position=? WHERE id=?").run(age, height, marketValue, club, name, pos, ourId);
    updated++;
  } else {
    // 插入新球员
    const result = db.prepare("INSERT INTO players (team_id, name, name_en, number, position, club, age, height, market_value) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)").run(tid, name, name, pos, club, age, height, marketValue);
    ourId = Number(result.lastInsertRowid);
    inserted++;
  }
  db.prepare("INSERT OR REPLACE INTO _player_map VALUES (?, ?)").run(purchasedId, ourId);
}
console.log(`Players: ${inserted} inserted, ${updated} updated`);

// ============================================================
// 3. 从 wcplayerstatistics.csv 更新 player_tournament_stats
// ============================================================
const stats = csvRows("wcplayerstatistics.csv");
let statsUpdated = 0;
const playerIdMap = new Map();
// 先建立 PlayerID → our_id 的映射（通过 squad 中的 purchased_id 关联）
for (const p of squads) {
  playerIdMap.set(p.player_id, db.prepare("SELECT our_id FROM _player_map WHERE purchased_id=?").get(Number(p.player_id))?.our_id);
}
// 也通过 name+team 匹配
for (const s of stats) {
  const playerId = s.PlayerID?.trim();
  const name = s.Player?.trim();
  const squadName = s.Squad?.trim();
  let ourId = playerIdMap.get(playerId);

  if (!ourId) {
    // 通过名字+球队名匹配
    // squad 格式如 "us United States" — 取国家名部分
    const country = squadName.split(" ").slice(1).join(" ") || squadName;
    // 模糊找
    const row = db.prepare("SELECT id FROM players WHERE name_en=? OR name=?").get(name, name);
    if (row) ourId = row.id;
  }

  if (!ourId) continue;

  const goals = Math.round(Number(s.Gls) || 0);
  const assists = Math.round(Number(s.Ast) || 0);
  const apps = Math.round(Number(s.MP) || 0);
  const mins = Math.round(Number(s.Min) || 0);
  const yellows = Math.round(Number(s.CrdY) || 0);
  const reds = Math.round(Number(s.CrdR) || 0);

  const ex = db.prepare("SELECT player_id FROM player_tournament_stats WHERE player_id=?").get(ourId);
  if (ex) {
    db.prepare("UPDATE player_tournament_stats SET appearances=?, goals=?, assists=?, yellow_cards=?, red_cards=?, minutes_played=? WHERE player_id=?").run(apps, goals, assists, yellows, reds, mins, ourId);
  } else {
    db.prepare("INSERT INTO player_tournament_stats VALUES (?, ?, ?, ?, ?, ?, ?)").run(ourId, apps, goals, assists, yellows, reds, mins);
  }
  statsUpdated++;
}
console.log(`Player stats updated: ${statsUpdated}`);

// ============================================================
// 4. 从 match_events.csv 导入黄牌/红牌/VAR 事件
// ============================================================
const events = csvRows("match_events.csv");
// 购买数据的 match_id → 我们的 match_id（两者都是 1-104 序号的，match_id 直接对上）
// 实际上购买数据的 match_id 和我们的一样（小组赛第一轮 1-28）

let cardsImported = 0;
for (const e of events) {
  const matchId = Number(e.match_id);
  const minute = e.minute;
  const type = e.event_type;
  const purchasedPlayerId = Number(e.player_id);
  const teamId = Number(e.team_id);

  // 只导入非进球事件（我们已经有进球了）
  if (type === "Goal") continue;

  const ourType = type === "Yellow Card" ? "yellow_card" : type === "Red Card" ? "red_card" : type === "VAR Review" ? "var" : null;
  if (!ourType) continue;

  // 找我们的 player
  const mapRow = db.prepare("SELECT our_id FROM _player_map WHERE purchased_id=?").get(purchasedPlayerId);
  const ourPlayerId = mapRow ? mapRow.our_id : null;
  const playerRow = ourPlayerId ? db.prepare("SELECT name FROM players WHERE id=?").get(ourPlayerId) : null;
  const playerName = playerRow ? playerRow.name : "";

  // 判断主客
  const side = teamIdMap[teamId] === db.prepare("SELECT home_team_id FROM matches WHERE id=?").get(matchId)?.home_team_id ? "home" : "away";

  const desc = ourType === "yellow_card" ? `${playerName}领黄` : ourType === "red_card" ? `${playerName}染红` : "VAR审查";

  db.prepare("INSERT INTO match_events (match_id, minute, type, description, player_id, player_name, team_side) VALUES (?, ?, ?, ?, ?, ?, ?)").run(matchId, minute, ourType, desc, ourPlayerId, playerName || "未知", side);
  cardsImported++;
}
console.log(`Match events imported: ${cardsImported}`);

// ============================================================
// 5. 更新球队 FIFA 排名
// ============================================================
const teams = csvRows("teams.csv");
for (const t of teams) {
  const ourId = teamIdMap[Number(t.team_id)];
  if (!ourId) continue;
  const ranking = t.fifa_ranking_pre_tournament ? Number(t.fifa_ranking_pre_tournament) : null;
  if (ranking) db.prepare("UPDATE teams SET fifa_ranking=? WHERE id=?").run(ranking, ourId);
}
console.log("Team rankings updated");

db.exec("DROP TABLE IF EXISTS _player_map");
db.close();
console.log("\nDone!");
