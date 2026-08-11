import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
  Post,
  Query,
  Param,
} from "@midwayjs/core";
import { CourseService } from "../service/course.service";
import { MatchService } from "../service/match.service";
import { TeamService } from "../service/team.service";
import { PlayerService } from "../service/player.service";
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

  /** 获取赛程列表，按日期分组 */
  @Get("/matches")
  async listMatches(@Query("stage") stage?: string) {
    const data = this.matchService.list(stage);
    return { data };
  }

  /** 获取单场比赛详情 */
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

  /** 获取球队列表 */
  @Get("/teams")
  async listTeams() {
    const data = this.teamService.list();
    return { data };
  }

  /** 获取球队详情 */
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

  /** 获取球员详情 */
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
}
