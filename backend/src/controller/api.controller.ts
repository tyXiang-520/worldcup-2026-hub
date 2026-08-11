import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
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
  @Inject()
  courseService: CourseService;

  @Inject()
  matchService: MatchService;

  @Inject()
  teamService: TeamService;

  @Inject()
  playerService: PlayerService;

  @Inject()
  statsService: StatsService;

  @Inject()
  leaderboardService: LeaderboardService;

  @Inject()
  authService: AuthService;

  // ============================================================
  // 原有课程接口
  // ============================================================
  @Get("/health")
  async health() {
    return {
      status: "ok" as const,
      service: "course-demo-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("/courses")
  async listCourses() {
    return { data: this.courseService.list() };
  }

  @Post("/courses")
  async createCourse(@Body() body: unknown) {
    try {
      const input = parseCourseInput(body);
      return { data: this.courseService.create(input) };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "课程数据无效";
      throw new httpError.BadRequestError(message);
    }
  }

  // ============================================================
  // 001-match-display：世界杯赛事数据展示
  // ============================================================
  @Get("/matches")
  async listMatches(@Query("stage") stage?: string) {
    const data = this.matchService.list(stage);
    return { data };
  }

  @Get("/matches/:matchId")
  async getMatchDetail(@Param("matchId") matchId: string) {
    const id = Number(matchId);
    if (!Number.isInteger(id) || id < 1) {
      throw new httpError.BadRequestError("matchId 必须为正整数");
    }
    const detail = this.matchService.getById(id);
    if (!detail) {
      throw new httpError.NotFoundError("比赛不存在");
    }
    return { data: detail };
  }

  @Get("/teams")
  async listTeams() {
    const data = this.teamService.list();
    return { data };
  }

  @Get("/teams/:teamId")
  async getTeamDetail(@Param("teamId") teamId: string) {
    const id = Number(teamId);
    if (!Number.isInteger(id) || id < 1) {
      throw new httpError.BadRequestError("teamId 必须为正整数");
    }
    const team = this.teamService.getById(id);
    if (!team) {
      throw new httpError.NotFoundError("球队不存在");
    }
    return { data: { team, players: [], matches: [] } };
  }

  @Get("/players/:playerId")
  async getPlayerDetail(@Param("playerId") playerId: string) {
    const id = Number(playerId);
    if (!Number.isInteger(id) || id < 1) {
      throw new httpError.BadRequestError("playerId 必须为正整数");
    }
    const player = this.playerService.getById(id);
    if (!player) {
      throw new httpError.NotFoundError("球员不存在");
    }
    return { data: player };
  }

  // ============================================================
  // 003-stats-bracket：晋级图、射手榜、助攻榜、积分榜
  // ============================================================
  @Get("/stats/bracket")
  async getBracket() {
    const data = this.statsService.getBracket();
    return { data };
  }

  @Get("/stats/top-scorers")
  async getTopScorers(
    @Query("sortBy") sortBy?: string,
    @Query("order") order?: string,
  ) {
    const data = this.statsService.getTopScorers(sortBy ?? "goals", order ?? "desc");
    return { data };
  }

  @Get("/stats/top-assists")
  async getTopAssists(
    @Query("sortBy") sortBy?: string,
    @Query("order") order?: string,
  ) {
    const data = this.statsService.getTopAssists(sortBy ?? "assists", order ?? "desc");
    return { data };
  }

  @Get("/stats/standings")
  async getStandings() {
    const data = this.statsService.getStandings();
    return { data };
  }

  // ============================================================
  // 006-leaderboard：排行榜
  // ============================================================
  @Get("/leaderboard")
  async getLeaderboard() {
    const data = this.leaderboardService.getTop100();
    return { data };
  }

  @Get("/leaderboard/me")
  async getMyRank(@Headers("authorization") auth?: string) {
    const userId = this.requireAuth(auth);
    const data = this.leaderboardService.getMyRank(userId);
    return { data };
  }

  private requireAuth(auth?: string): number {
    if (!auth) throw new httpError.UnauthorizedError("请先登录");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    const result = this.authService.verifyToken(token);
    if (!result) throw new httpError.UnauthorizedError("登录已过期");
    return result.userId;
  }
}
