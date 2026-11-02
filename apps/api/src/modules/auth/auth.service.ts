import type { AuthTokenResponse } from '@haedalpoint/shared';
import { BadGatewayException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../config/env.validation';
import {
  ANON_AUTH_CODE_INVALID,
  TossPartnerClient,
  TossPartnerError,
} from '../toss-partner/toss-partner.client';
import { UsersService } from '../users/users.service';

/** access token 에는 내부 사용자 ID 만 담는다 (토스 식별자는 넣지 않는다) */
export interface AccessTokenPayload {
  sub: string;
}

// 비즈니스 로직 계층: 인증 코드 교환 → 회원 연결 → 자체 토큰 발급 (ADR-0006)
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly tossPartnerClient: TossPartnerClient,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async loginWithAnonAuthCode(code: string): Promise<AuthTokenResponse> {
    const anonKey = await this.exchangeAnonAuthCode(code);
    const user = await this.usersService.findOrCreateByAnonKey(anonKey);

    const payload: AccessTokenPayload = { sub: user.id };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
    };
  }

  private async exchangeAnonAuthCode(code: string): Promise<string> {
    try {
      return await this.tossPartnerClient.exchangeAnonAuthCode(code);
    } catch (error) {
      // 상세 사유는 서버 로그에만 남기고, 클라이언트에는 화면에 필요한 만큼만 돌려준다
      if (error instanceof TossPartnerError && error.errorCode === ANON_AUTH_CODE_INVALID) {
        this.logger.warn(`익명 인증 코드 교환 거부: ${error.reason}`);
        throw new UnauthorizedException('인증 코드가 만료됐거나 유효하지 않아요');
      }
      this.logger.error('익명 인증 코드 교환 실패', error instanceof Error ? error.stack : error);
      throw new BadGatewayException('사용자 확인에 실패했어요. 잠시 후 다시 시도해 주세요');
    }
  }
}
