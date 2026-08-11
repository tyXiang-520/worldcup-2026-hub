const assert = require("node:assert/strict");
const { test } = require("node:test");

const BASE_URL = process.env.API_URL ?? "http://localhost:7001";

let seq = 0;
function uid() { return `t${Date.now()}${seq++}`; }

async function api(method, path, opts) {
  const url = `${BASE_URL}${path}`;
  const fetchOpts = { method, headers: { "Content-Type": "application/json", Accept: "application/json", ...opts?.headers } };
  if (opts?.body) fetchOpts.body = JSON.stringify(opts.body);
  const res = await fetch(url, fetchOpts);
  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? (await res.json().catch(() => ({}))) : {};
  return { status: res.status, body };
}

// ============================================================
// AC-01 — 成功注册
// ============================================================
test("POST /api/auth/register 合法输入返回 200 和令牌（AC-01）", async () => {
  const name = uid();
  const { status, body } = await api("POST", "/api/auth/register", {
    body: { username: name, password: "testpass123" },
  });
  if (status !== 200) throw new Error(`期望 200，实际 ${status}: ${JSON.stringify(body)}`);
  if (!body.data?.token) throw new Error("应返回 token");
  if (body.data?.user?.username !== name) throw new Error(`用户名应为 ${name}`);
});

// ============================================================
// AC-02 — 重复用户名
// ============================================================
test("POST /api/auth/register 重复用户名返回 409（AC-02）", async () => {
  const name = uid();
  const r1 = await api("POST", "/api/auth/register", {
    body: { username: name, password: "testpass123" },
  });
  if (r1.status !== 200) throw new Error(`首次注册期望 200，实际 ${r1.status}`);
  const r2 = await api("POST", "/api/auth/register", {
    body: { username: name, password: "otherpass" },
  });
  if (r2.status !== 409) throw new Error(`重复注册期望 409，实际 ${r2.status}`);
});

// ============================================================
// AC-03 — 用户名格式校验
// ============================================================
test("POST /api/auth/register 短用户名返回 400（AC-03）", async () => {
  const { status } = await api("POST", "/api/auth/register", {
    body: { username: "ab", password: "123456" },
  });
  if (status !== 400) throw new Error(`期望 400，实际 ${status}`);
});

test("POST /api/auth/register 含空格用户名返回 400（AC-03）", async () => {
  const { status } = await api("POST", "/api/auth/register", {
    body: { username: "hello world", password: "123456" },
  });
  if (status !== 400) throw new Error(`期望 400，实际 ${status}`);
});

test("POST /api/auth/register 含下划线用户名注册成功", async () => {
  const { status } = await api("POST", "/api/auth/register", {
    body: { username: "testuser_2026", password: "testpass123" },
  });
  if (status !== 200 && status !== 409) throw new Error(`期望 200 或 409（已存在），实际 ${status}`);
});

// ============================================================
// AC-04 — 短密码
// ============================================================
test("POST /api/auth/register 短密码返回 400（AC-04）", async () => {
  const { status } = await api("POST", "/api/auth/register", {
    body: { username: uid(), password: "12345" },
  });
  if (status !== 400) throw new Error(`期望 400，实际 ${status}`);
});

// ============================================================
// AC-05 — 成功登录
// ============================================================
test("POST /api/auth/login 正确凭证返回 200（AC-05）", async () => {
  const name = uid();
  const pw = "testpass123";
  await api("POST", "/api/auth/register", { body: { username: name, password: pw } });
  const { status, body } = await api("POST", "/api/auth/login", {
    body: { username: name, password: pw },
  });
  if (status !== 200) throw new Error(`期望 200，实际 ${status}: ${JSON.stringify(body)}`);
  if (!body.data?.token) throw new Error("应返回 token");
  if (body.data?.user?.username !== name) throw new Error(`用户名不匹配`);
});

// ============================================================
// AC-06 — 登录失败模糊提示
// ============================================================
test("POST /api/auth/login 错误密码返回 401（AC-06）", async () => {
  const name = uid();
  await api("POST", "/api/auth/register", { body: { username: name, password: "correct" } });
  const { status } = await api("POST", "/api/auth/login", {
    body: { username: name, password: "wrongpass" },
  });
  if (status !== 401) throw new Error(`期望 401，实际 ${status}`);
});

test("POST /api/auth/login 不存在用户也返回 401", async () => {
  const { status } = await api("POST", "/api/auth/login", {
    body: { username: `noexist_${uid()}`, password: "any" },
  });
  if (status !== 401) throw new Error(`不存在的用户期望 401，实际 ${status}`);
});

// ============================================================
// AC-07 — 获取个人信息
// ============================================================
test("GET /api/auth/me 有效令牌返回 200（AC-07）", async () => {
  const name = uid();
  const r1 = await api("POST", "/api/auth/register", {
    body: { username: name, password: "testpass123" },
  });
  const token = r1.body.data.token;
  const { status, body } = await api("GET", "/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (status !== 200) throw new Error(`期望 200，实际 ${status}`);
  if (body.data.username !== name) throw new Error("用户名不匹配");
});

// ============================================================
// AC-08 — 无效令牌
// ============================================================
test("GET /api/auth/me 无令牌返回 401（AC-08）", async () => {
  const { status } = await api("GET", "/api/auth/me", {});
  if (status !== 401) throw new Error(`期望 401，实际 ${status}`);
});

test("GET /api/auth/me 无效令牌返回 401（AC-08）", async () => {
  const { status } = await api("GET", "/api/auth/me", {
    headers: { Authorization: "Bearer invalid.token.here" },
  });
  if (status !== 401) throw new Error(`期望 401，实际 ${status}`);
});

// ============================================================
// 隐私设置
// ============================================================
test("PATCH /api/auth/me 更新隐私设置", async () => {
  const name = uid();
  const r1 = await api("POST", "/api/auth/register", {
    body: { username: name, password: "testpass123" },
  });
  const token = r1.body.data.token;
  const { status, body } = await api("PATCH", "/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
    body: { allowLeaderboard: false },
  });
  if (status !== 200) throw new Error(`期望 200，实际 ${status}`);
  if (body.data.allowLeaderboard !== false) throw new Error("allowLeaderboard 应为 false");
  if (body.data.allowPredictionView !== true) throw new Error("allowPredictionView 应保持 true");
});
