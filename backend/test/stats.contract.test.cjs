const assert = require("node:assert/strict");
const { test } = require("node:test");

const BASE_URL = process.env.API_URL ?? "http://localhost:7001";

async function api(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

// ============================================================
// AC-01 — 晋级图
// ============================================================
test("GET /api/stats/bracket 返回晋级图（AC-01）", async () => {
  const { status, body } = await api("/api/stats/bracket");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data.rounds), "应有 rounds 数组");
  assert.ok(body.data.rounds.length >= 4, "至少应有 4 轮淘汰赛");
  const firstRound = body.data.rounds[0];
  assert.ok(firstRound.title, "每轮应有 title");
  assert.ok(Array.isArray(firstRound.matches), "每轮应有 matches 数组");
  // 决赛
  assert.ok(body.data.final, "应有决赛信息");
});

test("晋级图中已赛毕比赛有比分（AC-02）", async () => {
  const { body } = await api("/api/stats/bracket");
  const final = body.data.final;
  assert.ok(final.homeScore !== null && final.awayScore !== null, "决赛应有比分");
});

// ============================================================
// AC-03, AC-04 — 射手榜
// ============================================================
test("GET /api/stats/top-scorers 返回射手榜，默认按进球降序（AC-03）", async () => {
  const { status, body } = await api("/api/stats/top-scorers");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
  if (body.data.length >= 2) {
    assert.ok(body.data[0].goals >= body.data[1].goals, "应按进球降序");
  }
  const first = body.data[0];
  assert.ok(first.name);
  assert.ok(typeof first.goals === "number");
  assert.ok(typeof first.teamName === "string");
});

test("GET /api/stats/top-scorers?sortBy=appearances 支持切换排序（AC-04）", async () => {
  const { status, body } = await api("/api/stats/top-scorers?sortBy=appearances&order=desc");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
});

// ============================================================
// AC-05 — 助攻榜
// ============================================================
test("GET /api/stats/top-assists 返回助攻榜（AC-05）", async () => {
  const { status, body } = await api("/api/stats/top-assists");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
  if (body.data.length >= 2) {
    assert.ok(body.data[0].assists >= body.data[1].assists, "应按助攻降序");
  }
});

// ============================================================
// AC-06 — 积分榜
// ============================================================
test("GET /api/stats/standings 返回积分榜（AC-06）", async () => {
  const { status, body } = await api("/api/stats/standings");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, 12, "应为 12 组");
  const groupA = body.data[0];
  assert.equal(groupA.group, "A");
  assert.ok(Array.isArray(groupA.teams));
  assert.equal(groupA.teams.length, 4, "每组 4 队");
  const first = groupA.teams[0];
  assert.ok(first.rank === 1);
  assert.ok(typeof first.points === "number");
  assert.ok(typeof first.played === "number");
});
