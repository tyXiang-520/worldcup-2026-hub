// 统一生成所有 CSV：teams, matches, events, lineups, ratings, scorers
const fs = require("node:fs");
const path = require("node:path");

const D = path.resolve(__dirname, "..", "小红书爬取数据");
const O = path.resolve(__dirname, "..", "scripts");

const cal = JSON.parse(fs.readFileSync(path.join(D, "xhs_worldcup_calendar_info.json.crdownload")));
const std = JSON.parse(fs.readFileSync(path.join(D, "xhs_worldcup_standings.json.crdownload")));
const ps  = JSON.parse(fs.readFileSync(path.join(D, "xhs_rank_player_stats.json.crdownload")));
// lineup data (only for the match user browsed — the final)
let luRaw = null, luMatchId = null;
try { luRaw = JSON.parse(fs.readFileSync(path.join(D, "xhs_match_lineup.json.crdownload"))); } catch(e){}
try { const mb = JSON.parse(fs.readFileSync(path.join(D, "xhs_match_base.json.crdownload"))); luMatchId = mb.data.match_base?.match_id; } catch(e){}

// ============================================================
// 1. Teams
// ============================================================
const teamMap = new Map(); // xhsId -> { name, logo, group }
for (const g of std.data.standing_list)
  for (const t of g.teams)
    teamMap.set(t.team_id, { name: t.team_name, logo: t.team_logo||"", group: g.group_label.replace("组","") });
for (const day of cal.data.calendar_list)
  for (const m of day.matches)
    for (const side of ["home","away"]) {
      const xid = m[`${side}_team_id`];
      if (!teamMap.has(xid)) teamMap.set(xid, { name: m[`${side}_team_name`], logo: m[`${side}_team_logo`]||"", group: (m.group_label||"").replace("组","") });
    }

const gOrder = std.data.standing_list.map(s=>s.group_label.replace("组",""));
const sorted = [...teamMap.entries()].sort((a,b)=>{
  const ga=gOrder.indexOf(a[1].group), gb=gOrder.indexOf(b[1].group);
  return ga!==gb?ga-gb:a[1].name.localeCompare(b[1].name,"zh");
});

let t=0; const tidMap={}; // xhsId -> ourId
let teamCsv="id,name,nameEn,group,fifa_ranking,flag_url\n";
for(const [xid,info] of sorted){ t++; tidMap[xid]=t; teamCsv+=`${t},"${info.name}",,"${info.group}",,"${info.logo}"\n`; }
fs.writeFileSync(path.join(O,"teams_xhs.csv"),teamCsv); console.log("teams:",t);

// ============================================================
// 2. Matches
// ============================================================
const STAGE={
  "小组赛": null,
  "1/16决赛":"round-of-32","1/8决赛":"round-of-16","1/4决赛":"quarter-final",
  "半决赛":"semi-final","季军赛":"third-place","决赛":"final"
};
function gs(n){ return n<=7?"group-1":n<=14?"group-2":"group-3"; }

const all=[];
for(const day of cal.data.calendar_list){
  const p=day.date_label.replace("月"," ").replace("日","").split(" ");
  const date=`2026-${String(Number(p[0])).padStart(2,"0")}-${String(Number(p[1])).padStart(2,"0")}`;
  for(const m of day.matches){
    let stage=STAGE[m.round_stage];
    if(!stage) stage=gs(m.round_num);
    all.push({...m,_date:date,_stage:stage});
  }
}
all.sort((a,b)=>a._date!==b._date?a._date.localeCompare(b._date):(a.match_time||0)-(b.match_time||0));

let mc="id,date,kickoff_time,stage,group,venue,home_team_id,away_team_id,home_score,away_score,home_penalty,away_penalty,summary\n";
let mid=0; const xhsToOur={}; // xhs match_id -> our match_id
for(const m of all){ mid++; xhsToOur[m.match_id]=mid;
  const hid=tidMap[m.home_team_id],aid=tidMap[m.away_team_id]; if(!hid||!aid)continue;
  mc+=`${mid},${m._date},"${m.match_time_label||""}",${m._stage},${(m.group_label||"").replace("组","")},"",${hid},${aid},${m.home_score??"null"},${m.away_score??"null"},null,null,""\n`; }
