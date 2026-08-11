// 从小红书阵容数据生成 lineups + lineup_players CSV
// 注意：小红书 player_id 和 openfootball player_id 不同，这里直接用小红书原始数据
const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "..", "小红书爬取数据");
const OUT_DIR = path.resolve(__dirname, "..", "scripts");

// 读取阵容数据
const lineupRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "xhs_match_lineup.json.crdownload")));
const matchBase = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "xhs_match_base.json.crdownload")));

const xhsMatchId = matchBase.data.match_base.match_id;
console.log("XHS match_id:", xhsMatchId);

// 找到对应的 our match_id（从小红书赛程数据中）
const cal = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "xhs_worldcup_calendar_info.json.crdownload")));
let ourMatchId = 0;
let homeTeamId = 0, awayTeamId = 0;
for (const day of cal.data.calendar_list) {
  for (const m of day.matches) {
    if (m.match_id === xhsMatchId) {
      // 找到对应比赛。从 teams_xhs.csv 中查我们的 team_id
      // 但这里没法直接查，只能根据比赛日期排序估算
      // 简化：直接用 XHS 的比赛在列表中的位置
      ourMatchId = Array.from(cal.data.calendar_list).flatMap(d => d.matches).findIndex(m => m.match_id === xhsMatchId) + 1;
      break;
    }
  }
  if (ourMatchId > 0) break;
}
console.log("Our match_id:", ourMatchId);

const lu = lineupRaw.data.match_lineup;
const home = lu.home_player_info;
const away = lu.away_player_info;

// 生成 lineups.csv
let lineupsCsv = "id,match_id,team_id,side,formation\n";
let lpCsv = "id,lineup_id,player_id,number,name,position,is_starter\n";
let ratingsCsv = "id,match_id,player_id,number,name,team_side,rating\n";

let lineupId = 1;
let lpId = 1;
let ratingId = 1;

function processTeam(info, side) {
  const teamId = info.team_id;
  const formation = info.formation || "未知";

  // lineups row
  lineupsCsv += `${lineupId},${ourMatchId},${teamId},${side},${formation}\n`;
  const currentLineupId = lineupId;
  lineupId++;

  // starters
  for (const p of info.first_player_list || []) {
    const playerId = p.player_id || 0;
    const number = p.shirt_number || 0;
    const name = p.name || "";
    const pos = p.position || "";
    lpCsv += `${lpId},${currentLineupId},${playerId},${number},"${name}","${pos}",1\n`;
    lpId++;
    // rating
    const rating = p.rating ? parseFloat(p.rating) : 0;
    if (rating > 0) {
      ratingsCsv += `${ratingId},${ourMatchId},${playerId},${number},"${name}",${side},${rating}\n`;
      ratingId++;
    }
  }

  // bench
  for (const p of info.backup_player_list || []) {
    const playerId = p.player_id || 0;
    const number = p.shirt_number || 0;
    const name = p.name || "";
    const pos = p.position || "";
    lpCsv += `${lpId},${currentLineupId},${playerId},${number},"${name}","${pos}",0\n`;
    lpId++;
  }
}

processTeam(home, "home");
processTeam(away, "away");

fs.writeFileSync(path.join(OUT_DIR, "lineups_xhs.csv"), lineupsCsv);
fs.writeFileSync(path.join(OUT_DIR, "lineup_players_xhs.csv"), lpCsv);
fs.writeFileSync(path.join(OUT_DIR, "player_ratings_xhs.csv"), ratingsCsv);

console.log(`lineups: ${lineupId - 1}`);
console.log(`lineup_players: ${lpId - 1}`);
console.log(`ratings: ${ratingId - 1}`);
console.log("\nDone! Files written to", OUT_DIR);
