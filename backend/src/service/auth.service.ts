import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  created_at: string;
  allow_leaderboard: number;
  allow_prediction_view: number;
}

export interface UserProfile {
  id: number;
  username: string;
  createdAt: string;
  allowLeaderboard: boolean;
  allowPredictionView: boolean;
}

const JWT_SECRET_LENGTH = 32;
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

// 简单的 HMAC-based token，避免引入 jsonwebtoken 依赖
function generateToken(userId: number, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + TOKEN_EXPIRY_MS })).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string, secret: string): { userId: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const expectedSig = createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");
    const sigBuf = Buffer.from(sigB64, "base64url");
    const expBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    try {
      if (!timingSafeEqual(sigBuf, expBuf)) return null;
    } catch {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Date.now()) return null;
    if (!payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

function hashPassword(password: string, salt: string): string {
  return createHmac("sha256", salt).update(password).digest("hex");
}

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

@Provide()
export class AuthService {
  @Config("courseDatabase.path")
  databasePath: string;

  private database: DatabaseSync;
  private jwtSecret: string;

  @Init()
  async initialize() {
    const absolutePath = resolve(process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        allow_leaderboard INTEGER NOT NULL DEFAULT 1,
        allow_prediction_view INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    // 从配置注入，避免每次重启密钥变化导致旧 token 失效
    this.jwtSecret = process.env.JWT_SECRET ?? "worldcup-dev-secret";
  }

  register(username: string, password: string): { token: string; user: UserProfile } {
    // 去首尾空格
    username = username.trim();

    // 校验格式
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      throw new ValidationError("用户名仅允许字母、数字和下划线，长度 3-16 字符");
    }
    if (password.length < 6) {
      throw new ValidationError("密码长度不少于 6 字符");
    }

    // 检查唯一性
    const existing = this.database
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existing) {
      throw new ConflictError("用户名已被使用");
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const result = this.database
      .prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)")
      .run(username, passwordHash, salt);

    const user: UserProfile = {
      id: Number(result.lastInsertRowid),
      username,
      createdAt: new Date().toISOString(),
      allowLeaderboard: true,
      allowPredictionView: true,
    };
    const token = generateToken(user.id, this.jwtSecret);
    return { token, user };
  }

  login(username: string, password: string): { token: string; user: UserProfile } {
    username = username.trim();
    const row = this.database
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (!row) {
      throw new UnauthorizedError("用户名或密码错误");
    }

    const passwordHash = hashPassword(password, row.salt);
    if (passwordHash !== row.password_hash) {
      throw new UnauthorizedError("用户名或密码错误");
    }

    const user = mapUser(row);
    const token = generateToken(user.id, this.jwtSecret);
    return { token, user };
  }

  verifyToken(token: string): { userId: number } | null {
    return verifyToken(token, this.jwtSecret);
  }

  getProfile(userId: number): UserProfile | null {
    const row = this.database
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  updatePrivacy(
    userId: number,
    settings: { allowLeaderboard?: boolean; allowPredictionView?: boolean },
  ): UserProfile | null {
    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (settings.allowLeaderboard !== undefined) {
      updates.push("allow_leaderboard = ?");
      values.push(settings.allowLeaderboard ? 1 : 0);
    }
    if (settings.allowPredictionView !== undefined) {
      updates.push("allow_prediction_view = ?");
      values.push(settings.allowPredictionView ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getProfile(userId);
    }

    values.push(userId);
    this.database
      .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .run(...values);

    return this.getProfile(userId);
  }

  @Destroy()
  async close() {
    this.database?.close();
  }
}

function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    createdAt: new Date(`${row.created_at.replace(" ", "T")}Z`).toISOString(),
    allowLeaderboard: row.allow_leaderboard === 1,
    allowPredictionView: row.allow_prediction_view === 1,
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
