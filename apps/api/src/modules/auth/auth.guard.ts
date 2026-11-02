import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { AuthenticatedRequest } from '../../common/decorators/current-user-id.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import type { AccessTokenPayload } from './auth.service';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token || null;
}

// 전역 Guard: @Public() 이 아닌 모든 경로에서 Bearer 토큰을 검증하고 request.userId 를 붙인다
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('인증이 필요해요');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('인증이 만료됐거나 유효하지 않아요');
    }
    if (!isUUID(payload.sub)) throw new UnauthorizedException('인증이 만료됐거나 유효하지 않아요');

    request.userId = payload.sub;
    return true;
  }
}
