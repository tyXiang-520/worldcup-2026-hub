// 决赛(104)数据：从用户手动复制的小红书页面生成
const fs = require("node:fs");
const path = require("node:path");
const O = path.resolve(__dirname, "..", "scripts");

// ============================================================
// 决赛阵容 + 评分
// ============================================================
// 西班牙 4-1-2-3, 阿根廷 4-4-2
const finalData = {
  matchId: 104, // 决赛
  home: {
    teamId: 32, // 西班牙
    formation: "4-1-2-3",
    starting: [
      { number: 23, name: "西蒙", position: "守门员" },
      { number: 12, name: "波罗", position: "后卫" },
      { number: 22, name: "库巴西", position: "后卫" },
      { number: 14, name: "拉波尔特", position: "后卫" },
      { number: 24, name: "库库雷利亚", position: "后卫" },
      { number: 16, name: "罗德里", position: "中场" },
      { number: 10, name: "奥尔莫", position: "中场" },
      { number: 8, name: "法比安", position: "中场" },
      { number: 19, name: "亚马尔", position: "前锋" },
      { number: 21, name: "奥亚萨瓦尔", position: "前锋" },
      { number: 15, name: "巴埃纳", position: "前锋" },
    ],
    bench: [
      "穆尼奥斯", "皮诺", "J.加西亚", "尼科", "加维", "普维尔", "伊格莱西亚斯",
      "佩德里", "苏维门迪", "E.加西亚", "托雷斯", "格里马尔多", "略伦特", "拉亚", "梅里诺",
    ].map(n => ({ name: n })),
    coach: "德拉富恩特",
  },
  away: {
    teamId: 38, // 阿根廷
    formation: "4-4-2",
    starting: [
      { number: 23, name: "达米安·马丁内斯", position: "守门员" },
      { number: 4, name: "蒙铁尔", position: "后卫" },
      { number: 13, name: "罗梅罗", position: "后卫" },
      { number: 6, name: "利桑德罗·马丁内斯", position: "后卫" },
      { number: 3, name: "塔利亚菲科", position: "后卫" },
      { number: 7, name: "德保罗", position: "中场" },
      { number: 24, name: "恩佐", position: "中场" },
      { number: 20, name: "麦卡利斯特", position: "中场" },
      { number: 15, name: "冈萨雷斯", position: "前锋" },
      { number: 10, name: "梅西", position: "前锋" },
      { number: 9, name: "阿尔瓦雷斯", position: "前锋" },
    ],
    bench: [
      "塞内西", "劳塔罗", "帕拉西奥斯", "洛塞尔索", "穆索", "帕雷德斯", "鲁利",
      "奥塔门迪", "莫利纳", "梅迪纳", "阿尔马达", "何塞·洛佩斯", "巴尔科", "朱利亚诺·西蒙尼", "尼科·帕斯",
    ].map(n => ({ name: n })),
    coach: "斯卡洛尼",
  },
};

