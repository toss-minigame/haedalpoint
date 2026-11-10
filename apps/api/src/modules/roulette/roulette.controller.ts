import type {
  ApplyBaitResponse,
  BaitRouletteTodayResponse,
  SpinBaitRouletteResponse,
} from '@haedalpoint/shared';
import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator.js';
import { RouletteService } from './roulette.service.js';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
@Controller('roulette')
export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  @Get('today')
  getToday(@CurrentUserId() userId: string): Promise<BaitRouletteTodayResponse> {
    return this.rouletteService.getToday(userId);
  }

  @Post('spin')
  spin(@CurrentUserId() userId: string): Promise<SpinBaitRouletteResponse> {
    return this.rouletteService.spin(userId);
  }

  // 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다
  @Post('ad-apply')
  applyAdBait(@CurrentUserId() userId: string): Promise<ApplyBaitResponse> {
    return this.rouletteService.applyAdBait(userId);
  }
}
