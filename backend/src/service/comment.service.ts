import { Provide, Inject, Init } from "@midwayjs/core";
import { DatabaseSync } from "node:sqlite";
import { MatchService } from "./match.service";

@Provide()
export class CommentService {
  @Inject()
  matchService: MatchService;

  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  @Init()
  async initTables() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL REFERENCES matches(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES comments(id),
        likes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS comment_likes (
        comment_id INTEGER NOT NULL REFERENCES comments(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        PRIMARY KEY (comment_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL REFERENCES teams(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        likes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // 评论列表
  list(matchId: number, sort: string) {
    const order = sort === "hot" ? "c.likes DESC, c.created_at DESC" : "c.created_at DESC";
    const rows = this.database
      .prepare(
        `SELECT c.*, u.username,
                (SELECT COUNT(*) FROM predictions p WHERE p.user_id = c.user_id AND p.match_id = c.match_id AND p.points > 0) > 0 AS correct_pred
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.match_id = ? AND c.parent_id IS NULL
         ORDER BY ${order}`,
      )
      .all(matchId) as any[];

    return rows.map((r) => this.buildComment(r));
  }

  // 发表评论
  create(userId: number, matchId: number, content: string, parentId?: number) {
    content = content.trim();
    if (!content) throw new Error("评论内容不能为空");
    if (content.length > 500) throw new Error("评论最多 500 字");

    // 如果是回复，检查父评论存在且属于同一比赛
    if (parentId) {
      const parent = this.database
        .prepare("SELECT id, match_id, parent_id FROM comments WHERE id = ?")
        .get(parentId) as any;
      if (!parent) throw new Error("父评论不存在");
      if (parent.match_id !== matchId) throw new Error("不能跨比赛回复");
      if (parent.parent_id !== null) throw new Error("仅支持回复一级评论");
    }

    const result = this.database
      .prepare("INSERT INTO comments (match_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)")
      .run(matchId, userId, content, parentId ?? null);

    return this.getById(Number(result.lastInsertRowid));
  }

  private getById(id: number) {
    const row = this.database
      .prepare(
        `SELECT c.*, u.username,
                (SELECT COUNT(*) FROM predictions p WHERE p.user_id = c.user_id AND p.match_id = c.match_id AND p.points > 0) > 0 AS correct_pred
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
      )
      .get(id) as any;
    return row ? this.buildComment(row) : null;
  }

  private buildComment(r: any): any {
    const replies = this.database
      .prepare(
        `SELECT c.*, u.username,
                (SELECT COUNT(*) FROM predictions p WHERE p.user_id = c.user_id AND p.match_id = c.match_id AND p.points > 0) > 0 AS correct_pred
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ?
         ORDER BY c.created_at ASC`,
      )
      .all(r.id) as any[];

    return {
      id: r.id,
      matchId: r.match_id,
      content: r.content,
      username: r.username,
      likes: r.likes,
      isPredictionCorrect: r.correct_pred === 1,
      createdAt: new Date(`${r.created_at.replace(" ", "T")}Z`).toISOString(),
      replies: replies.map((rr) => ({
        id: rr.id,
        matchId: rr.match_id,
        content: rr.content,
        username: rr.username,
        likes: rr.likes,
        isPredictionCorrect: rr.correct_pred === 1,
        createdAt: new Date(`${rr.created_at.replace(" ", "T")}Z`).toISOString(),
      })),
    };
  }
}

// 球队圈子
@Provide()
export class CommunityService {
  @Inject()
  matchService: MatchService;

  private get database(): DatabaseSync {
    return (this.matchService as any).database;
  }

  // 圈子列表
  listTeams() {
    const rows = this.database
      .prepare(
        `SELECT t.id AS teamId, t.name AS teamName, t.flag_url AS flagUrl,
                (SELECT COUNT(*) FROM posts WHERE team_id = t.id) AS memberCount,
                (SELECT title FROM posts WHERE team_id = t.id ORDER BY created_at DESC LIMIT 1) AS latestPostTitle
         FROM teams t
         ORDER BY t.group_name, t.id`,
      )
      .all() as any[];
    return rows.map((r) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      flagUrl: r.flagUrl || "",
      memberCount: r.memberCount,
      latestPostTitle: r.latestPostTitle ?? null,
    }));
  }

  // 帖子列表
  listPosts(teamId: number) {
    const rows = this.database
      .prepare(
        `SELECT p.*, u.username
         FROM posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.team_id = ?
         ORDER BY p.created_at DESC`,
      )
      .all(teamId) as any[];
    return rows.map((r) => ({
      id: r.id,
      teamId: r.team_id,
      title: r.title,
      content: r.content,
      username: r.username,
      likes: r.likes,
      createdAt: new Date(`${r.created_at.replace(" ", "T")}Z`).toISOString(),
    }));
  }

  // 发帖
  createPost(userId: number, teamId: number, title: string, content: string) {
    title = title.trim();
    content = content.trim();
    if (!title) throw new Error("标题不能为空");
    if (!content) throw new Error("内容不能为空");
    if (title.length > 80) throw new Error("标题最多 80 字");
    if (content.length > 2000) throw new Error("正文最多 2000 字");

    const result = this.database
      .prepare("INSERT INTO posts (team_id, user_id, title, content) VALUES (?, ?, ?, ?)")
      .run(teamId, userId, title, content);

    const row = this.database
      .prepare("SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?")
      .get(result.lastInsertRowid) as any;

    return {
      id: row.id,
      teamId: row.team_id,
      title: row.title,
      content: row.content,
      username: row.username,
      likes: row.likes,
      createdAt: new Date(`${row.created_at.replace(" ", "T")}Z`).toISOString(),
    };
  }
}
