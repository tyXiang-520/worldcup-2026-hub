const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "..", "小红书爬取数据");
const OUT_DIR = path.resolve(__dirname, "..", "scripts");
const cal = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "xhs_worldcup_calendar_info.json.crdownload")));
const std = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "xhs_worldcup_standings.json.crdownload")));
const ps = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "xhs_rank_player_stats.json.crdownload")));

// ============================================================
// Teams
// ============================================================
const teamMap = new Map();
for (const g of std.data.standing_list) {
  for (const t of g.teams) {
    teamMap.set(t.team_id, { name: t.team_name, logo: t.team_logo || "", group: g.group_label.replace("组", "") });
  }
}
for (const day of cal.data.calendar_list) {
  for (const m of day.matches) {
    for (const side of ["home", "away"]) {
      const tid = m[`${side}_team_id`];
      if (!teamMap.has(tid)) teamMap.set(tid, { name: m[`${side}_team_name`], logo: m[`${side}_team_logo`] || "", group: (m.group_label || "").replace("组", "") });
    }
  }
}

const groupOrder = std.data.standing_list.map(s => s.group_label.replace("组", ""));
const sorted = [...teamMap.entries()].sort((a, b) => {
  const ga = groupOrder.indexOf(a[1].group), gb = groupOrder.indexOf(b[1].group);
  return ga !== gb ? ga - gb : a[1].name.localeCompare(b[1].name, "zh");
});

let teamCsv = "id,name,nameEn,group,fifa_ranking,flag_url\n";
let tid = 0;
const tidMap = {};
for (const [xhsId, t] of sorted) { tid++; tidMap[xhsId] = tid; teamCsv += `${tid},"${t.name}",,"${t.group}",,"${t.logo}"\n`; }
fs.writeFileSync(path.join(OUT_DIR, "teams_xhs.csv"), teamCsv);
console.log("teams:", tid);

// ============================================================
// Matches — 修正 stage 映射
// ============================================================
function mapStage(stage) {
  const m = {
    "小组赛": "group-1", // will be refined below by round_num
    "1/16决赛": "round-of-32",
    "1/8决赛": "round-of-16",
    "1/4决赛": "quarter-final",
    "半决赛": "semi-final",
    "季军赛": "third-place",
    "决赛": "final",
  };
  return m[stage] || null;
}

function groupStage(roundNum) {
  if (roundNum >= 1 && roundNum <= 7) return "group-1";
  if (roundNum >= 8 && roundNum <= 14) return "group-2";
  return "group-3";
}

const allMatches = [];
for (const day of cal.data.calendar_list) {
  const parts = day.date_label.replace("月", " ").replace("日", "").split(" ");
  const date = `2026-${String(Number(parts[0])).padStart(2, "0")}-${String(Number(parts[1])).padStart(2, "0")}`;
  for (const m of day.matches) {
    let stage = mapStage(m.round_stage);
    if (m.round_stage === "小组赛") stage = groupStage(m.round_num);
    allMatches.push({ ...m, _date: date, _stage: stage });
  }
}
allMatches.sort((a, b) => a._date !== b._date ? a._date.localeCompare(b._date) : (a.match_time || 0) - (b.match_time || 0));

let matchCsv = "id,date,kickoff_time,stage,group,venue,home_team_id,away_team_id,home_score,away_score,home_penalty,away_penalty,summary\n";
let mid = 0;
for (const m of allMatches) {
  mid++;
  const hid = tidMap[m.home_team_id], aid = tidMap[m.away_team_id];
  if (!hid || !aid) continue;
  const group = (m.group_label || "").replace("组", "");
  const stage = m._stage;
  matchCsv += `${mid},${m._date},"${m.match_time_label || ""}",${stage},${group},"",${hid},${aid},${m.home_score ?? "null"},${m.away_score ?? "null"},null,null,""\n`;
}
fs.writeFileSync(path.join(OUT_DIR, "matches_xhs.csv"), matchCsv);
console.log("matches:", mid);

// ============================================================
// Player stats (射手榜/助攻榜) from XHS rank data
// ============================================================
const statList = ps.data.info_list || [];
let statsCsv = "player_id,team_id,name,goals,assists\n";
for (const s of statList) {
  statsCsv += `${s.player_id},${s.team_id},"${s.player_name}",${Number(s.value) || 0},0\n`;
}
fs.writeFileSync(path.join(OUT_DIR, "scorers_xhs.csv"), statsCsv);
console.log("scorers:", statList.length);

console.log("\nDone! ->", OUT_DIR);
