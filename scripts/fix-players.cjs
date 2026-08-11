// 修复：通过 name + team 匹配购买数据的统计信息
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

// 购买数据中的 squad 字段 (en France, us United States) → 我们的团队名
const squadToTeam = {
  "Mexico": "墨西哥", "South Africa": "南非", "South Korea": "韩国", "Czechia": "捷克",
  "Canada": "加拿大", "Bosnia and Herzegovina": "波黑", "Qatar": "卡塔尔", "Switzerland": "瑞士",
  "Brazil": "巴西", "Morocco": "摩洛哥", "Haiti": "海地", "Scotland": "苏格兰",
  "USA": "美国", "United States": "美国", "Paraguay": "巴拉圭", "Australia": "澳大利亚", "Türkiye": "土耳其",
  "Germany": "德国", "Curaçao": "库拉索", "Côte d'Ivoire": "科特迪瓦", "Ecuador": "厄瓜多尔",
  "Netherlands": "荷兰", "Japan": "日本", "Sweden": "瑞典", "Tunisia": "突尼斯",
  "Belgium": "比利时", "Egypt": "埃及", "IR Iran": "伊朗", "New Zealand": "新西兰",
  "Spain": "西班牙", "Cabo Verde": "佛得角", "Saudi Arabia": "沙特阿拉伯", "Uruguay": "乌拉圭",
  "France": "法国", "Senegal": "塞内加尔", "Iraq": "伊拉克", "Norway": "挪威",
  "Argentina": "阿根廷", "Algeria": "阿尔及利亚", "Austria": "奥地利", "Jordan": "约旦",
  "Portugal": "葡萄牙", "Congo DR": "刚果（金）", "Uzbekistan": "乌兹别克斯坦", "Colombia": "哥伦比亚",
  "England": "英格兰", "Croatia": "克罗地亚", "Ghana": "加纳", "Panama": "巴拿马",
};

// 建立我们的 team name → id 映射
const ourTeams = db.prepare("SELECT id, name FROM teams").all();
const teamNameToId = {};
ourTeams.forEach(t => teamNameToId[t.name] = t.id);

const stats = csvRows("wcplayerstatistics.csv");
const squads = csvRows("squads_and_players.csv");

// 建立 purchased player_id → 详情映射（从 squad 数据）
const infoMap = new Map();
for (const p of squads) {
  infoMap.set(p.player_id, {
    teamId: Number(p.team_id),
    height: p.height_cm ? Number(p.height_cm) : null,
    age: p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 31557600000) : null,
    marketValue: p.market_value_eur ? Math.round(Number(p.market_value_eur) / 10000) + "万欧" : "",
    club: p.club_team || "",
    position: p.position,
  });
}

let detailUpdated = 0, statUpdated = 0;
for (const s of stats) {
  const name = s.Player?.trim();
  // squad 格式: "fr France" → "France"
  const squad = s.Squad?.trim();
  const country = squad.split(" ").slice(1).join(" ") || squad;
  const ourTeamName = squadToTeam[country];
  if (!ourTeamName) continue;
  const ourTeamId = teamNameToId[ourTeamName];
  if (!ourTeamId) continue;

  // 按 team + name 匹配我们的球员
  let ourPlayer = db.prepare("SELECT id FROM players WHERE team_id=? AND name=?").get(ourTeamId, name);
  // 模糊匹配：名字最后一部分（姓氏）
  if (!ourPlayer) {
    const lastName = name.split(" ").pop();
    ourPlayer = db.prepare("SELECT id FROM players WHERE team_id=? AND (name=? OR name LIKE ?)").get(ourTeamId, name, `%${lastName}`);
  }

  if (!ourPlayer) continue;
  const ourId = ourPlayer.id;

  // 更新详情
  db.prepare("UPDATE players SET name_en=?, age=?, height=?, market_value=?, club=? WHERE id=?").run(name, null, null, "", "", ourId);
  detailUpdated++;

  // 更新统计
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
    db.prepare("INSERT INTO player_tournament_stats VALUES (?,?,?,?,?,?,?)").run(ourId, apps, goals, assists, yellows, reds, mins);
  }
  statUpdated++;
}

console.log(`Details: ${detailUpdated}, Stats: ${statUpdated}`);
db.close();
