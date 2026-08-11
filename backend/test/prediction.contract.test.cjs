const assert = require("node:assert/strict");
const { test } = require("node:test");

const BASE_URL = process.env.API_URL ?? "http://localhost:7001";

function uid() { return `t${String(Date.now()).slice(-8)}${String(Math.floor(Math.random()*100)).padStart(2,"0")}`; }

async function api(method, path, opts) {
  const url = `${BASE_URL}${path}`;
  const fetchOpts = { method, headers: { "Content-Type": "application/json", Accept: "application/json", ...opts?.headers } };
  if (opts?.body) fetchOpts.body = JSON.stringify(opts.body);
  const res = await fetch(url, fetchOpts);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function register() {
  const name = uid();
  const r = await api("POST", "/api/auth/register", { body: { username: name, password: "testpass123" } });
  if (r.status !== 200) throw new Error(`注册失败: ${JSON.stringify(r.body)}`);
  return { token: r.body.data.token, userId: r.body.data.user.id };
}

// ============================================================
// AC-01 — 正确预测获得积分
// ============================================================
test("POST /api/predictions 正确主胜预测返回 10 分（AC-01）", async () => {
  const { token } = await register();
  // 比赛1：墨西哥 2-0 南非，主胜
  const { status, body } = await api("POST", "/api/predictions", {
    headers: { Authorization: `Bearer ${token}` },
    body: { matchId: 1, prediction: "home" },
  });
  if (status !== 200 && status !== 201) throw new Error(`期望 2xx，实际 ${status}: ${JSON.stringify(body)}`);
  if (!body.data) throw new Error("应包含 data");
  if (body.data.points !== 10) throw new Error(`胜负正确应得 10 分，实际 ${body.data.points}`);
  assert.equal(body.data.points, 10, `胜负正确应得 10 分，实际 ${body.data.points}`);
  assert.equal(body.data.correctResult, true);
});

// ============================================================
// AC-02 — 精准比分
// ============================================================
test("POST /api/predictions 精准比分正确返回 50 分（AC-02）", async () => {
  const { token } = await register();
  // 比赛1：墨西哥 2-0 南非
  const { status, body } = await api("POST", "/api/predictions", {
    headers: { Authorization: `Bearer ${token}` },
    body: { matchId: 1, prediction: "home", homeScore: 2, awayScore: 0 },
  });
  if (status !== 200 && status !== 201) throw new Error(`期望 2xx，实际 ${status}`);
  if (body.data.points !== 50) throw new Error(`比分正确应得 50 分，实际 ${body.data.points}`);
  if (body.data.correctScore !== true) throw new Error("correctScore 应为 true");
});

// ============================================================
// AC-03 — 不可重复预测
// ============================================================
test("POST /api/predictions 重复预测返回 409（AC-03）", async () => {
  const { token } = await register();
  await api("POST", "/api/predictions", {
    headers: { Authorization: `Bearer ${token}` },
    body: { matchId: 1, prediction: "draw" },
  });
  const { status } = await api("POST", "/api/predictions", {
    headers: { Authorization: `Bearer ${token}` },
    body: { matchId: 1, prediction: "home" },
  });
  assert.equal(status, 409, `重复预测期望 409，实际 ${status}`);
});

// ============================================================
// AC-04 — 未登录拒绝
// ============================================================
test("POST /api/predictions 未登录返回 401（AC-04）", async () => {
  const { status } = await api("POST", "/api/predictions", {
    body: { matchId: 1, prediction: "home" },
  });
  assert.equal(status, 401, `期望 401，实际 ${status}`);
});

// ============================================================
// AC-05 — 预测历史
// ============================================================
test("GET /api/predictions 返回用户预测历史（AC-05）", async () => {
  const { token } = await register();
  await api("POST", "/api/predictions", {
    headers: { Authorization: `Bearer ${token}` },
    body: { matchId: 1, prediction: "home" },
  });
  const { status, body } = await api("GET", "/api/predictions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].matchId, 1);
});