fs.writeFileSync(path.join(O,"matches_xhs.csv"),mc); console.log("matches:",mid);

// ============================================================
// 3. Match events (from openfootball)
// ============================================================
const wc = JSON.parse(fs.readFileSync(require("os").homedir()+"/Desktop/worldcup.json/2026/worldcup.json"));
// re-match events to our match IDs by date+teams
let evCsv="id,match_id,minute,type,description,player_id,player_name,team_side\n";
let eid=0;
for(const om of wc.matches){
  // find our match
  const ourId = all.findIndex(m=>m._date===om.date && m.home_team_name===om.team1 && m.away_team_name===om.team2)+1;
  if(ourId<=0)continue;
  if(om.goals1)for(const g of om.goals1){ eid++; evCsv+=`${eid},${ourId},"${g.minute}",goal,"${g.name} ${g.penalty?'点球破门':'进球'}",,"${g.name}",home\n`; }
  if(om.goals2)for(const g of om.goals2){ eid++; evCsv+=`${eid},${ourId},"${g.minute}",goal,"${g.name} ${g.penalty?'点球破门':'进球'}",,"${g.name}",away\n`; }
}
fs.writeFileSync(path.join(O,"match_events_xhs.csv"),evCsv); console.log("events:",eid);

// ============================================================
// 4. Lineups + ratings from XHS (only the browsed match)
// ============================================================
if(luRaw&&luMatchId){
  const lu=luRaw.data.match_lineup;
  const ourMid=xhsToOur[luMatchId];
  let lCsv="id,match_id,team_id,side,formation\n";
  let lpCsv="id,lineup_id,player_id,number,name,position,is_starter\n";
  let rCsv="id,match_id,player_id,number,name,team_side,rating\n";
  let lid=1,lpid=1,rid=1;

  function proc(info,side){
    lCsv+=`${lid},${ourMid},${tidMap[info.team_id]},${side},"${info.formation||'未知'}"\n`;
    const clid=lid; lid++;
    for(const p of info.first_player_list||[]){
      lpCsv+=`${lpid},${clid},${p.player_id||0},${p.shirt_number||0},"${p.name}","${p.position||''}",1\n`; lpid++;
      const rv=parseFloat(p.rating); if(rv>0){ rCsv+=`${rid},${ourMid},${p.player_id||0},${p.shirt_number||0},"${p.name}",${side},${rv}\n`; rid++; }
    }
    for(const p of info.backup_player_list||[]){
      lpCsv+=`${lpid},${clid},${p.player_id||0},${p.shirt_number||0},"${p.name}","${p.position||''}",0\n`; lpid++;
    }
  }
  proc(lu.home_player_info,"home"); proc(lu.away_player_info,"away");
  fs.writeFileSync(path.join(O,"lineups_xhs.csv"),lCsv);
  fs.writeFileSync(path.join(O,"lineup_players_xhs.csv"),lpCsv);
  fs.writeFileSync(path.join(O,"player_ratings_xhs.csv"),rCsv);
  console.log(`lineups: ${lid-1}, lineup_players: ${lpid-1}, ratings: ${rid-1}`);
}else{console.log("No lineup data for this match");}

// ============================================================
// 5. Player stats  (XHS top scorers)
// ============================================================
const sl=ps.data.info_list||[];
let sc="player_id,team_id,name,team_name,goals,assists\n";
for(const s of sl) sc+=`${s.player_id},${s.team_id},"${s.player_name}","${s.team_name}",0,${Number(s.value)||0}\n`;
fs.writeFileSync(path.join(O,"scorers_xhs.csv"),sc); console.log("scorers:",sl.length);
console.log("\nDone! ->",O);