// ============================================================
// 比赛事件
// ============================================================
const events = [
  { minute:"41", type:"yellow_card", description:"利桑德罗·马丁内斯放铲领黄", player_name:"利桑德罗·马丁内斯", side:"away" },
  { minute:"44", type:"substitution", description:"利桑德罗·马丁内斯 ↓ 奥塔门迪 ↑", player_name:"利桑德罗·马丁内斯/奥塔门迪", side:"away" },
  { minute:"45", type:"substitution", description:"冈萨雷斯 ↓ 帕雷德斯 ↑", player_name:"冈萨雷斯/帕雷德斯", side:"away" },
  { minute:"52", type:"yellow_card", description:"帕雷德斯领黄", player_name:"帕雷德斯", side:"away" },
  { minute:"58", type:"substitution", description:"蒙铁尔 ↓ 莫利纳 ↑", player_name:"蒙铁尔/莫利纳", side:"away" },
  { minute:"62", type:"substitution", description:"奥亚萨瓦尔 ↓ 托雷斯 ↑", player_name:"奥亚萨瓦尔/托雷斯", side:"home" },
  { minute:"62", type:"substitution", description:"法比安 ↓ 佩德里 ↑", player_name:"法比安/佩德里", side:"home" },
  { minute:"70", type:"substitution", description:"罗梅罗 ↓ 梅迪纳 ↑", player_name:"罗梅罗/梅迪纳", side:"away" },
  { minute:"70", type:"substitution", description:"德保罗 ↓ 朱利亚诺·西蒙尼 ↑", player_name:"德保罗/朱利亚诺·西蒙尼", side:"away" },
  { minute:"75", type:"substitution", description:"巴埃纳 ↓ 尼科 ↑", player_name:"巴埃纳/尼科", side:"home" },
  { minute:"75", type:"substitution", description:"奥尔莫 ↓ 梅里诺 ↑", player_name:"奥尔莫/梅里诺", side:"home" },
  { minute:"82", type:"yellow_card", description:"恩佐领黄", player_name:"恩佐", side:"away" },
  { minute:"90+2", type:"yellow_card", description:"罗梅罗领黄", player_name:"罗梅罗", side:"away" },
  { minute:"90+3", type:"red_card", description:"恩佐两黄变一红下场", player_name:"恩佐", side:"away" },
  { minute:"99", type:"substitution", description:"拉波尔特 ↓ E.加西亚 ↑", player_name:"拉波尔特/E.加西亚", side:"home" },
  { minute:"99", type:"substitution", description:"罗德里 ↓ 苏维门迪 ↑", player_name:"罗德里/苏维门迪", side:"home" },
  { minute:"102", type:"substitution", description:"阿尔瓦雷斯 ↓ 塞内西 ↑", player_name:"阿尔瓦雷斯/塞内西", side:"away" },
  { minute:"104", type:"yellow_card", description:"加时斯卡洛尼领黄", player_name:"斯卡洛尼(教练)", side:"away" },
  { minute:"106", type:"goal", description:"费兰·托雷斯抽射破门（助攻：尼科）", player_name:"费兰·托雷斯", side:"home" },
  { minute:"111", type:"yellow_card", description:"加时麦卡利斯特领黄", player_name:"麦卡利斯特", side:"away" },
];

// ============================================================
// 生成 CSV
// ============================================================
// lineups
let lCsv = "id,match_id,team_id,side,formation\n";
lCsv += `1,104,32,home,4-1-2-3\n`;
lCsv += `2,104,38,away,4-4-2\n`;

// lineup_players
let lpCsv = "id,lineup_id,player_id,number,name,position,is_starter\n";
let lpId = 1;
function addPlayers(lineupId, players) {
  for (const p of players) {
    lpCsv += `${lpId},${lineupId},0,${p.number||0},"${p.name}","${p.position||''}",1\n`;
    lpId++;
  }
}
function addBench(lineupId, players) {
  for (const p of players) {
    lpCsv += `${lpId},${lineupId},0,0,"${p.name}","",0\n`;
    lpId++;
  }
}
addPlayers(1, finalData.home.starting);
addBench(1, finalData.home.bench);
addPlayers(2, finalData.away.starting);
addBench(2, finalData.away.bench);

// match_events
let evCsv = "id,match_id,minute,type,description,player_id,player_name,team_side\n";
events.forEach((e, i) => {
  evCsv += `${i+1},104,"${e.minute}",${e.type},"${e.description}",,"${e.player_name}",${e.side}\n`;
});

fs.writeFileSync(path.join(O, "final_lineups.csv"), lCsv);
fs.writeFileSync(path.join(O, "final_lineup_players.csv"), lpCsv);
fs.writeFileSync(path.join(O, "final_events.csv"), evCsv);

console.log("Final match lineups:", finalData.home.starting.length + finalData.away.starting.length, "starters");
console.log("Final match bench:", finalData.home.bench.length + finalData.away.bench.length, "subs");
console.log("Final match events:", events.length);
console.log("Done!");
