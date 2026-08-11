import { Body, Controller, Get, httpError, Inject, Post, Query, Headers } from "@midwayjs/core";
import { AuthService, UnauthorizedError } from "../service/auth.service";
import {
  PredictionService,
  ValidationError,
  ConflictError,
} from "../service/prediction.service";

@Controller("/api/predictions")
export class PredictionController {
  @Inject()
  predictionService: PredictionService;

  @Inject()
  authService: AuthService;

  @Post("/")
  async create(
    @Headers("authorization") auth: string | undefined,
    @Body() body: unknown,
  ) {
    const userId = this.requireAuth(auth);
    const input = body as Record<string, unknown>;

    try {
      const result = this.predictionService.submit(userId, {
        matchId: Number(input.matchId),
        prediction: String(input.prediction ?? "") as "home" | "away" | "draw",
        homeScore: input.homeScore !== undefined ? Number(input.homeScore) : undefined,
        awayScore: input.awayScore !== undefined ? Number(input.awayScore) : undefined,
      });
      return { data: result };
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new httpError.BadRequestError(err.message);
      }
      if (err instanceof ConflictError) {
        throw new httpError.ConflictError(err.message);
      }
      throw err;
    }
  }

  @Get("/")
  async list(
    @Headers("authorization") auth: string | undefined,
    @Query("matchId") matchId?: string,
  ) {
    const userId = this.requireAuth(auth);
    const data = this.predictionService.listByUser(
      userId,
      matchId ? Number(matchId) : undefined,
    );
    return { data };
  }

  private requireAuth(auth?: string): number {
    if (!auth) throw new httpError.UnauthorizedError("请先登录");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    const result = this.authService.verifyToken(token);
    if (!result) throw new httpError.UnauthorizedError("登录已过期，请重新登录");
    return result.userId;
  }
}
