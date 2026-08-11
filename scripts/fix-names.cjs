// 用已知中文名更新球员表
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("backend/data/course-demo.sqlite");

// 从小红书收集的所有中文名（阵容+射手榜+助攻榜+事件）
const cnNames = new Map(); // 中文名 → {数, 队}

// 决赛阵容
[ [32,'西班牙',[23,'西蒙'],[12,'波罗'],[22,'库巴西'],[14,'拉波尔特'],[24,'库库雷利亚'],[16,'罗德里'],[10,'奥尔莫'],[8,'法比安'],[19,'亚马尔'],[21,'奥亚萨瓦尔'],[15,'巴埃纳'],[1,'拉亚'],[4,'E.加西亚'],[18,'苏维门迪'],[3,'格里马尔多'],[2,'略伦特'],[7,'穆尼奥斯'],[17,'皮诺'],[5,'普维尔'],[26,'加维'],[13,'J.加西亚'],[25,'伊格莱西亚斯'],[11,'尼科'],[9,'托雷斯'],[6,'梅里诺'],[20,'佩德里'] ],
[38,'阿根廷',[23,'达米安·马丁内斯'],[4,'蒙铁尔'],[13,'罗梅罗'],[6,'利桑德罗·马丁内斯'],[3,'塔利亚菲科'],[7,'德保罗'],[24,'恩佐'],[20,'麦卡利斯特'],[15,'冈萨雷斯'],[10,'梅西'],[9,'阿尔瓦雷斯'],[5,'帕雷德斯'],[2,'莫利纳'],[8,'奥塔门迪'],[22,'劳塔罗'],[11,'塞内西'],[14,'帕拉西奥斯'],[18,'洛塞尔索'],[1,'穆索'],[12,'鲁利'],[16,'梅迪纳'],[17,'朱利亚诺·西蒙尼'],[19,'阿尔马达'],[21,'何塞·洛佩斯'],[25,'巴尔科'],[26,'尼科·帕斯'] ],
// 季军赛
[33,'法国',[16,'迈尼昂'],[2,'古斯托'],[15,'科纳特'],[26,'拉克鲁瓦'],[19,'特奥'],[18,'埃梅里'],[14,'拉比奥'],[11,'奥利塞'],[24,'谢尔基'],[20,'杜埃'],[10,'姆巴佩'],[21,'巴尔科拉'],[4,'于帕梅卡诺'],[5,'孔德'],[8,'楚阿梅尼'],[3,'迪涅'],[7,'登贝莱'],[22,'马特塔'],[1,'桑巴'],[12,'坎特'],[23,'里塞'],[17,'萨利巴'],[9,'图拉姆'],[25,'阿克利乌什'],[6,'科内'],[27,'卢卡斯'] ],
[48,'英格兰',[13,'D.亨德森'],[26,'匡萨'],[2,'孔萨'],[6,'格伊'],[25,'斯彭斯'],[4,'赖斯'],[17,'摩根·罗杰斯'],[21,'埃泽'],[7,'萨卡'],[22,'伊万·托尼'],[11,'拉什福德'],[10,'贝林厄姆'],[9,'凯恩'],[1,'皮克福德'],[5,'斯通斯'],[3,'丹·伯恩'],[14,'J.亨德森'],[24,'里斯·詹姆斯'],[8,'奥赖利'],[18,'安东尼·戈登'],[12,'埃利奥特·安德森'],[19,'沃特金斯'],[15,'查洛巴'],[23,'马杜埃凯'],[20,'特拉福德'],[16,'梅努'] ],
// 半决赛法国西班牙
[33,'法国',[3,'迪涅'],[5,'孔德'],[4,'于帕梅卡诺'],[17,'萨利巴'],[30,'拉克鲁瓦'],[72,'特奥']],
[32,'西班牙',[84,'波罗'],[72,'奥尔莫'],[78,'法比安'],[84,'巴埃纳'],[74,'奥亚萨瓦尔'],[78,'佩德里'],[84,'略伦特'],[84,'尼科'],[74,'托雷斯'],[78,'梅里诺']],
// 半决赛英格兰阿根廷
[48,'英格兰',[72,'孔萨'],[82,'丹·伯恩'],[82,'奥赖利'],[90,'斯通斯'],[90,'斯彭斯'],[72,'安东尼·戈登']],
[38,'阿根廷',[72,'蒙铁尔'],[72,'奥塔门迪'],[72,'德保罗'],[64,'冈萨雷斯'],[81,'劳塔罗'],[72,'莫利纳'],[72,'朱利亚诺·西蒙尼'],[64,'帕雷德斯'],[85,'恩佐'],[90,'劳塔罗']],
].forEach(([tid, tname, ...players]) => {
  for (const [num, name] of players) {
    if (!cnNames.has(name)) cnNames.set(name, []);
    cnNames.get(name).push({ teamId: tid, number: num });
  }
});

// 射手榜中文名映射（手动，前50个最关键）
const scorerCN = {
  'Kylian Mbappé': '姆巴佩', 'Lionel Messi': '梅西', 'Jude Bellingham': '贝林厄姆',
  'Erling Haaland': '哈兰德', 'Ousmane Dembélé': '登贝莱', 'Harry Kane': '凯恩',
  'Mikel Oyarzabal': '奥亚萨瓦尔', 'Julián Quiñones': '基尼奥内斯', 'Vinícius Júnior': '维尼修斯',
  'Bukayo Saka': '萨卡', 'Deniz Undav': '翁达夫', 'Johan Manzambi': '曼赞比',
  'Romelu Lukaku': '卢卡库', 'Lautaro Martínez': '劳塔罗', 'Charles De Ketelaere': '德凯特拉雷',
  'Cody Gakpo': '加克波', 'Bradley Barcola': '巴尔科拉', 'Brian Brobbey': '布罗比',
  'Niko Jankewitz': '贾斯特', 'Matheus Cunha': '库尼亚',
};

// 对每个现有球员，如果英文名在 scorerCN 映射中，更新中文名
let updated = 0;
for (const [enName, cnName] of Object.entries(scorerCN)) {
  const r = db.prepare("SELECT id FROM players WHERE name=? AND name NOT LIKE '姆%' AND name NOT LIKE '贝%'").get(enName);
  if (r) {
    db.prepare("UPDATE players SET name=? WHERE id=?").run(cnName, r.id);
    updated++;
  }
}
console.log('Scorer names updated:', updated);

// 用号码+球队反推阵容球员→中文名
let lineupUpdated = 0;
for (const [cnName, entries] of cnNames) {
  for (const { teamId, number } of entries) {
    if (!number) continue;
    const r = db.prepare("SELECT id, name FROM players WHERE team_id=? AND number=?",).get(teamId, number);
    if (r && r.name !== cnName) {
      db.prepare("UPDATE players SET name=? WHERE id=?").run(cnName, r.id);
      lineupUpdated++;
    }
  }
}
console.log('Lineup names updated:', lineupUpdated);

db.close();
