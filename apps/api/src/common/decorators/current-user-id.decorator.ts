// 현재 사용자 ID(users.id). 토큰 검증은 전역 인증 Guard(modules/auth/auth.guard.ts)가 하고,
// 이 데코레이터는 Guard 가 request 에 붙여 둔 값을 꺼내기만 한다. (컨트롤러 시그니처 유지 — ADR-0006)
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & { userId?: string };

export function extractUserId(request: Pick<AuthenticatedRequest, 'userId'>): string {
  // @Public() 경로에서 잘못 쓰였거나 Guard 가 등록되지 않은 경우
  if (!request.userId) throw new UnauthorizedException('인증이 필요해요');
  return request.userId;
}

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  extractUserId(ctx.switchToHttp().getRequest<AuthenticatedRequest>()),
);
