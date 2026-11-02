import type { AuthTokenResponse } from '@haedalpoint/shared';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { AnonLoginDto } from './dto/anon-login.dto.js';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 미니앱 진입 시 User.createAnonymousKeyAuthCode() 로 받은 코드를 보낸다
  @Public()
  @Post('anon')
  @HttpCode(HttpStatus.OK)
  loginWithAnonAuthCode(@Body() dto: AnonLoginDto): Promise<AuthTokenResponse> {
    return this.authService.loginWithAnonAuthCode(dto.code);
  }
}
