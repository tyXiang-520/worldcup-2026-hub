import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
  Patch,
  Post,
  Headers,
} from "@midwayjs/core";
import {
  AuthService,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from "../service/auth.service";

@Controller("/api/auth")
export class AuthController {
  @Inject()
  authService: AuthService;

  @Post("/register")
  async register(@Body() body: unknown) {
    const input = body as Record<string, unknown>;
    const username = typeof input.username === "string" ? input.username : "";
    const password = typeof input.password === "string" ? input.password : "";

    try {
      const result = this.authService.register(username, password);
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

  @Post("/login")
  async login(@Body() body: unknown) {
    const input = body as Record<string, unknown>;
    const username = typeof input.username === "string" ? input.username : "";
    const password = typeof input.password === "string" ? input.password : "";

    try {
      const result = this.authService.login(username, password);
      return { data: result };
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw new httpError.UnauthorizedError(err.message);
      }
      throw err;
    }
  }

  @Get("/me")
  async getProfile(@Headers("authorization") auth?: string) {
    const userId = this.requireAuth(auth);
    const profile = this.authService.getProfile(userId);
    if (!profile) {
      throw new httpError.UnauthorizedError("用户不存在或令牌无效");
    }
    return { data: profile };
  }

  @Patch("/me")
  async updatePrivacy(
    @Headers("authorization") auth: string | undefined,
    @Body() body: unknown,
  ) {
    const userId = this.requireAuth(auth);
    const input = body as Record<string, unknown>;
    const settings: { allowLeaderboard?: boolean; allowPredictionView?: boolean } = {};

    if (typeof input.allowLeaderboard === "boolean") {
      settings.allowLeaderboard = input.allowLeaderboard;
    }
    if (typeof input.allowPredictionView === "boolean") {
      settings.allowPredictionView = input.allowPredictionView;
    }

    const profile = this.authService.updatePrivacy(userId, settings);
    if (!profile) {
      throw new httpError.UnauthorizedError("用户不存在");
    }
    return { data: profile };
  }

  private requireAuth(auth?: string): number {
    if (!auth) {
      throw new httpError.UnauthorizedError("请先登录");
    }
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    const result = this.authService.verifyToken(token);
    if (!result) {
      throw new httpError.UnauthorizedError("登录已过期，请重新登录");
    }
    return result.userId;
  }
}
