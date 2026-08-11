const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const db = new DatabaseSync("backend/data/course-demo.sqlite");
const scripts = "scripts";

function csvRows(file) {
  const raw = fs.readFileSync(path.join(scripts, file), "utf8").trim().split("\n").slice(1);
  return raw.map((line) => {
    const parts = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { parts.push(cur); cur = ""; }
      else cur += ch;
    }
    parts.push(cur);
    return parts;
  });
}

// 清旧数据
db.prepare("DELETE FROM match_events WHERE match_id=104").run();
db.prepare("DELETE FROM lineup_players WHERE lineup_id IN (SELECT id FROM lineups WHERE match_id=104)").run();
db.prepare("DELETE FROM lineups WHERE match_id=104").run();

// 决赛阵容
for (const r of csvRows("final_lineups.csv"))
  db.prepare("INSERT OR REPLACE INTO lineups(id,match_id,team_id,side,formation) VALUES(?,?,?,?,?)").run(Number(r[0]), Number(r[1]), Number(r[2]), r[3], r[4]);

for (const r of csvRows("final_lineup_players.csv"))
  db.prepare("INSERT OR REPLACE INTO lineup_players(id,lineup_id,player_id,number,name,position,is_starter) VALUES(?,?,?,?,?,?,?)").run(Number(r[0]), Number(r[1]), Number(r[2]), Number(r[3]), r[4], r[5] || null, Number(r[6]));

// 决赛事件
for (const r of csvRows("final_events.csv"))
  db.prepare("INSERT OR REPLACE INTO match_events(id,match_id,minute,type,description,player_id,player_name,team_side) VALUES(?,?,?,?,?,?,?,?)").run(Number(r[0]), Number(r[1]), r[2], r[3], r[4], r[5] ? Number(r[5]) : null, r[6] || null, r[7]);

console.log("Lineups:", db.prepare("SELECT COUNT(*) as c FROM lineups WHERE match_id=104").get().c);
console.log("LP:", db.prepare("SELECT COUNT(*) as c FROM lineup_players WHERE lineup_id IN (SELECT id FROM lineups WHERE match_id=104)").get().c);
console.log("Events for 104:", db.prepare("SELECT COUNT(*) as c FROM match_events WHERE match_id=104").get().c);

// 验证
const evs = db.prepare("SELECT * FROM match_events WHERE match_id=104 ORDER BY CAST(minute AS INTEGER)").all();
evs.forEach(e => console.log(" ", e.minute, e.type, e.description));
db.close();
