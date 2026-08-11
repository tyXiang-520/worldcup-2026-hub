import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
  Patch,
  Post,
  Query,
  Param,
  Headers,
} from "@midwayjs/core";
import { CourseService } from "../service/course.service";
import { MatchService } from "../service/match.service";
import { TeamService } from "../service/team.service";
import { PlayerService } from "../service/player.service";
import { StatsService } from "../service/stats.service";
import { LeaderboardService } from "../service/leaderboard.service";
import { AuthService } from "../service/auth.service";
import { parseCourseInput } from "../utils/course-input";

@Controller("/api")
export class ApiController {
  @Inject() courseService: CourseService;
  @Inject() matchService: MatchService;
  @Inject() teamService: TeamService;
  @Inject() playerService: PlayerService;
  @Inject() statsService: StatsService;
  @Inject() leaderboardService: LeaderboardService;
  @Inject() authService: AuthService;

  // ============================================================
  // 原有课程接口
  // ============================================================
  @Get("/health")
  async health() {
    return { status: "ok" as const, service: "course-demo-api", timestamp: new Date().toISOString() };
  }

  @Get("/courses")
  async listCourses() {
    return { data: this.courseService.list() };
  }

  @Post("/courses")
  async createCourse(@Body() body: unknown) {
    try {
      return { data: this.courseService.create(parseCourseInput(body)) };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "课程数据无效";
      throw new httpError.BadRequestError(message);
    }
  }

  // ============================================================
  // 001-match-display
  // ============================================================
  @Get("/matches")
  async listMatches(@Query("stage") stage?: string) {
    return { data: this.matchService.list(stage) };
  }

  @Get("/matches/:matchId")
  async getMatchDetail(@Param("matchId") matchId: string) {
    const id = Number(matchId);
    if (!Number.isInteger(id) || id < 1) throw new httpError.BadRequestError("matchId 必须为正整数");
    const detail = this.matchService.getById(id);
    if (!detail) throw new httpError.NotFoundError("比赛不存在");
    return { data: detail };
  }

  @Patch("/matches/:matchId")
  async updateMatch(@Param("matchId") matchId: string, @Body() body: Record<string, unknown>) {
    const id = Number(matchId);
    if (!Number.isInteger(id) || id < 1) throw new httpError.BadRequestError("非法 ID");
    const match = this.matchService.getById(id);
    if (!match) throw new httpError.NotFoundError("比赛不存在");
    const db = (this.matchService as any).database;
    if (body.homeScore !== undefined) db.prepare("UPDATE matches SET home_score = ? WHERE id = ?").run(Number(body.homeScore), id);
    if (body.awayScore !== undefined) db.prepare("UPDATE matches SET away_score = ? WHERE id = ?").run(Number(body.awayScore), id);
    if (typeof body.summary === "string") db.prepare("UPDATE matches SET summary = ? WHERE id = ?").run(String(body.summary), id);
    return this.getMatchDetail(matchId);
  }

  @Get("/teams")
  async listTeams() { return { data: this.teamService.list() }; }

  @Get("/teams/:teamId")
  async getTeamDetail(@Param("teamId") teamId: string) {
    const id = Number(teamId);
    if (!Number.isInteger(id) || id < 1) throw new httpError.BadRequestError("teamId 必须为正整数");
    const team = this.teamService.getById(id);
    if (!team) throw new httpError.NotFoundError("球队不存在");
    return { data: { team, players: this.getTeamPlayers(id), matches: this.getTeamMatches(id) } };
  }

  private getTeamPlayers(teamId: number) {
    try {
      const db = (this.matchService as any).database;
      return db.prepare("SELECT id, name, number, position FROM players WHERE team_id=? ORDER BY number").all(teamId);
    } catch { return []; }
  }

  private getTeamMatches(teamId: number) {
    try {
      return this.matchService.getTeamMatches(teamId);
    } catch { return []; }
  }

  @Get("/players/:playerId")
  async getPlayerDetail(@Param("playerId") playerId: string) {
    const id = Number(playerId);
    if (!Number.isInteger(id) || id < 1) throw new httpError.BadRequestError("playerId 必须为正整数");
    const player = this.playerService.getById(id);
    if (!player) throw new httpError.NotFoundError("球员不存在");
    return { data: player };
  }

  // ============================================================
  // 003-stats
  // ============================================================
  @Get("/stats/bracket") async getBracket() { return { data: this.statsService.getBracket() }; }
  @Get("/stats/top-scorers") async getTopScorers() { return { data: this.statsService.getTopScorers() }; }
  @Get("/stats/top-assists") async getTopAssists() { return { data: this.statsService.getTopAssists() }; }
  @Get("/stats/standings") async getStandings() { return { data: this.statsService.getStandings() }; }

  // ============================================================
  // 006-leaderboard
  // ============================================================
  @Get("/leaderboard") async getLeaderboard() { return { data: this.leaderboardService.getTop100() }; }

  @Get("/leaderboard/me")
  async getMyRank(@Headers("authorization") auth?: string) {
    const userId = this.requireAuth(auth);
    return { data: this.leaderboardService.getMyRank(userId) };
  }

  private requireAuth(auth?: string): number {
    if (!auth) throw new httpError.UnauthorizedError("请先登录");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    const result = this.authService.verifyToken(token);
    if (!result) throw new httpError.UnauthorizedError("登录已过期");
    return result.userId;
  }
}
