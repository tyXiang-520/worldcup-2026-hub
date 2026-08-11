const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");

const BASE_URL = process.env.API_URL ?? "http://localhost:7001";

async function api(path, opts) {
  const url = `${BASE_URL}${path}`;
  const method = opts?.method ?? "GET";
  const fetchOpts = { method, headers: { Accept: "application/json", ...opts?.headers } };
  if (opts?.body) {
    fetchOpts.headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, fetchOpts);
  const body = await res.json();
  return { status: res.status, body };
}

// ============================================================
// AC-01 — 赛程列表
// ============================================================
test("GET /api/matches 返回 200 且 data 为数组（AC-01）", async () => {
  const { status, body } = await api("/api/matches");
  assert.equal(status, 200, `期望 200，实际 ${status}: ${JSON.stringify(body)}`);
  assert.ok(Array.isArray(body.data), "data 应为数组");
  assert.ok(body.data.length > 0, "种子数据应包含赛事");
});

test("GET /api/matches 按日期分组结构正确（AC-01）", async () => {
  const { status, body } = await api("/api/matches");
  assert.equal(status, 200);
  const group = body.data[0];
  assert.ok(typeof group.date === "string", "每组应有 date 字符串");
  assert.ok(Array.isArray(group.matches), "每组应有 matches 数组");
  const match = group.matches[0];
  assert.ok(typeof match.id === "number");
  assert.ok(typeof match.homeTeam.name === "string");
  assert.ok(typeof match.awayTeam.name === "string");
});

// ============================================================
// AC-02 — 阶段筛选
// ============================================================
test("GET /api/matches?stage=group-1 仅返回小组赛第一轮（AC-02）", async () => {
  const { status, body } = await api("/api/matches?stage=group-1");
  assert.equal(status, 200);
  for (const g of body.data) {
    for (const m of g.matches) {
      assert.equal(m.stage, "group-1", `match ${m.id}: stage=${m.stage} 应为 group-1`);
    }
  }
});

test("GET /api/matches?stage=final 仅返回决赛（AC-02）", async () => {
  const { status, body } = await api("/api/matches?stage=final");
  assert.equal(status, 200);
  assert.equal(body.data.length, 1, "决赛应只有一天");
  assert.equal(body.data[0].matches.length, 1, "决赛应只有 1 场");
  assert.equal(body.data[0].matches[0].stage, "final");
});

// ============================================================
// AC-03 — 已结束比赛有比分和摘要
// ============================================================
test("决赛包含比分和一句话总结（AC-03）", async () => {
  const { status, body } = await api("/api/matches?stage=final");
  assert.equal(status, 200);
  const m = body.data[0].matches[0];
  assert.ok(m.homeScore !== null && m.awayScore !== null, "决赛应有比分");
  assert.equal(m.status, "finished");
  assert.ok(m.summary && m.summary.length > 0, "应有总结");
});

// ============================================================
// AC-07, AC-08 — 比赛详情
// ============================================================
test("GET /api/matches/1 返回比赛详情（AC-07,08）", async () => {
  const { status, body } = await api("/api/matches/1");
  assert.equal(status, 200);
  const d = body.data;
  assert.ok(d.match, "应包含 match");
  assert.ok(Array.isArray(d.events), "events 应为数组");
  assert.ok(d.lineups?.home, "应有主队阵容");
  assert.ok(d.lineups?.away, "应有客队阵容");
});

test("GET /api/matches/9999 返回 404", async () => {
  const { status, body } = await api("/api/matches/9999");
  assert.equal(status, 404, `期望 404，实际 ${status}`);
  assert.ok(body.message || body.error, "应包含错误信息");
});

// ============================================================
// AC-14 — 球队列表
// ============================================================
test("GET /api/teams 返回 48 支球队（AC-14）", async () => {
  const { status, body } = await api("/api/teams");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data), "data 应为数组");
  assert.equal(body.data.length, 48, `应为 48 队，实际 ${body.data.length}`);
});

// ============================================================
// AC-12 — 球队详情
// ============================================================
test("GET /api/teams/37 返回阿根廷（AC-12）", async () => {
  const { status, body } = await api("/api/teams/37");
  assert.equal(status, 200);
  const { team } = body.data;
  assert.equal(team.id, 37);
  assert.ok(team.name, "应有名字");
  assert.ok(team.stats, "应有统计");
  assert.ok(Array.isArray(body.data.players), "players 应为数组");
});

test("GET /api/teams/9999 返回 404", async () => {
  const { status } = await api("/api/teams/9999");
  assert.equal(status, 404);
});

// ============================================================
// AC-13 — 球员
// ============================================================
test("GET /api/players/9999 返回 404（AC-13）", async () => {
  const { status } = await api("/api/players/9999");
  assert.equal(status, 404);
});

// ============================================================
// 排序验证
// ============================================================
test("赛程按日期和时间升序排列", async () => {
  const { status, body } = await api("/api/matches?stage=group-1");
  assert.equal(status, 200);
  const all = body.data.flatMap((g) => g.matches);
  for (let i = 1; i < all.length; i++) {
    const a = `${all[i - 1].date}T${all[i - 1].kickoffTime ?? "00:00"}`;
    const b = `${all[i].date}T${all[i].kickoffTime ?? "00:00"}`;
    assert.ok(a <= b, `排序错误: ${a} > ${b}`);
  }
});

// ============================================================
// Contract Schema 一致性
// ============================================================
test("Match 对象符合 OpenAPI Schema", async () => {
  const { status, body } = await api("/api/matches");
  assert.equal(status, 200);
  const all = body.data.flatMap((g) => g.matches);
  const fields = ["id", "date", "stage", "homeTeam", "awayTeam", "homeScore", "awayScore", "status"];
  const stages = ["group-1", "group-2", "group-3", "round-of-32", "round-of-16", "quarter-final", "semi-final", "third-place", "final"];
  for (const m of all.slice(0, 10)) {
    for (const f of fields) {
      assert.ok(f in m, `match ${m.id} 缺少字段 ${f}`);
    }
    assert.ok(stages.includes(m.stage), `match ${m.id}: stage="${m.stage}" 不合法`);
    assert.ok(["finished"].includes(m.status), `match ${m.id}: status="${m.status}" 不合法`);
  }
});
