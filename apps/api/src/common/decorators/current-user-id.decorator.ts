// 임시 사용자 식별: 토스 로그인 연동 시 이 데코레이터 구현만 교체 (컨트롤러 시그니처 유지).
// ⚠️ X-User-Id 헤더는 클라이언트가 임의로 바꿀 수 있으므로 운영 배포 전 반드시 교체해야 한다.
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

export const USER_ID_HEADER = 'x-user-id';

export function extractUserId(request: Pick<Request, 'headers'>): string {
  const raw = request.headers[USER_ID_HEADER];
  const userId = Array.isArray(raw) ? raw[0] : raw;
  if (!userId || !isUUID(userId)) {
    throw new UnauthorizedException('유효한 X-User-Id 헤더가 필요합니다');
  }
  return userId;
}

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  extractUserId(ctx.switchToHttp().getRequest<Request>()),
);
