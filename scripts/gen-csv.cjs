// 从 worldcup.json 数据生成 teams/matches/match_events CSV
const fs = require("node:fs");
const path = require("node:path");

const WC_DIR = path.join(require("os").homedir(), "Desktop/worldcup.json/2026");
const OUT_DIR = path.resolve(__dirname);
const matches = require(path.join(WC_DIR, "worldcup.json")).matches;
const teams = require(path.join(WC_DIR, "worldcup.teams.json"));
const squads = require(path.join(WC_DIR, "worldcup.squads.json"));
const stadiums = require(path.join(WC_DIR, "worldcup.stadiums.json"));
const groups = require(path.join(WC_DIR, "worldcup.groups.json"));

// ============================================================
// 阶段映射 (openfootball data uses Matchday N for group stages)
// ============================================================
// Groups are 12 groups of 4 teams = 6 matches per group per round = 72 matches across 3 rounds
// Matchday 1-7 ≈ group-1, Matchday 8-14 ≈ group-2, Matchday 15-17+ ≈ group-3
function mapStage(match) {
  const round = match.round;
  if (round === "Round of 32") return "round-of-32";
  if (round === "Round of 16") return "round-of-16";
  if (round === "Quarter-final") return "quarter-final";
  if (round === "Semi-final") return "semi-final";
  if (round === "Match for third place") return "third-place";
  if (round === "Final") return "final";

  // Group matches: Matchday 1-7 → group-1, 8-14 → group-2, 15-17 → group-3
  const mdNum = parseInt(round.replace("Matchday ", ""));
  if (mdNum >= 1 && mdNum <= 7) return "group-1";
  if (mdNum >= 8 && mdNum <= 14) return "group-2";
  return "group-3";
}

function groupFromTeam(teamName) {
  const t = teams.find((t) => t.name === teamName);
  return t ? t.group : null;
}

// ============================================================
// 1. teams.csv
// ============================================================
let teamCsv = "id,name,nameEn,group,fifa_ranking,flag_url\n";
// 按 A-L 组排序
const groupOrder = ["A","B","C","D","E","F","G","H","I","J","K","L"];
let teamId = 0;
const teamIdMap = {}; // teamName → id
const teamFlagMap = {}; // teamName → emoji

for (const g of groupOrder) {
  const teamNames = groups.groups.find((gr) => gr.name === `Group ${g}`).teams;
  for (const name of teamNames) {
    teamId++;
    teamIdMap[name] = teamId;
    const t = teams.find((tm) => tm.name === name);
    const flag = t ? t.flag_icon : "";
    teamFlagMap[name] = flag;
    teamCsv += `${teamId},"${name}",,${g},,${flag}\n`;
  }
}
fs.writeFileSync(path.join(OUT_DIR, "teams_new.csv"), teamCsv);
console.log(`teams: ${teamId}`);

// ============================================================
// 2. matches.csv
// ============================================================
let matchCsv = "id,date,kickoff_time,stage,group,venue,home_team_id,away_team_id,home_score,away_score,home_penalty,away_penalty,summary\n";
let matchId = 0;
const matchIdToHomeId = {};

// Sort by date then time
const sorted = [...matches].sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return (a.time || "").localeCompare(b.time || "");
});

for (const m of sorted) {
  matchId++;
  const stage = mapStage(m);
  const group = groupFromTeam(m.team1) || "";
  const venue = m.ground || "";
  const hid = teamIdMap[m.team1];
  const aid = teamIdMap[m.team2];
  matchIdToHomeId[matchId] = { homeId: hid, awayId: aid, homeName: m.team1, awayName: m.team2 };

  // Scores
  let hs = null, as = null, hp = null, ap = null;
  if (m.score) {
    // Use et if exists (overtime result), otherwise ft
    const mainScore = m.score.et || m.score.ft;
    if (mainScore) {
      hs = mainScore[0];
      as = mainScore[1];
    }
    // Penalty shootout
    if (m.score.p) {
      hp = m.score.p[0];
      ap = m.score.p[1];
    }
    if (m.score.et) {
      // if et exists and no pens, et score is the final
      hs = m.score.et[0];
      as = m.score.et[1];
    }
    if (!m.score.et && m.score.ft) {
      hs = m.score.ft[0];
      as = m.score.ft[1];
    }
  }

  matchCsv += `${matchId},${m.date},"${m.time}",${stage},${group},"${venue}",${hid},${aid},${hs},${as},${hp},${ap},""\n`;
}
fs.writeFileSync(path.join(OUT_DIR, "matches_new.csv"), matchCsv);
console.log(`matches: ${matchId}`);

// ============================================================
// 3. match_events.csv
// ============================================================
let eventsCsv = "id,match_id,minute,type,description,player_id,player_name,team_side\n";
let eventId = 0;

function matchById(id) {
  // Re-sort the original matches to find match with same criteria
  const m = sorted[id - 1];
  return m;
}

for (let mid = 1; mid <= matchId; mid++) {
  const m = matchById(mid);
  if (!m) continue;

  // Goals for team1 (home)
  if (m.goals1) {
    for (const g of m.goals1) {
      eventId++;
      const desc = g.penalty ? `${g.name} 点球破门` : `${g.name} 进球`;
      eventsCsv += `${eventId},${mid},"${g.minute}",goal,"${desc}",,"${g.name}",home\n`;
    }
  }
  // Goals for team2 (away)
  if (m.goals2) {
    for (const g of m.goals2) {
      eventId++;
      const desc = g.owngoal ? `${g.name} 乌龙球` : g.penalty ? `${g.name} 点球破门` : `${g.name} 进球`;
      eventsCsv += `${eventId},${mid},"${g.minute}",goal,"${desc}",,"${g.name}",away\n`;
    }
  }
}
fs.writeFileSync(path.join(OUT_DIR, "match_events_new.csv"), eventsCsv);
console.log(`events: ${eventId}`);

// ============================================================
// 4. players.csv (from squads)
// ============================================================
let playersCsv = "id,team_id,name,nameEn,number,position,nationality,age,height,weight,marketValue,club\n";
let playerId = 0;

const posMap = { "GK": "守门员", "DF": "后卫", "MF": "中场", "FW": "前锋" };

for (const squad of squads) {
  const tid = teamIdMap[squad.name];
  if (!tid) continue;
  for (const p of squad.players) {
    playerId++;
    const pos = posMap[p.pos] || p.pos;
    const club = p.club ? p.club.name : "";
    playersCsv += `${playerId},${tid},"${p.name}",,${p.number},${pos},,,,${p.date_of_birth},,,"${club}"\n`;
  }
}
fs.writeFileSync(path.join(OUT_DIR, "players_new.csv"), playersCsv);
console.log(`players: ${playerId}`);

// ============================================================
// 5. player_tournament_stats.csv (basic entry for every player)
// ============================================================
let statsCsv = "player_id,appearances,goals,assists,yellow_cards,red_cards,minutes_played\n";
for (let i = 1; i <= playerId; i++) {
  statsCsv += `${i},0,0,0,0,0,0\n`;
}
fs.writeFileSync(path.join(OUT_DIR, "player_tournament_stats_new.csv"), statsCsv);
console.log(`stats: ${playerId}`);

console.log("\nDone! All CSV files written to:", OUT_DIR);
