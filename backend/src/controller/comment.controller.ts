import {
  Body, Controller, Get, httpError, Inject, Param, Post, Query, Headers,
} from "@midwayjs/core";
import { AuthService } from "../service/auth.service";
import { CommentService, CommunityService } from "../service/comment.service";

@Controller("/api")
export class CommentController {
  @Inject()
  commentService: CommentService;
  @Inject()
  communityService: CommunityService;
  @Inject()
  authService: AuthService;

  @Get("/comments")
  async list(@Query("matchId") matchId: string, @Query("sort") sort?: string) {
    const data = this.commentService.list(Number(matchId), sort ?? "latest");
    return { data };
  }

  @Post("/comments")
  async create(
    @Headers("authorization") auth: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = this.requireAuth(auth);
    try {
      const data = this.commentService.create(
        userId,
        Number(body.matchId),
        String(body.content ?? ""),
        body.parentId ? Number(body.parentId) : undefined,
      );
      return { data };
    } catch (err: any) {
      throw new httpError.BadRequestError(err.message);
    }
  }

  @Get("/community")
  async listTeams() {
    const data = this.communityService.listTeams();
    return { data };
  }

  @Get("/community/:teamId/posts")
  async listPosts(@Param("teamId") teamId: string) {
    const data = this.communityService.listPosts(Number(teamId));
    return { data };
  }

  @Post("/community/:teamId/posts")
  async createPost(
    @Param("teamId") teamId: string,
    @Headers("authorization") auth: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = this.requireAuth(auth);
    try {
      const data = this.communityService.createPost(
        userId, Number(teamId), String(body.title ?? ""), String(body.content ?? ""),
      );
      return { data };
    } catch (err: any) {
      throw new httpError.BadRequestError(err.message);
    }
  }

  private requireAuth(auth?: string): number {
    if (!auth) throw new httpError.UnauthorizedError("请先登录");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    const result = this.authService.verifyToken(token);
    if (!result) throw new httpError.UnauthorizedError("登录已过期");
    return result.userId;
  }
}
